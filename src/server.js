#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const parseXml = promisify(parseString);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MarketingCloudMCPServer {
  constructor() {
    this.app = express();
    this.tokens = new Map();
    this.resources = this.loadResources();
    
    // Setup middleware
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    this.app.use(express.json());
    
    // Initialize MCP Server
    this.mcpServer = new Server(
      {
        name: 'salesforce-marketing-cloud-mcp',
        version: '3.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        },
      }
    );
    
    this.setupMCPHandlers();
    this.setupHTTPRoutes();
  }

  loadResources() {
    console.error('Loading MCP resources...');
    const resources = {
      guides: {},
      examples: {},
      components: {},
      helpers: {}
    };

    try {
      // Load markdown guides
      const guidesPath = join(__dirname, '..', 'docs');
      const guideFiles = ['mce-editable-emails-llm.md', 'mce-journey-builder-llm.md', 
                          'email-structure-guide.md', 'dynamic-content-guide.md', 
                          'email-components-lexicon.md'];
      
      guideFiles.forEach(file => {
        try {
          const content = readFileSync(join(guidesPath, file), 'utf8');
          resources.guides[file] = content;
          console.error(`✓ Loaded guide: ${file}`);
        } catch (e) {
          console.error(`✗ Could not load ${file}`);
        }
      });

      // Load JSON examples
      const exampleFiles = ['mcp-complete-example.json', 'mce-complete-operations-guide.json'];
      exampleFiles.forEach(file => {
        try {
          const content = readFileSync(join(guidesPath, file), 'utf8');
          resources.examples[file] = content;
          console.error(`✓ Loaded example: ${file}`);
        } catch (e) {
          console.error(`✗ Could not load ${file}`);
        }
      });

      // Load component examples
      const componentsPath = join(guidesPath, 'component-examples');
      try {
        const componentFiles = readdirSync(componentsPath);
        componentFiles.forEach(file => {
          if (file.endsWith('.json')) {
            const content = readFileSync(join(componentsPath, file), 'utf8');
            resources.components[file] = content;
            console.error(`✓ Loaded component: ${file}`);
          }
        });
      } catch (e) {
        console.error('✗ Could not load components directory');
      }

      // Load helper files
      const helperFiles = ['mce-operations-helper.js', 'mce-api-helpers.js'];
      helperFiles.forEach(file => {
        try {
          const content = readFileSync(join(__dirname, file), 'utf8');
          resources.helpers[file] = content;
          console.error(`✓ Loaded helper: ${file}`);
        } catch (e) {
          console.error(`✗ Could not load ${file}`);
        }
      });

    } catch (error) {
      console.error('Error loading resources:', error.message);
    }

    return resources;
  }

  setupMCPHandlers() {
    // ==================== RESOURCES ====================
    this.mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resourceList = [];

      // Add guides
      Object.keys(this.resources.guides).forEach(file => {
        resourceList.push({
          uri: `mce://guides/${file.replace('.md', '')}`,
          name: file.replace('.md', '').split('-').map(w => 
            w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: `Guide: ${file}`,
          mimeType: 'text/markdown'
        });
      });

      // Add examples
      Object.keys(this.resources.examples).forEach(file => {
        resourceList.push({
          uri: `mce://examples/${file.replace('.json', '')}`,
          name: file.replace('.json', '').split('-').map(w => 
            w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: `Example: ${file}`,
          mimeType: 'application/json'
        });
      });

      // Add components
      Object.keys(this.resources.components).forEach(file => {
        resourceList.push({
          uri: `mce://components/${file.replace('.json', '')}`,
          name: file.replace('.json', '').split('-').map(w => 
            w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: `Component template: ${file}`,
          mimeType: 'application/json'
        });
      });

      // Add helpers
      Object.keys(this.resources.helpers).forEach(file => {
        resourceList.push({
          uri: `mce://helpers/${file.replace('.js', '')}`,
          name: file.replace('.js', '').split('-').map(w => 
            w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: `Helper utilities: ${file}`,
          mimeType: 'application/javascript'
        });
      });

      return { resources: resourceList };
    });

    this.mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const [, category, name] = uri.split('/');

      let content, mimeType;

      switch (category) {
        case 'guides':
          content = this.resources.guides[`${name}.md`];
          mimeType = 'text/markdown';
          break;
        case 'examples':
          content = this.resources.examples[`${name}.json`];
          mimeType = 'application/json';
          break;
        case 'components':
          content = this.resources.components[`${name}.json`];
          mimeType = 'application/json';
          break;
        case 'helpers':
          content = this.resources.helpers[`${name}.js`];
          mimeType = 'application/javascript';
          break;
        default:
          throw new Error(`Unknown resource category: ${category}`);
      }

      if (!content) {
        throw new Error(`Resource not found: ${uri}`);
      }

      return {
        contents: [{
          uri: uri,
          mimeType: mimeType,
          text: content
        }]
      };
    });

    // ==================== PROMPTS ====================
    this.mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'create_editable_email',
          description: 'Create a fully editable marketing email with proper structure',
          arguments: [
            { name: 'email_name', description: 'Name for the email asset', required: true },
            { name: 'subject', description: 'Email subject line', required: true },
            { name: 'email_type', description: 'Type: welcome, newsletter, promotional, transactional', required: false }
          ]
        },
        {
          name: 'create_journey',
          description: 'Create a Journey Builder automation',
          arguments: [
            { name: 'journey_name', description: 'Name for the journey', required: true },
            { name: 'entry_type', description: 'Entry type: email_audience, api_event, automation', required: true }
          ]
        },
        {
          name: 'validate_email_structure',
          description: 'Validate an email creation request before sending',
          arguments: [
            { name: 'request_json', description: 'The email creation request to validate', required: true }
          ]
        }
      ]
    }));

    this.mcpServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'create_editable_email':
          const emailGuide = this.resources.guides['mce-editable-emails-llm.md'] || '';
          return {
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `Create a ${args.email_type || 'marketing'} email named "${args.email_name}" with subject "${args.subject}".

CRITICAL REQUIREMENTS FROM DOCUMENTATION:
${emailGuide.slice(0, 2000)}

Use mce_v1_rest_request with:
- method: POST
- path: /asset/v1/content/assets
- body: Complete structure with assetType {id: 207, name: "templatebasedemail"}

Build proper slots and blocks structure as shown in the guide.`
              }
            }]
          };

        case 'create_journey':
          const journeyGuide = this.resources.guides['mce-journey-builder-llm.md'] || '';
          return {
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `Create a journey named "${args.journey_name}" with entry type "${args.entry_type}".

JOURNEY BUILDER GUIDE:
${journeyGuide.slice(0, 2000)}

Use mce_v1_rest_request with:
- method: POST
- path: /interaction/v1/interactions
- body: Complete journey structure with triggers and activities`
              }
            }]
          };

        case 'validate_email_structure':
          return {
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `Validate this email creation request:
${args.request_json}

Check for:
1. assetType.id === 207 (not 208)
2. assetType.name === "templatebasedemail"
3. Proper slots structure
4. Each block has: assetType, content, design, meta
5. HTML template includes <custom> tags and <div data-type="slot">

Report any issues and provide corrections.`
              }
            }]
          };

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });

    // ==================== TOOLS ====================
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'mce_v1_health',
          description: 'Health check tool',
          inputSchema: {
            type: 'object',
            properties: {
              ping: { type: 'string', default: 'pong' }
            }
          }
        },
        {
          name: 'mce_v1_rest_request',
          description: `Execute Marketing Cloud REST API request.

CRITICAL FOR EMAIL CREATION:
- ALWAYS use assetType: {id: 207, name: "templatebasedemail"} for editable emails
- NEVER use assetType.id = 208 (creates non-editable HTML paste)
- Read mce://guides/mce-editable-emails-llm first for complete structure
- Both assetType.id AND assetType.name are REQUIRED`,
          inputSchema: {
            type: 'object',
            properties: {
              method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
              path: { type: 'string', description: 'API path under REST base URL' },
              query: { type: 'object', description: 'Query parameters' },
              body: { type: ['object', 'string'], description: 'Request body' },
              businessUnitId: { type: 'string', description: 'Business unit MID' }
            },
            required: ['method', 'path']
          }
        },
        {
          name: 'mce_v1_soap_request',
          description: 'Execute Marketing Cloud SOAP API request',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['Create', 'Retrieve', 'Update', 'Delete', 'Perform'] },
              objectType: { type: 'string', description: 'SOAP object type (e.g., DataExtension, TriggeredSend)' },
              properties: { type: 'array', items: { type: 'string' }, description: 'Properties to retrieve' },
              filter: { type: 'object', description: 'Filter criteria for Retrieve' },
              objects: { type: 'array', description: 'Objects to create/update' },
              businessUnitId: { type: 'string' }
            },
            required: ['action', 'objectType']
          }
        },
        {
          name: 'mce_v1_validate_request',
          description: 'Validate email/journey creation request before execution',
          inputSchema: {
            type: 'object',
            properties: {
              request_type: { type: 'string', enum: ['email', 'journey', 'data_extension'] },
              request_body: { type: 'object', description: 'The request to validate' }
            },
            required: ['request_type', 'request_body']
          }
        }
      ]
    }));

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'mce_v1_health':
            return {
              content: [{
                type: 'text',
                text: `Health check OK: ${args.ping || 'pong'}`
              }]
            };

          case 'mce_v1_rest_request':
            return await this.handleRestRequest(args);

          case 'mce_v1_soap_request':
            return await this.handleSoapRequest(args);

          case 'mce_v1_validate_request':
            return await this.handleValidateRequest(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error in ${name}:`, error);
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}\n\nStack: ${error.stack}`
          }],
          isError: true
        };
      }
    });
  }

  async handleRestRequest(args) {
    const tokenInfo = await this.getAccessToken(args.businessUnitId);
    
    let url = `${tokenInfo.rest_instance_url}${args.path}`;
    
    if (args.query) {
      const params = new URLSearchParams(args.query);
      url += `?${params}`;
    }

    const response = await axios({
      method: args.method,
      url: url,
      headers: {
        'Authorization': `Bearer ${tokenInfo.access_token}`,
        'Content-Type': 'application/json'
      },
      data: args.body,
      validateStatus: () => true
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2)
      }]
    };
  }

  async handleSoapRequest(args) {
    const tokenInfo = await this.getAccessToken(args.businessUnitId);
    
    // Build SOAP envelope
    const soapEnvelope = this.buildSoapEnvelope(args, tokenInfo.access_token);
    
    const response = await axios.post(
      tokenInfo.soap_instance_url,
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml',
          'SOAPAction': args.action
        },
        validateStatus: () => true
      }
    );

    // Parse SOAP response
    const parsed = await parseXml(response.data);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(parsed, null, 2)
      }]
    };
  }

  buildSoapEnvelope(args, accessToken) {
    const { action, objectType, properties, filter, objects } = args;
    
    let body = '';
    
    switch (action) {
      case 'Retrieve':
        body = `<RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
          <RetrieveRequest>
            <ObjectType>${objectType}</ObjectType>
            ${properties ? properties.map(p => `<Properties>${p}</Properties>`).join('') : '<Properties>*</Properties>'}
            ${filter ? this.buildSoapFilter(filter) : ''}
          </RetrieveRequest>
        </RetrieveRequestMsg>`;
        break;
        
      case 'Create':
      case 'Update':
        body = `<${action}Request xmlns="http://exacttarget.com/wsdl/partnerAPI">
          ${objects.map(obj => `<Objects xsi:type="${objectType}">${this.objectToXml(obj)}</Objects>`).join('')}
        </${action}Request>`;
        break;
        
      case 'Delete':
        body = `<DeleteRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
          ${objects.map(obj => `<Objects xsi:type="${objectType}">${this.objectToXml(obj)}</Objects>`).join('')}
        </DeleteRequest>`;
        break;
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <a:Action s:mustUnderstand="1">${action}</a:Action>
    <a:To s:mustUnderstand="1">https://webservice.exacttarget.com/Service.asmx</a:To>
    <fueloauth xmlns="http://exacttarget.com">${accessToken}</fueloauth>
  </s:Header>
  <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    ${body}
  </s:Body>
</s:Envelope>`;
  }

  buildSoapFilter(filter) {
    return `<Filter xsi:type="SimpleFilterPart">
      <Property>${filter.property}</Property>
      <SimpleOperator>${filter.operator || 'equals'}</SimpleOperator>
      <Value>${filter.value}</Value>
    </Filter>`;
  }

  objectToXml(obj) {
    return Object.entries(obj).map(([key, value]) => {
      if (typeof value === 'object' && !Array.isArray(value)) {
        return `<${key}>${this.objectToXml(value)}</${key}>`;
      } else if (Array.isArray(value)) {
        return value.map(item => `<${key}>${typeof item === 'object' ? this.objectToXml(item) : item}</${key}>`).join('');
      }
      return `<${key}>${value}</${key}>`;
    }).join('');
  }

  async handleValidateRequest(args) {
    const { request_type, request_body } = args;
    const errors = [];
    const warnings = [];
    
    if (request_type === 'email') {
      // Check asset type
      if (!request_body.assetType) {
        errors.push('Missing assetType object');
      } else {
        if (request_body.assetType.id !== 207) {
          errors.push(`assetType.id must be 207, got ${request_body.assetType.id}`);
        }
        if (request_body.assetType.name !== 'templatebasedemail') {
          errors.push(`assetType.name must be "templatebasedemail", got "${request_body.assetType.name}"`);
        }
      }
      
      // Check views structure
      if (!request_body.views?.html?.slots) {
        errors.push('Missing views.html.slots structure');
      }
      
      // Check HTML template
      const html = request_body.views?.html?.content || '';
      if (!html.includes('<!DOCTYPE HTML')) {
        warnings.push('HTML should start with <!DOCTYPE HTML>');
      }
      if (!html.includes('data-type="slot"')) {
        errors.push('HTML template missing slot placeholders');
      }
    }
    
    const validation = {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendation: errors.length > 0 ? 'Review mce://guides/mce-editable-emails-llm for correct structure' : 'Request looks good'
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(validation, null, 2)
      }]
    };
  }

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

    const tokenUrl = `https://${subdomain}.auth.marketingcloudapis.com/v2/token`;
    const tokenData = {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    };

    if (businessUnitId) {
      tokenData.account_id = businessUnitId;
    }

    const response = await axios.post(tokenUrl, tokenData);
    
    const tokenInfo = {
      access_token: response.data.access_token,
      rest_instance_url: response.data.rest_instance_url,
      soap_instance_url: response.data.soap_instance_url,
      expires_in: response.data.expires_in,
      expiresAt: Date.now() + (response.data.expires_in - 60) * 1000
    };

    this.tokens.set(cacheKey, tokenInfo);
    return tokenInfo;
  }

  setupHTTPRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy',
        service: 'mcp-server',
        version: '3.0.0',
        resources_loaded: {
          guides: Object.keys(this.resources.guides).length,
          examples: Object.keys(this.resources.examples).length,
          components: Object.keys(this.resources.components).length,
          helpers: Object.keys(this.resources.helpers).length
        }
      });
    });

    this.app.get('/mcp/sse', async (req, res) => {
      console.log('SSE connection initiated');
      const transport = new SSEServerTransport('/mcp/sse', res);
      await this.mcpServer.connect(transport);
      
      req.on('close', () => {
        console.log('SSE connection closed');
      });
    });

    this.app.get('/resources', (req, res) => {
      res.json({
        guides: Object.keys(this.resources.guides),
        examples: Object.keys(this.resources.examples),
        components: Object.keys(this.resources.components),
        helpers: Object.keys(this.resources.helpers)
      });
    });
  }

  async start() {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`MCP Server v3.0 - Marketing Cloud Engagement`);
      console.log(`${'='.repeat(60)}`);
      console.log(`\nServer running on port ${port}`);
      console.log(`\nEndpoints:`);
      console.log(`  Health:     http://localhost:${port}/health`);
      console.log(`  MCP SSE:    http://localhost:${port}/mcp/sse`);
      console.log(`  Resources:  http://localhost:${port}/resources`);
      console.log(`\nResources loaded:`);
      console.log(`  Guides:     ${Object.keys(this.resources.guides).length}`);
      console.log(`  Examples:   ${Object.keys(this.resources.examples).length}`);
      console.log(`  Components: ${Object.keys(this.resources.components).length}`);
      console.log(`  Helpers:    ${Object.keys(this.resources.helpers).length}`);
      console.log(`\n${'='.repeat(60)}\n`);
    });
  }
}

async function main() {
  const server = new MarketingCloudMCPServer();
  
  if (process.argv.includes('--stdio')) {
    try {
      const transport = new StdioServerTransport();
      await server.mcpServer.connect(transport);
      console.error('MCP Server running in stdio mode for Claude Desktop');
    } catch (error) {
      console.error('Failed to start in stdio mode:', error);
      process.exit(1);
    }
  } else {
    server.start();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});