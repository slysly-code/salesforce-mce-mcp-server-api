# Salesforce MCE MCP Server API

HTTP API bridge that enables Salesforce Agentforce to interact with Marketing Cloud Engagement (MCE).

## 🚀 Features

- **Agentforce Integration**: Webhook endpoint for natural language marketing operations
- **Email Management**: Create, send, and manage marketing emails
- **Journey Builder**: Automate customer journeys (coming soon)
- **Data Extensions**: Manage customer data and segments
- **Campaign Analytics**: Track and report on campaign performance
- **Multi-Business Unit Support**: Handle multiple MCE business units
- **Secure Authentication**: API key and OAuth token management

## 📋 Prerequisites

- Node.js 18+ 
- Salesforce Marketing Cloud Engagement account
- MCE API credentials (Client ID, Client Secret)
- Salesforce org with Agentforce enabled (optional)
- Fly.io CLI for deployment (optional)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/salesforce-mce-mcp-server-api.git
   cd salesforce-mce-mcp-server-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your MCE credentials
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Marketing Cloud Credentials (Required)
MCE_SUBDOMAIN=your-subdomain
MCE_CLIENT_ID=your-client-id
MCE_CLIENT_SECRET=your-client-secret
MCE_DEFAULT_MID=your-business-unit-id

# Security (Required)
REQUIRE_AUTH=true
API_KEY=your-secure-api-key

# Server (Optional)
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

### Getting MCE Credentials

1. Log into Marketing Cloud
2. Go to **Setup** → **Apps** → **Installed Packages**
3. Create a new package or use existing
4. Add **API Integration** component
5. Grant necessary permissions (Email, Automation, Data Extensions, etc.)
6. Copy the Client ID and Client Secret

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### Agentforce Webhook
```bash
POST /agentforce/webhook
Headers: X-API-Key: your-api-key
Body: {
  "action": "create_email",
  "parameters": {...},
  "context": {...}
}
```

### Email Operations
```bash
# Create email
POST /api/email/create

# Send email
POST /api/email/send

# List emails
GET /api/email/list
```

### Direct MCE API Access
```bash
# REST API proxy
POST /api/rest

# SOAP API proxy
POST /api/soap
```

## 🤖 Agentforce Integration

### 1. Deploy to Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch --name your-app-name

# Set secrets
fly secrets set MCE_SUBDOMAIN=your-subdomain
fly secrets set MCE_CLIENT_ID=your-client-id
fly secrets set MCE_CLIENT_SECRET=your-client-secret
fly secrets set API_KEY=your-api-key

# Deploy
fly deploy
```

### 2. Configure Agentforce

In Salesforce Setup:

1. **Create External Service**
   - Go to Setup → Integrations → External Services
   - Add endpoint: `https://your-app.fly.dev/agentforce/webhook`
   - Add header: `X-API-Key: your-api-key`

2. **Create Agent Action**
   - Go to Setup → Einstein → Agentforce
   - Create action using the external service
   - Map parameters to email creation fields

3. **Train Agent**
   - Add sample prompts:
     - "Create a welcome email for new subscribers"
     - "Send promotional email with 20% discount"
     - "Schedule newsletter for tomorrow at 10 AM"

## 🧪 Testing

### Test with cURL

```bash
# Health check
curl http://localhost:3000/health

# Create email
curl -X POST http://localhost:3000/api/email/create \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Email",
    "subject": "Test Subject",
    "template": "welcome",
    "content": {
      "headline": "Welcome!",
      "message": "Thanks for joining us!"
    }
  }'
```

### Test Agentforce Webhook

```bash
curl -X POST http://localhost:3000/agentforce/webhook \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_email",
    "parameters": {
      "name": "Welcome Email",
      "subject": "Welcome to Our Service",
      "template": "welcome"
    },
    "context": {
      "userId": "test-user",
      "orgId": "test-org"
    }
  }'
```

## 📊 Monitoring

### View Logs

```bash
# Local
npm run dev

# Fly.io
fly logs -f

# Check status
fly status
```

### Metrics Endpoint

The API tracks basic metrics accessible at:
```bash
GET /api/metrics
```

## 🚀 Deployment

### Fly.io (Recommended)

```bash
fly deploy
```

### Docker

```bash
docker build -t mce-api .
docker run -p 3000:3000 --env-file .env mce-api
```

### Other Platforms

- **Railway**: Connect GitHub repo for auto-deploy
- **Render**: Use render.yaml for configuration
- **Heroku**: Add Procfile with `web: node src/server.js`

## 📚 Documentation

- [API Documentation](docs/API.md)
- [Agentforce Setup Guide](docs/AGENTFORCE_SETUP.md)
- [MCE Operations](docs/MCE_OPERATIONS.md)

## 🛡️ Security

- API key authentication required
- Rate limiting enabled (100 requests/minute)
- CORS configured for Salesforce domains
- Environment variables for sensitive data
- Token caching with auto-refresh

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file

## 🆘 Support

- Create an issue in GitHub
- Check [documentation](docs/)
- Contact: your-email@example.com

## 🗺️ Roadmap

- [ ] Journey Builder integration
- [ ] Einstein AI features
- [ ] SMS and Push notifications
- [ ] Advanced personalization
- [ ] Batch operations
- [ ] Webhook subscriptions
- [ ] GraphQL endpoint

## 🙏 Acknowledgments

- Salesforce Marketing Cloud team
- Agentforce documentation
- MCP Server community