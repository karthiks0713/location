import { chromium } from 'playwright';
import readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';
import * as fs from 'fs';

// Helper to determine if we should run headless
const isHeadless = process.env.HEADLESS === 'true' || process.env.DOCKER === 'true' || fs.existsSync('/.dockerenv');

/**
 * Robust Playwright script to automate location selection on Nature's Basket
 * Based on MCP Selenium implementation - uses proven selectors
 * 
 * Features:
 * - Multiple selector fallbacks for reliability
 * - Slow typing for better form interaction
 * - Screenshot capture at key points
 * - Reload verification
 * - HTML export
 * - Waits for user input before closing
 */
async function selectLocationOnNaturesBasket(locationName, productName = 'tomato') {
  console.log(`[NATURESBASKET] ========================================`);
  console.log(`[NATURESBASKET] Starting Nature's Basket scraper`);
  console.log(`[NATURESBASKET] Product: ${productName}`);
  console.log(`[NATURESBASKET] Location: ${locationName}`);
  console.log(`[NATURESBASKET] ========================================`);
  
  // Construct search URL from product name
  const searchUrl = `https://www.naturesbasket.co.in/search?q=${encodeURIComponent(productName)}`;
  // Launch Chrome browser - opens only once
  let browser;
  let context;
  let page;
  
  try {
    console.log(`[NATURESBASKET] Launching browser (headless: ${isHeadless})...`);
    try {
      // Try with Chrome channel first (if available)
      browser = await chromium.launch({
        headless: isHeadless,
        channel: 'chrome',
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
      console.log(`[NATURESBASKET] ✓ Browser launched successfully (Chrome channel)`);
    } catch (channelError) {
      // Fallback to bundled Chromium (works in all environments)
      console.log(`[NATURESBASKET] ⚠️  Chrome channel not available: ${channelError.message}`);
      console.log(`[NATURESBASKET] Using bundled Chromium instead...`);
      try {
        browser = await chromium.launch({
          headless: isHeadless,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ]
        });
        console.log(`[NATURESBASKET] ✓ Browser launched successfully (bundled Chromium)`);
      } catch (fallbackError) {
        console.error(`[NATURESBASKET] ❌ Bundled Chromium also failed: ${fallbackError.message}`);
        throw new Error(`[NATURESBASKET] Browser launch failed with both Chrome channel and bundled Chromium: ${fallbackError.message}`);
      }
    }

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    console.log(`[NATURESBASKET] ✓ Browser context created`);

    page = await context.newPage();
    console.log(`[NATURESBASKET] ✓ New page created`);
    
    // Small delay to ensure browser is fully initialized
    await page.waitForTimeout(500);
    
    // Verify browser is still open
    if (!browser.isConnected()) {
      throw new Error('Browser disconnected immediately after launch');
    }
  } catch (launchError) {
    console.error(`[NATURESBASKET] ❌ Failed to launch browser: ${launchError.message}`);
    if (launchError.stack) {
      console.error(`[NATURESBASKET] Browser launch error stack: ${launchError.stack}`);
    }
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    throw new Error(`[NATURESBASKET] Browser launch failed: ${launchError.message}`);
  }

  try {
    // Verify browser is still connected before navigation
    if (!browser.isConnected()) {
      throw new Error('Browser disconnected before navigation');
    }
    
    console.log(`[NATURESBASKET] Step 1: Navigating to Nature's Basket search page...`);
    console.log(`[NATURESBASKET] URL: ${searchUrl}`);
    // Navigate to Nature's Basket search page
    const response = await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    if (!response || !response.ok()) {
      const status = response ? response.status() : 'unknown';
      console.warn(`[NATURESBASKET] ⚠️  Page returned status ${status}, continuing anyway...`);
    } else {
      console.log(`[NATURESBASKET] ✓ Page loaded successfully (status: ${response.status()})`);
    }
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log(`[NATURESBASKET] Network idle timeout, continuing...`);
    });
    await page.waitForTimeout(3000);
    console.log(`[NATURESBASKET] ✓ Page fully loaded`);

    console.log(`[NATURESBASKET] Step 2: Opening location selector...`);
    // Step 1: Find and click location selector
    // Proven MCP selector: //*[contains(text(), 'Select Location')]
    const locationSelectors = [
      'xpath=//*[contains(text(), "Select Location")]',
      'text=Select Location',
      '*:has-text("Select Location")',
      'button:has-text("Select Location")',
      'span:has-text("Select Location")',
      'xpath=//*[contains(text(), "Location")]',
      'xpath=//button[contains(text(), "Location")]'
    ];

    let locationClicked = false;
    for (const selector of locationSelectors) {
      try {
        if (selector.startsWith('xpath=')) {
          const xpath = selector.replace('xpath=', '');
          await page.waitForSelector(xpath, { timeout: 5000 });
          await page.click(xpath, { timeout: 5000 });
          locationClicked = true;
          console.log(`[NATURESBASKET] ✓ Location selector clicked using: ${selector}`);
          break;
        } else {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 5000 })) {
            await element.click({ timeout: 5000 });
            locationClicked = true;
            console.log(`✓ Location selector clicked using: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!locationClicked) {
      // Save debug info
      try {
        await page.screenshot({ path: 'naturesbasket-debug-location-not-found.png', fullPage: true });
        const pageContent = await page.content();
        fs.writeFileSync('naturesbasket-debug-page-source.html', pageContent, 'utf8');
        console.log(`[NATURESBASKET] Debug files saved: naturesbasket-debug-location-not-found.png, naturesbasket-debug-page-source.html`);
      } catch (e) {
        console.log(`[NATURESBASKET] Could not save debug files: ${e.message}`);
      }
      throw new Error('[NATURESBASKET] Location selector not found after trying all selectors. Check debug screenshots.');
    }

    console.log(`[NATURESBASKET] Step 3: Waiting for location modal to open...`);
    await page.waitForTimeout(2000);

    // Step 4: Find location input field - try multiple strategies
    // The dialog might not have role="dialog" or might be in a different structure
    const locationInputSelectors = [
      'xpath=//div[@role=\'dialog\']//input[@type=\'text\']',
      'xpath=//div[@role="dialog"]//input[@type="text"]',
      'div[role="dialog"] input[type="text"]',
      'div[role="dialog"] input',
      'xpath=//div[contains(@class, "modal")]//input[@type="text"]',
      'xpath=//div[contains(@class, "dialog")]//input[@type="text"]',
      'xpath=//input[@type="text"][contains(@placeholder, "location") or contains(@placeholder, "search") or contains(@placeholder, "area")]',
      'input[type="text"][placeholder*="location" i]',
      'input[type="text"][placeholder*="search" i]',
      'input[type="text"][placeholder*="area" i]',
      'xpath=//input[@type=\'text\' or @type=\'search\']',
      'input[type="text"]'
    ];

    // Wait for any input or dialog to appear (more flexible)
    // Don't wait strictly - just try to find inputs immediately
    console.log(`[NATURESBASKET] Looking for location input (no strict wait)...`);

    let locationInput = null;
    
    // Try to find input without strict waiting - just check if visible
    for (const selector of locationInputSelectors) {
      try {
        let input;
        if (selector.startsWith('xpath=')) {
          const xpath = selector.replace('xpath=', '');
          input = page.locator(xpath).first();
        } else {
          input = page.locator(selector).first();
        }
        
        // Check visibility with short timeout, don't wait strictly
        const isVisible = await Promise.race([
          input.isVisible({ timeout: 1000 }),
          Promise.resolve(false)
        ]).catch(() => false);
        
        if (isVisible) {
          locationInput = input;
          console.log(`[NATURESBASKET] ✓ Found location input using: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // If standard selectors failed, try broader search immediately
    if (!locationInput) {
      console.log(`[NATURESBASKET] ⚠️  Standard selectors failed, trying broader search...`);
      try {
        // Get all inputs without waiting
        const allInputs = await page.locator('input[type="text"], input[type="search"], input').all();
        console.log(`[NATURESBASKET] Found ${allInputs.length} total input elements`);
        
        for (let i = 0; i < Math.min(5, allInputs.length); i++) {
          try {
            const input = allInputs[i];
            const isVisible = await Promise.race([
              input.isVisible({ timeout: 1000 }),
              Promise.resolve(false)
            ]).catch(() => false);
            
            if (isVisible) {
              const placeholder = await input.getAttribute('placeholder').catch(() => '');
              if (placeholder && (placeholder.toLowerCase().includes('location') || 
                                  placeholder.toLowerCase().includes('search') ||
                                  placeholder.toLowerCase().includes('area'))) {
                locationInput = input;
                console.log(`[NATURESBASKET] ✓ Found location input by placeholder: "${placeholder}"`);
                break;
              } else if (i === 0) {
                // Use first visible input as fallback
                locationInput = input;
                console.log(`[NATURESBASKET] ✓ Using first visible input as fallback`);
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      } catch (e) {
        console.log(`[NATURESBASKET] Broader search also failed: ${e.message}`);
      }
    }

    if (!locationInput) {
      // Save debug info
      try {
        await page.screenshot({ path: 'naturesbasket-debug-input-not-found.png', fullPage: true });
        const pageContent = await page.content();
        fs.writeFileSync('naturesbasket-debug-input-page.html', pageContent, 'utf8');
        console.log(`[NATURESBASKET] Debug files saved: naturesbasket-debug-input-not-found.png, naturesbasket-debug-input-page.html`);
      } catch (e) {
        console.log(`[NATURESBASKET] Could not save debug files: ${e.message}`);
      }
      throw new Error('[NATURESBASKET] Location input field not found after trying all selectors. Check debug screenshots.');
    }

    console.log(`[NATURESBASKET] Step 4: Clicking location input field...`);
    // Click and focus the input
    await locationInput.click({ force: true });
    await page.waitForTimeout(500);

    // Clear any existing text
    await locationInput.fill('');
    await page.waitForTimeout(200);

    console.log(`[NATURESBASKET] Step 5: Typing location: ${locationName}`);
    // Type slowly character by character (as done in MCP with slowly=true)
    // This ensures better reliability with dynamic forms
    for (const char of locationName) {
      await locationInput.type(char, { delay: 100 });
    }
    await page.waitForTimeout(500);

    console.log(`[NATURESBASKET] Step 6: Waiting for location suggestions to appear...`);
    await page.waitForTimeout(1500);

    // Step 7: Find and click location suggestion
    let suggestionClicked = false;
    
    // Generate location name variations to handle different formats
    const locationVariations = [
      locationName,                           // Exact: "RT Nagar"
      locationName.replace(/\s+/g, ''),      // No spaces: "RTNagar"
      locationName.replace(/\s+/g, ' '),     // Normalized: "RT Nagar"
      locationName.toLowerCase(),             // Lowercase: "rt nagar"
      locationName.toUpperCase(),             // Uppercase: "RT NAGAR"
      locationName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') // Title case
    ];
    
    // Remove duplicates
    const uniqueVariations = [...new Set(locationVariations)];
    
    // Build multiple selector strategies
    const suggestionSelectors = [];
    
    for (const loc of uniqueVariations) {
      // Strategy 1: In dialog, excluding airport/railway/station
      suggestionSelectors.push(`xpath=//div[@role='dialog']//*[contains(text(), '${loc}') and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'airport')) and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'railway')) and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'station'))]`);
      
      // Strategy 2: In dialog, any element
      suggestionSelectors.push(`xpath=//div[@role='dialog']//*[contains(text(), '${loc}')]`);
      
      // Strategy 3: List items in dialog
      suggestionSelectors.push(`xpath=//div[@role='dialog']//li[contains(text(), '${loc}')]`);
      
      // Strategy 4: Divs in dialog
      suggestionSelectors.push(`xpath=//div[@role='dialog']//div[contains(text(), '${loc}')]`);
      
      // Strategy 5: Playwright has-text
      suggestionSelectors.push(`div[role="dialog"] *:has-text("${loc}")`);
      
      // Strategy 6: Text locator
      suggestionSelectors.push(`text=${loc}`);
    }

    for (const selector of suggestionSelectors) {
      try {
        let suggestion;
        if (selector.startsWith('xpath=') || selector.startsWith('//')) {
          const xpath = selector.startsWith('xpath=') ? selector.replace('xpath=', '') : selector;
          suggestion = page.locator(xpath).first();
        } else {
          suggestion = page.locator(selector).first();
        }
        
        await suggestion.waitFor({ timeout: 3000, state: 'visible' });
        if (await suggestion.isVisible({ timeout: 2000 })) {
          // Scroll into view
          await suggestion.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          
          // Try regular click
          try {
            await suggestion.click({ timeout: 2000 });
            suggestionClicked = true;
            console.log(`[NATURESBASKET] ✓ Location suggestion clicked: ${locationName}`);
            break;
          } catch (e) {
            // Try force click
            try {
              await suggestion.click({ timeout: 2000, force: true });
              suggestionClicked = true;
              console.log(`[NATURESBASKET] ✓ Location suggestion clicked (force): ${locationName}`);
              break;
            } catch (e2) {
              // Try JavaScript click
              const elementHandle = await suggestion.elementHandle();
              if (elementHandle) {
                await elementHandle.click();
                suggestionClicked = true;
                console.log(`[NATURESBASKET] ✓ Location suggestion clicked (JS): ${locationName}`);
                break;
              }
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!suggestionClicked) {
      // Save debug info
      try {
        await page.screenshot({ path: 'naturesbasket-debug-suggestion-not-found.png', fullPage: true });
        const pageContent = await page.content();
        fs.writeFileSync('naturesbasket-debug-suggestion-page.html', pageContent, 'utf8');
        console.log(`[NATURESBASKET] Debug files saved: naturesbasket-debug-suggestion-not-found.png, naturesbasket-debug-suggestion-page.html`);
      } catch (e) {
        console.log(`[NATURESBASKET] Could not save debug files: ${e.message}`);
      }
      throw new Error(`[NATURESBASKET] Could not click location suggestion for: ${locationName}. Check debug screenshots.`);
    }

    console.log(`[NATURESBASKET] Step 8: Waiting for location to be applied...`);
    await page.waitForTimeout(1000);

    // Step 9: Find and click confirm location button
    // Proven MCP selector: //div[@role='dialog']//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'confirm')]
    console.log(`[NATURESBASKET] Step 9: Clicking confirm location button...`);
    let confirmClicked = false;
    
    const confirmSelectors = [
      'xpath=//div[@role=\'dialog\']//button[contains(translate(., \'ABCDEFGHIJKLMNOPQRSTUVWXYZ\', \'abcdefghijklmnopqrstuvwxyz\'), \'confirm\')]',
      'xpath=//button[contains(translate(text(), \'ABCDEFGHIJKLMNOPQRSTUVWXYZ\', \'abcdefghijklmnopqrstuvwxyz\'), \'confirm location\')]',
      'xpath=//button[contains(text(), \'CONFIRM LOCATION\')]',
      'xpath=//button[contains(text(), \'Confirm Location\')]',
      'button:has-text("CONFIRM LOCATION")',
      'button:has-text("Confirm Location")'
    ];

    for (const selector of confirmSelectors) {
      try {
        if (selector.startsWith('xpath=')) {
          const xpath = selector.replace('xpath=', '');
          const confirmButton = page.locator(xpath).first();
          await confirmButton.waitFor({ timeout: 5000, state: 'visible' });
          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click({ timeout: 2000, force: true });
            confirmClicked = true;
            console.log(`[NATURESBASKET] ✓ Confirm location button clicked using: ${selector}`);
            break;
          }
        } else {
          const confirmButton = page.locator(selector).first();
          if (await confirmButton.isVisible({ timeout: 5000 })) {
            await confirmButton.click({ timeout: 2000, force: true });
            confirmClicked = true;
            console.log(`[NATURESBASKET] ✓ Confirm location button clicked using: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!confirmClicked) {
      console.log(`[NATURESBASKET] ⚠️  Warning: Could not find confirm button, continuing anyway...`);
    } else {
      console.log(`[NATURESBASKET] ✓ Confirm button clicked`);
    }

    console.log(`[NATURESBASKET] Step 10: Waiting for location to be confirmed...`);
    await page.waitForTimeout(2000);

    // Step 11: Wait for products to load (if they appear on the same page)
    console.log(`[NATURESBASKET] Step 11: Waiting for products to load...`);
    try {
      await page.waitForSelector('[class*="product"], [class*="item"], a[href*="/product-detail/"]', {
        timeout: 10000
      });
      console.log(`[NATURESBASKET] ✓ Products detected on page`);
    } catch (e) {
      console.log(`[NATURESBASKET] ⚠️  Products not immediately visible, continuing...`);
    }

    // Step 12: Reload page to verify location persists and get fresh results
    console.log(`[NATURESBASKET] Step 12: Reloading page to get location-specific results...`);
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      console.log(`[NATURESBASKET] Network idle timeout, continuing...`);
    });
    await page.waitForTimeout(4000);

    // Wait for product elements to appear
    try {
      await page.waitForSelector('[class*="product"], [class*="item"], a[href*="/product-detail/"]', {
        timeout: 10000
      });
      console.log(`[NATURESBASKET] ✓ Page loaded with products`);
    } catch (e) {
      console.log(`[NATURESBASKET] ⚠️  Products may not be visible, continuing anyway...`);
    }

    // Step 13: Take screenshot after reload
    const screenshotAfterReloadPath = `naturesbasket-${locationName.toLowerCase().replace(/\s+/g, '-')}-after-reload.png`;
    await page.screenshot({ path: screenshotAfterReloadPath, fullPage: true });
    console.log(`[NATURESBASKET] ✓ Screenshot after reload saved: ${screenshotAfterReloadPath}`);

    // Step 14: Get the HTML of the final page
    console.log(`[NATURESBASKET] Step 14: Getting final page HTML...`);
    const pageHtml = await page.content();
    console.log(`[NATURESBASKET] HTML retrieved: ${pageHtml.length} characters`);
    
    // Ensure output directory exists
    const outputDir = 'output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const htmlPath = path.join(outputDir, `naturesbasket-${locationName.toLowerCase().replace(/\s+/g, '-')}-${productName.toLowerCase().replace(/\s+/g, '-')}-search-results.html`);
    fs.writeFileSync(htmlPath, pageHtml, 'utf8');
    console.log(`[NATURESBASKET] ✓ Search results HTML saved: ${htmlPath}`);

    console.log(`[NATURESBASKET] ========================================`);
    console.log(`[NATURESBASKET] ✅ SUCCESS!`);
    console.log(`[NATURESBASKET] Location "${locationName}" selected and product "${productName}" searched successfully!`);
    console.log(`[NATURESBASKET] HTML length: ${pageHtml.length} characters`);
    console.log(`[NATURESBASKET] ========================================`);
    
    // Close browser AFTER HTML is retrieved
    console.log(`[NATURESBASKET] Closing browser...`);
    await browser.close();
    console.log(`[NATURESBASKET] Browser closed.`);

    // Return the HTML
    return pageHtml;

  } catch (error) {
    console.error(`\n${'='.repeat(60)}`);
    console.error(`[NATURESBASKET] ❌ ERROR OCCURRED`);
    console.error(`${'='.repeat(60)}`);
    console.error(`[NATURESBASKET] Error Message: ${error.message}`);
    console.error(`[NATURESBASKET] Error Type: ${error.constructor.name}`);
    if (error.stack) {
      console.error(`[NATURESBASKET] Error Stack:`);
      console.error(error.stack);
    }
    console.error(`[NATURESBASKET] Product: ${productName}`);
    console.error(`[NATURESBASKET] Location: ${locationName}`);
    console.error(`${'='.repeat(60)}\n`);
    
    try {
      // Save multiple debug files with detailed info
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const debugDir = 'naturesbasket-debug';
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      // Screenshot
      try {
        if (page) {
          await page.screenshot({ 
            path: path.join(debugDir, `naturesbasket-error-${timestamp}.png`), 
            fullPage: true 
          });
          console.error(`[NATURESBASKET] ✓ Error screenshot saved: naturesbasket-debug/naturesbasket-error-${timestamp}.png`);
        }
      } catch (e) {
        console.error(`[NATURESBASKET] Could not save screenshot: ${e.message}`);
      }
      
      // HTML
      try {
        if (page) {
          const pageContent = await page.content();
          fs.writeFileSync(
            path.join(debugDir, `naturesbasket-error-${timestamp}.html`), 
            pageContent, 
            'utf8'
          );
          console.error(`[NATURESBASKET] ✓ Error HTML saved: naturesbasket-debug/naturesbasket-error-${timestamp}.html`);
        }
      } catch (e) {
        console.error(`[NATURESBASKET] Could not save HTML: ${e.message}`);
      }
      
      // Page info
      try {
        if (page) {
          const pageUrl = page.url();
          const pageTitle = await page.title();
          console.error(`[NATURESBASKET] Error occurred at URL: ${pageUrl}`);
          console.error(`[NATURESBASKET] Page title: ${pageTitle}`);
        }
      } catch (e) {
        console.error(`[NATURESBASKET] Could not get page info: ${e.message}`);
      }
      
      // Save error details to JSON
      try {
        const errorDetails = {
          timestamp: new Date().toISOString(),
          error: {
            message: error.message,
            type: error.constructor.name,
            stack: error.stack
          },
          context: {
            product: productName,
            location: locationName,
            url: page ? await page.url().catch(() => 'unknown') : 'unknown',
            title: page ? await page.title().catch(() => 'unknown') : 'unknown'
          }
        };
        fs.writeFileSync(
          path.join(debugDir, `naturesbasket-error-${timestamp}.json`),
          JSON.stringify(errorDetails, null, 2),
          'utf8'
        );
        console.error(`[NATURESBASKET] ✓ Error details saved: naturesbasket-debug/naturesbasket-error-${timestamp}.json`);
      } catch (e) {
        console.error(`[NATURESBASKET] Could not save error details: ${e.message}`);
      }
    } catch (e) {
      console.error(`[NATURESBASKET] Could not save error debug files: ${e.message}`);
    }
    
    // Close browser on error
    try {
      if (browser && browser.isConnected()) {
    await browser.close();
        console.error('[NATURESBASKET] Browser closed after error.');
      }
    } catch (e) {
      // Ignore if already closed
      console.error(`[NATURESBASKET] Browser close error (ignored): ${e.message}`);
    }
    
    // Re-throw with more context
    throw new Error(`[NATURESBASKET] ${error.message}. Check naturesbasket-debug/ folder for detailed error information.`);
  }
}

// Helper function to wait for Enter key press
function waitForEnter() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\nPress Enter to close the browser...', () => {
      rl.close();
      resolve();
    });
  });
}

// Main execution
async function main() {
  const locations = ['Mumbai', 'Bangalore', 'Chennai', 'Madurai'];
  
  // Get location and product from command line arguments
  const locationToSelect = process.argv[2] || locations[0];
  const productName = process.argv[3] || 'tomato';
  
  console.log(`\n🚀 Starting Nature's Basket location selection`);
  console.log(`📍 Location: ${locationToSelect}`);
  console.log(`🛍️ Product: ${productName}\n`);
  
  const pageHtml = await selectLocationOnNaturesBasket(locationToSelect, productName);
  console.log(`\n📊 Page HTML length: ${pageHtml.length} characters`);
  return pageHtml;
}

// Run the script only if called directly (not when imported as a module)
const __filename = fileURLToPath(import.meta.url);
const __basename = path.basename(__filename);

let isMainModule = false;
if (process.argv[1]) {
  try {
    const mainFile = path.resolve(process.argv[1]);
    const currentFile = path.resolve(__filename);
    isMainModule = mainFile === currentFile || path.basename(mainFile) === __basename;
  } catch (e) {
    isMainModule = process.argv[1].endsWith('naturesbasket-location-selector.js') || 
                   process.argv[1].includes('naturesbasket-location-selector.js');
  }
}

if (isMainModule) {
  main().catch(console.error);
}

export { selectLocationOnNaturesBasket };
