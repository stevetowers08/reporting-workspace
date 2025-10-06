#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { GoHighLevelClient } from './services/gohighlevel-client.js';

// Configuration schema
const ConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().url().optional(),
});

type Config = z.infer<typeof ConfigSchema>;

class GoHighLevelMCPServer {
  private server: Server;
  private client: GoHighLevelClient | null = null;
  private config: Config | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'gohighlevel-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'ghl_configure',
            description: 'Configure the GoHighLevel API connection',
            inputSchema: {
              type: 'object',
              properties: {
                apiKey: {
                  type: 'string',
                  description: 'GoHighLevel API key',
                },
                baseUrl: {
                  type: 'string',
                  description: 'Base URL for GoHighLevel API (optional)',
                },
              },
              required: ['apiKey'],
            },
          },
          {
            name: 'ghl_get_contacts',
            description: 'Get contacts from GoHighLevel',
            inputSchema: {
              type: 'object',
              properties: {
                locationId: {
                  type: 'string',
                  description: 'Location ID to fetch contacts from',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of contacts to return',
                  default: 100,
                },
                query: {
                  type: 'string',
                  description: 'Search query for contacts',
                },
              },
              required: ['locationId'],
            },
          },
          {
            name: 'ghl_get_contact',
            description: 'Get a specific contact by ID',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: {
                  type: 'string',
                  description: 'Contact ID to fetch',
                },
              },
              required: ['contactId'],
            },
          },
          {
            name: 'ghl_create_contact',
            description: 'Create a new contact in GoHighLevel',
            inputSchema: {
              type: 'object',
              properties: {
                locationId: {
                  type: 'string',
                  description: 'Location ID to create contact in',
                },
                firstName: {
                  type: 'string',
                  description: 'Contact first name',
                },
                lastName: {
                  type: 'string',
                  description: 'Contact last name',
                },
                email: {
                  type: 'string',
                  description: 'Contact email address',
                },
                phone: {
                  type: 'string',
                  description: 'Contact phone number',
                },
                companyName: {
                  type: 'string',
                  description: 'Contact company name',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Contact tags',
                },
              },
              required: ['locationId'],
            },
          },
          {
            name: 'ghl_update_contact',
            description: 'Update an existing contact',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: {
                  type: 'string',
                  description: 'Contact ID to update',
                },
                firstName: {
                  type: 'string',
                  description: 'Contact first name',
                },
                lastName: {
                  type: 'string',
                  description: 'Contact last name',
                },
                email: {
                  type: 'string',
                  description: 'Contact email address',
                },
                phone: {
                  type: 'string',
                  description: 'Contact phone number',
                },
                companyName: {
                  type: 'string',
                  description: 'Contact company name',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Contact tags',
                },
              },
              required: ['contactId'],
            },
          },
          {
            name: 'ghl_get_campaigns',
            description: 'Get campaigns from GoHighLevel',
            inputSchema: {
              type: 'object',
              properties: {
                locationId: {
                  type: 'string',
                  description: 'Location ID to fetch campaigns from',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of campaigns to return',
                  default: 100,
                },
                status: {
                  type: 'string',
                  description: 'Filter campaigns by status',
                },
              },
              required: ['locationId'],
            },
          },
          {
            name: 'ghl_get_opportunities',
            description: 'Get opportunities from GoHighLevel',
            inputSchema: {
              type: 'object',
              properties: {
                locationId: {
                  type: 'string',
                  description: 'Location ID to fetch opportunities from',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of opportunities to return',
                  default: 100,
                },
                contactId: {
                  type: 'string',
                  description: 'Filter opportunities by contact ID',
                },
                pipelineId: {
                  type: 'string',
                  description: 'Filter opportunities by pipeline ID',
                },
              },
              required: ['locationId'],
            },
          },
          {
            name: 'ghl_get_pipelines',
            description: 'Get pipelines from GoHighLevel',
            inputSchema: {
              type: 'object',
              properties: {
                locationId: {
                  type: 'string',
                  description: 'Location ID to fetch pipelines from',
                },
              },
              required: ['locationId'],
            },
          },
          {
            name: 'ghl_get_locations',
            description: 'Get all locations from GoHighLevel',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'ghl_get_webhooks',
            description: 'Get webhooks from GoHighLevel',
            inputSchema: {
              type: 'object',
              properties: {
                locationId: {
                  type: 'string',
                  description: 'Location ID to fetch webhooks from',
                },
              },
              required: ['locationId'],
            },
          },
        ] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'ghl_configure':
            return await this.handleConfigure(args);
          case 'ghl_get_contacts':
            return await this.handleGetContacts(args);
          case 'ghl_get_contact':
            return await this.handleGetContact(args);
          case 'ghl_create_contact':
            return await this.handleCreateContact(args);
          case 'ghl_update_contact':
            return await this.handleUpdateContact(args);
          case 'ghl_get_campaigns':
            return await this.handleGetCampaigns(args);
          case 'ghl_get_opportunities':
            return await this.handleGetOpportunities(args);
          case 'ghl_get_pipelines':
            return await this.handleGetPipelines(args);
          case 'ghl_get_locations':
            return await this.handleGetLocations(args);
          case 'ghl_get_webhooks':
            return await this.handleGetWebhooks(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private ensureClient() {
    if (!this.client) {
      throw new Error('GoHighLevel client not configured. Please call ghl_configure first.');
    }
  }

  private async handleConfigure(args: any) {
    this.config = ConfigSchema.parse(args);
    this.client = new GoHighLevelClient(this.config.apiKey, this.config.baseUrl);
    
    return {
      content: [
        {
          type: 'text',
          text: 'GoHighLevel client configured successfully',
        },
      ],
    };
  }

  private async handleGetContacts(args: any) {
    this.ensureClient();
    const { locationId, limit = 100, query } = args;
    const response = await this.client!.getContacts(locationId, { limit, query });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async handleGetContact(args: any) {
    this.ensureClient();
    const { contactId } = args;
    const response = await this.client!.getContact(contactId);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async handleCreateContact(args: any) {
    this.ensureClient();
    const { locationId, ...contactData } = args;
    const response = await this.client!.createContact(contactData, locationId);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async handleUpdateContact(args: any) {
    this.ensureClient();
    const { contactId, ...contactData } = args;
    const response = await this.client!.updateContact(contactId, contactData);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async handleGetCampaigns(args: any) {
    this.ensureClient();
    const { locationId, limit = 100, status } = args;
    const response = await this.client!.getCampaigns(locationId, { limit, status });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async handleGetOpportunities(args: any) {
    this.ensureClient();
    const { locationId, limit = 100, contactId, pipelineId } = args;
    const response = await this.client!.getOpportunities(locationId, { limit, contactId, pipelineId });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async handleGetPipelines(args: any) {
    this.ensureClient();
    const { locationId } = args;
    const response = await this.client!.getPipelines(locationId);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async handleGetLocations(args: any) {
    this.ensureClient();
    const response = await this.client!.getLocations();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async handleGetWebhooks(args: any) {
    this.ensureClient();
    const { locationId } = args;
    const response = await this.client!.getWebhooks(locationId);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GoHighLevel MCP server running on stdio');
  }
}

// Start the server
const server = new GoHighLevelMCPServer();
server.run().catch(console.error);
