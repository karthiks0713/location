import { chromium } from 'playwright';
import * as fs from 'fs';

// Helper to determine if we should run headless
const isHeadless = process.env.HEADLESS === 'true' || process.env.DOCKER === 'true' || fs.existsSync('/.dockerenv');

/**
 * Unified Location Selector for E-commerce Platforms
 * Supports: Zepto, Nature's Basket, D-Mart, and JioMart
 * 
 * All implementations are based on MCP Selenium testing with proven selectors
 */

// ============================================================================
// ZEPTO LOCATION SELECTOR
// ============================================================================

async function selectLocationOnZepto(locationName, productName = 'Paracetamol tablet') {
  const browser = await chromium.launch({
    headless: isHeadless,
    channel: 'chrome'
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log(`[ZEPTO] Navigating to search page...`);
    await page.goto(`https://www.zepto.com/search?query=${encodeURIComponent(productName)}`, {
      waitUntil: 'load',
      timeout: 60000
    });
    await page.waitForTimeout(2000);

    console.log(`[ZEPTO] Opening location selector...`);
    const locationSelectors = [
      'text=Select Location',
      'text=Location',
      'button:has-text("Location")',
      'span:has-text("Location")'
    ];

    let locationClicked = false;
    for (const selector of locationSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click({ timeout: 5000 });
          locationClicked = true;
          console.log(`[ZEPTO] Location selector clicked using: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!locationClicked) {
      throw new Error('[ZEPTO] Location selector not found');
    }

    console.log(`[ZEPTO] Waiting for location input...`);
    await page.waitForSelector('input[type="text"]:not([id*="R49trea4tb"])', { timeout: 10000 });

    console.log(`[ZEPTO] Typing location: ${locationName}`);
    const locationInput = page.locator('input[type="text"]:not([id*="R49trea4tb"])').first();
    await locationInput.click();
    await locationInput.fill(locationName);
    await page.waitForTimeout(1000);

    console.log(`[ZEPTO] Selecting location suggestion...`);
    const locationSuggestions = [
      `text=/^${locationName}$/i`,
      `text=/^${locationName},/i`,
      `text=/^${locationName} /i`
    ];

    let suggestionClicked = false;
    for (const suggestionSelector of locationSuggestions) {
      try {
        const suggestion = page.locator(suggestionSelector).first();
        if (await suggestion.isVisible({ timeout: 2000 })) {
          await suggestion.click({ timeout: 5000 });
          suggestionClicked = true;
          console.log(`[ZEPTO] Location suggestion clicked: ${locationName}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!suggestionClicked) {
      throw new Error(`[ZEPTO] Could not select location: ${locationName}`);
    }

    await page.waitForTimeout(2000);

    const pageHtml = await page.content();
    const htmlPath = `zepto-${locationName.toLowerCase().replace(/\s+/g, '-')}-selected.html`;
    fs.writeFileSync(htmlPath, pageHtml, 'utf8');
    console.log(`[ZEPTO] HTML saved: ${htmlPath}`);

    return pageHtml;

  } catch (error) {
    console.error('[ZEPTO] Error occurred:', error);
    await page.screenshot({ path: 'zepto-error.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

// ============================================================================
// NATURE'S BASKET LOCATION SELECTOR
// ============================================================================

async function selectLocationOnNaturesBasket(locationName, productName = 'potato') {
  const browser = await chromium.launch({
    headless: isHeadless,
    channel: 'chrome'
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log(`[NATURE'S BASKET] Navigating to search page...`);
    await page.goto(`https://www.naturesbasket.co.in/search?q=${encodeURIComponent(productName)}`, {
      waitUntil: 'load',
      timeout: 60000
    });
    await page.waitForTimeout(2000);

    console.log(`[NATURE'S BASKET] Opening location selector...`);
    const locationSelectors = [
      'text=Select Location',
      'text=Location',
      'button:has-text("Location")',
      'span:has-text("Location")',
      '*:has-text("Location")',
      '*:has-text("Not serviceable")'
    ];

    let locationClicked = false;
    for (const selector of locationSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click({ timeout: 5000 });
          locationClicked = true;
          console.log(`[NATURE'S BASKET] Location selector clicked using: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!locationClicked) {
      throw new Error('[NATURE\'S BASKET] Location selector not found');
    }

    console.log(`[NATURE'S BASKET] Waiting for location input...`);
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    console.log(`[NATURE'S BASKET] Typing location: ${locationName}`);
    const allInputs = page.locator('input[type="text"]');
    const inputCount = await allInputs.count();
    
    let locationInput = null;
    for (let i = 0; i < inputCount; i++) {
      const input = allInputs.nth(i);
      const placeholder = await input.getAttribute('placeholder');
      if (placeholder) {
        const lowerPlaceholder = placeholder.toLowerCase();
        if (lowerPlaceholder.includes('search veggies') || 
            lowerPlaceholder.includes('groceries') || 
            (lowerPlaceholder.includes('search') && !lowerPlaceholder.includes('location'))) {
          continue;
        }
        if (lowerPlaceholder.includes('location') || 
            lowerPlaceholder.includes('city') || 
            lowerPlaceholder.includes('area')) {
          locationInput = input;
          break;
        }
      }
    }
    
    if (!locationInput && inputCount > 1) {
      locationInput = allInputs.nth(1);
    } else if (!locationInput) {
      locationInput = allInputs.first();
    }
    
    await locationInput.click();
    await locationInput.fill(locationName);
    await page.waitForTimeout(1000);

    console.log(`[NATURE'S BASKET] Selecting location suggestion...`);
    let suggestionClicked = false;
    
    try {
      const suggestionButton = page.locator(`button:has-text("${locationName}")`).first();
      if (await suggestionButton.isVisible({ timeout: 3000 })) {
        const text = await suggestionButton.textContent();
        const lowerText = text?.toLowerCase() || '';
        if (!lowerText.includes('airport') && !lowerText.includes('railway') && 
            !lowerText.includes('station') && !lowerText.includes('temple')) {
          await suggestionButton.click({ timeout: 5000 });
          suggestionClicked = true;
          console.log(`[NATURE'S BASKET] Location suggestion button clicked: ${locationName}`);
        }
      }
    } catch (e) {
      // Try "Delivering to" section
      try {
        const deliveringTo = page.locator('*:has-text("Delivering to")').first();
        if (await deliveringTo.isVisible({ timeout: 2000 })) {
          await deliveringTo.click({ timeout: 5000 });
          suggestionClicked = true;
          console.log(`[NATURE'S BASKET] Clicked "Delivering to" section`);
        }
      } catch (e2) {
        // Continue
      }
    }

    if (!suggestionClicked) {
      throw new Error(`[NATURE'S BASKET] Could not select location: ${locationName}`);
    }

    console.log(`[NATURE'S BASKET] Clicking confirm button...`);
    await page.waitForTimeout(500);
    
    const confirmSelectors = [
      'button:has-text("CONFIRM LOCATION")',
      'button:has-text("Confirm Location")',
      'button:has-text(/confirm/i)'
    ];

    let confirmClicked = false;
    for (const selector of confirmSelectors) {
      try {
        const confirmButton = page.locator(selector).first();
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click({ timeout: 5000 });
          confirmClicked = true;
          console.log(`[NATURE'S BASKET] Confirm button clicked`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!confirmClicked) {
      throw new Error('[NATURE\'S BASKET] Could not find confirm button');
    }

    await page.waitForTimeout(2000);

    const pageHtml = await page.content();
    const htmlPath = `naturesbasket-${locationName.toLowerCase().replace(/\s+/g, '-')}-selected.html`;
    fs.writeFileSync(htmlPath, pageHtml, 'utf8');
    console.log(`[NATURE'S BASKET] HTML saved: ${htmlPath}`);

    return pageHtml;

  } catch (error) {
    console.error('[NATURE\'S BASKET] Error occurred:', error);
    await page.screenshot({ path: 'naturesbasket-error.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

// ============================================================================
// D-MART LOCATION SELECTOR
// ============================================================================

async function selectLocationAndSearchOnDmart(locationName, productName = 'potato') {
  const browser = await chromium.launch({
    headless: isHeadless,
    channel: 'chrome'
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log(`[D-MART] Navigating to search page...`);
    await page.goto(`https://www.dmart.in/search?searchTerm=${encodeURIComponent(productName)}`, {
      waitUntil: 'load',
      timeout: 60000
    });
    await page.waitForTimeout(2000);

    console.log(`[D-MART] Opening location selector...`);
    const locationSelector = page.locator('xpath=//*[contains(@class, "location") or contains(@id, "location")]').first();
    if (await locationSelector.isVisible({ timeout: 5000 })) {
      await locationSelector.click({ timeout: 5000 });
      console.log(`[D-MART] Location selector clicked`);
    } else {
      throw new Error('[D-MART] Location selector not found');
    }

    console.log(`[D-MART] Waiting for location modal...`);
    await page.waitForSelector('div[role="dialog"] input[type="text"]', { timeout: 10000 });

    console.log(`[D-MART] Typing location: ${locationName}`);
    const locationInput = page.locator('div[role="dialog"] input[type="text"]').first();
    await locationInput.click();
    await locationInput.fill(locationName);
    await page.waitForTimeout(1000);

    console.log(`[D-MART] Selecting location suggestion...`);
    const suggestionXpath = `xpath=//ul//*[contains(text(), '${locationName}') and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'airport')) and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'railway')) and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'station')) and not(contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'temple'))]`;
    
    const suggestion = page.locator(suggestionXpath).first();
    if (await suggestion.isVisible({ timeout: 5000 })) {
      await suggestion.click({ timeout: 2000 });
      console.log(`[D-MART] Location suggestion clicked: ${locationName}`);
    } else {
      throw new Error(`[D-MART] Could not select location: ${locationName}`);
    }

    await page.waitForTimeout(1000);

    console.log(`[D-MART] Clicking confirm button...`);
    await page.waitForTimeout(500);
    
    const confirmButton = page.locator('xpath=//button[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "confirm")]').first();
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click({ timeout: 2000 });
      console.log(`[D-MART] Confirm button clicked`);
    } else {
      throw new Error('[D-MART] Could not find confirm button');
    }

    await page.waitForTimeout(2000);

    console.log(`[D-MART] Searching for product: ${productName}...`);
    const searchInput = page.locator('input#scrInput').first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('');
      await searchInput.fill(productName);
      await page.waitForTimeout(500);
      
      const searchButton = page.locator('xpath=//button[contains(@class, "searchButton") or contains(@class, "search")]').first();
      if (await searchButton.isVisible({ timeout: 2000 })) {
        await searchButton.click({ timeout: 2000 });
        console.log(`[D-MART] Search button clicked`);
      } else {
        await searchInput.press('Enter');
      }
      
      await page.waitForTimeout(3000);
    }

    const pageHtml = await page.content();
    const htmlPath = `dmart-${locationName.toLowerCase().replace(/\s+/g, '-')}-${productName.toLowerCase().replace(/\s+/g, '-')}-search-results.html`;
    fs.writeFileSync(htmlPath, pageHtml, 'utf8');
    console.log(`[D-MART] HTML saved: ${htmlPath}`);

    return pageHtml;

  } catch (error) {
    console.error('[D-MART] Error occurred:', error);
    await page.screenshot({ path: 'dmart-error.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

// ============================================================================
// JIOMART LOCATION SELECTOR
// ============================================================================

async function selectLocationOnJioMart(locationName, productName = 'tomoto') {
  const browser = await chromium.launch({
    headless: isHeadless,
    channel: 'chrome'
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log(`[JIOMART] Navigating to search page...`);
    await page.goto(`https://www.jiomart.com/search?q=${encodeURIComponent(productName)}`, {
      waitUntil: 'load',
      timeout: 60000
    });
    await page.waitForTimeout(2000);

    console.log(`[JIOMART] Opening location selector...`);
    await page.waitForSelector('xpath=//button[contains(text(), "Location")]', { timeout: 10000 });
    const locationButton = page.locator('xpath=//button[contains(text(), "Location")]').first();
    await locationButton.click({ timeout: 5000 });
    console.log(`[JIOMART] Location selector clicked`);

    console.log(`[JIOMART] Waiting for location modal...`);
    await page.waitForSelector('xpath=//input[contains(@placeholder, "Search for area") or contains(@placeholder, "landmark")]', {
      timeout: 10000
    });

    console.log(`[JIOMART] Typing location: ${locationName}`);
    const locationInput = page.locator('xpath=//input[contains(@placeholder, "Search for area") or contains(@placeholder, "landmark")]').first();
    await locationInput.click({ timeout: 5000 });
    await locationInput.fill(locationName);
    await page.waitForTimeout(1000);

    console.log(`[JIOMART] Selecting location suggestion...`);
    const suggestionXpath = `xpath=(//*[contains(text(), '${locationName}')])[3]`;
    
    try {
      await page.waitForSelector(suggestionXpath, { timeout: 5000 });
      const suggestion = page.locator(suggestionXpath).first();
      await suggestion.waitFor({ state: 'visible', timeout: 2000 });
      await suggestion.click({ timeout: 2000 });
      console.log(`[JIOMART] Location suggestion clicked using index [3]: ${locationName}`);
    } catch (e) {
      // Try alternative indices
      for (let i = 2; i <= 5; i++) {
        try {
          const altSuggestionXpath = `xpath=(//*[contains(text(), '${locationName}')])[${i}]`;
          await page.waitForSelector(altSuggestionXpath, { timeout: 2000 });
          const altSuggestion = page.locator(altSuggestionXpath).first();
          await altSuggestion.waitFor({ state: 'visible', timeout: 1000 });
          await altSuggestion.click({ timeout: 2000 });
          console.log(`[JIOMART] Location suggestion clicked using index [${i}]: ${locationName}`);
          break;
        } catch (e2) {
          continue;
        }
      }
    }

    await page.waitForTimeout(1000);

    console.log(`[JIOMART] Clicking confirm button...`);
    await page.waitForTimeout(500);
    await page.waitForSelector('xpath=//*[contains(text(), "Confirm Location")]', { timeout: 5000 });
    const confirmButton = page.locator('xpath=//*[contains(text(), "Confirm Location")]').first();
    await confirmButton.waitFor({ state: 'visible', timeout: 2000 });
    await confirmButton.click({ timeout: 2000 });
    console.log(`[JIOMART] Confirm location button clicked`);

    await page.waitForTimeout(2000);

    const pageHtml = await page.content();
    const htmlPath = `jiomart-${locationName.toLowerCase().replace(/\s+/g, '-')}-selected.html`;
    fs.writeFileSync(htmlPath, pageHtml, 'utf8');
    console.log(`[JIOMART] HTML saved: ${htmlPath}`);

    return pageHtml;

  } catch (error) {
    console.error('[JIOMART] Error occurred:', error);
    await page.screenshot({ path: 'jiomart-error.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

// ============================================================================
// UNIFIED INTERFACE
// ============================================================================

const PLATFORMS = {
  ZEPTO: 'zepto',
  NATURES_BASKET: 'naturesbasket',
  DMART: 'dmart',
  JIOMART: 'jiomart'
};

async function selectLocation(platform, locationName, productName = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Starting location selection on ${platform.toUpperCase()}`);
  console.log(`Location: ${locationName}`);
  if (productName) console.log(`Product: ${productName}`);
  console.log(`${'='.repeat(60)}\n`);

  switch (platform.toLowerCase()) {
    case PLATFORMS.ZEPTO:
      return await selectLocationOnZepto(locationName, productName || 'Paracetamol tablet');
    
    case PLATFORMS.NATURES_BASKET:
      return await selectLocationOnNaturesBasket(locationName, productName || 'potato');
    
    case PLATFORMS.DMART:
      return await selectLocationAndSearchOnDmart(locationName, productName || 'potato');
    
    case PLATFORMS.JIOMART:
      return await selectLocationOnJioMart(locationName, productName || 'tomoto');
    
    default:
      throw new Error(`Unknown platform: ${platform}. Supported platforms: ${Object.values(PLATFORMS).join(', ')}`);
  }
}

// ============================================================================
// TEST CASES
// ============================================================================

async function runTestCases() {
  const testCases = [
    // Zepto tests
    { platform: PLATFORMS.ZEPTO, location: 'Mumbai', product: 'Paracetamol tablet' },
    { platform: PLATFORMS.ZEPTO, location: 'Bangalore', product: 'Paracetamol tablet' },
    
    // Nature's Basket tests
    { platform: PLATFORMS.NATURES_BASKET, location: 'Mumbai', product: 'potato' },
    { platform: PLATFORMS.NATURES_BASKET, location: 'Chennai', product: 'potato' },
    { platform: PLATFORMS.NATURES_BASKET, location: 'Madurai', product: 'potato' },
    
    // D-Mart tests
    { platform: PLATFORMS.DMART, location: 'Mumbai', product: 'potato' },
    { platform: PLATFORMS.DMART, location: 'Chennai', product: 'potato' },
    { platform: PLATFORMS.DMART, location: 'Bangalore', product: 'tomato' },
    
    // JioMart tests
    { platform: PLATFORMS.JIOMART, location: 'Mumbai', product: 'tomoto' },
    { platform: PLATFORMS.JIOMART, location: 'Bangalore', product: 'tomoto' },
    { platform: PLATFORMS.JIOMART, location: 'Chennai', product: 'tomoto' },
  ];

  const results = [];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n🧪 Running test: ${testCase.platform} - ${testCase.location} - ${testCase.product}`);
      const html = await selectLocation(testCase.platform, testCase.location, testCase.product);
      results.push({
        ...testCase,
        status: 'PASSED',
        htmlLength: html.length
      });
      console.log(`✅ Test PASSED: ${testCase.platform} - ${testCase.location}`);
    } catch (error) {
      results.push({
        ...testCase,
        status: 'FAILED',
        error: error.message
      });
      console.log(`❌ Test FAILED: ${testCase.platform} - ${testCase.location} - ${error.message}`);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Print test summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`${'='.repeat(60)}\n`);

  // Save test results
  const resultsPath = 'test-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Test results saved to: ${resultsPath}`);

  return results;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node unified-location-selector.js <platform> <location> [product]');
    console.log('  node unified-location-selector.js test');
    console.log('\nPlatforms: zepto, naturesbasket, dmart, jiomart');
    console.log('\nExamples:');
    console.log('  node unified-location-selector.js zepto Mumbai');
    console.log('  node unified-location-selector.js dmart Chennai potato');
    console.log('  node unified-location-selector.js test');
    process.exit(1);
  }

  if (args[0] === 'test') {
    await runTestCases();
  } else {
    const platform = args[0];
    const location = args[1];
    const product = args[2] || null;

    if (!platform || !location) {
      console.error('Error: Platform and location are required');
      process.exit(1);
    }

    try {
      const html = await selectLocation(platform, location, product);
      console.log(`\n✅ Success! HTML length: ${html.length} characters`);
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the script
main().catch(console.error);

export { 
  selectLocation, 
  selectLocationOnZepto, 
  selectLocationOnNaturesBasket, 
  selectLocationAndSearchOnDmart, 
  selectLocationOnJioMart,
  PLATFORMS,
  runTestCases
};


