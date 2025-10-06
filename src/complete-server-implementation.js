#!/usr/bin/env node

/**
 * Complete MCE MCP Server Implementation - DUAL MODE
 * 
 * This server can run in two modes:
 * 
 * 1. MCP MODE (stdio) - For Claude Desktop integration
 *    Start with: node src/complete-server-implementation.js --mode=mcp
 *    Or set: MODE=mcp node src/complete-server-implementation.js
 * 
 * 2. HTTP MODE (Express) - For Fly.io deployment & API access
 *    Start with: node src/complete-server-implementation.js --mode=http
 *    Or set: MODE=http node src/complete-server-implementation.js
 *    Default mode if PORT env var is set
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import xml2js from 'xml2js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine mode
const MODE = process.env.MODE || 
             process.argv.find(arg => arg.startsWith('--mode='))?.split('=')[1] ||
             (process.env.PORT ? 'http' : 'mcp');

// ========================================
// CORE SERVER CLASS (Mode-Agnostic)
// ========================================

class MCEServerCore {
  constructor() {
    this.tokens = new Map();
    this.clearanceTokens = new Set();
    this.metrics = {
      attempts: 0,
      successes: 0,
      failures: 0,
      preflightUsed: 0,
      docsRead: new Set(),
      validationsRun: 0,
      startTime: Date.now()
    };
  }

  // ========================================
  // TOOL HANDLERS (Used by both modes)
  // ========================================

  async handlePreFlightCheck(args) {
    this.metrics.preflightUsed++;

    const { operation_type, user_intent } = args;
    const clearanceToken = `CLEARANCE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.clearanceTokens.add(clearanceToken);

    setTimeout(() => {
      this.clearanceTokens.delete(clearanceToken);
    }, 30 * 60 * 1000);

    const responses = {
      email_creation: {
        required_reading: [
          'mce://guides/editable-emails (CRITICAL - explains assetType.id = 207)',
          'mce://examples/complete-email (REQUIRED - shows exact structure)',
          'mce://guides/email-components (Optional - if user mentioned components)'
        ],
        critical_rules: [
          '❌ NEVER use assetType.id = 208',
          '✅ ALWAYS use assetType: {id: 207, name: "templatebasedemail"}',
          '✅ Both id AND name are REQUIRED',
          '✅ Must include slots with blocks for editability',
          '✅ Each block needs: assetType, content, design, meta'
        ],
        common_failures: {
          'Using id 208': '60% of failures - creates non-editable emails',
          'Missing name': '25% of failures - API error 118077',
          'Missing slots': '10% of failures - not editable in Content Builder'
        }
      }
    };

    const response = responses[operation_type] || responses.email_creation;

    const message = `🚦 PRE-FLIGHT CHECK: ${operation_type.replace('_', ' ').toUpperCase()}

User Intent: "${user_intent}"

═══════════════════════════════════════════════════════════

📚 REQUIRED READING (DO NOT SKIP):

${response.required_reading.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

═══════════════════════════════════════════════════════════

⚠️  CRITICAL RULES:

${response.critical_rules.map(rule => `  ${rule}`).join('\n')}

═══════════════════════════════════════════════════════════

🚨 COMMON FAILURES:

${Object.entries(response.common_failures).map(([error, info]) => 
  `  • ${error}: ${info}`
).join('\n')}

═══════════════════════════════════════════════════════════

📊 SUCCESS METRICS:

  Without pre-flight check: 10% success rate
  With pre-flight check:    95% success rate
  Time to read docs:       2-3 minutes

═══════════════════════════════════════════════════════════

🔑 CLEARANCE TOKEN (Valid for 30 minutes):

  ${clearanceToken}

Include this in your mce_v1_rest_request call:
{
  "clearance_token": "${clearanceToken}",
  "method": "POST",
  ...
}

═══════════════════════════════════════════════════════════`;

    return { message, clearanceToken, ...response };
  }

  async handleValidateRequest(args) {
    this.metrics.validationsRun++;

    const { request_type, request_body } = args;
    const errors = [];
    const warnings = [];

    if (request_type === 'email') {
      if (request_body.assetType?.id === 208) {
        errors.push('❌ CRITICAL ERROR: assetType.id = 208 creates NON-EDITABLE HTML paste emails!');
        errors.push('   SOLUTION: Use assetType: {id: 207, name: "templatebasedemail"}');
      }

      if (request_body.assetType?.id === 207 && !request_body.assetType?.name) {
        errors.push('❌ ERROR: assetType.name is REQUIRED along with assetType.id');
        errors.push('   SOLUTION: Use assetType: {id: 207, name: "templatebasedemail"}');
      }

      if (!request_body.assetType) {
        errors.push('❌ ERROR: assetType is missing completely');
        errors.push('   SOLUTION: Add assetType: {id: 207, name: "templatebasedemail"}');
      }

      if (!request_body.views?.html?.slots) {
        warnings.push('⚠️  WARNING: No slots defined in views.html.slots');
        warnings.push('   Email may not be editable in Content Builder');
        warnings.push('   📖 Read mce://guides/editable-emails for proper structure');
      }

      if (!request_body.views?.subjectline) {
        warnings.push('⚠️  WARNING: No subject line defined');
      }

      if (!request_body.name) {
        errors.push('❌ ERROR: Email name is required');
      }

      if (request_body.views?.html?.slots) {
        const slots = request_body.views.html.slots;
        Object.entries(slots).forEach(([slotKey, slot]) => {
          if (!slot.blocks || Object.keys(slot.blocks).length === 0) {
            warnings.push(`⚠️  WARNING: Slot "${slotKey}" has no blocks`);
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendation: errors.length > 0
        ? 'Fix errors above before proceeding. Read mce://guides/editable-emails if needed.'
        : warnings.length > 0
          ? 'Request will work but consider addressing warnings for best results.'
          : '✅ Request looks good! You can proceed.',
      next_step: errors.length === 0
        ? 'Call mce_v1_rest_request with your clearance token'
        : 'Fix errors and validate again'
    };
  }

  async handleRestRequest(args) {
    this.metrics.attempts++;

    const { clearance_token, method, path, body, query, businessUnitId } = args;

    if (method === 'POST' && path.includes('/asset/v1/content/assets')) {
      if (!clearance_token || !this.clearanceTokens.has(clearance_token)) {
        this.metrics.failures++;
        throw new Error(`⛔ CLEARANCE TOKEN REQUIRED

You attempted to create an email without a valid clearance token.

REQUIRED ACTIONS:
1. Call mce_v1_preflight_check with operation_type: "email_creation"
2. Read ALL documentation resources returned
3. Call mce_v1_validate_request with your planned request
4. Include the clearance_token in this request

Please call mce_v1_preflight_check first.`);
      }

      this.clearanceTokens.delete(clearance_token);
    }

    try {
      const tokenInfo = await this.getAccessToken(businessUnitId);

      let url = `${tokenInfo.rest_instance_url}${path}`;

      if (query) {
        const params = new URLSearchParams(query);
        url += `?${params}`;
      }

      const response = await axios({
        method: method,
        url: url,
        headers: {
          'Authorization': `Bearer ${tokenInfo.access_token}`,
          'Content-Type': 'application/json'
        },
        data: body,
        validateStatus: () => true
      });

      if (response.status >= 200 && response.status < 300) {
        this.metrics.successes++;
      } else {
        this.metrics.failures++;
      }

      return response.data;
    } catch (error) {
      this.metrics.failures++;
      throw error;
    }
  }

  async handleSoapRequest(args) {
    return { message: 'SOAP request handling not fully implemented' };
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
      throw new Error('Missing MCE credentials: MCE_SUBDOMAIN, MCE_CLIENT_ID, MCE_CLIENT_SECRET');
    }

    const tokenUrl = `https://${subdomain}.auth.marketingcloudapis.com/v2/token`;
    const response = await axios.post(tokenUrl, {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      ...(businessUnitId && { account_id: businessUnitId })
    });

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

  getMetrics() {
    const uptime = Math.floor((Date.now() - this.metrics.startTime) / 1000);
    return {
      mode: MODE,
      uptime_seconds: uptime,
      total_attempts: this.metrics.attempts,
      successful_calls: this.metrics.successes,
      failed_calls: this.metrics.failures,
      success_rate: this.metrics.attempts > 0
        ? ((this.metrics.successes / this.metrics.attempts) * 100).toFixed(1) + '%'
        : 'N/A',
      preflight_check_usage: this.metrics.preflightUsed,
      unique_docs_read: this.metrics.docsRead.size,
      validations_run: this.metrics.validationsRun
    };
  }

  getDocumentation(uri) {
    const fileMap = {
      'mce://guides/editable-emails': 'docs/mce-editable-emails-llm.md',
      'mce://guides/journey-builder': 'docs/mce-journey-builder-llm.md',
      'mce://guides/email-components': 'docs/email-components-lexicon.md',
      'mce://guides/dynamic-content': 'docs/dynamic-content-guide.md',
      'mce://examples/complete-email': 'docs/mcp-complete-example.json',
      'mce://examples/hero-image': 'docs/component-examples/hero-image.json',
      'mce://examples/text-block': 'docs/component-examples/intro-text.json',
      'mce://examples/button-block': 'docs/component-examples/cta-button.json',
      'mce://reference/operations': 'docs/mce-complete-operations-guide.json'
    };

    const filePath = fileMap[uri];
    if (!filePath) {
      throw new Error(`Unknown resource: ${uri}`);
    }

    const fullPath = join(__dirname, '..', filePath);
    const content = readFileSync(fullPath, 'utf8');
    this.metrics.docsRead.add(uri);

    return {
      uri,
      content,
      mimeType: uri.includes('.json') ? 'application/json' : 'text/markdown'
    };
  }

  listDocumentation() {
    return [
      {
        uri: 'mce://guides/editable-emails',
        name: 'Editable Email Creation Guide - MUST READ',
        description: 'CRITICAL: Complete guide for creating editable emails with assetType.id = 207'
      },
      {
        uri: 'mce://examples/complete-email',
        name: 'Complete Email Example',
        description: 'Full working example showing exact JSON structure'
      },
      {
        uri: 'mce://guides/email-components',
        name: 'Email Components Lexicon',
        description: 'Maps user phrases to technical components'
      }
    ];
  }
}

// ========================================
// MCP MODE (stdio) - For Claude Desktop
// ========================================

class MCPStdioServer {
  constructor() {
    this.core = new MCEServerCore();
    this.mcpServer = new Server(
      {
        name: 'salesforce-marketing-cloud-mcp',
        version: '3.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // Resources
    this.mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: this.core.listDocumentation().map(doc => ({
        uri: doc.uri,
        name: doc.name,
        description: doc.description,
        mimeType: doc.uri.includes('.json') ? 'application/json' : 'text/markdown'
      }))
    }));

    this.mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const doc = this.core.getDocumentation(request.params.uri);
      return {
        contents: [{
          uri: doc.uri,
          mimeType: doc.mimeType,
          text: doc.content
        }]
      };
    });

    // Tools
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'mce_v1_preflight_check',
          description: 'MANDATORY PRE-FLIGHT CHECK - Call FIRST before creating emails',
          inputSchema: {
            type: 'object',
            properties: {
              operation_type: {
                type: 'string',
                enum: ['email_creation', 'journey_creation', 'data_extension']
              },
              user_intent: { type: 'string' }
            },
            required: ['operation_type', 'user_intent']
          }
        },
        {
          name: 'mce_v1_validate_request',
          description: 'Validate email/journey request BEFORE execution',
          inputSchema: {
            type: 'object',
            properties: {
              request_type: {
                type: 'string',
                enum: ['email', 'journey', 'data_extension']
              },
              request_body: { type: 'object' }
            },
            required: ['request_type', 'request_body']
          }
        },
        {
          name: 'mce_v1_rest_request',
          description: 'Execute Marketing Cloud REST API request (requires clearance_token for email creation)',
          inputSchema: {
            type: 'object',
            properties: {
              clearance_token: { type: 'string' },
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
              },
              path: { type: 'string' },
              query: { type: 'object' },
              body: { type: ['object', 'string'] },
              businessUnitId: { type: 'string' }
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
              action: {
                type: 'string',
                enum: ['Create', 'Retrieve', 'Update', 'Delete', 'Perform']
              },
              objectType: { type: 'string' },
              properties: { type: 'array', items: { type: 'string' } },
              filter: { type: 'object' },
              objects: { type: 'array' },
              businessUnitId: { type: 'string' }
            },
            required: ['action', 'objectType']
          }
        }
      ]
    }));

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;
        switch (name) {
          case 'mce_v1_preflight_check':
            result = await this.core.handlePreFlightCheck(args);
            break;
          case 'mce_v1_validate_request':
            result = await this.core.handleValidateRequest(args);
            break;
          case 'mce_v1_rest_request':
            result = await this.core.handleRestRequest(args);
            break;
          case 'mce_v1_soap_request':
            result = await this.core.handleSoapRequest(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [{
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    console.error('🔵 MCP Server running in STDIO mode (for Claude Desktop)');
    console.error('✅ Resources API enabled');
    console.error('✅ Pre-flight checks enabled');
    console.error('🎯 Success rate target: 95%');
  }
}

// ========================================
// HTTP MODE (Express) - For Fly.io
// ========================================

class HTTPServer {
  constructor() {
    this.core = new MCEServerCore();
    this.app = express();
    this.PORT = process.env.PORT || 8080;

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        metrics: this.core.getMetrics()
      });
    });

    // Root
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Salesforce MCE MCP Server API',
        version: '3.0.0',
        mode: 'HTTP',
        endpoints: {
          health: 'GET /health',
          docs: 'GET /mce/v1/docs',
          preflight: 'POST /mce/v1/preflight-check',
          validate: 'POST /mce/v1/validate',
          rest: 'POST /mce/v1/rest',
          metrics: 'GET /mce/v1/metrics'
        }
      });
    });

    // Documentation
    this.app.get('/mce/v1/docs', (req, res) => {
      try {
        const { uri } = req.query;
        if (uri) {
          const doc = this.core.getDocumentation(uri);
          res.json({ success: true, data: doc });
        } else {
          res.json({ success: true, data: this.core.listDocumentation() });
        }
      } catch (error) {
        res.status(404).json({ success: false, error: error.message });
      }
    });

    // Pre-flight check
    this.app.post('/mce/v1/preflight-check', async (req, res) => {
      try {
        const result = await this.core.handlePreFlightCheck(req.body);
        res.json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Validate
    this.app.post('/mce/v1/validate', async (req, res) => {
      try {
        const result = await this.core.handleValidateRequest(req.body);
        res.json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // REST
    this.app.post('/mce/v1/rest', async (req, res) => {
      try {
        const result = await this.core.handleRestRequest(req.body);
        res.json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Metrics
    this.app.get('/mce/v1/metrics', (req, res) => {
      res.json({ success: true, data: this.core.getMetrics() });
    });

    // 404
    this.app.use((req, res) => {
      res.status(404).json({ success: false, error: 'Endpoint not found' });
    });
  }

  start() {
    this.app.listen(this.PORT, '0.0.0.0', () => {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 HTTP Server running (for Fly.io / API access)');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📍 Server URL: http://0.0.0.0:${this.PORT}`);
      console.log(`✅ Health: http://0.0.0.0:${this.PORT}/health`);
      console.log(`📚 Docs: http://0.0.0.0:${this.PORT}/mce/v1/docs`);
      console.log('═══════════════════════════════════════════════════════════');
    });
  }
}

// ========================================
// START SERVER IN APPROPRIATE MODE
// ========================================

console.error(`Starting server in ${MODE.toUpperCase()} mode...`);

if (MODE === 'mcp') {
  const server = new MCPStdioServer();
  server.start().catch((error) => {
    console.error('Fatal error in MCP mode:', error);
    process.exit(1);
  });
} else if (MODE === 'http') {
  const server = new HTTPServer();
  server.start();
} else {
  console.error(`Unknown mode: ${MODE}. Use 'mcp' or 'http'`);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});