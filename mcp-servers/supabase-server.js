#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

class SupabaseMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'supabase-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.supabase = null;
    this.pgClient = null;
    this.setupToolHandlers();
  }

  async initializeSupabase() {
    if (!this.supabase) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        throw new Error('Missing Supabase URL or key');
      }
      
      this.supabase = createClient(url, key);
    }
    return this.supabase;
  }

  async initializePostgres() {
    if (!this.pgClient) {
      const url = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!url || !serviceKey) {
        throw new Error('Missing Supabase URL or service role key');
      }
      
      // Extract database connection details from Supabase URL
      const dbUrl = url.replace('https://', '').replace('.supabase.co', '');
      const connectionString = `postgresql://postgres.${dbUrl}:${serviceKey}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
      
      this.pgClient = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
      });
      
      await this.pgClient.connect();
    }
    return this.pgClient;
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'query',
            description: 'Execute a SQL query on Supabase',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'SQL query to execute',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'insert',
            description: 'Insert data into a table',
            inputSchema: {
              type: 'object',
              properties: {
                table: {
                  type: 'string',
                  description: 'Table name',
                },
                data: {
                  type: 'object',
                  description: 'Data to insert',
                },
              },
              required: ['table', 'data'],
            },
          },
          {
            name: 'update',
            description: 'Update data in a table',
            inputSchema: {
              type: 'object',
              properties: {
                table: {
                  type: 'string',
                  description: 'Table name',
                },
                data: {
                  type: 'object',
                  description: 'Data to update',
                },
                filter: {
                  type: 'object',
                  description: 'Filter conditions',
                },
              },
              required: ['table', 'data', 'filter'],
            },
          },
          {
            name: 'delete',
            description: 'Delete data from a table',
            inputSchema: {
              type: 'object',
              properties: {
                table: {
                  type: 'string',
                  description: 'Table name',
                },
                filter: {
                  type: 'object',
                  description: 'Filter conditions',
                },
              },
              required: ['table', 'filter'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        await this.initializeSupabase();
        
        switch (name) {
          case 'query':
            return await this.handleQuery(args);
          case 'insert':
            return await this.handleInsert(args);
          case 'update':
            return await this.handleUpdate(args);
          case 'delete':
            return await this.handleDelete(args);
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

  async handleQuery(args) {
    const { query } = args;
    
    // Parse the query to determine the table and operation
    const queryLower = query.trim().toLowerCase();
    
    if (queryLower.startsWith('select')) {
      // Extract table name and columns from SELECT query
      const tableMatch = query.match(/from\s+(\w+)/i);
      const columnMatch = query.match(/select\s+(.+?)\s+from/i);
      
      if (tableMatch) {
        const tableName = tableMatch[1];
        const columns = columnMatch ? columnMatch[1].trim() : '*';
        
        // Handle WHERE clause
        const whereMatch = query.match(/where\s+(.+?)(?:\s+order\s+by|\s+limit|$)/i);
        let queryBuilder = this.supabase.from(tableName);
        
        if (columns === '*') {
          queryBuilder = queryBuilder.select('*');
        } else {
          // Parse column list
          const columnList = columns.split(',').map(col => col.trim());
          queryBuilder = queryBuilder.select(columnList.join(','));
        }
        
        // Apply WHERE conditions
        if (whereMatch) {
          const whereClause = whereMatch[1].trim();
          // Simple WHERE parsing - handle basic conditions
          if (whereClause.includes('=')) {
            const [column, value] = whereClause.split('=').map(s => s.trim());
            const cleanValue = value.replace(/'/g, '').replace(/"/g, '');
            if (cleanValue === 'true') {
              queryBuilder = queryBuilder.eq(column, true);
            } else if (cleanValue === 'false') {
              queryBuilder = queryBuilder.eq(column, false);
            } else {
              queryBuilder = queryBuilder.eq(column, cleanValue);
            }
          }
        }
        
        const { data, error } = await queryBuilder;
        
        if (error) {
          throw new Error(`Query failed: ${error.message}`);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
    }
    
    // For DDL operations (CREATE, ALTER, DROP), use direct PostgreSQL connection
    if (queryLower.startsWith('create') || queryLower.startsWith('alter') || queryLower.startsWith('drop')) {
      try {
        const client = await this.initializePostgres();
        const result = await client.query(query);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.rows || result.command || 'Success', null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(`Query failed: ${error.message}`);
      }
    }
    
    // For other queries, try direct PostgreSQL connection
    try {
      const client = await this.initializePostgres();
      const result = await client.query(query);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.rows || result.command || 'Success', null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  async handleInsert(args) {
    const { table, data } = args;
    const { data: result, error } = await this.supabase
      .from(table)
      .insert(data)
      .select();
    
    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `Inserted: ${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  async handleUpdate(args) {
    const { table, data, filter } = args;
    const { data: result, error } = await this.supabase
      .from(table)
      .update(data)
      .match(filter)
      .select();
    
    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `Updated: ${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  async handleDelete(args) {
    const { table, filter } = args;
    const { data: result, error } = await this.supabase
      .from(table)
      .delete()
      .match(filter)
      .select();
    
    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `Deleted: ${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Supabase MCP server running on stdio');
  }
}

const server = new SupabaseMCPServer();
server.run().catch(console.error);
