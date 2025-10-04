#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { chromium } from 'playwright';

const server = new Server(
  {
    name: 'playwright-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let browser = null;
let context = null;
let page = null;

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'navigate',
        description: 'Navigate to a URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to navigate to',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'screenshot',
        description: 'Take a screenshot of the current page',
        inputSchema: {
          type: 'object',
          properties: {
            fullPage: {
              type: 'boolean',
              description: 'Whether to capture the full page',
              default: false,
            },
          },
        },
      },
      {
        name: 'click',
        description: 'Click on an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector for the element to click',
            },
          },
          required: ['selector'],
        },
      },
      {
        name: 'type',
        description: 'Type text into an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector for the element to type into',
            },
            text: {
              type: 'string',
              description: 'Text to type',
            },
          },
          required: ['selector', 'text'],
        },
      },
      {
        name: 'evaluate',
        description: 'Execute JavaScript in the page context',
        inputSchema: {
          type: 'object',
          properties: {
            script: {
              type: 'string',
              description: 'JavaScript code to execute',
            },
          },
          required: ['script'],
        },
      },
      {
        name: 'getContent',
        description: 'Get the HTML content of the page',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector to get content from (optional)',
            },
          },
        },
      },
    ],
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'navigate':
        return await navigate(args.url);
      case 'screenshot':
        return await screenshot(args.fullPage);
      case 'click':
        return await click(args.selector);
      case 'type':
        return await type(args.selector, args.text);
      case 'evaluate':
        return await evaluate(args.script);
      case 'getContent':
        return await getContent(args.selector);
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

async function ensureBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
  }
}

async function navigate(url) {
  await ensureBrowser();
  await page.goto(url);
  return {
    content: [
      {
        type: 'text',
        text: `Navigated to ${url}`,
      },
    ],
  };
}

async function screenshot(fullPage = false) {
  await ensureBrowser();
  const screenshot = await page.screenshot({ fullPage });
  const base64 = screenshot.toString('base64');
  return {
    content: [
      {
        type: 'text',
        text: `Screenshot taken (${fullPage ? 'full page' : 'viewport'})`,
      },
      {
        type: 'image',
        data: base64,
        mimeType: 'image/png',
      },
    ],
  };
}

async function click(selector) {
  await ensureBrowser();
  await page.click(selector);
  return {
    content: [
      {
        type: 'text',
        text: `Clicked element: ${selector}`,
      },
    ],
  };
}

async function type(selector, text) {
  await ensureBrowser();
  await page.fill(selector, text);
  return {
    content: [
      {
        type: 'text',
        text: `Typed "${text}" into ${selector}`,
      },
    ],
  };
}

async function evaluate(script) {
  await ensureBrowser();
  const result = await page.evaluate(script);
  return {
    content: [
      {
        type: 'text',
        text: `Script result: ${JSON.stringify(result)}`,
      },
    ],
  };
}

async function getContent(selector) {
  await ensureBrowser();
  let content;
  if (selector) {
    content = await page.textContent(selector);
  } else {
    content = await page.content();
  }
  return {
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
  };
}

async function cleanup() {
  if (browser) {
    await browser.close();
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Playwright MCP server running on stdio');