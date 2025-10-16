#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class _VercelComprehensiveServer {
  constructor() {
    this.server = new Server(
      {
        name: 'vercel-comprehensive-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Environment Variables
          {
            name: 'create_vercel_env_var',
            description: 'Create or update an environment variable in a Vercel project',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description: 'The Vercel project ID',
                },
                key: {
                  type: 'string',
                  description: 'Environment variable key',
                },
                value: {
                  type: 'string',
                  description: 'Environment variable value',
                },
                environments: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['development', 'preview', 'production'],
                  },
                  description: 'Target environments',
                  default: ['development', 'preview', 'production'],
                },
                type: {
                  type: 'string',
                  enum: ['plain', 'encrypted'],
                  description: 'Variable type',
                  default: 'plain',
                },
                teamId: {
                  type: 'string',
                  description: 'Team ID (optional)',
                },
              },
              required: ['projectId', 'key', 'value'],
            },
          },
          {
            name: 'list_vercel_env_vars',
            description: 'List all environment variables for a Vercel project',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description: 'The Vercel project ID',
                },
                teamId: {
                  type: 'string',
                  description: 'Team ID (optional)',
                },
              },
              required: ['projectId'],
            },
          },
          {
            name: 'delete_vercel_env_var',
            description: 'Delete an environment variable from a Vercel project',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description: 'The Vercel project ID',
                },
                envVarId: {
                  type: 'string',
                  description: 'Environment variable ID',
                },
                teamId: {
                  type: 'string',
                  description: 'Team ID (optional)',
                },
              },
              required: ['projectId', 'envVarId'],
            },
          },
          // Projects
          {
            name: 'list_vercel_projects',
            description: 'List all Vercel projects',
            inputSchema: {
              type: 'object',
              properties: {
                teamId: {
                  type: 'string',
                  description: 'Team ID (optional)',
                },
              },
            },
          },
          {
            name: 'get_vercel_project',
            description: 'Get details of a specific Vercel project',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description: 'The Vercel project ID',
                },
                teamId: {
                  type: 'string',
                  description: 'Team ID (optional)',
                },
              },
              required: ['projectId'],
            },
          },
          // Deployments
          {
            name: 'list_vercel_deployments',
            description: 'List deployments for a Vercel project',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description: 'The Vercel project ID',
                },
                teamId: {
                  type: 'string',
                  description: 'Team ID (optional)',
                },
                limit: {
                  type: 'number',
                  description: 'Number of deployments to return',
                  default: 20,
                },
              },
              required: ['projectId'],
            },
          },
          {
            name: 'get_vercel_deployment',
            description: 'Get details of a specific deployment',
            inputSchema: {
              type: 'object',
              properties: {
                deploymentId: {
                  type: 'string',
                  description: 'The deployment ID',
                },
                teamId: {
                  type: 'string',
                  description: 'Team ID (optional)',
                },
              },
              required: ['deploymentId'],
            },
          },
          {
            name: 'get_deployment_logs',
            description: 'Get build logs for a deployment',
            inputSchema: {
              type: 'object',
              properties: {
                deploymentId: {
                  type: 'string',
                  description: 'The deployment ID',
                },
                teamId: {
                  type: 'string',
                  description: 'Team ID (optional)',
                },
              },
              required: ['deploymentId'],
            },
          },
          // Teams
          {
            name: 'list_vercel_teams',
            description: 'List all teams',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          // Domains
          {
            name: 'check_domain_availability',
            description: 'Check if a domain is available and get pricing',
            inputSchema: {
              type: 'object',
              properties: {
                domain: {
                  type: 'string',
                  description: 'Domain name to check',
                },
              },
              required: ['domain'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Environment Variables
          case 'create_vercel_env_var':
            return await this.createEnvVar(args);
          case 'list_vercel_env_vars':
            return await this.listEnvVars(args);
          case 'delete_vercel_env_var':
            return await this.deleteEnvVar(args);
          // Projects
          case 'list_vercel_projects':
            return await this.listProjects(args);
          case 'get_vercel_project':
            return await this.getProject(args);
          // Deployments
          case 'list_vercel_deployments':
            return await this.listDeployments(args);
          case 'get_vercel_deployment':
            return await this.getDeployment(args);
          case 'get_deployment_logs':
            return await this.getDeploymentLogs(args);
          // Teams
          case 'list_vercel_teams':
            return await this.listTeams(args);
          // Domains
          case 'check_domain_availability':
            return await this.checkDomainAvailability(args);
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

  async createEnvVar(args) {
    const { projectId, key, value, environments = ['development', 'preview', 'production'], type = 'plain', teamId } = args;
    
    const vercelToken = process.env.VERCEL_API_TOKEN;
    if (!vercelToken) {
      throw new Error('VERCEL_API_TOKEN environment variable is required');
    }

    const url = teamId 
      ? `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`
      : `https://api.vercel.com/v10/projects/${projectId}/env`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        value,
        type,
        target: environments,
        upsert: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create environment variable: ${response.status} ${error}`);
    }

    const _result = await response.json();
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Environment variable "${key}" created successfully for environments: ${environments.join(', ')}`,
        },
      ],
    };
  }

  async listEnvVars(args) {
    const { projectId, teamId } = args;
    
    const vercelToken = process.env.VERCEL_API_TOKEN;
    if (!vercelToken) {
      throw new Error('VERCEL_API_TOKEN environment variable is required');
    }

    const url = teamId 
      ? `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`
      : `https://api.vercel.com/v10/projects/${projectId}/env`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list environment variables: ${response.status} ${error}`);
    }

    const envVars = await response.json();
    
    const formattedVars = envVars.envs?.map(env => 
      `• ${env.key} (${env.type}) - ${env.target?.join(', ') || 'all'}`
    ).join('\n') || 'No environment variables found';

    return {
      content: [
        {
          type: 'text',
          text: `Environment variables for project ${projectId}:\n${formattedVars}`,
        },
      ],
    };
  }

  async deleteEnvVar(args) {
    const { projectId, envVarId, teamId } = args;
    
    const vercelToken = process.env.VERCEL_API_TOKEN;
    if (!vercelToken) {
      throw new Error('VERCEL_API_TOKEN environment variable is required');
    }

    const url = teamId 
      ? `https://api.vercel.com/v10/projects/${projectId}/env/${envVarId}?teamId=${teamId}`
      : `https://api.vercel.com/v10/projects/${projectId}/env/${envVarId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete environment variable: ${response.status} ${error}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Environment variable ${envVarId} deleted successfully`,
        },
      ],
    };
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Vercel Environment Variables MCP server running on stdio');
  }
}

const server = new VercelEnvServer();
server.run().catch(console.error);
