# Salesforce Marketing Cloud Engagement MCP Server

> **Use Marketing Cloud Engagement via LLM and Agents**

A Model Context Protocol (MCP) server that enables Large Language Models to interact with Salesforce Marketing Cloud Engagement through natural language. This proof-of-concept demonstrates that complex marketing automation tasks—from creating editable emails to building customer journeys—can be accomplished through conversational AI.

## What is MCP?

Model Context Protocol (MCP) is an open standard that allows AI assistants like Claude to securely connect to external data sources and tools. MCP servers expose capabilities (tools) and documentation (resources) that LLMs can use to perform tasks. This server makes MCE's REST and SOAP APIs accessible to LLMs through a structured, documented interface.

## Why This Matters

Marketing Cloud Engagement's API is powerful but complex. Creating a properly structured email requires understanding nested JSON structures, asset types, slots, blocks, and Content Builder's editing model. This server solves that complexity through:

1. **Pre-Flight Documentation System**: Enforces documentation reading before API calls, dramatically improving success rates
2. **Structured Validation**: Catches common errors before they reach the MCE API
3. **Natural Language Interface**: Marketers can create campaigns by describing what they want

The result: Complex MCE operations become as simple as "Create a welcome email with a hero image, intro text, and a call-to-action button."

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  User Interface Layer                               │
│  ├─ Claude Desktop (Development/Testing)            │
│  ├─ mce-email-chat (Web Chat Interface)             │
│  └─ Salesforce APEX (Super Prompt Integration)      │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  MCP Server (Dual Mode)                             │
│  ├─ stdio mode → Claude Desktop                     │
│  └─ HTTP mode  → Fly.io / Any HTTP deployment       │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  Pre-Flight & Validation System                     │
│  ├─ Mandatory documentation reading                 │
│  ├─ Clearance token enforcement                     │
│  ├─ Request validation before execution             │
│  └─ Error prevention with detailed feedback         │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  Salesforce Marketing Cloud Engagement              │
│  ├─ Content Builder (Email Assets)                  │
│  ├─ Journey Builder (Customer Journeys)             │
│  └─ Contact Builder (Data Extensions)               │
└─────────────────────────────────────────────────────┘
```

## Key Features

### Email Creation
- Creates **editable** emails with proper MCE structure (not HTML paste)
- Supports all block types: text, images, buttons, layouts, dynamic content
- Generated emails are fully editable in Content Builder GUI
- Automatic slot and block management

### Journey Builder
- Create multi-step customer journeys
- Support for email sends, wait periods, decision splits
- Engagement-based routing (opened/clicked logic)
- Path Optimizer for A/B testing

### Pre-Flight System
The technical breakthrough that makes this work:

1. **Mandatory Documentation Reading**: LLM must call pre-flight check first
2. **Clearance Token**: Email creation requires a time-limited token from pre-flight
3. **Comprehensive Documentation**: Single MASTER-GUIDE.md contains all patterns
4. **Validation Before Execution**: Catches errors before they hit MCE API

This system ensures LLMs understand MCE's structure before attempting API calls, preventing the most common mistakes that cause 90% of failures.

### Data Extensions
- Create and manage subscriber data
- Link to Contact Model for journey filtering
- Support for sendable data extensions

## Prerequisites

### Marketing Cloud Setup
1. **MCE Account** with API access
2. **Installed Package** in MCE with API Integration component
3. **API User Credentials**:
   - Client ID
   - Client Secret
   - Subdomain (e.g., `mc123456789`)
4. **Permissions**: API user needs full permissions for:
   - Email (Content Builder, Email Studio)
   - Automation (Journey Builder)
   - Contacts (Data Extensions, Contact Builder)

### Development Environment
- Node.js 18 or higher
- Git (for cloning repository)
- Text editor or IDE

### Optional
- Fly.io CLI (for cloud deployment)
- Claude Desktop (for local MCP testing)

## Quick Start

### Option 1: Claude Desktop (Development)

1. **Clone and install**:
```bash
git clone https://github.com/slysly-code/salesforce-mce-mcp-server-api.git
cd salesforce-mce-mcp-server-api
npm install
```

2. **Configure Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "salesforce-mce": {
      "command": "node",
      "args": ["/absolute/path/to/salesforce-mce-mcp-server-api/src/mcp-server.js"],
      "env": {
        "MCE_SUBDOMAIN": "your-subdomain",
        "MCE_CLIENT_ID": "your-client-id",
        "MCE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

3. **Restart Claude Desktop** - Server appears in MCP menu

4. **Test it**:
```
"Create a welcome email with a hero image and a call-to-action button"
```

### Option 2: HTTP Server (Production)

1. **Clone and install** (same as above)

2. **Create `.env` file**:
```env
MCE_SUBDOMAIN=your-subdomain
MCE_CLIENT_ID=your-client-id
MCE_CLIENT_SECRET=your-client-secret
PORT=8080
MODE=http
```

3. **Start server**:
```bash
npm start
# Or for HTTP mode specifically:
node src/http-server.js
```

4. **Test endpoints**:
```bash
# Health check
curl http://localhost:8080/health

