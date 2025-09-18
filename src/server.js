#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';  // ADD THIS

dotenv.config();  // ADD THIS

const parseXml = promisify(parseString);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load documentation files
let documentation = {};
const docFiles = ['mcp-documentation.json', 'journey-builder-examples.json', 'soap-examples.json'];

docFiles.forEach(file => {
  try {
    const filePath = join(__dirname, '..', 'docs', file);
    const content = JSON.parse(readFileSync(filePath, 'utf8'));
    const key = file.replace('.json', '').replace(/-/g, '_');
    documentation[key] = content;
    console.error(`✓ Loaded ${file}`);  // Use console.error for stdio mode
  } catch (error) {
    console.error(`✗ Could not load ${file}:`, error.message);  // Use console.error
  }
});


class MarketingCloudMCPServer {
  constructor() {
    // Create Express app for HTTP transport
    this.app = express();
    this.tokens = new Map();
    
    // Setup middleware
    this.app.use(cors({
      origin: '*', // Configure based on your security needs
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    this.app.use(express.json());
    
    // Initialize MCP Server
    this.mcpServer = new Server(
      {
        name: 'salesforce-marketing-cloud-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupMCPHandlers();
    this.setupHTTPRoutes();
  }

  setupMCPHandlers() {
    // Register MCP tool handlers
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'mce_v1_health',
          description: 'Health check tool',
          inputSchema: {
            type: 'object',
            properties: {
              ping: {
                type: 'string',
                default: 'pong',
              },
            },
          },
        },
        {
          name: 'mce_v1_rest_request',
          description: 'Generic REST request for Marketing Cloud',
          inputSchema: {
            type: 'object',
            properties: {
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              },
              path: {
                type: 'string',
                description: 'Path under REST base',
              },
              query: {
                type: 'object',
              },
              body: {
                type: ['object', 'string'],
              },
              businessUnitId: {
                type: 'string',
              },
            },
            required: ['method', 'path'],
          },
        },
        {
          name: 'mce_v1_soap_request',
          description: 'Generic SOAP request for Marketing Cloud',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['Create', 'Retrieve', 'Update', 'Delete'],
              },
              objectType: {
                type: 'string',
              },
              properties: {
                type: 'array',
                items: { type: 'string' },
              },
              filter: {
                type: 'object',
              },
              objects: {
                type: 'array',
              },
              businessUnitId: {
                type: 'string',
              },
            },
            required: ['action', 'objectType'],
          },
        },
        {
          name: 'mce_v1_build_email',
          description: 'Build complex emails with sections and layouts',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Email name',
              },
              subject: {
                type: 'string',
                description: 'Email subject',
              },
              nlpCommand: {
                type: 'string',
                description: 'Natural language command to build email',
              },
              sections: {
                type: 'array',
                description: 'Email sections with layouts',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['standard', 'two-column', 'three-column'],
                    },
                    content: {
                      type: 'array',
                    },
                  },
                },
              },
              template: {
                type: 'string',
                enum: ['custom', 'welcome', 'newsletter', 'promotional'],
              },
            },
            required: ['name', 'subject'],
          },
        },
        {
          name: 'mce_v1_documentation',
          description: 'Get MCE documentation and examples',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'mce_v1_health':
            return {
              content: [
                {
                  type: 'text',
                  text: `Health check OK: ${args.ping || 'pong'}`,
                },
              ],
            };

          case 'mce_v1_rest_request':
            return await this.handleRestRequest(args);

          case 'mce_v1_soap_request':
            return await this.handleSoapRequest(args);

          case 'mce_v1_build_email':
            return await this.handleBuildEmail(args);

          case 'mce_v1_documentation':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(documentation, null, 2),
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error in ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  setupHTTPRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'mcp-http-server',
        transport: 'HTTP/SSE',
        version: '2.0.0'
      });
    });

    // MCP SSE endpoint for streaming
    this.app.get('/mcp/sse', async (req, res) => {
      console.log('SSE connection initiated');
      const transport = new SSEServerTransport('/mcp/sse', res);
      await this.mcpServer.connect(transport);
      
      // Keep connection alive
      req.on('close', () => {
        console.log('SSE connection closed');
      });
    });

    // Direct tool execution endpoint (non-MCP)
    this.app.post('/api/tool/:toolName', async (req, res) => {
      try {
        const { toolName } = req.params;
        const args = req.body;
        
        let result;
        switch (toolName) {
          case 'build_email':
            result = await this.handleBuildEmail(args);
            break;
          case 'rest_request':
            result = await this.handleRestRequest(args);
            break;
          case 'soap_request':
            result = await this.handleSoapRequest(args);
            break;
          default:
            return res.status(404).json({ error: `Unknown tool: ${toolName}` });
        }
        
        res.json({
          success: true,
          result: result.content[0].text
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // List available tools
    this.app.get('/api/tools', (req, res) => {
      res.json({
        tools: [
          {
            name: 'build_email',
            description: 'Build complex marketing emails',
            endpoint: '/api/tool/build_email'
          },
          {
            name: 'rest_request',
            description: 'Execute MCE REST API request',
            endpoint: '/api/tool/rest_request'
          },
          {
            name: 'soap_request',
            description: 'Execute MCE SOAP API request',
            endpoint: '/api/tool/soap_request'
          }
        ]
      });
    });
  }

  async handleBuildEmail(args) {
    try {
      // If natural language command provided, parse it
      if (args.nlpCommand) {
        const emailStructure = await this.parseNLPCommand(args.nlpCommand);
        args = { ...args, ...emailStructure };
      }

      // Build email with MCE
      const tokenInfo = await this.getAccessToken(args.businessUnitId);
      
      // Build HTML from sections
      const htmlContent = this.buildHTMLFromSections(args.sections || []);
      
      const emailPayload = {
        name: args.name,
        channels: {
          email: true
        },
        views: {
          html: {
            content: htmlContent
          },
          subjectline: {
            content: args.subject
          }
        },
        assetType: {
          name: 'htmlemail',
          id: 208
        }
      };

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

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              emailId: response.data.id,
              name: response.data.name,
              message: `Email created successfully with ID: ${response.data.id}`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw error;
    }
  }

  async parseNLPCommand(command) {
    // Parse natural language to extract email structure
    // This is a simplified example - you could integrate with Claude/GPT here
    const structure = {
      sections: []
    };

    // Detect column layouts
    if (command.includes('three-column') || command.includes('3-column')) {
      structure.sections.push({
        type: 'three-column',
        content: []
      });
    } else if (command.includes('two-column') || command.includes('2-column')) {
      structure.sections.push({
        type: 'two-column',
        content: []
      });
    }

    // Detect content types
    if (command.includes('hero')) {
      structure.sections.unshift({
        type: 'standard',
        content: [{
          blockType: 'image',
          data: { src: 'hero-image.jpg', alt: 'Hero Image' }
        }]
      });
    }

    if (command.includes('button')) {
      structure.sections.push({
        type: 'standard',
        content: [{
          blockType: 'button',
          data: { text: 'Call to Action', url: '#' }
        }]
      });
    }

    return structure;
  }

  buildHTMLFromSections(sections) {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .row { display: table; width: 100%; }
    .column { display: table-cell; padding: 10px; vertical-align: top; }
    .two-column .column { width: 50%; }
    .three-column .column { width: 33.33%; }
    .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">`;

    sections.forEach(section => {
      const columnClass = section.type === 'three-column' ? 'three-column' : 
                          section.type === 'two-column' ? 'two-column' : '';
      
      html += `<div class="row ${columnClass}">`;
      
      if (section.type === 'standard') {
        html += '<div class="column">';
        section.content.forEach(block => {
          html += this.renderContentBlock(block);
        });
        html += '</div>';
      } else {
        // Multi-column layout
        const columns = section.type === 'three-column' ? 3 : 2;
        for (let i = 0; i < columns; i++) {
          html += '<div class="column">';
          if (section.content[i]) {
            html += this.renderContentBlock(section.content[i]);
          }
          html += '</div>';
        }
      }
      
      html += '</div>';
    });

    html += `</div></body></html>`;
    return html;
  }

  renderContentBlock(block) {
    switch (block.blockType) {
      case 'text':
        return `<p>${block.data.text || ''}</p>`;
      case 'image':
        return `<img src="${block.data.src}" alt="${block.data.alt || ''}" style="width:100%;">`;
      case 'button':
        return `<a href="${block.data.url}" class="button">${block.data.text}</a>`;
      default:
        return '';
    }
  }

  async handleRestRequest(args) {
    try {
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
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data, null, 2)
          }
        ]
      };
    } catch (error) {
      throw error;
    }
  }

  async handleSoapRequest(args) {
    // Your existing SOAP implementation
    // ...
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
      throw new Error('Missing MCE credentials');
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

  async start() {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () => {
      console.log(`MCP HTTP Server running on port ${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
      console.log(`MCP SSE endpoint: http://localhost:${port}/mcp/sse`);
      console.log(`Direct API: http://localhost:${port}/api/tools`);
    });
  }
}

// Start the server in appropriate mode
async function main() {
  const server = new MarketingCloudMCPServer();
  
  if (process.argv.includes('--stdio')) {
    // Stdio mode for Claude Desktop
    try {
      const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
      const transport = new StdioServerTransport();
      await server.mcpServer.connect(transport);
      console.error('MCP Server running in stdio mode for Claude Desktop');
    } catch (error) {
      console.error('Failed to start in stdio mode:', error);
      process.exit(1);
    }
  } else {
    // HTTP mode for remote access
    server.start();
  }
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});