#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * SOLUTION 1: Add Resources Support
 * This allows Claude to read documentation files before calling tools
 */
class EnhancedMarketingCloudMCPServer {
  constructor() {
    this.mcpServer = new Server(
      {
        name: 'salesforce-marketing-cloud-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {}  // ← ADD THIS!
        },
      }
    );
    
    this.setupResourceHandlers();
    this.setupToolHandlers();
  }

  /**
   * NEW: Resource handlers expose documentation
   */
  setupResourceHandlers() {
    // List available documentation
    this.mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'mce://guides/editable-emails',
            name: 'Editable Email Creation Guide',
            description: 'CRITICAL: How to create editable emails with assetType.id = 207',
            mimeType: 'text/markdown'
          },
          {
            uri: 'mce://guides/journey-builder',
            name: 'Journey Builder Guide',
            description: 'Complete guide for creating journeys with all activity types',
            mimeType: 'text/markdown'
          },
          {
            uri: 'mce://guides/email-components',
            name: 'Email Components Lexicon',
            description: 'Maps user phrases to technical implementations',
            mimeType: 'text/markdown'
          },
          {
            uri: 'mce://guides/dynamic-content',
            name: 'Dynamic Content Guide',
            description: 'How to create AMPscript-based dynamic content blocks',
            mimeType: 'text/markdown'
          },
          {
            uri: 'mce://examples/complete-email',
            name: 'Complete Email Example',
            description: 'Full working example of editable email JSON structure',
            mimeType: 'application/json'
          },
          {
            uri: 'mce://examples/hero-image',
            name: 'Hero Image Block Example',
            description: 'Example of imageblock (assetType.id: 199)',
            mimeType: 'application/json'
          },
          {
            uri: 'mce://examples/text-block',
            name: 'Text Block Example',
            description: 'Example of textblock (assetType.id: 196)',
            mimeType: 'application/json'
          },
          {
            uri: 'mce://examples/button-block',
            name: 'Button Block Example',
            description: 'Example of buttonblock (assetType.id: 195)',
            mimeType: 'application/json'
          },
          {
            uri: 'mce://reference/operations',
            name: 'Complete Operations Guide',
            description: 'All MCE operations with examples and error solutions',
            mimeType: 'application/json'
          }
        ]
      };
    });

    // Read documentation content
    this.mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      
      // Map URIs to file paths
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

      try {
        const fullPath = join(__dirname, '..', filePath);
        const content = readFileSync(fullPath, 'utf8');
        
        return {
          contents: [{
            uri: uri,
            mimeType: uri.includes('.json') ? 'application/json' : 'text/markdown',
            text: content
          }]
        };
      } catch (error) {
        throw new Error(`Failed to read resource: ${error.message}`);
      }
    });
  }

  setupToolHandlers() {
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'mce_v1_rest_request',
          description: `Execute Marketing Cloud REST API request.

CRITICAL FOR EMAIL CREATION:
- ALWAYS use assetType: {id: 207, name: "templatebasedemail"} for editable emails
- NEVER use assetType.id = 208 (creates non-editable HTML paste)
- Read mce://guides/editable-emails first for complete structure
- Both assetType.id AND assetType.name are REQUIRED`,
          inputSchema: {
            type: 'object',
            properties: {
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              },
              path: {
                type: 'string',
                description: 'API path under REST base URL',
              },
              query: {
                type: 'object',
                description: 'Query parameters',
              },
              body: {
                type: ['object', 'string'],
                description: 'Request body',
              },
              businessUnitId: {
                type: 'string',
                description: 'Business unit MID',
              },
            },
            required: ['method', 'path'],
          },
        },
        {
          name: 'mce_v1_validate_request',
          description: 'Validate email/journey creation request before execution',
          inputSchema: {
            type: 'object',
            properties: {
              request_type: {
                type: 'string',
                enum: ['email', 'journey', 'data_extension'],
              },
              request_body: {
                type: 'object',
                description: 'The request to validate',
              },
            },
            required: ['request_type', 'request_body'],
          },
        },
        // ... other tools
      ],
    }));

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'mce_v1_rest_request':
            return await this.handleRestRequest(args);
            
          case 'mce_v1_validate_request':
            return await this.validateRequest(args);
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
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

  async validateRequest(args) {
    const { request_type, request_body } = args;
    const errors = [];
    const warnings = [];

    if (request_type === 'email') {
      // Validate email creation
      if (request_body.assetType?.id === 208) {
        errors.push('CRITICAL ERROR: assetType.id = 208 creates NON-EDITABLE HTML paste emails!');
        errors.push('SOLUTION: Use assetType: {id: 207, name: "templatebasedemail"}');
      }

      if (request_body.assetType?.id === 207 && !request_body.assetType?.name) {
        errors.push('ERROR: assetType.name is REQUIRED along with assetType.id');
        errors.push('SOLUTION: Use assetType: {id: 207, name: "templatebasedemail"}');
      }

      if (!request_body.views?.html?.slots) {
        warnings.push('WARNING: No slots defined. Email may not be editable in Content Builder.');
        warnings.push('TIP: Read mce://guides/editable-emails for proper structure');
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          valid: errors.length === 0,
          errors: errors,
          warnings: warnings,
          recommendation: errors.length > 0 
            ? 'Read mce://guides/editable-emails before creating the email'
            : 'Request looks good!'
        }, null, 2)
      }]
    };
  }

  async handleRestRequest(args) {
    // Your existing REST request implementation
    // ...
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    console.error('Enhanced MCP Server running with documentation resources');
  }
}

// Start the server
const server = new EnhancedMarketingCloudMCPServer();
server.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
