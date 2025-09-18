// src/server.js
import express from 'express';
import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const parseXml = promisify(parseString);

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class MarketingCloudAPIServer {
  constructor() {
    this.app = express();
    this.tokens = new Map();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Security headers
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // CORS for Salesforce
    this.app.use((req, res, next) => {
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
      allowedOrigins.push('https://*.salesforce.com', 'https://*.force.com');
      
      const origin = req.headers.origin;
      if (origin) {
        const isAllowed = allowedOrigins.some(allowed => {
          if (allowed.includes('*')) {
            const pattern = allowed.replace(/\*/g, '.*');
            return new RegExp(pattern).test(origin);
          }
          return allowed === origin;
        });
        
        if (isAllowed) {
          res.header('Access-Control-Allow-Origin', origin);
          res.header('Access-Control-Allow-Credentials', 'true');
        }
      }
      
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Org-Id, X-User-Id');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: 'Too many requests, please try again later.'
    });
    this.app.use('/api/', limiter);
    this.app.use('/agentforce/', limiter);

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      next();
    });

    // Authentication middleware
    this.app.use((req, res, next) => {
      // Skip auth for health and docs
      if (['/health', '/', '/api/docs'].includes(req.path)) {
        return next();
      }

      if (process.env.REQUIRE_AUTH === 'true') {
        const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
        
        if (!apiKey) {
          logger.warn('Missing authentication', { path: req.path, ip: req.ip });
          return res.status(401).json({ error: 'Missing API key' });
        }
        
        if (apiKey !== process.env.API_KEY) {
          logger.warn('Invalid API key attempt', { path: req.path, ip: req.ip });
          return res.status(401).json({ error: 'Invalid API key' });
        }
      }
      
      // Store API key for logging
      req.apiKey = req.headers['x-api-key'];
      next();
    });
  }

  setupRoutes() {
    // Welcome route
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Salesforce MCE MCP Server API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          agentforce: '/agentforce/webhook',
          api: {
            docs: '/api/docs',
            rest: '/api/rest',
            soap: '/api/soap',
            email: '/api/email/*',
            journey: '/api/journey/*',
            data: '/api/data/*'
          }
        }
      });
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'salesforce-mce-mcp-server-api',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // Main Agentforce webhook endpoint
    this.app.post('/agentforce/webhook', async (req, res) => {
      try {
        logger.info('Agentforce webhook received', { 
          action: req.body.action,
          orgId: req.body.context?.orgId 
        });
        
        const { action, parameters, context } = req.body;
        
        let result;
        switch (action) {
          case 'create_email':
            result = await this.createEmail(parameters, context);
            break;
          case 'send_email':
            result = await this.sendEmail(parameters, context);
            break;
          case 'create_journey':
            result = await this.createJourney(parameters, context);
            break;
          case 'list_emails':
            result = await this.listEmails(parameters, context);
            break;
          case 'get_metrics':
            result = await this.getMetrics(parameters, context);
            break;
          case 'create_data_extension':
            result = await this.createDataExtension(parameters, context);
            break;
          default:
            result = await this.handleGenericRequest(action, parameters, context);
        }
        
        res.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Webhook error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // REST API proxy
    this.app.post('/api/rest', async (req, res) => {
      try {
        const result = await this.handleRestRequest(req.body);
        res.json(result);
      } catch (error) {
        logger.error('REST API error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // SOAP API proxy
    this.app.post('/api/soap', async (req, res) => {
      try {
        const result = await this.handleSoapRequest(req.body);
        res.json(result);
      } catch (error) {
        logger.error('SOAP API error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Email endpoints
    this.app.post('/api/email/create', async (req, res) => {
      try {
        const result = await this.createEmail(req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/email/send', async (req, res) => {
      try {
        const result = await this.sendEmail(req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/email/list', async (req, res) => {
      try {
        const result = await this.listEmails(req.query);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Documentation
    this.app.get('/api/docs', (req, res) => {
      res.json({
        description: 'Salesforce MCE MCP Server API Documentation',
        baseUrl: req.protocol + '://' + req.get('host'),
        authentication: 'X-API-Key header required',
        endpoints: this.getApiDocumentation()
      });
    });
  }

  // Email creation
  async createEmail(parameters, context = {}) {
    try {
      const {
        name,
        subject,
        preheader,
        template = 'standard',
        content = {},
        folderId,
        businessUnitId
      } = parameters;

      logger.info('Creating email', { name, template });

      const htmlContent = this.buildEmailHTML(template, content);
      const tokenInfo = await this.getAccessToken(businessUnitId || process.env.MCE_DEFAULT_MID);
      
      const emailPayload = {
        name: name,
        channels: {
          email: true
        },
        views: {
          html: {
            content: htmlContent
          },
          text: {},
          subjectline: {
            content: subject
          },
          preheader: {
            content: preheader || ''
          }
        },
        assetType: {
          name: 'htmlemail',
          id: 208
        }
      };

      if (folderId) {
        emailPayload.category = {
          id: parseInt(folderId)
        };
      }

      const response = await axios.post(
        `${tokenInfo.rest_instance_url}/asset/v1/content/assets`,
        emailPayload,
        {
          headers: {
            'Authorization': `Bearer ${tokenInfo.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Email created successfully', { emailId: response.data.id });

      return {
        emailId: response.data.id,
        customerKey: response.data.customerKey,
        name: response.data.name,
        status: response.data.status || 'Draft',
        createdDate: response.data.createdDate
      };
    } catch (error) {
      logger.error('Error creating email:', error);
      throw error;
    }
  }

  // Send email
  async sendEmail(parameters, context = {}) {
    try {
      const {
        emailId,
        sendDefinitionName,
        listId,
        dataExtensionKey,
        scheduledTime,
        businessUnitId
      } = parameters;

      logger.info('Sending email', { emailId, sendDefinitionName });

      const tokenInfo = await this.getAccessToken(businessUnitId || process.env.MCE_DEFAULT_MID);
      
      // Create send definition
      const sendDefinition = {
        definitionKey: `send_${Date.now()}`,
        name: sendDefinitionName || `Send_${Date.now()}`,
        description: 'Created via API',
        classification: 'Default Commercial',
        content: {
          customerKey: emailId
        },
        subscriptions: {
          list: listId ? [{ id: listId }] : undefined,
          dataExtension: dataExtensionKey ? [{ key: dataExtensionKey }] : undefined
        },
        options: {
          trackLinks: true,
          cc: [],
          bcc: []
        }
      };

      const response = await axios.post(
        `${tokenInfo.rest_instance_url}/messaging/v1/email/definitions`,
        sendDefinition,
        {
          headers: {
            'Authorization': `Bearer ${tokenInfo.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const definitionKey = response.data.definitionKey;

      // Trigger send if not scheduled
      if (!scheduledTime) {
        await axios.post(
          `${tokenInfo.rest_instance_url}/messaging/v1/email/definitions/${definitionKey}/send`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${tokenInfo.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        logger.info('Email sent immediately', { definitionKey });
      } else {
        // Schedule send
        await axios.post(
          `${tokenInfo.rest_instance_url}/messaging/v1/email/definitions/${definitionKey}/schedule`,
          {
            scheduledTime: scheduledTime
          },
          {
            headers: {
              'Authorization': `Bearer ${tokenInfo.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        logger.info('Email scheduled', { definitionKey, scheduledTime });
      }

      return {
        sendDefinitionKey: definitionKey,
        status: scheduledTime ? 'Scheduled' : 'Sent',
        scheduledTime: scheduledTime
      };
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  // List emails
  async listEmails(parameters, context = {}) {
    try {
      const { folderId, pageSize = 50, page = 1, businessUnitId } = parameters;
      
      const tokenInfo = await this.getAccessToken(businessUnitId || process.env.MCE_DEFAULT_MID);
      
      let url = `${tokenInfo.rest_instance_url}/asset/v1/content/assets`;
      const params = new URLSearchParams({
        '$pagesize': pageSize,
        '$page': page,
        '$filter': 'assetType.id eq 208' // HTML emails
      });

      if (folderId) {
        params.append('$filter', `category.id eq ${folderId}`);
      }

      const response = await axios.get(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${tokenInfo.access_token}`
        }
      });

      return {
        emails: response.data.items || [],
        totalCount: response.data.count,
        page: response.data.page,
        pageSize: response.data.pageSize
      };
    } catch (error) {
      logger.error('Error listing emails:', error);
      throw error;
    }
  }

  // Create journey (placeholder)
  async createJourney(parameters, context = {}) {
    logger.info('Creating journey', parameters);
    // Journey Builder API implementation
    return {
      journeyId: `journey_${Date.now()}`,
      name: parameters.name,
      status: 'Draft',
      message: 'Journey creation endpoint - implementation pending'
    };
  }

  // Get metrics
  async getMetrics(parameters, context = {}) {
    try {
      const { emailId, startDate, endDate, businessUnitId } = parameters;
      
      const tokenInfo = await this.getAccessToken(businessUnitId || process.env.MCE_DEFAULT_MID);
      
      // This would aggregate metrics from various endpoints
      // Placeholder response for now
      return {
        emailId: emailId,
        metrics: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0
        },
        period: {
          start: startDate,
          end: endDate
        }
      };
    } catch (error) {
      logger.error('Error getting metrics:', error);
      throw error;
    }
  }

  // Create data extension
  async createDataExtension(parameters, context = {}) {
    try {
      const { name, fields, businessUnitId } = parameters;
      
      logger.info('Creating data extension', { name });
      
      // Use SOAP for data extension creation
      return await this.handleSoapRequest({
        action: 'Create',
        objectType: 'DataExtension',
        objects: [{
          name: name,
          customerKey: parameters.customerKey || name.replace(/\s+/g, '_'),
          description: parameters.description || '',
          fields: fields || [
            { name: 'EmailAddress', fieldType: 'EmailAddress', isRequired: true },
            { name: 'SubscriberKey', fieldType: 'Text', maxLength: 254, isPrimaryKey: true }
          ]
        }],
        businessUnitId: businessUnitId
      });
    } catch (error) {
      logger.error('Error creating data extension:', error);
      throw error;
    }
  }

  // Build email HTML
  buildEmailHTML(template, content) {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || 'Email'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
    .wrapper { width: 100%; table-layout: fixed; background: #f4f4f4; padding: 20px 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: ${content.headerColor || '#0176d3'}; color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px 20px; }
    .content p { line-height: 1.6; color: #333; }
    .button { display: inline-block; padding: 12px 30px; background: ${content.buttonColor || '#0176d3'}; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .footer a { color: #0176d3; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">`;

    // Template-specific content
    switch (template) {
      case 'welcome':
        html += `
      <div class="header">
        <h1>${content.headline || 'Welcome!'}</h1>
      </div>
      <div class="content">
        <p>Hi %%firstname%%,</p>
        <p>${content.message || 'Welcome to our community! We\'re excited to have you on board.'}</p>
        ${content.ctaUrl ? `<center><a href="${content.ctaUrl}" class="button">${content.ctaText || 'Get Started'}</a></center>` : ''}
      </div>`;
        break;

      case 'promotional':
        html += `
      <div class="header">
        <h1>${content.headline || 'Special Offer'}</h1>
      </div>
      <div class="content">
        <p>Hi %%firstname%%,</p>
        <p>${content.message || 'Check out this exclusive offer just for you!'}</p>
        ${content.discountCode ? `<p style="font-size: 24px; font-weight: bold; text-align: center; color: #0176d3;">Code: ${content.discountCode}</p>` : ''}
        ${content.ctaUrl ? `<center><a href="${content.ctaUrl}" class="button">${content.ctaText || 'Shop Now'}</a></center>` : ''}
      </div>`;
        break;

      case 'newsletter':
        html += `
      <div class="header">
        <h1>${content.headline || 'Newsletter'}</h1>
      </div>
      <div class="content">
        ${content.sections ? content.sections.map(section => `
        <h2>${section.title}</h2>
        <p>${section.content}</p>
        ${section.link ? `<a href="${section.link}">Read more →</a>` : ''}
        `).join('<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">') : '<p>Newsletter content here</p>'}
      </div>`;
        break;

      default:
        // Custom or standard template
        html += `
      ${content.headerHTML || `<div class="header"><h1>${content.headline || 'Email'}</h1></div>`}
      <div class="content">
        ${content.bodyHTML || content.message || '<p>Email content goes here</p>'}
      </div>`;
    }

    // Footer
    html += `
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${content.companyName || 'Your Company'}. All rights reserved.</p>
        <p>
          <a href="%%unsub_center_url%%">Unsubscribe</a> | 
          <a href="%%profile_center_url%%">Update Preferences</a> | 
          <a href="%%view_email_url%%">View Online</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  // Generic request handler
  async handleGenericRequest(action, parameters, context) {
    if (parameters.apiType === 'soap') {
      return await this.handleSoapRequest(parameters);
    } else {
      return await this.handleRestRequest(parameters);
    }
  }

  // Token management
  async getAccessToken(businessUnitId) {
    const cacheKey = businessUnitId || 'default';
    const cached = this.tokens.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    const subdomain = process.env.MCE_SUBDOMAIN;
    const clientId = process.env.MCE_CLIENT_ID;
    const clientSecret = process.env.MCE_CLIENT_SECRET;

    if (!subdomain || !clientId || !clientSecret) {
      throw new Error('Missing MCE credentials in environment variables');
    }

    try {
      const tokenUrl = `https://${subdomain}.auth.marketingcloudapis.com/v2/token`;
      const tokenData = {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      };

      if (businessUnitId) {
        tokenData.account_id = businessUnitId;
      }

      const response = await axios.post(tokenUrl, tokenData, {
        headers: { 'Content-Type': 'application/json' }
      });

      const tokenInfo = {
        access_token: response.data.access_token,
        rest_instance_url: response.data.rest_instance_url,
        soap_instance_url: response.data.soap_instance_url,
        expires_in: response.data.expires_in,
        expiresAt: Date.now() + (response.data.expires_in - 60) * 1000
      };

      this.tokens.set(cacheKey, tokenInfo);
      logger.info('Token acquired', { businessUnitId, expiresIn: response.data.expires_in });
      
      return tokenInfo;
    } catch (error) {
      logger.error('Token acquisition failed:', error.response?.data || error.message);
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  // REST request handler
  async handleRestRequest(args) {
    try {
      const tokenInfo = await this.getAccessToken(args.businessUnitId || process.env.MCE_DEFAULT_MID);
      
      let url = `${tokenInfo.rest_instance_url}${args.path}`;
      
      if (args.query) {
        const params = new URLSearchParams();
        Object.entries(args.query).forEach(([key, value]) => {
          params.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        });
        url += `?${params}`;
      }

      const headers = {
        'Authorization': `Bearer ${tokenInfo.access_token}`,
        'Content-Type': 'application/json',
        ...args.headers
      };

      logger.info(`REST ${args.method} ${args.path}`);

      const response = await axios({
        method: args.method,
        url: url,
        headers: headers,
        data: args.body,
        validateStatus: () => true
      });

      return {
        status: response.status,
        data: response.data
      };
    } catch (error) {
      logger.error('REST request failed:', error);
      throw error;
    }
  }

  // SOAP request handler
  async handleSoapRequest(args) {
    try {
      const tokenInfo = await this.getAccessToken(args.businessUnitId || process.env.MCE_DEFAULT_MID);
      const soapUrl = tokenInfo.soap_instance_url + 'Service.asmx';
      
      const soapEnvelope = this.buildSoapEnvelope(args, tokenInfo.access_token);
      
      logger.info(`SOAP ${args.action} ${args.objectType}`);

      const response = await axios.post(soapUrl, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml; charset=UTF-8',
          'SOAPAction': args.action
        },
        maxBodyLength: Infinity,
        validateStatus: () => true
      });

      if (response.status !== 200) {
        const errorData = await parseXml(response.data).catch(() => response.data);
        throw new Error(`SOAP Error (${response.status}): ${JSON.stringify(errorData)}`);
      }

      const parsed = await parseXml(response.data, {
        explicitArray: false,
        ignoreAttrs: true,
        tagNameProcessors: [(name) => name.replace(':', '_')]
      });

      let responseBody = parsed;
      if (parsed['soap_Envelope']?.['soap_Body']) {
        responseBody = parsed['soap_Envelope']['soap_Body'];
      } else if (parsed['s_Envelope']?.['s_Body']) {
        responseBody = parsed['s_Envelope']['s_Body'];
      }

      return responseBody;
    } catch (error) {
      logger.error('SOAP request failed:', error);
      throw error;
    }
  }

  // Build SOAP envelope
  buildSoapEnvelope(args, accessToken) {
    const subdomain = process.env.MCE_SUBDOMAIN;
    
    let body = '';
    switch (args.action) {
      case 'Create':
        body = this.buildCreateBody(args);
        break;
      case 'Retrieve':
        body = this.buildRetrieveBody(args);
        break;
      case 'Update':
        body = this.buildUpdateBody(args);
        break;
      case 'Delete':
        body = this.buildDeleteBody(args);
        break;
      default:
        throw new Error(`Unsupported SOAP action: ${args.action}`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <a:Action s:mustUnderstand="1">${args.action}</a:Action>
    <a:To s:mustUnderstand="1">https://${subdomain}.soap.marketingcloudapis.com/Service.asmx</a:To>
    <fueloauth xmlns="http://exacttarget.com">${accessToken}</fueloauth>
  </s:Header>
  <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    ${body}
  </s:Body>
</s:Envelope>`;
  }

  buildCreateBody(args) {
    const obj = args.objects?.[0] || {};
    return `
    <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Objects xsi:type="${args.objectType}">
        ${this.buildObjectProperties(obj)}
      </Objects>
    </CreateRequest>`;
  }

  buildRetrieveBody(args) {
    const filter = args.filter ? this.buildFilter(args.filter) : '';
    const properties = args.properties?.map(p => `<Properties>${p}</Properties>`).join('') || '';
    
    return `
    <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <RetrieveRequest>
        <ObjectType>${args.objectType}</ObjectType>
        ${properties}
        ${filter}
      </RetrieveRequest>
    </RetrieveRequestMsg>`;
  }

  buildUpdateBody(args) {
    const obj = args.objects?.[0] || {};
    return `
    <UpdateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Objects xsi:type="${args.objectType}">
        ${this.buildObjectProperties(obj)}
      </Objects>
    </UpdateRequest>`;
  }

  buildDeleteBody(args) {
    const obj = args.objects?.[0] || {};
    return `
    <DeleteRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Objects xsi:type="${args.objectType}">
        ${this.buildObjectProperties(obj)}
      </Objects>
    </DeleteRequest>`;
  }

  buildFilter(filter) {
    if (!filter) return '';
    return `
      <Filter xsi:type="SimpleFilterPart">
        <Property>${filter.property}</Property>
        <SimpleOperator>${filter.operator || 'equals'}</SimpleOperator>
        <Value>${filter.value}</Value>
      </Filter>`;
  }

  buildObjectProperties(obj) {
    if (!obj) return '';
    
    // Special handling for DataExtension
    if (obj.fields) {
      let xml = `<CustomerKey>${obj.customerKey || obj.name}</CustomerKey>
        <Name>${obj.name}</Name>`;
      
      if (obj.description) xml += `<Description>${obj.description}</Description>`;
      
      obj.fields.forEach(field => {
        xml += `
        <Fields>
          <Field>
            <Name>${field.name}</Name>
            <FieldType>${field.fieldType || 'Text'}</FieldType>
            ${field.maxLength ? `<MaxLength>${field.maxLength}</MaxLength>` : ''}
            ${field.isPrimaryKey ? `<IsPrimaryKey>true</IsPrimaryKey>` : ''}
            ${field.isRequired ? `<IsRequired>true</IsRequired>` : ''}
          </Field>
        </Fields>`;
      });
      
      return xml;
    }
    
    // Generic properties
    return Object.entries(obj)
      .filter(([key, value]) => typeof value !== 'object')
      .map(([key, value]) => `<${key}>${value}</${key}>`)
      .join('');
  }

  getApiDocumentation() {
    return {
      agentforce: {
        '/agentforce/webhook': {
          method: 'POST',
          description: 'Main webhook endpoint for Agentforce',
          body: {
            action: 'string (required) - Action to perform',
            parameters: 'object - Action-specific parameters',
            context: 'object - Salesforce context information'
          }
        }
      },
      email: {
        '/api/email/create': {
          method: 'POST',
          description: 'Create a new email',
          body: {
            name: 'string (required)',
            subject: 'string (required)',
            template: 'string - Template type (welcome, promotional, newsletter)',
            content: 'object - Template-specific content'
          }
        },
        '/api/email/send': {
          method: 'POST',
          description: 'Send an email',
          body: {
            emailId: 'string (required)',
            listId: 'string - Target list ID',
            scheduledTime: 'string - ISO datetime for scheduled send'
          }
        }
      }
    };
  }

  start() {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () => {
      logger.info(`Marketing Cloud API Server running on port ${port}`);
      logger.info(`Health check: http://localhost:${port}/health`);
      logger.info(`Agentforce webhook: http://localhost:${port}/agentforce/webhook`);
    });
  }
}

// Start server
const server = new MarketingCloudAPIServer();
server.start();

export default server;