# List documentation
curl http://localhost:8080/mce/v1/docs

# Pre-flight check
curl -X POST http://localhost:8080/mce/v1/preflight-check \
  -H "Content-Type: application/json" \
  -d '{"operation_type": "email_creation", "user_intent": "Create welcome email"}'
```

## Local Development Setup (Detailed)

### Windows (Git Bash)

```bash
# 1. Navigate to your projects folder
cd /c/projects

# 2. Clone repository
git clone https://github.com/slysly-code/salesforce-mce-mcp-server-api.git

# 3. Enter directory
cd salesforce-mce-mcp-server-api

# 4. Install dependencies
npm install

# 5. Copy environment template
cp .env.example .env

# 6. Edit .env with your credentials (use notepad or any editor)
notepad .env
# Add your MCE_SUBDOMAIN, MCE_CLIENT_ID, MCE_CLIENT_SECRET

# 7. Test the server in HTTP mode
node src/http-server.js

# 8. In another terminal, test the health endpoint
curl http://localhost:8080/health
```

### macOS/Linux

```bash
# 1. Navigate to your projects folder
cd ~/projects

# 2. Clone repository
git clone https://github.com/slysly-code/salesforce-mce-mcp-server-api.git

# 3. Enter directory
cd salesforce-mce-mcp-server-api

# 4. Install dependencies
npm install

# 5. Copy environment template
cp .env.example .env

# 6. Edit .env with your credentials
nano .env
# Or use your preferred editor: vim, code, etc.
# Add your MCE_SUBDOMAIN, MCE_CLIENT_ID, MCE_CLIENT_SECRET

# 7. Test the server in HTTP mode
node src/http-server.js

# 8. In another terminal, test the health endpoint
curl http://localhost:8080/health
```

### Verify Installation

```bash
# Check Node version (should be 18+)
node --version

# Check npm version
npm --version

# List installed packages
npm list --depth=0

# Test MCP mode (for Claude Desktop)
node src/mcp-server.js
# Should show: "🔵 MCP Server running in STDIO mode"
# Press Ctrl+C to exit

# Test HTTP mode
node src/http-server.js
# Should show: "🟢 HTTP Server running"
# Server will stay running, press Ctrl+C to stop
```

## Deployment

### Fly.io (Recommended)

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login to Fly.io
fly auth login

# 3. Launch app
fly launch --name your-mce-server

# 4. Set secrets
fly secrets set MCE_SUBDOMAIN=your-subdomain
fly secrets set MCE_CLIENT_ID=your-client-id
fly secrets set MCE_CLIENT_SECRET=your-client-secret

# 5. Deploy
fly deploy

# 6. Get your URL
fly status
# Your server: https://your-mce-server.fly.dev
```

### Docker (Any Platform)

```bash
# Build image
docker build -t mce-mcp-server .

# Run container
docker run -p 8080:8080 \
  -e MCE_SUBDOMAIN=your-subdomain \
  -e MCE_CLIENT_ID=your-client-id \
  -e MCE_CLIENT_SECRET=your-client-secret \
  mce-mcp-server
```

### Railway / Render / Heroku

All support Node.js deployments:

1. Connect GitHub repository
2. Set environment variables (MCE_SUBDOMAIN, MCE_CLIENT_ID, MCE_CLIENT_SECRET)
3. Deploy automatically on push

## Integration Examples

### With mce-email-chat

