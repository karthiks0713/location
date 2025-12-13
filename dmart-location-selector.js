import { chromium } from 'playwright';
import * as fs from 'fs';
import path from 'path';

/**
 * Playwright script to automate location selection and product search on D-Mart
 * This script:
 * 1. Opens D-Mart search page
 * 2. Selects a location
 * 3. Searches for the product
 * 4. Returns the final HTML of search results
 * 5. Closes browser when done
 */
async function selectLocationAndSearchOnDmart(locationName, productName = 'potato') {
  // Launch Chrome browser - use headless in Docker or if HEADLESS env var is set
  const isHeadless = process.env.HEADLESS === 'true' || process.env.DOCKER === 'true' || fs.existsSync('/.dockerenv');
  const browser = await chromium.launch({
    headless: isHeadless,
    channel: 'chrome' // Use Chrome browser
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log(`Navigating to D-Mart search page...`);
    // Navigate to D-Mart search page with product
    await page.goto(`https://www.dmart.in/search?searchTerm=${encodeURIComponent(productName)}`, {
      waitUntil: 'load',
      timeout: 60000 // Increase timeout to 60 seconds
    });
    
    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(2000);

    console.log(`Opening location selector...`);
    // Click on the location selector using XPath selector found via MCP
    // Selector: //*[contains(@class, 'location') or contains(@id, 'location')]
    let locationClicked = false;
    try {
      const locationSelector = page.locator('xpath=//*[contains(@class, "location") or contains(@id, "location")]').first();
      if (await locationSelector.isVisible({ timeout: 5000 })) {
        await locationSelector.click({ timeout: 5000 });
        locationClicked = true;
        console.log(`Location selector clicked using XPath`);
      }
    } catch (e) {
      // Fallback: try CSS selector
      try {
        const fallbackSelector = page.locator('*[class*="location" i]').first();
        if (await fallbackSelector.isVisible({ timeout: 5000 })) {
          await fallbackSelector.click({ timeout: 5000 });
          locationClicked = true;
          console.log(`Location selector clicked using CSS fallback`);
        }
      } catch (e2) {
        throw new Error('Location selector not found');
      }
    }

    if (!locationClicked) {
      throw new Error('Location selector not found');
    }

    console.log(`Waiting for location modal to open...`);
    // Wait for the location input field in the dialog
    // Selector found via MCP: //div[@role='dialog']//input[@type='text']
    await page.waitForSelector('div[role="dialog"] input[type="text"]', {
      timeout: 10000
    });

    console.log(`Typing location: ${locationName}`);
    // Find and interact with the location input in the dialog
    const locationInput = page.locator('div[role="dialog"] input[type="text"]').first();
    await locationInput.click();
    await locationInput.fill(locationName);
    
    console.log(`Waiting for location suggestions to appear...`);
    // Wait a bit for suggestions to load
    await page.waitForTimeout(1000);
    
    // Wait for suggestions to appear and select the location
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
    
    // Build multiple XPath strategies
    const suggestionStrategies = [];
    
    for (const loc of uniqueVariations) {
      // Strategy 1: In ul elements, excluding airport/railway/station/temple
      suggestionStrategies.push(`xpath=//ul//*[contains(text(), '${loc}') and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'airport')) and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'railway')) and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'station')) and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'temple'))]`);
      
      // Strategy 2: In list items
      suggestionStrategies.push(`xpath=//li[contains(text(), '${loc}')]`);
      
      // Strategy 3: In divs within dialog
      suggestionStrategies.push(`xpath=//div[@role='dialog']//div[contains(text(), '${loc}')]`);
      
      // Strategy 4: Any element with location text (excluding input)
      suggestionStrategies.push(`xpath=//*[contains(text(), '${loc}') and not(self::input) and not(ancestor::input)]`);
      
      // Strategy 5: Playwright text locator
      suggestionStrategies.push(`text=${loc}`);
    }
    
    // Try each strategy
    for (const selector of suggestionStrategies) {
      try {
        let suggestion;
        if (selector.startsWith('xpath=')) {
          const xpath = selector.replace('xpath=', '');
          suggestion = page.locator(xpath).first();
        } else {
          suggestion = page.locator(selector).first();
        }
        
        if (await suggestion.isVisible({ timeout: 3000 })) {
          // Scroll into view
          await suggestion.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          
          // Try regular click
          try {
            await suggestion.click({ timeout: 2000 });
            suggestionClicked = true;
            console.log(`✓ Location suggestion clicked: ${locationName} using ${selector.substring(0, 50)}...`);
            break;
          } catch (e) {
            // Try force click
            try {
              await suggestion.click({ timeout: 2000, force: true });
              suggestionClicked = true;
              console.log(`✓ Location suggestion clicked (force): ${locationName} using ${selector.substring(0, 50)}...`);
              break;
            } catch (e2) {
              // Try JavaScript click
              await page.evaluate((el) => el.click(), await suggestion.elementHandle());
              suggestionClicked = true;
              console.log(`✓ Location suggestion clicked (JS): ${locationName} using ${selector.substring(0, 50)}...`);
              break;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!suggestionClicked) {
      throw new Error(`Could not click location suggestion for: ${locationName}`);
    }

    console.log(`Waiting for location to be applied...`);
    // Wait a moment for the location to be applied
    await page.waitForTimeout(1000);

    console.log(`Clicking confirm location button...`);
    // Wait a moment for the confirm button to appear
    await page.waitForTimeout(500);
    
    // Find and click the "CONFIRM" button
    // Selector found via MCP: //button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'confirm')]
    let confirmClicked = false;
    
    const confirmSelectors = [
      'xpath=//button[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "confirm")]',
      'button:has-text("CONFIRM")',
      'button:has-text("Confirm")',
      'button:has-text("confirm")'
    ];

    for (const selector of confirmSelectors) {
      try {
        const confirmButton = page.locator(selector).first();
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click({ timeout: 2000 });
          confirmClicked = true;
          console.log(`Confirm location button clicked using: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!confirmClicked) {
      console.log(`Warning: Could not find confirm button`);
    }

    console.log(`Waiting for location to be confirmed...`);
    // Wait a moment for the location to be confirmed
    await page.waitForTimeout(2000);

    // After location is confirmed, search for the product
    console.log(`Searching for product: ${productName}...`);
    
    // Find the search input field
    // Selector found via MCP: //input[@id='scrInput']
    const searchInputSelectors = [
      'input#scrInput',
      'input[type="text"][id="scrInput"]',
      'xpath=//input[@id="scrInput"]'
    ];
    
    let searchInput = null;
    for (const selector of searchInputSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 5000 })) {
          searchInput = input;
          console.log(`Found search input using: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!searchInput) {
      console.log(`Warning: Could not find search input, navigating directly to search URL...`);
      // Fallback: navigate directly to search URL with location set
      await page.goto(`https://www.dmart.in/search?searchTerm=${encodeURIComponent(productName)}`, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      await page.waitForTimeout(3000);
    } else {
      // Clear and fill the search input
      await searchInput.fill('');
      await searchInput.fill(productName);
      await page.waitForTimeout(500);
      
      // Find and click the search button
      // Selector found via MCP: //button[contains(@class, 'searchButton') or contains(@class, 'search')]
      const searchButtonSelectors = [
        'xpath=//button[contains(@class, "searchButton") or contains(@class, "search")]',
        'button[class*="searchButton"]',
        'button[class*="search"]'
      ];
      
      let searchButtonClicked = false;
      for (const selector of searchButtonSelectors) {
        try {
          const searchButton = page.locator(selector).first();
          if (await searchButton.isVisible({ timeout: 2000 })) {
            await searchButton.click({ timeout: 2000 });
            searchButtonClicked = true;
            console.log(`Search button clicked using: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!searchButtonClicked) {
        // Fallback: Press Enter
        console.log(`Pressing Enter to search for: ${productName}...`);
        await searchInput.press('Enter');
        console.log(`✓ Enter pressed`);
      }
      
      // Wait for search results to load - wait for navigation or results to appear
      console.log(`Waiting for search results to load...`);
      
      // Wait for either navigation to complete or search results to appear
      try {
        // Wait for page to navigate (if it does) or for search results container
        await Promise.race([
          page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
          page.waitForSelector('div[class*="product"], div[class*="item"], div[class*="result"], [class*="vertical-card"], [class*="stretched-card"]', {
            timeout: 10000
          })
        ]);
        console.log(`✓ Search results loaded`);
      } catch (e) {
        // Fallback: wait a bit more
        console.log(`Waiting additional time for search results...`);
        await page.waitForTimeout(2000);
        console.log(`✓ Proceeding with search results`);
      }
    }

    // Wait for product elements to be fully rendered (like JioMart does)
    console.log(`Waiting for product elements to render...`);
    try {
      // Wait for product cards or items to appear
      await page.waitForSelector('[class*="vertical-card"], [class*="stretched-card"], [class*="product"], [class*="item"]', {
        timeout: 10000
      });
      console.log(`✓ Product elements found`);
    } catch (e) {
      console.log(`⚠️  Product elements not found, continuing anyway...`);
    }
    
    // Additional 2-second wait to ensure all dynamic content is loaded (as requested)
    console.log(`Waiting 2 seconds for dynamic content to fully load...`);
    await page.waitForTimeout(2000);
    console.log(`✓ Ready to extract HTML`);

    // Take a screenshot of search results
    const screenshotPath = `dmart-${locationName.toLowerCase().replace(/\s+/g, '-')}-${productName.toLowerCase().replace(/\s+/g, '-')}-search-results.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Get the HTML of the search results page
    const pageHtml = await page.content();
    // Ensure output directory exists
    const outputDir = 'output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const htmlPath = path.join(outputDir, `dmart-${locationName.toLowerCase().replace(/\s+/g, '-')}-${productName.toLowerCase().replace(/\s+/g, '-')}-search-results.html`);
    fs.writeFileSync(htmlPath, pageHtml, 'utf8');
    console.log(`Search results HTML saved: ${htmlPath}`);

    console.log(`Location "${locationName}" selected and product "${productName}" searched successfully!`);
    console.log(`Search results HTML returned and saved to: ${htmlPath}`);

    // Close browser AFTER HTML is retrieved
    console.log('\n=== Closing browser ===');
    await browser.close();
    console.log('Browser closed.');

    // Return the HTML
    return pageHtml;

  } catch (error) {
    console.error('Error occurred:', error);
    try {
      await page.screenshot({ path: 'dmart-error.png', fullPage: true });
      console.log('Error screenshot saved: dmart-error.png');
    } catch (e) {
      // Ignore screenshot errors
    }
    // Close browser on error
    try {
      await browser.close();
      console.log('Browser closed after error.');
    } catch (e) {
      // Ignore if already closed
    }
    throw error;
  }
}

// Main execution
async function main() {
  // Example: Select different locations
  const locations = ['Mumbai', 'Chennai', 'Bangalore', 'Delhi'];
  
  // Get location and product from command line arguments
  const locationToSelect = process.argv[2] || locations[0];
  const productToSearch = process.argv[3] || 'potato';
  
  console.log(`Starting location selection for: ${locationToSelect}`);
  console.log(`Product to search: ${productToSearch}`);
  const pageHtml = await selectLocationAndSearchOnDmart(locationToSelect, productToSearch);
  console.log(`\nSearch results HTML length: ${pageHtml.length} characters`);
  return pageHtml;
}

// Run the script only if called directly (not when imported as a module)
// Check if this file is being run directly by comparing the script path
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __basename = path.basename(__filename);

// Check if this file is being run directly
// process.argv[1] is a regular file path, not a file URL
let isMainModule = false;
if (process.argv[1]) {
  try {
    // Normalize both paths for comparison
    const mainFile = path.resolve(process.argv[1]);
    const currentFile = path.resolve(__filename);
    isMainModule = mainFile === currentFile || path.basename(mainFile) === __basename;
  } catch (e) {
    // Fallback: check if the filename matches
    isMainModule = process.argv[1].endsWith('dmart-location-selector.js') || 
                   process.argv[1].includes('dmart-location-selector.js');
  }
}

if (isMainModule) {
  main().catch(console.error);
}

export { selectLocationAndSearchOnDmart };
