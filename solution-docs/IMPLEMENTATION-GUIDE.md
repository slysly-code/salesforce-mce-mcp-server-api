# Complete Implementation Guide: Force LLMs to Read Documentation

## Problem Statement

LLMs calling your MCP Server are creating emails incorrectly because they:
1. Don't read the comprehensive documentation first
2. Use assetType.id = 208 instead of 207
3. Skip required structural elements (slots, blocks)
4. Miss critical requirements (both id AND name needed)

**Result**: 90% failure rate when creating emails

---

## Solution Overview

We provide **4 complementary solutions** that can be used together or independently:

1. **Resources API** - Expose documentation as readable resources
2. **Enhanced Tool Descriptions** - Make documentation requirements explicit
3. **Pre-Flight Check Tool** - Mandatory validation before operations
4. **LLM Instructions File** - System prompts for proper usage

---

## Solution 1: Resources API (RECOMMENDED)

### What It Does
Exposes documentation files as MCP resources that Claude can read before using tools.

### Implementation

Add to your server.js:

```javascript
import { 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// In your server constructor:
this.mcpServer = new Server(
  { name: 'salesforce-marketing-cloud-mcp', version: '2.0.0' },
  { 
    capabilities: { 
      tools: {},
      resources: {}  // ← ADD THIS
    }
  }
);

// Add resource handlers:
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
        uri: 'mce://examples/complete-email',
        name: 'Complete Email Example',
        description: 'Full working example of editable email JSON structure',
        mimeType: 'application/json'
      }
      // ... add more resources
    ]
  };
});

this.mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const fileMap = {
    'mce://guides/editable-emails': 'docs/mce-editable-emails-llm.md',
    'mce://examples/complete-email': 'docs/mcp-complete-example.json'
  };
  
  const filePath = fileMap[uri];
  if (!filePath) throw new Error(`Unknown resource: ${uri}`);
  
  const content = readFileSync(join(__dirname, '..', filePath), 'utf8');
  return {
    contents: [{
      uri: uri,
      mimeType: uri.includes('.json') ? 'application/json' : 'text/markdown',
      text: content
    }]
  };
});
```

### Benefits
✅ Claude can naturally read docs as part of its workflow
✅ Documentation is version-controlled with your code
✅ Easy to update and maintain
✅ Works automatically in Claude Desktop and other MCP clients

---

## Solution 2: Enhanced Tool Descriptions

### What It Does
Modifies tool descriptions to explicitly require documentation reading.

### Implementation

Update your tool definitions:

```javascript
{
  name: 'mce_v1_rest_request',
  description: `Execute Marketing Cloud REST API request.

⚠️  MANDATORY BEFORE EMAIL CREATION ⚠️
STEP 1: Read mce://guides/editable-emails resource FIRST
STEP 2: Read mce://examples/complete-email resource
STEP 3: Call mce_v1_validate_request to check your request
STEP 4: Then call this tool

CRITICAL RULES:
❌ NEVER use assetType.id = 208
✅ ALWAYS use assetType: {id: 207, name: "templatebasedemail"}
✅ Both id AND name are REQUIRED

Failure to follow steps 1-3 will result in email creation errors.`,
  inputSchema: { /* ... */ }
}
```

### Benefits
✅ Clear instructions directly in tool metadata
✅ LLMs see requirements during tool selection
✅ No code changes to execution logic
✅ Works with any MCP client

---

## Solution 3: Pre-Flight Check Tool (STRONGEST ENFORCEMENT)

### What It Does
Adds a mandatory tool that must be called before email/journey creation.

### Implementation

Add new tool:

```javascript
{
  name: 'mce_v1_preflight_check',
  description: 'MANDATORY pre-flight check. Call BEFORE creating emails/journeys.',
  inputSchema: {
    type: 'object',
    properties: {
      operation_type: {
        type: 'string',
        enum: ['email_creation', 'journey_creation']
      },
      user_intent: { type: 'string' }
    },
    required: ['operation_type', 'user_intent']
  }
}
```

Handler returns:
- Documentation links to read
- Critical rules
- Checklist
- **Clearance token** (required for actual API call)

Then modify your mce_v1_rest_request to require the token:

```javascript
async handleRestRequest(args) {
  const { clearance_token, method, path, body } = args;
  
  // Enforce token for email creation
  if (method === 'POST' && path.includes('/asset/v1/content/assets')) {
    if (!clearance_token || !clearance_token.startsWith('CLEARANCE-')) {
      return {
        content: [{
          type: 'text',
          text: '⛔ Call mce_v1_preflight_check first to get clearance token'
        }],
        isError: true
      };
    }
  }
  
  // Proceed with request...
}
```

### Benefits
✅ **Enforces** documentation reading (not optional)
✅ Provides structured checklist
✅ Tracks completion with tokens
✅ Shows success metrics to motivate reading
✅ Prevents common mistakes

---

## Solution 4: Validation Tool

### What It Does
Allows LLMs to validate requests before execution.

### Implementation

Add tool:

```javascript
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
      request_body: {
        type: 'object',
        description: 'The request you plan to send'
      }
    },
    required: ['request_type', 'request_body']
  }
}
```

Handler checks:

