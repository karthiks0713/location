// Express API wrapper for location-selector-orchestrator
// Wraps existing scraping functionality without modifying selectors

import express from 'express';
import { selectLocationAndSearchOnAllWebsites } from './location-selector-orchestrator.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS middleware (same pattern as api-server.js)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(join(__dirname, 'public')));

/**
 * GET /api/scrape
 * Scrape products from all websites
 * 
 * Query Parameters:
 *   - product: Product name to search (required)
 *   - location: Location name to select (required)
 *   - saveHtml: Optional flag to save HTML files (default: false)
 */
app.get('/api/scrape', async (req, res) => {
  try {
    const { product, location, saveHtml } = req.query;

    if (!product || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'Both "product" and "location" query parameters are required',
        example: '/api/scrape?product=lays&location=RT%20Nagar'
      });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`API Request: Scraping "${product}" in "${location}"`);
    console.log(`${'='.repeat(60)}\n`);

    // Temporarily store original argv to restore later
    const originalArgv = [...process.argv];
    
    // Set saveHtml flag if provided
    if (saveHtml === 'true' || saveHtml === '1') {
      process.argv.push('--save-html');
    }

    try {
      // Call the orchestrator function - it returns an array of results with HTML
      const results = await selectLocationAndSearchOnAllWebsites(product, location);
      
      // Restore original argv
      process.argv = originalArgv;

      // Extract data from HTML in results using extractDataFromHtml
      const { extractDataFromHtml } = await import('./location-selector-orchestrator.js');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extractedData = [];
      
      for (const result of results) {
        if (result.success && result.html) {
          const extracted = await extractDataFromHtml(result.html, result.website, `${result.website}-${location.toLowerCase().replace(/\s+/g, '-')}-${product.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.html`);
          if (extracted) {
            extractedData.push(extracted);
          }
        }
      }

      // Return JSON response
      res.json({
        success: true,
        timestamp: timestamp,
        product: product,
        location: location,
        websites: results.map(r => ({
          website: r.website,
          success: r.success,
          error: r.error || null
        })),
        data: extractedData,
        summary: {
          totalWebsites: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          totalProducts: extractedData.reduce((sum, site) => sum + (site.products?.length || 0), 0),
          byWebsite: extractedData.reduce((acc, item) => {
            acc[item.website] = (acc[item.website] || 0) + (item.products?.length || 0);
            return acc;
          }, {})
        }
      });
    } catch (scrapingError) {
      // Restore original argv
      process.argv = originalArgv;
      
      console.error('Scraping error:', scrapingError);
      res.status(500).json({
        success: false,
        error: 'Scraping failed',
        message: scrapingError.message,
        product: product,
        location: location
      });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/scrape
 * Scrape products from all websites (POST version)
 * 
 * Body:
 *   {
 *     "product": "lays",
 *     "location": "RT Nagar",
 *     "saveHtml": false
 *   }
 */
app.post('/api/scrape', async (req, res) => {
  try {
    const { product, location, saveHtml } = req.body;

    if (!product || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'Both "product" and "location" in request body are required',
        example: { product: 'lays', location: 'RT Nagar' }
      });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`API Request: Scraping "${product}" in "${location}"`);
    console.log(`${'='.repeat(60)}\n`);

    // Temporarily store original argv to restore later
    const originalArgv = [...process.argv];
    
    // Set saveHtml flag if provided
    if (saveHtml === true || saveHtml === 'true' || saveHtml === '1') {
      process.argv.push('--save-html');
    }

    try {
      // Call the orchestrator function - it returns an array of results with HTML
      const results = await selectLocationAndSearchOnAllWebsites(product, location);
      
      // Restore original argv
      process.argv = originalArgv;

      // Extract data from HTML in results using extractDataFromHtml
      const { extractDataFromHtml } = await import('./location-selector-orchestrator.js');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extractedData = [];
      
      for (const result of results) {
        if (result.success && result.html) {
          const extracted = await extractDataFromHtml(result.html, result.website, `${result.website}-${location.toLowerCase().replace(/\s+/g, '-')}-${product.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.html`);
          if (extracted) {
            extractedData.push(extracted);
          }
        }
      }

      // Return JSON response
      res.json({
        success: true,
        timestamp: timestamp,
        product: product,
        location: location,
        websites: results.map(r => ({
          website: r.website,
          success: r.success,
          error: r.error || null
        })),
        data: extractedData,
        summary: {
          totalWebsites: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          totalProducts: extractedData.reduce((sum, site) => sum + (site.products?.length || 0), 0),
          byWebsite: extractedData.reduce((acc, item) => {
            acc[item.website] = (acc[item.website] || 0) + (item.products?.length || 0);
            return acc;
          }, {})
        }
      });
    } catch (scrapingError) {
      // Restore original argv
      process.argv = originalArgv;
      
      console.error('Scraping error:', scrapingError);
      res.status(500).json({
        success: false,
        error: 'Scraping failed',
        message: scrapingError.message,
        product: product,
        location: location
      });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Product Scraper API'
  });
});

/**
 * GET /api/info
 * API information and documentation
 */
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Product Scraper API',
    version: '1.0.0',
    description: 'API for scraping product data from e-commerce websites',
    endpoints: {
      'GET /api/scrape': {
        description: 'Scrape products from all websites',
        parameters: {
          product: { type: 'string', required: true, description: 'Product name to search' },
          location: { type: 'string', required: true, description: 'Location name to select' },
          saveHtml: { type: 'boolean', required: false, description: 'Save HTML files to disk' }
        },
        example: '/api/scrape?product=lays&location=RT%20Nagar'
      },
      'POST /api/scrape': {
        description: 'Scrape products from all websites (POST)',
        body: {
          product: { type: 'string', required: true },
          location: { type: 'string', required: true },
          saveHtml: { type: 'boolean', required: false }
        },
        example: { product: 'lays', location: 'RT Nagar', saveHtml: false }
      },
      'GET /api/health': {
        description: 'Health check endpoint'
      }
    },
    supportedWebsites: ['D-Mart', 'JioMart', "Nature's Basket", 'Zepto', 'Swiggy Instamart']
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Product Scraper API Server`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/api/info`);
  console.log(`Frontend UI: http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log(`${'='.repeat(60)}\n`);
});
