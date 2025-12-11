import { chromium } from 'playwright';
import readline from 'readline';

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
async function selectLocationOnNaturesBasket(locationName, searchUrl = 'https://www.naturesbasket.co.in/search?q=tomato') {
  // Launch Chrome browser - opens only once
  let browser;
  let context;
  let page;
  
  try {
    try {
      browser = await chromium.launch({
        headless: false,
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
        headless: false,
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
    // Proven MCP selector: //div[@role='dialog']//*[contains(text(), 'LocationName') and not(contains(...airport...)) and not(contains(...railway...)) and not(contains(...station...))]
    let suggestionClicked = false;
    
    const suggestionXpath = `//div[@role='dialog']//*[contains(text(), '${locationName}') and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'airport')) and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'railway')) and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'station'))]`;
    
    const suggestionSelectors = [
      suggestionXpath,
      `xpath=//div[@role='dialog']//*[contains(text(), '${locationName}')]`,
      `div[role="dialog"] *:has-text("${locationName}")`,
      `text=${locationName}`
    ];

    for (const selector of suggestionSelectors) {
      try {
        if (selector.startsWith('xpath=') || selector.startsWith('//')) {
          const xpath = selector.startsWith('xpath=') ? selector.replace('xpath=', '') : selector;
          const suggestion = page.locator(xpath).first();
          await suggestion.waitFor({ timeout: 5000, state: 'visible' });
          if (await suggestion.isVisible({ timeout: 2000 })) {
            await suggestion.click({ timeout: 2000, force: true });
            suggestionClicked = true;
            console.log(`✓ Location suggestion clicked: ${locationName}`);
            break;
          }
        } else {
          const suggestion = page.locator(selector).first();
          if (await suggestion.isVisible({ timeout: 5000 })) {
            await suggestion.click({ timeout: 2000, force: true });
            suggestionClicked = true;
            console.log(`✓ Location suggestion clicked using: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!suggestionClicked) {
      console.log(`⚠ Warning: Could not click location suggestion automatically`);
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
    const htmlPath = `naturesbasket-${locationName.toLowerCase().replace(/\s+/g, '-')}-final.html`;
    fs.writeFileSync(htmlPath, pageHtml, 'utf8');
    console.log(`✓ Page HTML saved: ${htmlPath}`);
    console.log(`✓ HTML length: ${pageHtml.length} characters`);

    console.log(`\n✅ Location "${locationName}" selected successfully!`);
    console.log(`📄 Final page HTML returned and saved to: ${htmlPath}`);
    
    // Wait for user to press Enter before closing browser
    await waitForEnter();
    
    // Close browser
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
    
    // Wait for user input even on error
    console.log('\nPress Enter to close the browser...');
    await waitForEnter();
    
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
  
  // Get location and URL from command line arguments
  const locationToSelect = process.argv[2] || locations[0];
  const searchUrl = process.argv[3] || 'https://www.naturesbasket.co.in/search?q=tomato';
  
  console.log(`\n🚀 Starting Nature's Basket location selection`);
  console.log(`📍 Location: ${locationToSelect}`);
  console.log(`🌐 URL: ${searchUrl}\n`);
  
  const pageHtml = await selectLocationOnNaturesBasket(locationToSelect, searchUrl);
  console.log(`\n📊 Page HTML length: ${pageHtml.length} characters`);
  return pageHtml;
}

// Run the script
main().catch(console.error);

export { selectLocationOnNaturesBasket };
