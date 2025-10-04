# Playwright MCP Server for Cursor

This project includes a local Model Context Protocol (MCP) server that provides Playwright browser automation capabilities directly within Cursor IDE.

## What's Included

- **Local MCP Server**: A custom Playwright MCP server (`mcp-servers/playwright-server.js`)
- **Configuration**: MCP configuration file (`mcp-config.json`)
- **Dependencies**: All required packages installed locally

## Available Tools

The MCP server provides the following browser automation tools:

1. **navigate** - Navigate to a URL
2. **screenshot** - Take screenshots of web pages
3. **click** - Click on elements using CSS selectors
4. **type** - Type text into form fields
5. **evaluate** - Execute JavaScript in the browser context
6. **getContent** - Extract HTML content from pages

## Setup Instructions

### 1. Install Dependencies
The MCP server dependencies are already installed in the `mcp-servers` directory.

### 2. Configure Cursor
To use this MCP server in Cursor, you need to add the configuration to Cursor's MCP settings:

1. Open Cursor settings
2. Look for "MCP" or "Model Context Protocol" settings
3. Add the following configuration:

```json
{
  "mcpServers": {
    "playwright-local": {
      "command": "node",
      "args": ["playwright-server.js"],
      "cwd": "./mcp-servers"
    }
  }
}
```

### 3. Test the Server
You can test the MCP server by running:

```bash
cd mcp-servers
node test-server.js
```

## Usage Examples

Once configured in Cursor, you can use commands like:

- "Take a screenshot of google.com"
- "Navigate to my website and click the login button"
- "Extract all the text content from this page"
- "Fill out the contact form with test data"

## File Structure

```
mcp-servers/
├── playwright-server.js    # Main MCP server implementation
├── package.json            # Dependencies and scripts
├── test-server.js          # Test script to verify functionality
└── node_modules/          # Installed dependencies

mcp-config.json             # MCP configuration for Cursor
```

## Features

- **Headless Browser**: Runs Playwright in headless mode for automation
- **Screenshot Support**: Can capture full page or viewport screenshots
- **Element Interaction**: Click, type, and interact with web elements
- **JavaScript Execution**: Run custom JavaScript in the browser context
- **Content Extraction**: Get HTML content from pages or specific elements

## Troubleshooting

If the MCP server isn't working:

1. Check that all dependencies are installed: `cd mcp-servers && npm install`
2. Test the server: `node test-server.js`
3. Verify Cursor MCP configuration is correct
4. Check Cursor's MCP logs for any error messages

## Security Note

This MCP server runs browser automation locally. Be cautious when:
- Navigating to untrusted websites
- Executing JavaScript from unknown sources
- Providing sensitive information to automated forms

The server runs in headless mode and doesn't display a visible browser window.
