# JioMart Location Selection - MCP Tool Steps

## MCP Configuration Fix Required

**Current Issue:** MCP server path is `E:\mcp-selenium-main\src\lib\server.js` (wrong)
**Correct Path:** `C:\projects\mcp-selenium-main\src\lib\server.js`

### To Fix in Cursor:
1. Open Cursor Settings → MCP Servers
2. Find server: "mcp-selenium-main-selenium" or "project-0-mcp-selenium-main-selenium"
3. Update command to: `node src/lib/server.js`
4. Update working directory to: `C:\projects\mcp-selenium-main`
5. OR use absolute path: `node C:\projects\mcp-selenium-main\src\lib\server.js`
6. Restart Cursor or reload MCP server

## Automation Steps Using MCP Tools

### Step 1: Start Browser
```json
{
  "tool": "start_browser",
  "parameters": {
    "browser": "chrome",
    "options": {
      "headless": false,
      "arguments": [
        "--start-maximized",
        "--disable-blink-features=AutomationControlled"
      ]
    }
  }
}
```

### Step 2: Navigate to JioMart
```json
{
  "tool": "navigate",
  "parameters": {
    "url": "https://www.jiomart.com/search?q=tomato"
  }
}
```

### Step 3: Wait for page load (use find_element to wait)
```json
{
  "tool": "find_element",
  "parameters": {
    "by": "xpath",
    "value": "//button[contains(text(), 'Location')]",
    "timeout": 10000
  }
}
```

### Step 4: Click Location Button
```json
{
  "tool": "click_element",
  "parameters": {
    "by": "xpath",
    "value": "//button[contains(text(), 'Location')]",
    "timeout": 10000
  }
}
```

### Step 5: Find and Type Location Input
```json
{
  "tool": "find_element",
  "parameters": {
    "by": "xpath",
    "value": "//input[contains(@placeholder, 'Search for area') or contains(@placeholder, 'landmark')]",
    "timeout": 10000
  }
}
```

```json
{
  "tool": "send_keys",
  "parameters": {
    "by": "xpath",
    "value": "//input[contains(@placeholder, 'Search for area') or contains(@placeholder, 'landmark')]",
    "text": "Mumbai",
    "slowly": true,
    "timeout": 10000
  }
}
```

### Step 6: Select Location Suggestion
```json
{
  "tool": "click_element",
  "parameters": {
    "by": "xpath",
    "value": "//li[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'mumbai')]",
    "timeout": 5000
  }
}
```

### Step 7: Click Confirm Button
```json
{
  "tool": "click_element",
  "parameters": {
    "by": "xpath",
    "value": "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'confirm')]",
    "timeout": 5000
  }
}
```

### Step 8: Take Screenshot
```json
{
  "tool": "take_screenshot",
  "parameters": {
    "outputPath": "jiomart-mumbai-selected.png"
  }
}
```

### Step 9: Close Session
```json
{
  "tool": "close_session",
  "parameters": {}
}
```

## Notes
- Location name will be parameterized (e.g., "Mumbai", "Bangalore", "RT Nagar")
- Product name defaults to "tomato" but can be changed
- Multiple retry strategies may be needed for suggestion selection
- Screenshot and HTML extraction will be done before closing


