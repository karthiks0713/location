// Dynamic imports - only load the module needed based on website name
import {Builder, By, Key} from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

/**
 * Unified orchestrator for location selection and product search across multiple e-commerce sites
 * 
 * Usage:
 *   node location-selector-orchestrator.js <website> <product> <location>
 * 
 * Example:
 *   node location-selector-orchestrator.js dmart potato Mumbai
 *   node location-selector-orchestrator.js jiomart tomato Mumbai
 *   node location-selector-orchestrator.js naturesbasket tomato Mumbai
 *   node location-selector-orchestrator.js zepto Paracetamol Mumbai
 *   node location-selector-orchestrator.js swiggy lays "RT Nagar"
 */

/**
 * Validates website name and returns normalized site identifier
 */
function determineSite(websiteName) {
  const websiteLower = websiteName.toLowerCase().trim();
  
  if (websiteLower === 'dmart' || websiteLower === 'd-mart') {
    return 'dmart';
  } else if (websiteLower === 'jiomart' || websiteLower === 'jeomart') {
    return 'jiomart';
  } else if (websiteLower === 'naturesbasket' || websiteLower === "nature's basket") {
    return 'naturesbasket';
  } else if (websiteLower === 'zepto') {
    return 'zepto';
  } else if (websiteLower === 'swiggy') {
    return 'swiggy';
  } else {
    throw new Error(`Unsupported website: ${websiteName}. Supported websites: dmart, jiomart, naturesbasket, zepto, swiggy`);
  }
}

/**
 * Swiggy Instamart location selection and product search
 */
