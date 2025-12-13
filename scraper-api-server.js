/**
 * Express API Server for E-commerce Product Scraper
 * Railway-safe production version with non-blocking architecture
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Log startup immediately
console.log('🚀 Initializing Express server...');
console.log(`📡 Will listen on 0.0.0.0:${PORT}`);

// Middleware - minimal and fast
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware - must be fast
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// REMOVED: express.static - can block if directory doesn't exist
// If you need static files, add them conditionally or serve from CDN

// In-memory job store (for production, use Redis or a proper queue)
const jobs = new Map();
let jobCounter = 0;

/**
 * Health check - MUST return instantly (Railway requirement)
 * No async, no file I/O, no imports
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Scraper API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Root endpoint - MUST return instantly
 */
app.get('/', (req, res) => {
  // Return immediately - no async operations
  try {
    res.status(200).json({
      name: 'E-commerce Product Scraper API',
      status: 'running',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        info: '/api/info',
        scrape: '/api/scrape?product=<name>&location=<name>',
        jobStatus: '/api/job/<jobId>'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in root endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle favicon.ico to prevent 502s
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

/**
 * API Info - MUST return instantly
 */
app.get('/api/info', (req, res) => {
  res.status(200).json({
    name: 'E-commerce Product Scraper API',
    version: '1.0.0',
    description: 'API for scraping product data from multiple e-commerce websites',
    endpoints: {
      'GET /api/health': 'Health check endpoint (instant)',
      'GET /api/scrape?product=<name>&location=<name>': 'Start scraping job (returns immediately)',
      'GET /api/job/<jobId>': 'Check job status',
      'GET /api/info': 'Get API information (instant)'
    },
    supportedWebsites: ['D-Mart', 'JioMart', "Nature's Basket", 'Zepto', 'Swiggy'],
    note: 'Scraping jobs run in background. Use /api/job/<jobId> to check status.'
  });
});

/**
 * GET /api/scrape - Start scraping job (non-blocking)
 * Returns immediately with job ID, scraping happens in background
 */
app.get('/api/scrape', async (req, res) => {
  const { product, location, saveHtml } = req.query;

  // Validate immediately
  if (!product || !location) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters',
      message: 'Both "product" and "location" query parameters are required',
      example: '/api/scrape?product=lays&location=RT%20Nagar'
    });
  }

  // Create job immediately
  const jobId = `job-${Date.now()}-${++jobCounter}`;
  const job = {
    id: jobId,
    product,
    location,
    saveHtml: saveHtml === 'true' || saveHtml === '1',
    status: 'queued',
    createdAt: new Date().toISOString(),
    result: null,
    error: null
  };
  
  jobs.set(jobId, job);

  // Start scraping in background (don't await)
  scrapeInBackground(jobId, product, location, job.saveHtml).catch(err => {
    console.error(`Job ${jobId} failed:`, err);
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = err.message;
    }
  });

  // Return immediately with job ID
  res.status(202).json({
    success: true,
    message: 'Scraping job started',
    jobId: jobId,
    status: 'queued',
    checkStatus: `/api/job/${jobId}`,
    product,
    location,
    timestamp: job.createdAt
  });
});

/**
 * POST /api/scrape - Start scraping job (non-blocking)
 */
app.post('/api/scrape', async (req, res) => {
  const { product, location, saveHtml } = req.body;

  // Validate immediately
  if (!product || !location) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters',
      message: 'Both "product" and "location" in request body are required',
      example: { product: 'lays', location: 'RT Nagar' }
    });
  }

  // Create job immediately
  const jobId = `job-${Date.now()}-${++jobCounter}`;
  const job = {
    id: jobId,
    product,
    location,
    saveHtml: saveHtml === true || saveHtml === 'true' || saveHtml === '1',
    status: 'queued',
    createdAt: new Date().toISOString(),
    result: null,
    error: null
  };
  
  jobs.set(jobId, job);

  // Start scraping in background (don't await)
  scrapeInBackground(jobId, product, location, job.saveHtml).catch(err => {
    console.error(`Job ${jobId} failed:`, err);
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = err.message;
    }
  });

  // Return immediately with job ID
  res.status(202).json({
    success: true,
    message: 'Scraping job started',
    jobId: jobId,
    status: 'queued',
    checkStatus: `/api/job/${jobId}`,
    product,
    location,
    timestamp: job.createdAt
  });
});

/**
 * GET /api/job/:jobId - Check job status
 */
app.get('/api/job/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
      jobId
    });
  }

  // Return job status (instant)
  res.status(200).json({
    success: true,
    jobId: job.id,
    status: job.status,
    product: job.product,
    location: job.location,
    createdAt: job.createdAt,
    result: job.result,
    error: job.error
  });
});