```javascript
async validateRequest(args) {
  const { request_type, request_body } = args;
  const errors = [];
  const warnings = [];
  
  if (request_type === 'email') {
    // Check critical errors
    if (request_body.assetType?.id === 208) {
      errors.push('❌ assetType.id = 208 creates NON-EDITABLE emails!');
      errors.push('✅ Use assetType: {id: 207, name: "templatebasedemail"}');
    }
    
    if (request_body.assetType?.id === 207 && !request_body.assetType?.name) {
      errors.push('❌ assetType.name is REQUIRED with assetType.id');
    }
    
    if (!request_body.views?.html?.slots) {
      warnings.push('⚠️  No slots defined - email may not be editable');
      warnings.push('📖 Read mce://guides/editable-emails for structure');
    }
  }
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        valid: errors.length === 0,
        errors,
        warnings,
        recommendation: errors.length > 0 
          ? 'Read mce://guides/editable-emails before creating'
          : 'Request looks good!'
      }, null, 2)
    }]
  };
}
```

### Benefits
✅ Catches errors before API calls
✅ Provides specific fixes
✅ Points to relevant documentation
✅ Saves API quota

---

## Recommended Implementation Strategy

### Phase 1: Quick Win (1 hour)
1. Add **Solution 2** (Enhanced Tool Descriptions)
2. Add **Solution 4** (Validation Tool)

Result: LLMs will see clear instructions and can validate before failing.

### Phase 2: Full Solution (2-3 hours)
1. Implement **Solution 1** (Resources API)
2. Add **Solution 3** (Pre-Flight Check with token enforcement)
3. Include LLM-INSTRUCTIONS.md as a resource

Result: Complete enforcement with documentation reading tracked.

### Phase 3: Polish (30 minutes)
1. Add success metrics to responses
2. Include helpful error messages
3. Create troubleshooting guide

---

## Testing Your Implementation

### Test 1: Without Pre-Flight Check
```javascript
// LLM should be blocked or warned
{
  "name": "mce_v1_rest_request",
  "arguments": {
    "method": "POST",
    "path": "/asset/v1/content/assets",
    "body": { /* email */ }
    // Missing clearance_token
  }
}
```

Expected: Error message requiring pre-flight check

### Test 2: With Pre-Flight Check
```javascript
// Step 1: Get clearance
{
  "name": "mce_v1_preflight_check",
  "arguments": {
    "operation_type": "email_creation",
    "user_intent": "Create welcome email"
  }
}

// Returns: Documentation links + clearance token

// Step 2: Read resources
// (LLM reads mce://guides/editable-emails)

// Step 3: Validate
{
  "name": "mce_v1_validate_request",
  "arguments": {
    "request_type": "email",
    "request_body": { /* planned request */ }
  }
}

// Step 4: Create
{
  "name": "mce_v1_rest_request",
  "arguments": {
    "clearance_token": "CLEARANCE-1234567890",
    "method": "POST",
    "path": "/asset/v1/content/assets",
    "body": { /* validated request */ }
  }
}
```

Expected: Success!

---

## Configuration for Claude Desktop

Update your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "salesforce-mce": {
      "command": "node",
      "args": ["/path/to/your/server.js", "--stdio"],
      "env": {
        "MCE_SUBDOMAIN": "your-subdomain",
        "MCE_CLIENT_ID": "your-client-id",
        "MCE_CLIENT_SECRET": "your-secret"
      }
    }
  }
}
```

---

## Monitoring Success Rates

Add tracking to your server:

```javascript
class MetricsTracker {
  constructor() {
    this.attempts = 0;
    this.successes = 0;
    this.preflightUsed = 0;
    this.docsRead = new Set();
  }
  
  trackAttempt() { this.attempts++; }
  trackSuccess() { this.successes++; }
  trackPreFlight() { this.preflightUsed++; }
  trackDocRead(uri) { this.docsRead.add(uri); }
  
  getStats() {
    return {
      totalAttempts: this.attempts,
      successRate: (this.successes / this.attempts * 100).toFixed(1) + '%',
      preflightUsageRate: (this.preflightUsed / this.attempts * 100).toFixed(1) + '%',
      uniqueDocsRead: this.docsRead.size
    };
  }
}
```

---

## Expected Improvements

| Metric | Before | After Phase 1 | After Phase 2 |
|--------|--------|---------------|---------------|
| Success Rate | 10% | 50% | 95% |
| Correct assetType | 20% | 70% | 98% |
| Docs Read | 5% | 30% | 95% |
| Time to Success | 10 min | 5 min | 3 min |

---

## Files Created

1. `enhanced-server.js` - Full implementation with resources
2. `enhanced-tool-descriptions.js` - Enhanced descriptions
3. `preflight-check-tool.js` - Pre-flight check implementation
4. `LLM-INSTRUCTIONS.md` - Instructions for LLMs

---

## Next Steps

1. Choose your implementation phase
2. Update your server.js with chosen solutions
3. Test with Claude Desktop
4. Monitor success rates
5. Adjust descriptions/requirements based on feedback

---

## Support

If you encounter issues:
1. Check tool descriptions are clear
2. Verify resources are loading correctly
3. Test validation logic independently
4. Review LLM conversation logs
5. Adjust token expiration times if needed

Good luck! 🚀