The [mce-email-chat](https://github.com/slysly-code/mce-email-chat) application provides a web-based chat interface that connects to this MCP server via HTTP API:

1. Deploy this MCP server to Fly.io (or any platform)
2. Configure mce-email-chat with your MCP server URL
3. Users chat with Claude through the web interface
4. Claude uses MCP tools to create emails and journeys in MCE

### With Salesforce APEX

APEX code can send super prompts to the chat app endpoint:

```apex
// Example: Trigger email creation from Salesforce
HttpRequest req = new HttpRequest();
req.setEndpoint('https://your-chat-app.fly.dev/api/chat');
req.setMethod('POST');
req.setHeader('Content-Type', 'application/json');

String prompt = 'Create a promotional email for Product X with 20% discount. ' +
                'Include hero image, product details, and CTA button.';

req.setBody(JSON.serialize(new Map<String, Object>{
    'message' => prompt,
    'context' => new Map<String, Object>{
        'campaign_id' => campaignId,
        'product_id' => productId
    }
}));

Http http = new Http();
HttpResponse res = http.send(req);
```

This enables marketing automation triggered directly from Salesforce workflows.

### Direct API Integration

```javascript
// Call MCP server directly from any application
const response = await fetch('https://your-mce-server.fly.dev/mce/v1/preflight-check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operation_type: 'email_creation',
    user_intent: 'Create welcome email with logo and CTA'
  })
});

const { clearanceToken } = await response.json();

// Use token to create email
const email = await fetch('https://your-mce-server.fly.dev/mce/v1/rest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clearance_token: clearanceToken,
    method: 'POST',
    path: '/asset/v1/content/assets',
    body: emailStructure
  })
});
```

## API Reference

### HTTP Endpoints

#### GET /health
Health check and metrics.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-17T10:00:00.000Z",
  "metrics": {
    "mode": "http",
    "uptime_seconds": 3600,
    "total_attempts": 45,
    "successful_calls": 43,
    "success_rate": "95.6%"
  }
}
```

#### GET /mce/v1/docs
List all available documentation resources.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "uri": "mce://master-guide",
      "name": "🔴 MASTER GUIDE - READ THIS FIRST",
      "description": "Complete guide with everything needed..."
    }
  ]
}
```

#### GET /mce/v1/docs/read?uri=mce://master-guide
Read specific documentation.

**Response**:
```json
{
  "success": true,
  "data": {
    "uri": "mce://master-guide",
    "content": "# MASTER GUIDE...",
    "mimeType": "text/markdown"
  }
}
```

#### POST /mce/v1/preflight-check
Mandatory pre-flight check before email/journey creation.

**Request**:
```json
{
  "operation_type": "email_creation",
  "user_intent": "Create promotional email"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "📚 REQUIRED READING...",
    "clearanceToken": "CLEARANCE-1234567890-abc123",
    "required_reading": [...]
  }
}
```

#### POST /mce/v1/validate
Validate request structure before execution.

**Request**:
```json
{
  "request_type": "email",
  "request_body": {
    "name": "My Email",
    "assetType": {"id": 207, "name": "templatebasedemail"},
    ...
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [],
    "recommendation": "✅ Request looks good!"
  }
}
```

#### POST /mce/v1/rest
Execute Marketing Cloud REST API request.

**Request**:
```json
{
  "clearance_token": "CLEARANCE-1234567890-abc123",
  "method": "POST",
  "path": "/asset/v1/content/assets",
  "body": { ... }
}
```

**Response**: MCE API response (varies by endpoint)

### MCP Tools (Claude Desktop)

When using with Claude Desktop, these tools are available:

- `mce_v1_preflight_check` - Mandatory before operations
- `mce_v1_read_documentation` - Access documentation
- `mce_v1_validate_request` - Validate before execution
- `mce_v1_rest_request` - Execute REST API calls
- `mce_v1_soap_request` - Execute SOAP API calls

## Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MCE_SUBDOMAIN` | Yes | Your MCE subdomain | `mc123456789` |
| `MCE_CLIENT_ID` | Yes | API Client ID from Installed Package | `abc123...` |
| `MCE_CLIENT_SECRET` | Yes | API Client Secret | `xyz789...` |
| `PORT` | No | HTTP server port | `8080` |
| `MODE` | No | Server mode (`mcp` or `http`) | `http` |
| `NODE_ENV` | No | Environment | `production` |

### Getting MCE API Credentials

1. Log into Marketing Cloud
2. Navigate to **Setup** → **Apps** → **Installed Packages**
3. Click **New** to create a package (or use existing)
4. Add **API Integration** component
5. Select permissions:
   - ✅ Email (Read, Write)
   - ✅ Automation (Read, Write)
   - ✅ Contacts (Read, Write)
   - ✅ Data Extensions (Read, Write)
6. Save and copy **Client ID** and **Client Secret**
7. Note your subdomain from the MCE URL: `https://mc123456789.auth.marketingcloudapis.com`

## How It Works: The Pre-Flight System

The key innovation is the mandatory pre-flight system:

### Without Pre-Flight (Traditional Approach)
```
User: "Create an email"
LLM: [Guesses structure, uses wrong assetType]
MCE API: Error 118077
Result: Non-editable email or failure
```

### With Pre-Flight (This Server)
```
User: "Create an email"
LLM: [Calls mce_v1_preflight_check]
Server: [Returns docs + clearance token]
LLM: [Reads mce://master-guide]
LLM: [Builds correct structure with assetType 207]
LLM: [Validates with mce_v1_validate_request]
LLM: [Creates email with clearance token]
MCE API: Success ✅
Result: Properly editable email
```

### Key Components

