# GoHighLevel MCP Server

A Model Context Protocol (MCP) server for integrating with the GoHighLevel API. This server provides tools to interact with GoHighLevel's CRM, marketing automation, and lead management features.

## Features

- **Contact Management**: Create, read, update, and delete contacts
- **Campaign Management**: Retrieve campaign information and status
- **Opportunity Tracking**: Access sales opportunities and pipeline data
- **Pipeline Management**: Get pipeline and stage information
- **Webhook Management**: Manage webhooks for real-time updates
- **Location Management**: Access location and sub-account data

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd gohighlevel-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### Getting Your API Key

1. Log in to your GoHighLevel account
2. Navigate to **Settings** > **Integrations** > **Private Integrations**
3. Create a new private integration
4. Copy the generated API key

### Environment Setup

Create a `.env` file in the root directory:

```env
GHL_API_KEY=your_api_key_here
GHL_BASE_URL=https://services.leadconnectorhq.com
```

## Usage

### Running the Server

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

### Available Tools

#### Configuration
- `ghl_configure`: Configure the GoHighLevel API connection

#### Contacts
- `ghl_get_contacts`: Get contacts from a location
- `ghl_get_contact`: Get a specific contact by ID
- `ghl_create_contact`: Create a new contact
- `ghl_update_contact`: Update an existing contact

#### Campaigns
- `ghl_get_campaigns`: Get campaigns from a location

#### Opportunities
- `ghl_get_opportunities`: Get opportunities from a location

#### Pipelines
- `ghl_get_pipelines`: Get pipelines from a location

#### Locations
- `ghl_get_locations`: Get all locations

#### Webhooks
- `ghl_get_webhooks`: Get webhooks from a location

## API Reference

### GoHighLevel API Endpoints

The server interacts with the following GoHighLevel API endpoints:

- **Contacts**: `/contacts/location/{locationId}`
- **Campaigns**: `/campaigns/location/{locationId}`
- **Opportunities**: `/opportunities/location/{locationId}`
- **Pipelines**: `/pipelines/location/{locationId}`
- **Webhooks**: `/webhooks/location/{locationId}`
- **Locations**: `/locations`

### Authentication

All API requests use Bearer token authentication with your GoHighLevel API key.

## Error Handling

The server includes comprehensive error handling for:
- Invalid API keys
- Network timeouts
- API rate limits
- Invalid request parameters
- Server errors

## Development

### Project Structure

```
src/
├── index.ts                 # Main MCP server implementation
├── types/
│   └── gohighlevel.ts       # TypeScript type definitions
└── services/
    └── gohighlevel-client.ts # GoHighLevel API client
```

### Adding New Tools

To add new tools to the MCP server:

1. Add the tool definition to the `ListToolsRequestSchema` handler
2. Add a case in the `CallToolRequestSchema` handler
3. Implement the corresponding method in the `GoHighLevelClient` class
4. Add appropriate TypeScript types if needed

### Testing

```bash
npm test
```

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the GoHighLevel API documentation
2. Review the MCP server logs for error details
3. Ensure your API key has the necessary permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request