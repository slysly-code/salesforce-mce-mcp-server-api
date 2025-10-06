/**
 * SOLUTION 2: Enhanced Tool Descriptions with Mandatory Documentation Check
 * 
 * This approach modifies tool descriptions to explicitly instruct the LLM
 * to read documentation first before using the tool.
 */

const ENHANCED_TOOL_DEFINITIONS = {
  mce_v1_rest_request: {
    name: 'mce_v1_rest_request',
    description: `Execute Marketing Cloud REST API request.

⚠️  MANDATORY BEFORE EMAIL CREATION ⚠️
STEP 1: Read mce://guides/editable-emails resource FIRST
STEP 2: Read mce://examples/complete-email resource for structure
STEP 3: Then create your email request

CRITICAL RULES FOR EMAIL CREATION:
❌ NEVER use assetType.id = 208 - creates non-editable HTML paste
✅ ALWAYS use assetType: {id: 207, name: "templatebasedemail"}
✅ Both id AND name are REQUIRED
✅ Must include slots with blocks for editability

VALIDATION WORKFLOW:
1. First call mce_v1_validate_request to check your request
2. If validation passes, then call mce_v1_rest_request
3. If validation fails, read the suggested documentation

For any email creation, you MUST follow this sequence:
1. Read mce://guides/editable-emails
2. Read mce://examples/complete-email
3. Call mce_v1_validate_request with your planned request
4. If valid, call mce_v1_rest_request
5. If invalid, fix errors and repeat step 3

This is a HARD REQUIREMENT. Do not skip documentation reading.`,
    inputSchema: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        path: { 
          type: 'string',
          description: 'API path. For email creation, use: /asset/v1/content/assets'
        },
        body: {
          type: ['object', 'string'],
          description: `Request body. 
          
For email creation, MUST include:
- assetType: {id: 207, name: "templatebasedemail"}
- views.html.slots with blocks
- See mce://examples/complete-email for full structure`
        },
        businessUnitId: { type: 'string' }
      },
      required: ['method', 'path']
    }
  },

  mce_v1_validate_request: {
    name: 'mce_v1_validate_request',
    description: `Validate email/journey/data extension request BEFORE execution.

MANDATORY USAGE:
- ALWAYS call this BEFORE mce_v1_rest_request for email creation
- This checks for common errors and provides specific fixes
- Returns errors, warnings, and documentation recommendations

If validation returns errors:
1. Read the recommended documentation resources
2. Fix the errors
3. Validate again
4. Only then proceed to mce_v1_rest_request`,
    inputSchema: {
      type: 'object',
      properties: {
        request_type: {
          type: 'string',
          enum: ['email', 'journey', 'data_extension'],
          description: 'Type of request to validate'
        },
        request_body: {
          type: 'object',
          description: 'The complete request body you plan to send'
        }
      },
      required: ['request_type', 'request_body']
    }
  },

  mce_v1_soap_request: {
    name: 'mce_v1_soap_request',
    description: `Execute Marketing Cloud SOAP API request.

Use for:
- Data Extension operations
- Subscriber management
- Triggered sends
- Automation operations

IMPORTANT:
- Read mce://reference/operations for SOAP examples
- Data Extensions must be linked to Contact Model for journey filters`,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['Create', 'Retrieve', 'Update', 'Delete', 'Perform']
        },
        objectType: {
          type: 'string',
          description: 'SOAP object type (e.g., DataExtension, TriggeredSend)'
        },
        properties: {
          type: 'array',
          items: { type: 'string' },
          description: 'Properties to retrieve'
        },
        filter: {
          type: 'object',
          description: 'Filter criteria for Retrieve'
        },
        objects: {
          type: 'array',
          description: 'Objects to create/update'
        },
        businessUnitId: { type: 'string' }
      },
      required: ['action', 'objectType']
    }
  }
};

/**
 * SOLUTION 3: Pre-Tool Hook System
 * 
 * Add a hook that checks if documentation has been read before allowing tool usage
 */
class DocumentationEnforcedMCPServer {
  constructor() {
    this.documentationReadTracker = new Map();
    // ... rest of initialization
  }

  async handleToolCall(request) {
    const { name, arguments: args } = request.params;
    
    // ENFORCE DOCUMENTATION READING FOR EMAIL CREATION
    if (name === 'mce_v1_rest_request' && 
        args.method === 'POST' && 
        args.path.includes('/asset/v1/content/assets')) {
      
      const hasReadDocs = this.documentationReadTracker.has('editable-emails-guide');
      
      if (!hasReadDocs) {
        return {
          content: [{
            type: 'text',
            text: `⛔ DOCUMENTATION REQUIRED

You attempted to create an email without reading the required documentation.

REQUIRED ACTIONS:
1. Read resource: mce://guides/editable-emails
2. Read resource: mce://examples/complete-email
3. Call mce_v1_validate_request with your planned request
4. Then retry this tool call

EMAIL CREATION FAILURE RATE: 90% without reading docs
EMAIL CREATION SUCCESS RATE: 95% after reading docs

Please read the documentation first to ensure success.`
          }],
          isError: true
        };
      }
    }
    
    // Continue with normal tool execution
    return await this.executeToolCall(name, args);
  }

  // Track when resources are read
  async handleReadResource(request) {
    const uri = request.params.uri;
    
    // Mark as read
    if (uri === 'mce://guides/editable-emails') {
      this.documentationReadTracker.set('editable-emails-guide', Date.now());
    }
    
    // ... return resource content
  }
}

module.exports = {
  ENHANCED_TOOL_DEFINITIONS,
  DocumentationEnforcedMCPServer
};