async function selectLocationAndSearchOnSwiggy(locationName, productName) {
  // Configure Chrome with stealth options to bypass bot detection
  const chromeOptions = new chrome.Options();
  
  // Anti-detection options
  chromeOptions.addArguments('--disable-blink-features=AutomationControlled');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-setuid-sandbox');
  chromeOptions.addArguments('--disable-web-security');
  chromeOptions.addArguments('--disable-features=IsolateOrigins,site-per-process');
  chromeOptions.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  chromeOptions.excludeSwitches('enable-automation');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  try {
    // Execute script to hide webdriver property
    await driver.executeScript('Object.defineProperty(navigator, "webdriver", {get: () => undefined})');
    
    console.log('Step 1: Navigating to Swiggy Instamart...');
    await driver.get('https://www.swiggy.com/instamart');
    await driver.sleep(5000);

    console.log('Step 2: Clicking on "Search for an area or address"...');
    await driver.sleep(2000);
    const searchArea = await driver.findElement(By.xpath('//*[contains(text(), "Search for an area") or contains(@placeholder, "Search for an area") or contains(@placeholder, "area or address")]'));
    await searchArea.click();
    await driver.sleep(2000);

    console.log(`Step 3: Typing "${locationName}"...`);
    const input = await driver.findElement(By.xpath('//input | //*[@contenteditable="true"] | //*[@role="textbox"]'));
    await input.sendKeys(locationName);
    await driver.sleep(3000);

    console.log(`Step 4: Selecting ${locationName} from suggestions...`);
    // Generate location name variations
    const locationVariations = [
      locationName,
      locationName.replace(/\s+/g, ''),
      locationName.replace(/\s+/g, ' '),
      locationName.toLowerCase(),
      locationName.toUpperCase()
    ];
    const uniqueVariations = [...new Set(locationVariations)];
    
    // Try multiple strategies to find and click suggestion
    let suggestionClicked = false;
    const suggestionStrategies = [];
    
    for (const loc of uniqueVariations) {
      suggestionStrategies.push(`//*[contains(text(), "${loc}")]`);
      suggestionStrategies.push(`//li[contains(text(), "${loc}")]`);
      suggestionStrategies.push(`//div[contains(text(), "${loc}") and not(ancestor::input)]`);
      suggestionStrategies.push(`//*[contains(text(), "${loc}") and not(self::input) and not(ancestor::input)]`);
    }
    
    for (const selector of suggestionStrategies) {
      try {
        const suggestion = await driver.findElement(By.xpath(selector));
        await driver.executeScript('arguments[0].scrollIntoView({block: "center", behavior: "smooth"});', suggestion);
        await driver.sleep(500);
        try {
          await suggestion.click();
          suggestionClicked = true;
          console.log(`✓ Location suggestion clicked: ${locationName}`);
          break;
        } catch (e) {
          await driver.executeScript('arguments[0].click();', suggestion);
          suggestionClicked = true;
          console.log(`✓ Location suggestion clicked (JS): ${locationName}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!suggestionClicked) {
      throw new Error(`Could not click location suggestion for: ${locationName}`);
    }
    await driver.sleep(2000);

    console.log('Step 5: Clicking Confirm location...');
    const confirmBtn = await driver.findElement(By.xpath('//button[contains(text(), "Confirm")] | //*[contains(text(), "Confirm Location")] | //button[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "confirm")]'));
    try {
      await confirmBtn.click();
    } catch (e) {
      await driver.executeScript('arguments[0].click();', confirmBtn);
    }
    await driver.sleep(3000);

    console.log('Step 6: Closing any modal overlay if present...');
    try {
      const closeModal = await driver.findElement(By.xpath('//button[contains(@aria-label, "Close")] | //*[@data-testid="modal-overlay"]'));
      await driver.executeScript('arguments[0].click();', closeModal);
      await driver.sleep(1000);
    } catch (e) {
      // No modal to close
    }

    console.log('Step 7: Clicking search button...');
    const searchBar = await driver.findElement(By.xpath('//button[contains(text(), "Search")] | //*[contains(@aria-label, "Search")]'));
    await searchBar.click();
    await driver.sleep(1000);

    console.log(`Step 8: Typing "${productName}" slowly in search...`);
    const searchInput = await driver.findElement(By.xpath('//input | //*[@contenteditable="true"] | //*[@role="textbox"]'));
    await searchInput.clear();
    await driver.sleep(500);
    
    // Type slowly character by character
    for (let i = 0; i < productName.length; i++) {
      await searchInput.sendKeys(productName[i]);
      await driver.sleep(400);
    }
    
    console.log('Step 9: Waiting for suggestions to appear...');
    await driver.sleep(4000);

    console.log(`Step 10: Finding and clicking on "${productName}" suggestion...`);
    let productSuggestionClicked = false;
    const suggestionSelectors = [
      `//div[contains(text(), "${productName}") and not(contains(text(), "display"))]`,
      `//li[contains(text(), "${productName}")]`,
      `//a[contains(text(), "${productName}")]`,
      `//*[@role="option" and contains(text(), "${productName}")]`,
      `//*[contains(., "${productName}") and (self::div or self::li or self::a) and not(ancestor::script)]`
    ];
    
    for (const selector of suggestionSelectors) {
      try {
        const productSuggestion = await driver.findElement(By.xpath(selector));
        await driver.executeScript('arguments[0].scrollIntoView({block: "center", behavior: "smooth"});', productSuggestion);
        await driver.sleep(1000);
        try {
          await productSuggestion.click();
          productSuggestionClicked = true;
          break;
        } catch (e) {
          await driver.executeScript('arguments[0].click();', productSuggestion);
          productSuggestionClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!productSuggestionClicked) {
      await searchInput.sendKeys(Key.ENTER);
      await driver.sleep(2000);
    } else {
      await driver.sleep(5000);
    }

    console.log('Step 11: Waiting for page to fully load...');
    await driver.sleep(3000);

    console.log('Step 12: Checking for error page...');
    let hasError = false;
    try {
      const errorElement = await driver.findElement(By.xpath('//*[contains(text(), "Something went wrong")] | //*[contains(text(), "Try Again")] | //*[contains(@class, "error")]'));
      hasError = true;
      console.log('Error page detected!');
      await driver.sleep(2000);
      
      let tryAgainClicked = false;
      const tryAgainSelectors = [
        '//button[contains(text(), "Try Again")]',
        '//button[contains(., "Try Again")]',
        '//*[contains(text(), "Try Again") and (@role="button" or self::button)]',
        '//*[@class and contains(text(), "Try Again")]'
      ];
      
      for (const selector of tryAgainSelectors) {
        try {
          const tryAgainButton = await driver.findElement(By.xpath(selector));
          await driver.executeScript('arguments[0].scrollIntoView({block: "center", behavior: "smooth"});', tryAgainButton);
          await driver.sleep(1000);
          try {
            await tryAgainButton.click();
            tryAgainClicked = true;
            break;
          } catch (e) {
            await driver.executeScript('arguments[0].click();', tryAgainButton);
            tryAgainClicked = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (tryAgainClicked) {
        await driver.sleep(5000);
        try {
          const errorCheck = await driver.findElement(By.xpath('//*[contains(text(), "Something went wrong")]'));
          await driver.sleep(5000);
          for (const selector of tryAgainSelectors) {
            try {
              const tryAgainButton2 = await driver.findElement(By.xpath(selector));
              await driver.executeScript('arguments[0].click();', tryAgainButton2);
              await driver.sleep(5000);
              break;
            } catch (e2) {
              continue;
            }
          }
        } catch (e) {
          hasError = false;
        }
      }
    } catch (e) {
      // No error page
    }
    
    if (!hasError) {
      await driver.sleep(3000);
    }

    console.log('Step 13: Getting final page HTML...');
    await driver.sleep(5000);
    const html = await driver.getPageSource();
    
    await driver.quit();
    return html;
    
  } catch (error) {
    await driver.quit();
    throw error;
  }
}


/**
 * Execute location selection and product search on a single website
 */
async function executeOnWebsite(websiteName, productName, locationName) {
  const site = determineSite(websiteName);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${websiteName.toUpperCase()}`);
  console.log(`Product: ${productName}`);
  console.log(`Location: ${locationName}`);
  console.log(`${'='.repeat(60)}\n`);

  let pageHtml;

  try {
    if (site === 'dmart') {
      console.log(`Loading D-Mart location selector module...`);
      const { selectLocationAndSearchOnDmart } = await import('./dmart-location-selector.js');
      console.log(`Calling D-Mart location selector and product search...`);
      pageHtml = await selectLocationAndSearchOnDmart(locationName, productName);
    } else if (site === 'jiomart') {
      console.log(`Loading JioMart location selector module...`);
      const { selectLocationOnJioMart } = await import('./jiomart-location-selector.js');
      console.log(`Calling JioMart location selector with product: ${productName}...`);
      pageHtml = await selectLocationOnJioMart(locationName, productName);
    } else if (site === 'naturesbasket') {
      console.log(`Loading Nature's Basket location selector module...`);
      const { selectLocationOnNaturesBasket } = await import('./naturesbasket-location-selector.js');
      console.log(`Calling Nature's Basket location selector with product: ${productName}...`);
      pageHtml = await selectLocationOnNaturesBasket(locationName, productName);
    } else if (site === 'zepto') {
      console.log(`Loading Zepto location selector module...`);
      const { selectLocationOnZepto } = await import('./zepto-location-selector.js');
      console.log(`Calling Zepto location selector with product: ${productName}...`);
      pageHtml = await selectLocationOnZepto(locationName, productName);
    } else if (site === 'swiggy') {
      console.log(`Running Swiggy Instamart automation...`);
      pageHtml = await selectLocationAndSearchOnSwiggy(locationName, productName);
    } else {
      throw new Error(`Unknown site: ${site}`);
    }

    console.log(`\n✅ ${websiteName.toUpperCase()} - Process Completed Successfully`);
    console.log(`Final HTML length: ${pageHtml.length} characters`);
    console.log(`${'='.repeat(60)}\n`);

    return { website: websiteName, success: true, html: pageHtml, error: null };

  } catch (error) {
    console.error(`\n❌ ${websiteName.toUpperCase()} - Error Occurred`);
    console.error(`Error: ${error.message}`);
    console.error(`${'='.repeat(60)}\n`);
    return { website: websiteName, success: false, html: null, error: error.message };
  }
}

/**
 * Main orchestrator function - runs on all websites sequentially
 */
async function selectLocationAndSearchOnAllWebsites(productName, locationName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`LOCATION SELECTOR ORCHESTRATOR`);
  console.log(`Product: ${productName}`);
  console.log(`Location: ${locationName}`);
  console.log(`Running on ALL websites sequentially...`);
  console.log(`${'='.repeat(60)}\n`);

  const websites = ['dmart', 'jiomart', 'naturesbasket', 'zepto', 'swiggy'];
  const results = [];

  // Execute sequentially on each website
  for (const website of websites) {
    const result = await executeOnWebsite(website, productName, locationName);
    results.push(result);
    
    // Small delay between websites
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`EXECUTION SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total websites: ${websites.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`${'='.repeat(60)}\n`);

  // Print details
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.website}: Success (HTML length: ${result.html.length} chars)`);
    } else {
      console.log(`❌ ${result.website}: Failed - ${result.error}`);
    }
  });

  return results;
}

/**
 * Main execution function
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node location-selector-orchestrator.js <product> <location>');
    console.error('');
    console.error('Description:');
    console.error('  Automatically selects location and searches for product on ALL websites sequentially.');
    console.error('  URLs are constructed internally based on the website and product name.');
    console.error('');
    console.error('Arguments:');
    console.error('  product   - Product name to search (required)');
    console.error('  location  - Location name to select (required)');
    console.error('');
    console.error('Examples:');
    console.error('  node location-selector-orchestrator.js potato Mumbai');
    console.error('  node location-selector-orchestrator.js tomato Mumbai');
    console.error('  node location-selector-orchestrator.js lays "RT Nagar"');
    console.error('');
    console.error('This will run on all websites:');
    console.error('  - D-Mart');
    console.error('  - JioMart');
    console.error('  - Nature\'s Basket');
    console.error('  - Zepto');
    console.error('  - Swiggy');
    process.exit(1);
  }

  const productName = args[0];
  const locationName = args[1];

  // Validate inputs
  if (!productName || !locationName) {
    console.error('\n❌ Error: Product name and location are required');
    process.exit(1);
  }

  try {
    const results = await selectLocationAndSearchOnAllWebsites(productName, locationName);
    
    // Save HTML files for successful results
    const fsModule = await import('fs');
    const fs = fsModule.default || fsModule;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`SAVING RESULTS`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Ensure output directory exists
    const pathModule = await import('path');
    const path = pathModule.default || pathModule;
    const outputDir = 'output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    results.forEach(result => {
      if (result.success && result.html) {
        const htmlPath = path.join(outputDir, `${result.website}-${locationName.toLowerCase().replace(/\s+/g, '-')}-${productName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.html`);
        fs.writeFileSync(htmlPath, result.html, 'utf8');
        console.log(`✅ ${result.website}: HTML saved to ${htmlPath}`);
      }
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`EXTRACTING DATA FROM HTML FILES`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Import and run the HTML data selector
    try {
      const { extractDataFromAllFiles } = await import('./html-data-selector.js');
      const extractedData = extractDataFromAllFiles(outputDir);
      
      // Save extracted data as JSON
      if (extractedData && extractedData.length > 0) {
        const jsonPath = path.join(outputDir, `extracted-data-${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(extractedData, null, 2), 'utf8');
        console.log(`\n💾 Extracted data saved to: ${jsonPath}`);
      }
    } catch (error) {
      console.error(`\n⚠️  Error extracting data from HTML files:`, error.message);
      console.error(`   Continuing without data extraction...`);
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`ALL OPERATIONS COMPLETED`);
    console.log(`${'='.repeat(60)}\n`);
    
    return results;
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

export { selectLocationAndSearchOnAllWebsites, executeOnWebsite, determineSite };
