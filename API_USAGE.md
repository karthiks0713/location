# Product Search API Server

A REST API server to access extracted product data from e-commerce websites.

## Starting the Server

```bash
npm run api
# or
node api-server.js
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable).

## API Endpoints

### 1. Get Latest Extracted Data
**GET** `/api/data` or `/api/data/latest`

Returns the most recent extracted data from all websites.

**Response:**
```json
{
  "timestamp": "2025-12-12T11-01-26-236Z",
  "filename": "extracted-data-2025-12-12T11-01-26-236Z.json",
  "data": [
    {
      "website": "DMart",
      "location": "560032Bengaluru",
      "products": [
        {
          "name": "Lays Potato Chips - Sizzlin Hot : 48 g",
          "price": 18,
          "mrp": 20,
          "website": "DMart"
        }
      ],
      "filename": "dmart-rt-nagar-lays-2025-12-12T11-01-26-236Z.html"
    }
  ],
  "count": 5
}
```

### 2. Get Data by Website
**GET** `/api/data/website/:website`

Get data filtered by a specific website.

**Example:**
```bash
curl http://localhost:3000/api/data/website/jiomart
```

**Supported websites:** `dmart`, `jiomart`, `naturesbasket`, `zepto`, `swiggy`

### 3. Search Data
**GET** `/api/data/search`

Search data by product name, website, or location.

**Query Parameters:**
- `q` - Search term (searches in product names)
- `website` - Filter by website name
- `location` - Filter by location

**Examples:**
```bash
# Search for "lays" products
curl "http://localhost:3000/api/data/search?q=lays"

# Get all JioMart products
curl "http://localhost:3000/api/data/search?website=jiomart"

# Search for "lays" in RT Nagar
curl "http://localhost:3000/api/data/search?q=lays&location=RT%20Nagar"

# Combined search
curl "http://localhost:3000/api/data/search?q=lays&website=jiomart&location=RT%20Nagar"
```

**Response:**
```json
{
  "query": "lays",
  "website": "jiomart",
  "location": "RT Nagar",
  "timestamp": "2025-12-12T11-01-26-236Z",
  "data": [...],
  "count": 1,
  "totalProducts": 55
}
```

### 4. Get All Websites
**GET** `/api/websites`

Get a list of all websites with statistics.

**Response:**
```json
{
  "timestamp": "2025-12-12T11-01-26-236Z",
  "websites": [
    {
      "website": "DMart",
      "count": 3,
      "totalProducts": 17,
      "locations": ["560032Bengaluru"]
    },
    {
      "website": "JioMart",
      "count": 3,
      "totalProducts": 165,
      "locations": ["10 - 30 MinutesScheduled delivery to:P&T Colony, RT Nagar, Benga..."]
    }
  ],
  "total": 5
}
```

### 5. Get Statistics
**GET** `/api/stats`

Get overall statistics about the extracted data.

**Response:**
```json
{
  "timestamp": "2025-12-12T11-01-26-236Z",
  "totalEntries": 15,
  "totalProducts": 300,
  "websites": 5,
  "productsWithPrice": 280,
  "productsWithMRP": 200,
  "byWebsite": {
    "DMart": {
      "entries": 3,
      "products": 17,
      "productsWithPrice": 15,
      "productsWithMRP": 12
    },
    "JioMart": {
      "entries": 3,
      "products": 165,
      "productsWithPrice": 165,
      "productsWithMRP": 150
    }
  }
}
```

### 6. Refresh Data
**POST** `/api/refresh`

Trigger data extraction from HTML files in the output directory.

**Example:**
```bash
curl -X POST http://localhost:3000/api/refresh
```

**Response:**
```json
{
  "message": "Data refreshed successfully",
  "timestamp": "2025-12-12T11-09-05-995Z",
  "filename": "extracted-data-2025-12-12T11-09-05-995Z.json",
  "count": 5,
  "data": [...]
}
```

## Usage Examples

### Using curl

```bash
# Get all data
curl http://localhost:3000/api/data

# Get JioMart data
curl http://localhost:3000/api/data/website/jiomart

# Search for "lays"
curl "http://localhost:3000/api/data/search?q=lays"

# Get statistics
curl http://localhost:3000/api/stats
```

### Using JavaScript/Node.js

```javascript
// Fetch latest data
const response = await fetch('http://localhost:3000/api/data');
const result = await response.json();
console.log(result.data);

// Search for products
const searchResponse = await fetch('http://localhost:3000/api/data/search?q=lays&website=jiomart');
const searchResult = await searchResponse.json();
console.log(searchResult.data);
```

### Using Python

```python
import requests

# Get latest data
response = requests.get('http://localhost:3000/api/data')
data = response.json()
print(data['data'])

# Search for products
search_response = requests.get('http://localhost:3000/api/data/search', params={
    'q': 'lays',
    'website': 'jiomart'
})
search_data = search_response.json()
print(search_data['data'])
```

## Workflow

1. **Run the orchestrator** to scrape data:
   ```bash
   node location-selector-orchestrator.js "lays" "RT Nagar"
   ```

2. **Start the API server**:
   ```bash
   npm run api
   ```

3. **Access the data** via API endpoints:
   ```bash
   curl http://localhost:3000/api/data
   ```

4. **Refresh data** after new scrapes:
   ```bash
   curl -X POST http://localhost:3000/api/refresh
   ```

## CORS

The API server includes CORS headers, allowing cross-origin requests from any domain. This is useful for frontend applications.

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `404` - Not found (no data available)
- `500` - Server error

Error responses include an `error` field with a descriptive message.