/**
 * Background scraping function - runs asynchronously
 * This does NOT block the request handler
 */
async function scrapeInBackground(jobId, product, location, saveHtml) {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'processing';
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Job ${jobId}: Scraping "${product}" in "${location}"`);
    console.log(`${'='.repeat(60)}\n`);

    // Lazy import - only when actually needed
    const { selectLocationAndSearchOnAllWebsites } = await import('./location-selector-orchestrator.js');

    // Store original argv (request-scoped, not global)
    const originalArgv = [...process.argv];
    
    // Set saveHtml flag if provided (request-scoped)
    if (saveHtml) {
      process.argv.push('--save-html');
    }

    try {
      // Call the orchestrator function
      const results = await selectLocationAndSearchOnAllWebsites(product, location);
      
      // Restore original argv
      process.argv = originalArgv;
      
      // Extract data from HTML
      const { extractDataFromHtml } = await import('./location-selector-orchestrator.js');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extractedData = [];
      
      for (const result of results) {
        if (result.success && result.html) {
          console.log(`Job ${jobId}: Processing ${result.website} HTML...`);
          const extracted = await extractDataFromHtml(
            result.html, 
            result.website, 
            `${result.website}-${location.toLowerCase().replace(/\s+/g, '-')}-${product.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.html`
          );
          if (extracted && extracted.products && extracted.products.length > 0) {
            console.log(`Job ${jobId}: ✅ Extracted ${extracted.products.length} product(s) from ${result.website}`);
            extractedData.push(extracted);
          } else if (extracted) {
            extractedData.push(extracted);
          }
        }
      }

      // Update job with result
      job.status = 'completed';
      job.result = {
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
      };

      console.log(`Job ${jobId}: ✅ Completed successfully`);
    } catch (error) {
      process.argv = originalArgv;
      throw error;
    }
  } catch (error) {
    console.error(`Job ${jobId}: ❌ Error:`, error);
    job.status = 'failed';
    job.error = error.message;
  }
}

/**
 * GET /api/extract - Extract data from existing HTML files
 * This can be slow, so we'll make it async but still return quickly
 */
app.get('/api/extract', async (req, res) => {
  const { dir = 'output' } = req.query;

  // Start extraction in background
  const jobId = `extract-${Date.now()}-${++jobCounter}`;
  const job = {
    id: jobId,
    directory: dir,
    status: 'processing',
    createdAt: new Date().toISOString(),
    result: null,
    error: null
  };
  
  jobs.set(jobId, job);

  // Extract in background
  (async () => {
    try {
      const { extractDataFromAllFiles } = await import('./html-data-selector.js');
      const results = extractDataFromAllFiles(dir);
      job.status = 'completed';
      job.result = {
        success: true,
        timestamp: new Date().toISOString(),
        directory: dir,
        data: results,
        summary: {
          totalFiles: results.length,
          totalProducts: results.reduce((sum, site) => sum + (site.products?.length || 0), 0)
        }
      };
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
    }
  })();

  // Return immediately
  res.status(202).json({
    success: true,
    message: 'Extraction job started',
    jobId: jobId,
    checkStatus: `/api/job/${jobId}`,
    directory: dir
  });
});

// Clean up old jobs (keep last 100) - start after server is ready
// Use setTimeout to ensure server starts first
setTimeout(() => {
  setInterval(() => {
    if (jobs.size > 100) {
      const jobsArray = Array.from(jobs.entries());
      jobsArray.sort((a, b) => new Date(a[1].createdAt) - new Date(b[1].createdAt));
      const toDelete = jobsArray.slice(0, jobsArray.length - 100);
      toDelete.forEach(([id]) => jobs.delete(id));
      console.log(`Cleaned up ${toDelete.length} old jobs`);
    }
  }, 60000); // Every minute
}, 5000); // Start cleanup after 5 seconds

// Handle uncaught errors to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - let server keep running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - let server keep running
});

// Start server IMMEDIATELY - this must succeed
let server;
try {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Scraper API Server running on http://0.0.0.0:${PORT}`);
    console.log(`📖 API Documentation: http://0.0.0.0:${PORT}/api/info`);
    console.log(`📡 Listening on all interfaces (0.0.0.0) for Railway/Docker compatibility`);
    console.log(`✅ Server started successfully - ready to accept requests`);
    console.log(`⚡ All endpoints respond instantly - scraping runs in background`);
    console.log(`⏱️  Server listening on port ${PORT}`);
    console.log(`${'='.repeat(60)}\n`);
  });

  // Handle server errors
  server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error('Unknown server error:', error);
      // Try to keep running
    }
  });

  // Verify server is actually listening
  server.on('listening', () => {
    const addr = server.address();
    console.log(`✅ Server is listening on ${addr.address}:${addr.port}`);
  });

} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

export default app;
