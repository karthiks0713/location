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
  // Construct search URL from product name
  const searchUrl = `https://www.naturesbasket.co.in/search?q=${encodeURIComponent(productName)}`;
  // Launch Chrome browser - opens only once
  let browser;
  let context;
  let page;
  
  try {
    try {
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
    } catch (channelError) {
      console.log('⚠️ Failed to launch with channel option, trying without...');
      browser = await chromium.launch({
        headless: isHeadless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
    }

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    page = await context.newPage();
    
    // Small delay to ensure browser is fully initialized
    await page.waitForTimeout(500);
    
    // Verify browser is still open
    if (!browser.isConnected()) {
      throw new Error('Browser disconnected immediately after launch');
    }
  } catch (launchError) {
    console.error('❌ Failed to launch browser:', launchError);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    throw launchError;
  }

  try {
    // Verify browser is still connected before navigation
    if (!browser.isConnected()) {
      throw new Error('Browser disconnected before navigation');
    }
    
    console.log(`Navigating to Nature's Basket search page...`);
    console.log(`URL: ${searchUrl}`);
    // Navigate to Nature's Basket search page
    await page.goto(searchUrl, {
      waitUntil: 'load',
      timeout: 60000
    });
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);

    console.log(`Opening location selector...`);
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
          console.log(`✓ Location selector clicked using: ${selector}`);
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
      throw new Error('Location selector not found after trying all selectors');
    }

    console.log(`Waiting for location modal to open...`);
    await page.waitForTimeout(1000);

    // Step 2: Find location input field
    // Proven MCP selector: //div[@role='dialog']//input[@type='text']
    const locationInputSelectors = [
      'xpath=//div[@role=\'dialog\']//input[@type=\'text\']',
      'xpath=//div[@role="dialog"]//input[@type="text"]',
      'div[role="dialog"] input[type="text"]',
      'div[role="dialog"] input',
      'xpath=//input[@type=\'text\' or @type=\'search\']'
    ];

    await page.waitForSelector('div[role="dialog"] input[type="text"], div[role="dialog"] input', {
      timeout: 10000
    });

    let locationInput = null;
    for (const selector of locationInputSelectors) {
      try {
        if (selector.startsWith('xpath=')) {
          const xpath = selector.replace('xpath=', '');
          locationInput = page.locator(xpath).first();
          await locationInput.waitFor({ timeout: 5000, state: 'visible' });
          if (await locationInput.isVisible({ timeout: 2000 })) {
            console.log(`✓ Found location input using: ${selector}`);
            break;
          }
        } else {
          const input = page.locator(selector).first();
          if (await input.isVisible({ timeout: 5000 })) {
            locationInput = input;
            console.log(`✓ Found location input using: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!locationInput) {
      throw new Error('Location input field not found after trying all selectors');
    }

    console.log(`Clicking location input field...`);
    // Click and focus the input
    await locationInput.click({ force: true });
    await page.waitForTimeout(500);

    // Clear any existing text
    await locationInput.fill('');
    await page.waitForTimeout(200);

    console.log(`Typing location: ${locationName}`);
    // Type slowly character by character (as done in MCP with slowly=true)
    // This ensures better reliability with dynamic forms
    for (const char of locationName) {
      await locationInput.type(char, { delay: 100 });
    }
    await page.waitForTimeout(500);

    console.log(`Waiting for location suggestions to appear...`);
    await page.waitForTimeout(1500);

    // Step 3: Find and click location suggestion
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
            console.log(`✓ Location suggestion clicked: ${locationName}`);
            break;
          } catch (e) {
            // Try force click
            try {
              await suggestion.click({ timeout: 2000, force: true });
              suggestionClicked = true;
              console.log(`✓ Location suggestion clicked (force): ${locationName}`);
              break;
            } catch (e2) {
              // Try JavaScript click
              const elementHandle = await suggestion.elementHandle();
              if (elementHandle) {
                await elementHandle.click();
                suggestionClicked = true;
                console.log(`✓ Location suggestion clicked (JS): ${locationName}`);
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
      throw new Error(`Could not click location suggestion for: ${locationName}`);
    }

    console.log(`Waiting for location to be applied...`);
    await page.waitForTimeout(1000);

    // Step 4: Find and click confirm location button
    // Proven MCP selector: //div[@role='dialog']//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'confirm')]
    console.log(`Clicking confirm location button...`);
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
            console.log(`✓ Confirm location button clicked using: ${selector}`);
            break;
          }
        } else {
          const confirmButton = page.locator(selector).first();
          if (await confirmButton.isVisible({ timeout: 5000 })) {
            await confirmButton.click({ timeout: 2000, force: true });
            confirmClicked = true;
            console.log(`✓ Confirm location button clicked using: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!confirmClicked) {
      console.log(`⚠ Warning: Could not find confirm button`);
    }

    console.log(`Waiting for location to be confirmed...`);
    await page.waitForTimeout(2000);

    // Step 5: Take screenshot before reload
    const fsModule = await import('fs');
    const fs = fsModule.default || fsModule;
    const screenshotPath = `naturesbasket-${locationName.toLowerCase().replace(/\s+/g, '-')}-selected.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✓ Screenshot saved: ${screenshotPath}`);

    // Step 6: Reload page to verify location persists
    console.log(`Reloading page to verify location...`);
    await page.goto(searchUrl, {
      waitUntil: 'load',
      timeout: 60000
    });
    await page.waitForTimeout(3000);

    // Step 7: Take screenshot after reload
    const screenshotAfterReloadPath = `naturesbasket-${locationName.toLowerCase().replace(/\s+/g, '-')}-after-reload.png`;
    await page.screenshot({ path: screenshotAfterReloadPath, fullPage: true });
    console.log(`✓ Screenshot after reload saved: ${screenshotAfterReloadPath}`);

    // Step 8: Get the HTML of the final page
    console.log(`Getting final page HTML...`);
    const pageHtml = await page.content();
    // Ensure output directory exists
    const outputDir = 'output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const htmlPath = path.join(outputDir, `naturesbasket-${locationName.toLowerCase().replace(/\s+/g, '-')}-final.html`);
    fs.writeFileSync(htmlPath, pageHtml, 'utf8');
    console.log(`✓ Page HTML saved: ${htmlPath}`);
    console.log(`✓ HTML length: ${pageHtml.length} characters`);

    console.log(`\n✅ Location "${locationName}" selected successfully!`);
    console.log(`📄 Final page HTML returned and saved to: ${htmlPath}`);
    
    // Close browser AFTER HTML is retrieved
    await browser.close();
    console.log('Browser closed.');

    // Return the HTML
    return pageHtml;

  } catch (error) {
    console.error('❌ Error occurred:', error);
    try {
      await page.screenshot({ path: 'naturesbasket-error.png', fullPage: true });
      console.log('Error screenshot saved: naturesbasket-error.png');
    } catch (e) {
      // Ignore screenshot errors
    }
    
    // Close browser on error
    await browser.close();
    throw error;
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
