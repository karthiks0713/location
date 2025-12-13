/**
 * Express API Server for E-commerce Product Scraper
 * Provides REST API endpoints to scrape products from multiple e-commerce sites
 */

import express from 'express';
// Lazy imports - only load heavy modules when needed (not at startup)
// This prevents blocking server startup with Selenium/Playwright imports
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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

app.use(express.static(join(__dirname, 'public')));

// Health check endpoint - must return immediately (Railway requirement)
app.get('/api/health', (req, res) => {
  // Return immediately without any async operations
  res.status(200).json({ 
    status: 'ok', 
    message: 'Scraper API is running',
    timestamp: new Date().toISOString()
  });
});

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

    // Lazy import - only load when actually needed (not at server startup)
    const { selectLocationAndSearchOnAllWebsites } = await import('./location-selector-orchestrator.js');

    // Temporarily store original argv to restore later
    const originalArgv = [...process.argv];
    
    // Set saveHtml flag if provided
    if (saveHtml === 'true' || saveHtml === '1') {
      process.argv.push('--save-html');
    }

    try {
      // Call the orchestrator function - it returns an array of results
      const results = await selectLocationAndSearchOnAllWebsites(product, location);
      
      // Restore original argv
      process.argv = originalArgv;
      
      // Extract data from HTML in results
      const { extractDataFromHtml } = await import('./location-selector-orchestrator.js');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extractedData = [];
      
      for (const result of results) {
        if (result.success && result.html) {
          console.log(`Processing ${result.website} HTML (${result.html.length} chars)...`);
          const extracted = await extractDataFromHtml(result.html, result.website, `${result.website}-${location.toLowerCase().replace(/\s+/g, '-')}-${product.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.html`);
          if (extracted && extracted.products && extracted.products.length > 0) {
            console.log(`  ✅ Extracted ${extracted.products.length} product(s) from ${result.website}`);
            extractedData.push(extracted);
          } else if (extracted) {
            console.log(`  ⚠️  No products extracted from ${result.website} (products: ${extracted.products?.length || 0})`);
            // Still add the result even if no products, to show location was found
            extractedData.push(extracted);
          } else {
            console.log(`  ❌ Failed to extract data from ${result.website}`);
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
          totalProducts: extractedData.reduce((sum, site) => sum + (site.products?.length || 0), 0)
        }
      });
    } catch (error) {
      // Restore original argv on error
      process.argv = originalArgv;
      throw error;
    }

  } catch (error) {
    console.error('Error in /api/scrape:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
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

    // Lazy import - only load when actually needed (not at server startup)
    const { selectLocationAndSearchOnAllWebsites } = await import('./location-selector-orchestrator.js');

    // Temporarily store original argv to restore later
    const originalArgv = [...process.argv];
    
    // Set saveHtml flag if provided
    if (saveHtml === true || saveHtml === 'true' || saveHtml === '1') {
      process.argv.push('--save-html');
    }

    try {
      // Call the orchestrator function - it returns an array of results
      const results = await selectLocationAndSearchOnAllWebsites(product, location);
      
      // Restore original argv
      process.argv = originalArgv;
      
      // Extract data from HTML in results
      const { extractDataFromHtml } = await import('./location-selector-orchestrator.js');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extractedData = [];
      
      for (const result of results) {
        if (result.success && result.html) {
          console.log(`Processing ${result.website} HTML (${result.html.length} chars)...`);
          const extracted = await extractDataFromHtml(result.html, result.website, `${result.website}-${location.toLowerCase().replace(/\s+/g, '-')}-${product.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.html`);
          if (extracted && extracted.products && extracted.products.length > 0) {
            console.log(`  ✅ Extracted ${extracted.products.length} product(s) from ${result.website}`);
            extractedData.push(extracted);
          } else if (extracted) {
            console.log(`  ⚠️  No products extracted from ${result.website} (products: ${extracted.products?.length || 0})`);
            // Still add the result even if no products, to show location was found
            extractedData.push(extracted);
          } else {
            console.log(`  ❌ Failed to extract data from ${result.website}`);
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
          totalProducts: extractedData.reduce((sum, site) => sum + (site.products?.length || 0), 0)
        }
      });
    } catch (error) {
      // Restore original argv on error
      process.argv = originalArgv;
      throw error;
    }

  } catch (error) {
    console.error('Error in /api/scrape:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/extract
 * Extract data from existing HTML files
 * 
 * Query Parameters:
 *   - dir: Directory containing HTML files (default: 'output')
 */
app.get('/api/extract', async (req, res) => {
  try {
    const { dir = 'output' } = req.query;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`API Request: Extracting data from ${dir}`);
    console.log(`${'='.repeat(60)}\n`);

    // Lazy import - only load when actually needed (not at server startup)
    const { extractDataFromAllFiles } = await import('./html-data-selector.js');
    const results = extractDataFromAllFiles(dir);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      directory: dir,
      data: results,
      summary: {
        totalFiles: results.length,
        totalProducts: results.reduce((sum, site) => sum + (site.products?.length || 0), 0)
      }
    });

  } catch (error) {
    console.error('Error in /api/extract:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/info
 * Get API information and available endpoints - must return immediately
 */
app.get('/api/info', (req, res) => {
  // Return immediately without any async operations
  res.status(200).json({
    name: 'E-commerce Product Scraper API',
    version: '1.0.0',
    description: 'API for scraping product data from multiple e-commerce websites',
    endpoints: {
      'GET /api/health': 'Health check endpoint',
      'GET /api/scrape?product=<name>&location=<name>': 'Scrape products from all websites',
      'POST /api/scrape': 'Scrape products (POST with JSON body)',
      'GET /api/extract?dir=<directory>': 'Extract data from existing HTML files',
      'GET /api/info': 'Get API information'
    },
    supportedWebsites: ['D-Mart', 'JioMart', "Nature's Basket", 'Zepto', 'Swiggy'],
    example: {
      get: '/api/scrape?product=lays&location=RT%20Nagar',
      post: {
        url: '/api/scrape',
        body: {
          product: 'lays',
          location: 'RT Nagar',
          saveHtml: false
        }
      }
    }
  });
});

// Root endpoint - return immediately (no file serving to avoid blocking)
app.get('/', (req, res) => {
  res.json({
    name: 'E-commerce Product Scraper API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      info: '/api/info',
      scrape: '/api/scrape?product=<name>&location=<name>'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server immediately - no blocking operations before this
// Railway requires server to start within seconds
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Scraper API Server running on http://0.0.0.0:${PORT}`);
  console.log(`📖 API Documentation: http://0.0.0.0:${PORT}/api/info`);
  console.log(`📡 Listening on all interfaces (0.0.0.0) for Railway/Docker compatibility`);
  console.log(`✅ Server started successfully - ready to accept requests`);
  console.log(`${'='.repeat(60)}\n`);
});

// Handle server errors gracefully
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

export default app;
