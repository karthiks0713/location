import { Builder, By, until, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Selenium WebDriver script to automate location selection on JioMart
 * This script opens JioMart, navigates to search page, and selects a location
 */
async function selectLocationOnJioMart(locationName, productName = 'tomato') {
  // Construct search URL from product name
  const searchUrl = `https://www.jiomart.com/search?q=${encodeURIComponent(productName)}`;
  
  // Setup Chrome options
  const chromeOptions = new chrome.Options();
  
  // Docker compatibility: Use headless mode in Docker, but allow headed mode when not in Docker
  const isDocker = process.env.DOCKER === 'true' || process.env.HEADLESS === 'true';
  if (isDocker) {
    chromeOptions.addArguments('--headless=new'); // Use new headless mode in Docker
  } else {
    // Not in Docker - can use headed mode if needed
    chromeOptions.addArguments('--start-maximized');
  }
  
  // Docker-specific Chrome arguments
  chromeOptions.addArguments('--disable-blink-features=AutomationControlled');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-gpu');
  chromeOptions.addArguments('--disable-software-rasterizer');
  chromeOptions.addArguments('--window-size=1920,1080');
  
  // Set Chrome binary path for Docker (if CHROME_BIN is set)
  if (process.env.CHROME_BIN) {
    chromeOptions.setChromeBinaryPath(process.env.CHROME_BIN);
    console.log(`Using Chrome binary from: ${process.env.CHROME_BIN}`);
  }
  
  // Set user agent to look like a real browser
  chromeOptions.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Exclude automation flags
  chromeOptions.excludeSwitches('enable-automation');
  
  // Launch Chrome browser
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  try {
    // Set window size
    await driver.manage().window().setRect({ width: 1920, height: 1080 });
    
    // Get the original window handle to ensure we stay in the same window
    const originalWindow = await driver.getWindowHandle();

    console.log(`Navigating to JioMart search page...`);
    console.log(`URL: ${searchUrl}`);
    
    // Execute script to hide webdriver property
    await driver.executeScript('Object.defineProperty(navigator, "webdriver", {get: () => undefined})');
    
    // Navigate to JioMart search page
    await driver.get(searchUrl);
    
    // Wait for page to be fully loaded
    await driver.executeScript('return document.readyState').then(state => {
      console.log(`Page ready state: ${state}`);
    });
    
    // Wait longer for dynamic content to load in headless mode
    await driver.sleep(5000);
    
    // Wait for page to be interactive
    try {
      await driver.wait(async () => {
        const readyState = await driver.executeScript('return document.readyState');
        return readyState === 'complete';
      }, 10000);
    } catch (e) {
      console.log('Page ready state check timed out, continuing...');
    }
    
    // Ensure we're still on the original window (close any popups/tabs that might have opened)
    const allWindows = await driver.getAllWindowHandles();
    if (allWindows.length > 1) {
      for (const window of allWindows) {
        if (window !== originalWindow) {
          await driver.switchTo().window(window);
          await driver.close();
        }
      }
      await driver.switchTo().window(originalWindow);
    }

    console.log(`Opening location selector...`);
    // Try multiple selectors for the Location button (headless mode might render differently)
    const locationSelectors = [
      "//button[contains(text(), 'Location')]",
      "//button[contains(., 'Location')]",
      "//*[contains(@class, 'location') and (self::button or self::div or self::span)]",
      "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'location')]",
      "//*[@role='button' and contains(text(), 'Location')]",
      "//a[contains(text(), 'Location')]"
    ];
    
    let locationButton = null;
    let locationClicked = false;
    
    for (const selector of locationSelectors) {
      try {
        console.log(`Trying selector: ${selector}`);
        locationButton = await driver.wait(
          until.elementLocated(By.xpath(selector)),
          8000
        );
        await driver.wait(until.elementIsVisible(locationButton), 5000);
        locationClicked = true;
        console.log(`✓ Found location button using: ${selector}`);
        break;
      } catch (e) {
        console.log(`Selector failed: ${selector}`);
        continue;
      }
    }
    
    if (!locationClicked || !locationButton) {
      // Take a screenshot to debug
      const screenshot = await driver.takeScreenshot();
      const fsModule = await import('fs');
      const fs = fsModule.default || fsModule;
      fs.writeFileSync('jiomart-location-button-not-found.png', screenshot, 'base64');
      console.log('Screenshot saved: jiomart-location-button-not-found.png');
      
      // Try to get page source for debugging
      const pageSource = await driver.getPageSource();
      fs.writeFileSync('jiomart-page-source.html', pageSource, 'utf8');
      console.log('Page source saved: jiomart-page-source.html');
      
      throw new Error('Location button not found with any selector');
    }
    
    // Use JavaScript click to avoid opening new tabs/windows
    await driver.executeScript("arguments[0].click();", locationButton);
    console.log(`✓ Location selector clicked`);
    
    // Wait a moment and check if any new windows/tabs opened
    await driver.sleep(500);
    const windowsAfterClick = await driver.getAllWindowHandles();
    if (windowsAfterClick.length > 1) {
      // Switch back to original window and close others
      for (const window of windowsAfterClick) {
        if (window !== originalWindow) {
          await driver.switchTo().window(window);
          await driver.close();
        }
      }
      await driver.switchTo().window(originalWindow);
    }

    console.log(`Waiting for location modal to open...`);
    // Wait for the location search input field - verified working selector from MCP
    // MCP verified: //input[contains(@placeholder, 'Search for area') or contains(@placeholder, 'landmark')]
    const locationInput = await driver.wait(
      until.elementLocated(By.xpath("//input[contains(@placeholder, 'Search for area') or contains(@placeholder, 'landmark')]")),
      10000
    );
    await driver.wait(until.elementIsVisible(locationInput), 5000);

    console.log(`Typing location: ${locationName}`);
    // Scroll element into view and use JavaScript click to avoid viewport issues
    await driver.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", locationInput);
    await driver.sleep(500);
    // Use JavaScript click to avoid viewport issues
    await driver.executeScript("arguments[0].click();", locationInput);
    await locationInput.clear();
    // Type slowly character by character for better reliability
    for (const char of locationName) {
      await locationInput.sendKeys(char);
      await driver.sleep(100);
    }

    console.log(`Waiting for location suggestions to appear...`);
    // Wait for suggestions dropdown to appear
    let suggestionsVisible = false;
    const dropdownSelectors = [
      "//ul[contains(@class, 'suggestion') or contains(@class, 'dropdown') or contains(@class, 'list')]",
      "//div[contains(@class, 'suggestion') or contains(@class, 'dropdown') or contains(@class, 'autocomplete')]",
      "//*[@role='listbox' or @role='menu']",
      "//ul[li[contains(text(), '')]]", // Any ul with list items
    ];
    
    for (const dropdownSelector of dropdownSelectors) {
      try {
        await driver.wait(until.elementLocated(By.xpath(dropdownSelector)), 3000);
        suggestionsVisible = true;
        console.log(`✓ Suggestions dropdown found`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!suggestionsVisible) {
      console.log(`⚠️  Suggestions dropdown not found, waiting additional time...`);
      await driver.sleep(2000);
    }

    // Wait a bit more for suggestions to fully load
    await driver.sleep(1500);

    // Wait for suggestions to appear and select the location
    let suggestionClicked = false;
    
    // Try multiple approaches to find the suggestion
    const locationVariations = [
      locationName,                    // Exact match
      locationName.replace(/\s+/g, ''), // Without spaces (RTnagar)
      locationName.replace(/\s+/g, ' '), // Normalized spaces (RT Nagar)
      locationName.toUpperCase(),       // Uppercase
      locationName.toLowerCase(),       // Lowercase
    ];
    
    // First, try to find all suggestions and iterate through them
    console.log(`Trying to find all suggestions and match location...`);
    try {
      // Wait a bit more for suggestions to fully render
      await driver.sleep(1000);
      
      // Try multiple selectors to find suggestions
      const suggestionContainerSelectors = [
        "//ul[li]",
        "//div[contains(@class, 'suggestion')]//li",
        "//div[contains(@class, 'item')]",
        "//*[@role='option']",
        "//li[contains(@class, 'suggestion') or contains(@class, 'item')]",
        "//div[contains(@class, 'autocomplete')]//li",
        "//div[contains(@class, 'dropdown')]//li",
        "//*[contains(@class, 'location')]//li",
        "//li",
        "//div[contains(@class, 'suggestion')]",
      ];
      
      let allSuggestions = [];
      for (const containerSelector of suggestionContainerSelectors) {
        try {
          const suggestions = await driver.findElements(By.xpath(containerSelector));
          if (suggestions.length > 0) {
            allSuggestions = suggestions;
            console.log(`Found ${allSuggestions.length} potential suggestion elements using: ${containerSelector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (allSuggestions.length === 0) {
        // Fallback: try to find any clickable element near the input
        allSuggestions = await driver.findElements(By.xpath("//li | //div[contains(@class, 'suggestion')] | //div[contains(@class, 'item')] | //*[@role='option']"));
        console.log(`Found ${allSuggestions.length} potential suggestion elements (fallback)`);
      }
      
      // Try clicking each suggestion element
      for (let i = 0; i < allSuggestions.length && i < 30; i++) {
        try {
          // Check if element is visible
          const isDisplayed = await allSuggestions[i].isDisplayed();
          if (!isDisplayed) {
            continue;
          }
          
          // Get text from element
          let suggestionText = '';
          try {
            suggestionText = await allSuggestions[i].getText();
          } catch (e) {
            // Try getting text via JavaScript
            try {
              suggestionText = await driver.executeScript('return arguments[0].textContent || arguments[0].innerText || "";', allSuggestions[i]);
            } catch (e2) {
              suggestionText = '';
            }
          }
          
          const normalizedText = suggestionText.trim().toLowerCase();
          console.log(`Checking suggestion ${i + 1}: "${suggestionText.substring(0, 50)}"`);
          
          // Check if any location variation matches
          let shouldClick = false;
          for (const locVar of locationVariations) {
            if (normalizedText.includes(locVar.toLowerCase()) && 
                !normalizedText.includes('airport') && 
                !normalizedText.includes('railway') && 
                !normalizedText.includes('station') &&
                !normalizedText.includes('temple') &&
                normalizedText.length > 2) {
              shouldClick = true;
              break;
            }
          }
          
          // If no text match but we have few suggestions, try clicking the first visible one
          if (!shouldClick && allSuggestions.length <= 5 && normalizedText.length > 0) {
            console.log(`⚠️  Text doesn't match exactly, but trying first visible suggestion...`);
            shouldClick = true;
          }
          
          if (shouldClick) {
            // Scroll into view
            await driver.executeScript('arguments[0].scrollIntoView({block: "center", behavior: "smooth"});', allSuggestions[i]);
            await driver.sleep(800);
            
            // Try multiple click strategies
            const clickStrategies = [
              async () => {
                await allSuggestions[i].click();
              },
              async () => {
                await driver.executeScript('arguments[0].click();', allSuggestions[i]);
              },
              async () => {
                await driver.executeScript('arguments[0].dispatchEvent(new MouseEvent("click", {bubbles: true}));', allSuggestions[i]);
              },
              async () => {
                await driver.executeScript('arguments[0].dispatchEvent(new Event("click", {bubbles: true}));', allSuggestions[i]);
              }
            ];
            
            for (let strategyIndex = 0; strategyIndex < clickStrategies.length; strategyIndex++) {
              try {
                await clickStrategies[strategyIndex]();
                suggestionClicked = true;
                console.log(`✓ Location suggestion clicked: "${suggestionText}" (strategy ${strategyIndex + 1})`);
                await driver.sleep(1000);
                break;
              } catch (e) {
                if (strategyIndex === clickStrategies.length - 1) {
                  console.log(`⚠️  All click strategies failed for suggestion ${i + 1}`);
                }
                continue;
              }
            }
            
            if (suggestionClicked) break;
          }
        } catch (e) {
          console.log(`⚠️  Error processing suggestion ${i + 1}: ${e.message}`);
          continue;
        }
      }
    } catch (e) {
      console.log(`⚠️  Could not iterate through suggestions: ${e.message}, trying selectors...`);
    }
    
    // If not found by iteration, try XPath selectors
    if (!suggestionClicked) {
      console.log(`Trying XPath selectors for suggestions...`);
      const suggestionStrategies = [
        // Strategy 1: Find in list items (most common)
        ...locationVariations.map(loc => `//li[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${loc.toLowerCase()}')]`),
        // Strategy 2: Find in divs with location text
        ...locationVariations.map(loc => `//div[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${loc.toLowerCase()}') and not(ancestor::input)]`),
        // Strategy 3: Find any clickable element with location text
        ...locationVariations.map(loc => `//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${loc.toLowerCase()}') and not(self::input) and not(ancestor::input) and (self::li or self::div or self::button or self::a)]`),
        // Strategy 4: Try indices 2-10 (skip input field)
        ...Array.from({length: 9}, (_, i) => i + 2).map(i => 
          locationVariations.map(loc => `(//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${loc.toLowerCase()}') and not(self::input)])[${i}]`)
        ).flat(),
      ];
      
      for (const selector of suggestionStrategies) {
        try {
          const suggestion = await driver.wait(
            until.elementLocated(By.xpath(selector)),
            2000
          );
          await driver.wait(until.elementIsVisible(suggestion), 1000);
          
          const suggestionText = await suggestion.getText();
          // Skip if it contains excluded words
          if (suggestionText.toLowerCase().includes('airport') || 
              suggestionText.toLowerCase().includes('railway') || 
              suggestionText.toLowerCase().includes('station') ||
              suggestionText.toLowerCase().includes('temple')) {
            continue;
          }
          
          // Scroll into view
          await driver.executeScript('arguments[0].scrollIntoView({block: "center", behavior: "smooth"});', suggestion);
          await driver.sleep(500);
          
          // Try regular click first
          try {
            await suggestion.click();
            suggestionClicked = true;
            console.log(`✓ Location suggestion clicked using selector: "${suggestionText}"`);
            break;
          } catch (e) {
            // If regular click fails, use JavaScript click
            await driver.executeScript('arguments[0].click();', suggestion);
            suggestionClicked = true;
            console.log(`✓ Location suggestion clicked using JavaScript: "${suggestionText}"`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    // If still not clicked, try pressing Enter or selecting first visible suggestion
    if (!suggestionClicked) {
      console.log(`⚠️  Could not click suggestion by matching text. Trying alternative methods...`);
      
      // Try pressing Enter to select the first suggestion
      try {
        await locationInput.sendKeys(Key.ENTER);
        await driver.sleep(2000);
        console.log(`✓ Pressed Enter to select first suggestion`);
        suggestionClicked = true;
      } catch (e) {
        console.log(`⚠️  Enter key didn't work, trying to click first visible suggestion...`);
        
        // Try clicking the first visible suggestion element
        try {
          const firstSuggestion = await driver.findElement(By.xpath("(//li | //div[contains(@class, 'suggestion')] | //div[contains(@class, 'item')] | //*[@role='option'])[1]"));
          const isDisplayed = await firstSuggestion.isDisplayed();
          if (isDisplayed) {
            await driver.executeScript('arguments[0].scrollIntoView({block: "center", behavior: "smooth"});', firstSuggestion);
            await driver.sleep(500);
            await driver.executeScript('arguments[0].click();', firstSuggestion);
            suggestionClicked = true;
            console.log(`✓ Clicked first visible suggestion`);
          }
        } catch (e2) {
          console.log(`⚠️  Could not click first suggestion: ${e2.message}`);
        }
      }
    }
    
    if (!suggestionClicked) {
      throw new Error(`Could not click location suggestion for: ${locationName}`);
    }

    console.log(`Waiting for location to be applied...`);
    // Wait a moment for the location to be applied
    await driver.sleep(1000);

    console.log(`Clicking confirm location button...`);
    // Wait a moment for the confirm button to appear
    await driver.sleep(1000);
    
    // Find and click the "Confirm Location" button with multiple strategies
    let confirmClicked = false;
    const confirmSelectors = [
      "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'confirm')]",
      "//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'confirm location')]",
      "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'confirm') and contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'location')]",
      "//*[@type='button' and contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'confirm')]",
      "//button[contains(@class, 'confirm') or contains(@class, 'submit')]",
      "//*[@role='button' and contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'confirm')]",
    ];
    
    for (const selector of confirmSelectors) {
      try {
        const confirmButton = await driver.wait(
          until.elementLocated(By.xpath(selector)),
          3000
        );
        await driver.wait(until.elementIsVisible(confirmButton), 2000);
        
        // Scroll into view
        await driver.executeScript('arguments[0].scrollIntoView({block: "center", behavior: "smooth"});', confirmButton);
        await driver.sleep(500);
        
        // Try regular click first
        try {
          await confirmButton.click();
          confirmClicked = true;
          console.log(`✓ Confirm location button clicked`);
          break;
        } catch (e) {
          // If regular click fails, use JavaScript click
          await driver.executeScript('arguments[0].click();', confirmButton);
          confirmClicked = true;
          console.log(`✓ Confirm location button clicked using JavaScript`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!confirmClicked) {
      throw new Error(`Could not find or click confirm location button`);
    }

    console.log(`Waiting for location to be confirmed and page to update...`);
    // Wait for the modal to close and page to update
    await driver.sleep(3000);
    
    // Wait for page to be ready (check if location is displayed in the header)
    try {
      await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'Delivery to')]")),
        10000
      );
      console.log(`✓ Location confirmed - page updated`);
    } catch (e) {
      console.log(`⚠️ Could not verify location in header, proceeding anyway...`);
    }
    
    // Ensure we're on the original window
    await driver.switchTo().window(originalWindow);
    
    // Wait for page to be fully loaded and rendered
    console.log(`Waiting for page to fully load...`);
    await driver.sleep(3000);
    
    // Wait for products to be rendered before extracting HTML
    console.log(`Waiting for products to be rendered...`);
    try {
      await driver.wait(
        until.elementLocated(By.xpath('//*[contains(@class, "product") or contains(@class, "item") or contains(@class, "result")]')),
        15000
      );
      console.log(`✓ Products found on page`);
    } catch (e) {
      console.log(`⚠️ Products not found, continuing anyway...`);
    }
    await driver.sleep(2000);
    
    // Scroll the page to trigger lazy-loaded content (similar to D-Mart behavior)
    console.log(`Scrolling page to load all content...`);
    const scrollScript = `
      window.scrollTo(0, document.body.scrollHeight);
      return new Promise(resolve => setTimeout(resolve, 2000));
    `;
    await driver.executeScript(scrollScript);
    await driver.sleep(2000);
    
    // Scroll back to top
    await driver.executeScript('window.scrollTo(0, 0);');
    await driver.sleep(1000);
    
    // Wait for any remaining dynamic content to load
    await driver.sleep(2000);
    
    // Take a screenshot of the final state
    console.log(`Taking final screenshot...`);
    const screenshot = await driver.takeScreenshot();
    const fsModule = await import('fs');
    const fs = fsModule.default || fsModule;
    const screenshotPath = `jiomart-${locationName.toLowerCase().replace(/\s+/g, '-')}-selected.png`;
    fs.writeFileSync(screenshotPath, screenshot, 'base64');
    console.log(`✓ Screenshot saved: ${screenshotPath}`);

    // Get the HTML of the final page (extract body content similar to Nature's Basket format)
    console.log(`Getting final page HTML (body content)...`);
    // Extract body innerHTML to get compact format similar to Nature's Basket
    const pageHtml = await driver.executeScript(() => {
      return document.documentElement.outerHTML;
    });
    
    // Minify HTML by removing extra whitespace (similar to Nature's Basket compact format)
    const minifiedHtml = pageHtml
      .replace(/>\s+</g, '><')  // Remove whitespace between tags
      .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
      .trim();
    
    // Ensure output directory exists (reuse existing fs variable)
    const outputDir = 'output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const htmlPath = path.join(outputDir, `jiomart-${locationName.toLowerCase().replace(/\s+/g, '-')}-selected.html`);
    fs.writeFileSync(htmlPath, minifiedHtml, 'utf8');
    console.log(`✓ Page HTML saved: ${htmlPath}`);
    console.log(`✓ HTML length: ${minifiedHtml.length} characters`);
    console.log(`✓ HTML saved in compact format (similar to Nature's Basket)`);

    console.log(`\n✅ Location "${locationName}" selected successfully!`);
    console.log(`📄 Final page HTML returned and saved to: ${htmlPath}`);
    console.log(`📸 Final screenshot saved to: ${screenshotPath}`);

    // Return the HTML
    return minifiedHtml;

  } catch (error) {
    console.error('Error occurred:', error);
    try {
      const screenshot = await driver.takeScreenshot();
      const fsModule = await import('fs');
      const fs = fsModule.default || fsModule;
      fs.writeFileSync('jiomart-error.png', screenshot, 'base64');
      console.log('Error screenshot saved: jiomart-error.png');
    } catch (e) {
      // Ignore screenshot errors
    }
    throw error;
  } finally {
    // Always close browser in finally block with timeout to prevent hanging
    console.log('\n=== Closing browser ===');
    try {
      // Add timeout to prevent hanging (5 seconds should be enough)
      const quitPromise = driver.quit();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Browser close timeout')), 5000)
      );
      await Promise.race([quitPromise, timeoutPromise]);
      console.log('Browser closed successfully.');
    } catch (e) {
      console.log('Browser close timed out or failed, attempting force cleanup...');
      try {
        // Try to close all windows individually
        const windows = await driver.getAllWindowHandles();
        for (const window of windows) {
          try {
            await driver.switchTo().window(window);
            await driver.close();
          } catch (e2) {
            // Ignore individual window close errors
          }
        }
        console.log('Browser windows closed individually.');
      } catch (e3) {
        console.log('Could not close browser windows, process may need manual cleanup.');
      }
    }
  }
}

// Main execution
async function main() {
  // Example: Select different locations
  const locations = ['Mumbai', 'Bangalore', 'Chennai', 'Delhi'];
  
  // Get location and product from command line arguments
  const locationToSelect = process.argv[2] || locations[0];
  const productName = process.argv[3] || 'tomato';
  
  console.log(`Starting location selection for: ${locationToSelect}`);
  console.log(`Product: ${productName}`);
  const pageHtml = await selectLocationOnJioMart(locationToSelect, productName);
  console.log(`\nPage HTML length: ${pageHtml.length} characters`);
  return pageHtml;
}

// Run the script only if called directly (not when imported as a module)
const __filename = fileURLToPath(import.meta.url);
const __basename = path.basename(__filename);

// Check if this file is being run directly (not imported)
// When imported, process.argv[1] will be the orchestrator file, not this file
let isMainModule = false;
if (process.argv[1]) {
  try {
    const mainFile = path.resolve(process.argv[1]);
    const currentFile = path.resolve(__filename);
    // Only run main() if this exact file is being executed
    isMainModule = mainFile === currentFile;
  } catch (e) {
    // If path resolution fails, check by filename only
    const mainBasename = path.basename(process.argv[1]);
    isMainModule = mainBasename === __basename;
  }
}

// Only run main() if this file is executed directly
if (isMainModule) {
  main().catch(console.error);
}

export { selectLocationOnJioMart };
