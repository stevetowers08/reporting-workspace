# Marketing Analytics Dashboard

A comprehensive marketing analytics dashboard that integrates with Facebook Ads, Google Ads, and GoHighLevel APIs to provide unified reporting and analytics for marketing campaigns.

## Features

- **Multi-Platform Integration**: Connect Facebook Ads, Google Ads, and GoHighLevel accounts
- **Real-time Analytics**: View campaign performance metrics in real-time
- **Unified Dashboard**: Single interface for all your marketing data
- **Client Management**: Manage multiple clients and their marketing accounts
- **Export Capabilities**: Export reports and data in various formats
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd marketing-analytics-dashboard
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

The server interacts with the following GoHighLevel API 2.0 endpoints:

- **Contacts**: `POST /contacts/search` (primary method) or `GET /contacts?locationId={locationId}`
- **Calendars**: `GET /calendars/?locationId={locationId}`
- **Funnels**: `GET /funnels/funnel/list?locationId={locationId}`
- **Funnel Pages**: `GET /funnels/page?locationId={locationId}&funnelId={funnelId}`
- **Opportunities**: `POST /opportunities/search`
- **Locations**: `GET /locations` (via agency token)

### Authentication

All API requests use Bearer token authentication with `Version: 2021-07-28` header. Supports both agency-level private integration tokens and location-level OAuth tokens.

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