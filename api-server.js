import express from 'express';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { extractDataFromAllFiles } from './html-data-selector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const OUTPUT_DIR = join(__dirname, 'output');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/**
 * Get the latest extracted data JSON file
 */
function getLatestJsonFile() {
  try {
    const files = readdirSync(OUTPUT_DIR);
    const jsonFiles = files
      .filter(file => file.startsWith('extracted-data') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: join(OUTPUT_DIR, file),
        time: statSync(join(OUTPUT_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    return jsonFiles.length > 0 ? jsonFiles[0] : null;
  } catch (error) {
    console.error('Error reading output directory:', error);
    return null;
  }
}

/**
 * Load and parse JSON data
 */
function loadJsonData(filePath) {
  try {
    const data = readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading JSON file:', error);
    return null;
  }
}

// Routes

/**
 * GET / - Health check
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Product Search API Server',
    version: '1.0.0',
    endpoints: {
      '/api/data': 'Get latest extracted data',
      '/api/data/latest': 'Get latest extracted data (alias)',
      '/api/data/website/:website': 'Get data filtered by website',
      '/api/data/search': 'Search data by product name or location',
      '/api/websites': 'Get list of all websites in data',
      '/api/stats': 'Get statistics about extracted data'
    }
  });
});

/**
 * GET /api/data - Get latest extracted data
 */
app.get('/api/data', (req, res) => {
  const latestFile = getLatestJsonFile();
  
  if (!latestFile) {
    return res.status(404).json({
      error: 'No extracted data found',
      message: 'Run the orchestrator first to generate data'
    });
  }
  
  const data = loadJsonData(latestFile.path);
  
  if (!data) {
    return res.status(500).json({
      error: 'Failed to load data',
      message: 'Could not parse JSON file'
    });
  }
  
  res.json({
    timestamp: latestFile.name.replace('extracted-data-', '').replace('.json', ''),
    filename: latestFile.name,
    data: data,
    count: data.length
  });
});

/**
 * GET /api/data/latest - Alias for /api/data
 */
app.get('/api/data/latest', (req, res) => {
  const latestFile = getLatestJsonFile();
  
  if (!latestFile) {
    return res.status(404).json({
      error: 'No extracted data found',
      message: 'Run the orchestrator first to generate data'
    });
  }
  
  const data = loadJsonData(latestFile.path);
  
  if (!data) {
    return res.status(500).json({
      error: 'Failed to load data',
      message: 'Could not parse JSON file'
    });
  }
  
  res.json({
    timestamp: latestFile.name.replace('extracted-data-', '').replace('.json', ''),
    filename: latestFile.name,
    data: data,
    count: data.length
  });
});

/**
 * Normalize website name for comparison
 */
function normalizeWebsiteName(name) {
  return name.toLowerCase()
    .replace(/'/g, '')  // Remove apostrophes
    .replace(/\s+/g, '') // Remove spaces
    .trim();
}

/**
 * GET /api/data/website/:website - Get data filtered by website
 */
app.get('/api/data/website/:website', (req, res) => {
  const { website } = req.params;
  const latestFile = getLatestJsonFile();
  
  if (!latestFile) {
    return res.status(404).json({
      error: 'No extracted data found'
    });
  }
  
  const data = loadJsonData(latestFile.path);
  
  if (!data) {
    return res.status(500).json({
      error: 'Failed to load data'
    });
  }
  
  const normalizedQuery = normalizeWebsiteName(website);
  const filtered = data.filter(item => 
    normalizeWebsiteName(item.website) === normalizedQuery
  );
  
  res.json({
    website: website,
    timestamp: latestFile.name.replace('extracted-data-', '').replace('.json', ''),
    data: filtered,
    count: filtered.length
  });
});

/**
 * GET /api/data/search - Search data by product name or location
 * Query params: ?q=<search_term>&website=<website>&location=<location>
 */
app.get('/api/data/search', (req, res) => {
  const { q, website, location } = req.query;
  const latestFile = getLatestJsonFile();
  
  if (!latestFile) {
    return res.status(404).json({
      error: 'No extracted data found'
    });
  }
  
  const data = loadJsonData(latestFile.path);
  
  if (!data) {
    return res.status(500).json({
      error: 'Failed to load data'
    });
  }
  
  let results = data;
  
  // Filter by website if provided
  if (website) {
    const normalizedQuery = normalizeWebsiteName(website);
    results = results.filter(item => 
      normalizeWebsiteName(item.website) === normalizedQuery
    );
  }
  
  // Filter by location if provided
  if (location) {
    results = results.filter(item => 
      item.location && item.location.toLowerCase().includes(location.toLowerCase())
    );
  }
  
  // Search in product names if query provided
  if (q) {
    const queryLower = q.toLowerCase();
    results = results.map(item => ({
      ...item,
      products: item.products.filter(product => 
        product.name.toLowerCase().includes(queryLower)
      )
    })).filter(item => item.products.length > 0);
  }
  
  res.json({
    query: q || null,
    website: website || null,
    location: location || null,
    timestamp: latestFile.name.replace('extracted-data-', '').replace('.json', ''),
    data: results,
    count: results.length,
    totalProducts: results.reduce((sum, item) => sum + item.products.length, 0)
  });
});

/**
 * GET /api/websites - Get list of all websites in data
 */
app.get('/api/websites', (req, res) => {
  const latestFile = getLatestJsonFile();
  
  if (!latestFile) {
    return res.status(404).json({
      error: 'No extracted data found'
    });
  }
  
  const data = loadJsonData(latestFile.path);
  
  if (!data) {
    return res.status(500).json({
      error: 'Failed to load data'
    });
  }
  
  const websites = [...new Set(data.map(item => item.website))];
  const websiteStats = websites.map(website => {
    const websiteData = data.filter(item => item.website === website);
    const totalProducts = websiteData.reduce((sum, item) => sum + item.products.length, 0);
    
    return {
      website: website,
      count: websiteData.length,
      totalProducts: totalProducts,
      locations: [...new Set(websiteData.map(item => item.location).filter(Boolean))]
    };
  });
  
  res.json({
    timestamp: latestFile.name.replace('extracted-data-', '').replace('.json', ''),
    websites: websiteStats,
    total: websites.length
  });
});

/**
 * GET /api/stats - Get statistics about extracted data
 */
app.get('/api/stats', (req, res) => {
  const latestFile = getLatestJsonFile();
  
  if (!latestFile) {
    return res.status(404).json({
      error: 'No extracted data found'
    });
  }
  
  const data = loadJsonData(latestFile.path);
  
  if (!data) {
    return res.status(500).json({
      error: 'Failed to load data'
    });
  }
  
  const stats = {
    timestamp: latestFile.name.replace('extracted-data-', '').replace('.json', ''),
    totalEntries: data.length,
    totalProducts: data.reduce((sum, item) => sum + item.products.length, 0),
    websites: [...new Set(data.map(item => item.website))].length,
    productsWithPrice: data.reduce((sum, item) => 
      sum + item.products.filter(p => p.price !== null).length, 0
    ),
    productsWithMRP: data.reduce((sum, item) => 
      sum + item.products.filter(p => p.mrp !== null).length, 0
    ),
    byWebsite: {}
  };
  
  // Calculate stats by website
  data.forEach(item => {
    if (!stats.byWebsite[item.website]) {
      stats.byWebsite[item.website] = {
        entries: 0,
        products: 0,
        productsWithPrice: 0,
        productsWithMRP: 0
      };
    }
    
    stats.byWebsite[item.website].entries++;
    stats.byWebsite[item.website].products += item.products.length;
    stats.byWebsite[item.website].productsWithPrice += item.products.filter(p => p.price !== null).length;
    stats.byWebsite[item.website].productsWithMRP += item.products.filter(p => p.mrp !== null).length;
  });
  
  res.json(stats);
});

/**
 * POST /api/refresh - Trigger data extraction from HTML files
 */
app.post('/api/refresh', async (req, res) => {
  try {
    console.log('Refreshing data from HTML files...');
    const extractedData = extractDataFromAllFiles(OUTPUT_DIR);
    
    if (!extractedData || extractedData.length === 0) {
      return res.status(404).json({
        error: 'No data extracted',
        message: 'No HTML files found or extraction failed'
      });
    }
    
    // Save to latest JSON file
    const fs = await import('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = join(OUTPUT_DIR, `extracted-data-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(extractedData, null, 2), 'utf8');
    
    res.json({
      message: 'Data refreshed successfully',
      timestamp: timestamp,
      filename: `extracted-data-${timestamp}.json`,
      count: extractedData.length,
      data: extractedData
    });
  } catch (error) {
    console.error('Error refreshing data:', error);
    res.status(500).json({
      error: 'Failed to refresh data',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Product Search API Server`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /                    - API information`);
  console.log(`  GET  /api/data            - Get latest extracted data`);
  console.log(`  GET  /api/data/website/:website - Get data by website`);
  console.log(`  GET  /api/data/search?q=... - Search data`);
  console.log(`  GET  /api/websites        - Get all websites`);
  console.log(`  GET  /api/stats           - Get statistics`);
  console.log(`  POST /api/refresh         - Refresh data from HTML files`);
  console.log(`${'='.repeat(60)}\n`);
});

export default app;

