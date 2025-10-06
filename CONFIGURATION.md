# GoHighLevel MCP Server Configuration

This document explains how to configure and use the GoHighLevel MCP server.

## Prerequisites

- Node.js 18+ installed
- GoHighLevel account with API access
- Valid GoHighLevel API key

## Getting Your GoHighLevel API Key

1. **Log in to GoHighLevel**: Access your GoHighLevel dashboard
2. **Navigate to Settings**: Go to Settings > Integrations
3. **Create Private Integration**:
   - Click "Private Integrations"
   - Click "Create New Integration"
   - Give it a name (e.g., "MCP Server Integration")
   - Select the scopes you need:
     - `contacts.read`
     - `contacts.write`
     - `campaigns.read`
     - `opportunities.read`
     - `pipelines.read`
     - `webhooks.read`
     - `webhooks.write`
     - `locations.read`
4. **Copy the API Key**: Save the generated API key securely

## Configuration Options

### Environment Variables

Create a `.env` file in the project root:

```env
# Required
GHL_API_KEY=your_api_key_here

# Optional
GHL_BASE_URL=https://services.leadconnectorhq.com
NODE_ENV=development
```

### MCP Client Configuration

Add this to your MCP client configuration (e.g., `mcp-config.json`):

```json
{
  "mcpServers": {
    "gohighlevel": {
      "command": "node",
      "args": ["path/to/gohighlevel-mcp-server/dist/index.js"],
      "env": {
        "GHL_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Usage Examples

### 1. Configure the Connection

```javascript
// First, configure the API connection
await mcp.callTool('ghl_configure', {
  apiKey: 'your_api_key_here'
});
```

### 2. Get All Locations

```javascript
const locations = await mcp.callTool('ghl_get_locations', {});
console.log(locations);
```

### 3. Get Contacts from a Location

```javascript
const contacts = await mcp.callTool('ghl_get_contacts', {
  locationId: 'your_location_id',
  limit: 50,
  query: 'john@example.com'
});
```

### 4. Create a New Contact

```javascript
const newContact = await mcp.callTool('ghl_create_contact', {
  locationId: 'your_location_id',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  companyName: 'Acme Corp',
  tags: ['lead', 'hot']
});
```

### 5. Get Campaigns

```javascript
const campaigns = await mcp.callTool('ghl_get_campaigns', {
  locationId: 'your_location_id',
  status: 'active',
  limit: 100
});
```

### 6. Get Opportunities

```javascript
const opportunities = await mcp.callTool('ghl_get_opportunities', {
  locationId: 'your_location_id',
  contactId: 'contact_id_here',
  limit: 50
});
```

## Error Handling

The server handles various error scenarios:

### Authentication Errors
- **Invalid API Key**: Returns error if API key is missing or invalid
- **Expired Token**: Handles token expiration gracefully

### API Errors
- **Rate Limiting**: Automatically handles rate limit responses
- **Network Timeouts**: Configurable timeout handling
- **Invalid Parameters**: Validates input parameters

### Example Error Response
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Invalid API key provided"
    }
  ],
  "isError": true
}
```

## Security Considerations

1. **API Key Storage**: Never commit API keys to version control
2. **Environment Variables**: Use environment variables for sensitive data
3. **Network Security**: Ensure HTTPS connections to GoHighLevel API
4. **Access Control**: Limit API key permissions to minimum required scopes

## Troubleshooting

### Common Issues

1. **"Client not configured" Error**
   - Solution: Call `ghl_configure` before using other tools

2. **"Invalid location ID" Error**
   - Solution: Use `ghl_get_locations` to get valid location IDs

3. **"API key invalid" Error**
   - Solution: Verify your API key in GoHighLevel settings

4. **"Rate limit exceeded" Error**
   - Solution: Implement exponential backoff or reduce request frequency

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=gohighlevel-mcp:*
```

### Logs

The server logs important events to stderr:
- Connection status
- API request/response details
- Error messages
- Performance metrics

## Performance Optimization

1. **Batch Requests**: Use appropriate `limit` parameters
2. **Caching**: Implement client-side caching for frequently accessed data
3. **Pagination**: Use `startAfterId` for large datasets
4. **Connection Pooling**: The client reuses HTTP connections

## Rate Limits

GoHighLevel API has rate limits:
- **Standard Plan**: 1000 requests per hour
- **Professional Plan**: 5000 requests per hour
- **Enterprise Plan**: 10000 requests per hour

The server includes automatic retry logic with exponential backoff for rate limit errors.