**1. Clearance Token**: Time-limited (30 min) token issued by pre-flight check. Email creation endpoints require this token, forcing LLMs to read documentation first.

**2. Documentation Resources**: Exposed via MCP resources API. The MASTER-GUIDE.md contains all patterns, examples, and rules in a single comprehensive document.

**3. Validation Tool**: Catches common mistakes before they reach MCE:
- Using assetType 208 (non-editable)
- Missing assetType.name
- Missing slots/blocks structure
- Invalid email structure

**4. Metrics Tracking**: Monitors success rates, pre-flight usage, documentation reads to validate the approach.

## Project Status

**Current State**: Proof of Concept

**What Works**:
- ✅ Email creation with full Content Builder editability
- ✅ Multi-block emails (hero, text, buttons, layouts)
- ✅ Journey Builder (basic journeys with email sends, waits, decisions)
- ✅ Data Extensions (tested, functional)
- ✅ Pre-flight documentation system
- ✅ Request validation
- ✅ Dual-mode operation (MCP + HTTP)

**What's Proven**:
- MCE can be effectively controlled via LLM conversations
- Complex marketing operations work through natural language
- Pre-flight system dramatically improves success rates
- Generated emails are properly structured and editable

**Extensibility**:
Any MCE API endpoint can be added easily by following existing patterns. The pre-flight system adapts to new operations by adding documentation.

## Use Cases

### For Marketers
- Create campaign emails through conversation
- Build customer journeys without technical knowledge
- Iterate designs by describing changes
- Generate variations for A/B testing

### For Developers
- Rapid prototyping of MCE campaigns
- Automated campaign generation from data
- Integration with Salesforce workflows
- Testing MCE API patterns

### For Organizations
- Democratize marketing automation
- Reduce time-to-market for campaigns
- Enable non-technical teams
- Document MCE best practices in code

## Technical Notes

### Token Caching
Access tokens are cached with automatic refresh 60 seconds before expiration. Cache is per business unit ID.

### Error Handling
- Comprehensive error messages with solutions
- Common mistake detection (wrong assetType, etc.)
- Validation before API calls to prevent failures

### Documentation System
- Single source of truth in MASTER-GUIDE.md
- Example JSON structures for all block types
- Lexicon mapping user phrases to technical implementations

### Dual-Mode Architecture
Same core logic serves both MCP (stdio) and HTTP modes. Mode is determined by `MODE` environment variable or CLI argument.

## Troubleshooting

### "CLEARANCE TOKEN REQUIRED" Error
You skipped the pre-flight check. Call `/mce/v1/preflight-check` first to get a token.

### "Email Not Editable in Content Builder"
Email was created with wrong structure. Ensure:
- `assetType: {id: 207, name: "templatebasedemail"}`
- Proper slots and blocks structure
- Read `mce://master-guide` for correct patterns

### "Token Expired" Error
Clearance tokens expire after 30 minutes. Run pre-flight check again.

### Connection Errors
- Verify MCE credentials in environment variables
- Check subdomain format (no `https://`, no `.auth...`)
- Confirm API user has required permissions

## Development

### File Structure
```
salesforce-mce-mcp-server-api/
├── src/
│   ├── complete-server-implementation.js  # Core server (dual-mode)
│   ├── mcp-server.js                      # MCP mode entry point
│   └── http-server.js                     # HTTP mode entry point
├── docs/
│   ├── FOR-LLMS/
│   │   └── MASTER-GUIDE.md                # Primary documentation
│   └── lexicon/
│       └── email-components.md            # Component mapping
├── package.json
├── Dockerfile
├── fly.toml
└── README.md
```

### Adding New Capabilities

1. Add documentation to `docs/FOR-LLMS/MASTER-GUIDE.md`
2. Add URI to `fileMap` in `getDocumentation()`
3. Update `listDocumentation()` with new resource
4. Add validation logic to `handleValidateRequest()` if needed
5. Test with Claude Desktop first
6. Deploy to production

## Contributing

This is a proof-of-concept project demonstrating MCE + LLM integration. Contributions welcome:

1. Fork the repository
2. Create a feature branch
3. Test thoroughly with real MCE account
4. Submit pull request with clear description

## License

MIT License - See LICENSE file for details

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/slysly-code/salesforce-mce-mcp-server-api/issues)
- **Documentation**: Read `docs/FOR-LLMS/MASTER-GUIDE.md` for technical details
- **Chat App**: [mce-email-chat](https://github.com/slysly-code/mce-email-chat) for web interface

## Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io/)
- Powered by [Anthropic Claude](https://www.anthropic.com/claude)
- Salesforce Marketing Cloud Engagement platform

---

**Status**: Proof of Concept | **Version**: 3.2.0 | **Last Updated**: October 2025
