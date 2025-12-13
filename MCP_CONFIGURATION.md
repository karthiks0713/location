# MCP Selenium Configuration for Cursor

## Issue
The MCP server is configured to run from `E:\mcp-selenium-main\src\lib\server.js` but the workspace is at `C:\projects\mcp-selenium-main`.

## Fix

Update your Cursor MCP configuration to use one of these options:

### Option 1: Use relative path from workspace
```json
{
  "command": "node",
  "args": ["src/lib/server.js"],
  "cwd": "C:\\projects\\mcp-selenium-main"
}
```

### Option 2: Use absolute path
```json
{
  "command": "node",
  "args": ["C:\\projects\\mcp-selenium-main\\src\\lib\\server.js"]
}
```

### Option 3: Use npm script
```json
{
  "command": "npm",
  "args": ["start"],
  "cwd": "C:\\projects\\mcp-selenium-main"
}
```

## How to Update in Cursor

1. Open Cursor Settings
2. Go to MCP Servers configuration
3. Find the "mcp-selenium-main-selenium" server
4. Update the command/args to use the correct path
5. Restart Cursor or reload the MCP server

## Verify Configuration

The server file exists at: `C:\projects\mcp-selenium-main\src\lib\server.js`


