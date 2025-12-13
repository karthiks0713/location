# Product Scraper API with UI

Express API wrapper for the location-selector-orchestrator that provides a REST API and Swagger-like UI for scraping product data.

## Quick Start

```bash
# Start the API server with UI
npm run scraper-ui
# or
npm run ui
# or
node scraper-api.js
```

The server will start on `http://localhost:3001`

## Features

- ✅ REST API endpoints (GET and POST)
- ✅ Beautiful Swagger-like UI frontend
- ✅ Real-time JSON response visualization
- ✅ No selector modifications - wraps existing functionality
- ✅ In-memory processing (no HTML files saved by default)
- ✅ Returns JSON directly

## API Endpoints

### 1. GET /api/scrape
Scrape products from all websites

**Query Parameters:**
- `product` (required) - Product name to search
- `location` (required) - Location name to select
- `saveHtml` (optional) - Save HTML files to disk (true/false)

**Example:**
```
GET http://localhost:3001/api/scrape?product=lays&location=RT%20Nagar
```

### 2. POST /api/scrape
Scrape products from all websites (POST version)

**Request Body:**
```json
{
  "product": "lays",
  "location": "RT Nagar",
  "saveHtml": false
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"product": "lays", "location": "RT Nagar"}'
```

### 3. GET /api/health
Health check endpoint

### 4. GET /api/info
API documentation and information

## Frontend UI

Access the Swagger-like UI at:
```
http://localhost:3001
```

The UI provides:
- Form to input product and location
- Real-time API testing (GET and POST)
- Beautiful JSON response viewer with syntax highlighting
- Summary cards showing statistics
- Status indicators

## Response Format

```json
{
  "success": true,
  "timestamp": "2025-12-13T08-12-02-043Z",
  "product": "lays",
  "location": "RT Nagar",
  "websites": [
    {
      "website": "Swiggy",
      "success": true,
      "error": null
    }
  ],
  "data": [
    {
      "website": "Swiggy",
      "location": "RT Nagar, Bengaluru, Karnataka, India",
      "products": [
        {
          "name": "Lays Classic Salted 52g",
          "price": 20,
          "mrp": 25,
          "website": "Swiggy"
        }
      ],
      "filename": "swiggy-rt-nagar-lays-2025-12-13T08-12-02-043Z.html"
    }
  ],
  "summary": {
    "totalWebsites": 5,
    "successful": 4,
    "failed": 1,
    "totalProducts": 150,
    "byWebsite": {
      "Swiggy": 45,
      "JioMart": 60,
      "D-Mart": 25,
      "Zepto": 20
    }
  }
}
```

## Usage Examples

### Using the Frontend UI
1. Start the server: `npm run scraper-ui`
2. Open browser: `http://localhost:3001`
3. Enter product and location
4. Click "Scrape Products"
5. View JSON response with syntax highlighting

### Using cURL

**GET Request:**
```bash
curl "http://localhost:3001/api/scrape?product=lays&location=RT%20Nagar"
```

**POST Request:**
```bash
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"product": "lays", "location": "RT Nagar", "saveHtml": false}'
```

### Using JavaScript/Fetch

```javascript
// GET request
const response = await fetch('http://localhost:3001/api/scrape?product=lays&location=RT%20Nagar');
const data = await response.json();
console.log(data);

// POST request
const response = await fetch('http://localhost:3001/api/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    product: 'lays',
    location: 'RT Nagar',
    saveHtml: false
  })
});
const data = await response.json();
console.log(data);
```

### Using Python

```python
import requests

# GET request
response = requests.get('http://localhost:3001/api/scrape', params={
    'product': 'lays',
    'location': 'RT Nagar'
})
data = response.json()
print(data)

# POST request
response = requests.post('http://localhost:3001/api/scrape', json={
    'product': 'lays',
    'location': 'RT Nagar',
    'saveHtml': False
})
data = response.json()
print(data)
```

## Important Notes

- **No selectors are modified** - The API is a pure wrapper around existing functionality
- **In-memory processing** - HTML is processed in memory, not saved to disk (unless `saveHtml=true`)
- **Returns JSON** - All responses are JSON format
- **All websites** - Scrapes from all 5 websites sequentially (D-Mart, JioMart, Nature's Basket, Zepto, Swiggy)
- **Error handling** - Includes automatic error recovery for Swiggy

## Port Configuration

Default port: `3001`

Change port using environment variable:
```bash
PORT=8080 node scraper-api.js
```

## Supported Websites

1. D-Mart
2. JioMart
3. Nature's Basket
4. Zepto
5. Swiggy Instamart
