# MCP Server Setup Guide for Cursor IDE

This guide shows you how to set up Model Context Protocol (MCP) servers in Cursor IDE. Currently covers Playwright browser automation, with sections for adding additional MCP servers in the future.

## Table of Contents

- [What is MCP?](#what-is-mcp)
- [Playwright MCP Server](#playwright-mcp-server)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Usage Examples](#usage-examples)
- [Additional MCP Servers](#additional-mcp-servers)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## What is MCP?

Model Context Protocol (MCP) is a standard for connecting AI assistants to external tools and data sources. MCP servers provide specific capabilities that AI assistants can use to perform tasks beyond their built-in functionality.

## Playwright MCP Server

### What is Playwright MCP?

The Playwright MCP server enables AI assistants in Cursor to:
- Navigate web pages
- Take screenshots
- Interact with web elements (click, type, etc.)
- Execute JavaScript in browsers
- Scrape web content
- Generate test code
- And much more!

## Prerequisites

- Cursor IDE installed
- Node.js installed (for npx command)
- Internet connection (for downloading the MCP server)

## Installation Steps

### Step 1: Install the Playwright MCP Server Package

Install the official Playwright MCP server package globally or locally:

```bash
# Global installation (recommended)
npm install -g @executeautomation/playwright-mcp-server

# Or local installation in your project
npm install @executeautomation/playwright-mcp-server
```

### Step 2: Configure Cursor MCP Settings

You need to add the MCP server configuration to Cursor. There are two ways to do this:

#### Method A: Workspace Configuration (Recommended)

Create or edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    }
  }
}
```

#### Method B: Global Configuration

Add the configuration to Cursor's global MCP settings:

**Windows**: `%APPDATA%\Cursor\User\globalStorage\rooveterinaryinc.roo-cline\settings\mcp_settings.json`

**macOS**: `~/Library/Application Support/Cursor/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json`

**Linux**: `~/.config/Cursor/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    }
  }
}
```

### Step 3: Restart Cursor

Close and reopen Cursor IDE to load the new MCP configuration.

## Verification

To verify the setup is working:

1. **Check MCP Status**: Look for MCP server status in Cursor's status bar
2. **Test Commands**: Try asking Cursor to perform browser automation tasks like:
   - "Take a screenshot of google.com"
   - "Navigate to my website and click the login button"
   - "Extract all the text content from this page"

## Available Tools

Once configured, you'll have access to these Playwright tools:

### Navigation
- Navigate to URLs
- Go back/forward in browser history
- Refresh pages

### Screenshots
- Take viewport screenshots
- Capture full page screenshots
- Screenshot specific elements

### Element Interaction
- Click elements by CSS selector
- Type text into form fields
- Select dropdown options
- Hover over elements
- Drag and drop elements

### Content Extraction
- Get page HTML content
- Extract text from specific elements
- Get element attributes
- Extract links and images

### JavaScript Execution
- Execute custom JavaScript in page context
- Evaluate expressions
- Interact with page APIs

### Advanced Features
- Handle multiple tabs/windows
- Manage cookies and local storage
- Handle file uploads
- Generate test code
- Web scraping capabilities

## Usage Examples

Here are some example commands you can use with Cursor:

### Basic Navigation
```
"Navigate to https://example.com"
"Take a screenshot of the current page"
"Go back to the previous page"
```

### Form Interaction
```
"Fill out the contact form with test data"
"Click the submit button"
"Type 'test@example.com' into the email field"
```

### Content Extraction
```
"Extract all the text content from this page"
"Get all the links on this page"
"Find all images and their alt text"
```

### Testing and Automation
```
"Generate a Playwright test for this page"
"Test the login flow on this website"
"Check if all buttons are clickable"
```

## Troubleshooting

### MCP Server Not Appearing

1. **Check Configuration**: Verify the MCP configuration is correct
2. **Restart Cursor**: Close and reopen Cursor completely
3. **Check Logs**: Look at Cursor's MCP logs for errors
4. **Verify Installation**: Ensure the package is installed: `npx @executeautomation/playwright-mcp-server --version`

### Common Issues

**Permission Errors**: Run Cursor as administrator if needed

**Network Issues**: Ensure you have internet access for the initial download

**Node.js Issues**: Make sure Node.js and npm are installed and accessible

### MCP Logs Location

**Windows**: `%APPDATA%\Cursor\logs\[timestamp]\window[number]\exthost\anysphere.cursor-mcp\`

**macOS**: `~/Library/Application Support/Cursor/logs/[timestamp]/window[number]/exthost/anysphere.cursor-mcp/`

**Linux**: `~/.config/Cursor/logs/[timestamp]/window[number]/exthost/anysphere.cursor-mcp/`

## Advanced Configuration

### Custom Browser Options

You can customize browser behavior by modifying the MCP server arguments:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server", "--headless=false"]
    }
  }
}
```

### Multiple MCP Servers

You can run multiple MCP servers simultaneously:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"]
    }
  }
}
```

## Security Considerations

- **Headless Mode**: The browser runs in headless mode by default for security
- **Local Execution**: All browser automation happens locally on your machine
- **No Data Collection**: The MCP server doesn't collect or transmit your data
- **Sandboxed**: Browser instances are sandboxed and isolated

## Best Practices

1. **Use Specific Selectors**: Be specific with CSS selectors for reliable element interaction
2. **Handle Errors**: Always include error handling in your automation requests
3. **Test First**: Test automation on non-production websites first
4. **Monitor Performance**: Be aware of resource usage during automation
5. **Clean Up**: The MCP server automatically cleans up browser instances

## Additional MCP Servers

### Adding More MCP Servers

You can run multiple MCP servers simultaneously by adding them to your configuration:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"]
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"]
    }
  }
}
```

### Popular MCP Servers

Here are some popular MCP servers you can add:

#### Filesystem MCP Server
- **Package**: `@modelcontextprotocol/server-filesystem`
- **Purpose**: Read and write files in specified directories
- **Installation**: `npm install -g @modelcontextprotocol/server-filesystem`

#### Supabase MCP Server
- **Package**: `@modelcontextprotocol/server-supabase`
- **Purpose**: Interact with Supabase databases
- **Installation**: `npm install -g @modelcontextprotocol/server-supabase`

#### GitHub MCP Server
- **Package**: `ghcr.io/github/github-mcp-server` (Docker)
- **Purpose**: Interact with GitHub repositories, issues, pull requests, and more
- **Installation**: Uses Docker (no npm installation needed)
- **Authentication**: Requires GitHub Personal Access Token

#### SQLite MCP Server
- **Package**: `@modelcontextprotocol/server-sqlite`
- **Purpose**: Query SQLite databases
- **Installation**: `npm install -g @modelcontextprotocol/server-sqlite`

### Future MCP Servers

This guide will be updated as new MCP servers become available. Check the [MCP Registry](https://github.com/modelcontextprotocol/registry) for the latest available servers.

## Resources

- [Official Playwright MCP Server](https://github.com/executeautomation/mcp-playwright)
- [Playwright Documentation](https://playwright.dev/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cursor IDE Documentation](https://cursor.sh/)
- [MCP Registry](https://github.com/modelcontextprotocol/registry)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Cursor's MCP logs
3. Verify your configuration matches the examples
4. Ensure all prerequisites are met
5. Try restarting Cursor and your system

---

**Happy automating!** 🎭✨

With Playwright MCP server set up, you now have powerful browser automation capabilities directly integrated into your Cursor IDE workflow.
