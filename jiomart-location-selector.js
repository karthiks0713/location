import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

/**
 * Selenium WebDriver script to automate location selection on JioMart
 * This script opens JioMart, navigates to search page, and selects a location
 */
async function selectLocationOnJioMart(locationName, searchUrl = 'https://www.jiomart.com/search?q=tomoto') {
  // Setup Chrome options
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments('--start-maximized');
  chromeOptions.addArguments('--disable-blink-features=AutomationControlled');
  
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
    // Navigate to JioMart search page
    await driver.get(searchUrl);
    
    // Wait a bit for any dynamic content to load
    await driver.sleep(3000);
    
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
    // Wait for and click on the location selector - verified working selector from MCP
    // MCP verified: //button[contains(text(), 'Location')]
    const locationButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Location')]")),
      10000
    );
    await driver.wait(until.elementIsVisible(locationButton), 5000);
    
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
    // Clear any existing text and type the location name slowly
    await locationInput.click();
    await locationInput.clear();
    // Type slowly character by character for better reliability
    for (const char of locationName) {
      await locationInput.sendKeys(char);
      await driver.sleep(100);
    }

    console.log(`Waiting for location suggestions to appear...`);
    // Wait a bit for suggestions to load
    await driver.sleep(1500);

    // Wait for suggestions to appear and select the location - verified working selector from MCP
    // MCP verified: (//*[contains(text(), 'Mumbai')])[3] - using index [3] to skip input field
    let suggestionClicked = false;
    
    // Try index [3] first as it worked in MCP testing
    const suggestionXpath = `(//*[contains(text(), '${locationName}')])[3]`;
    
    try {
      const suggestion = await driver.wait(
        until.elementLocated(By.xpath(suggestionXpath)),
        5000
      );
      await driver.wait(until.elementIsVisible(suggestion), 2000);
      await suggestion.click();
      suggestionClicked = true;
      console.log(`✓ Location suggestion clicked using index [3]: ${locationName}`);
    } catch (e) {
      // Try alternative indices if [3] doesn't work
      for (let i = 2; i <= 5; i++) {
        try {
          const altSuggestionXpath = `(//*[contains(text(), '${locationName}')])[${i}]`;
          const suggestion = await driver.wait(
            until.elementLocated(By.xpath(altSuggestionXpath)),
            2000
          );
          await driver.wait(until.elementIsVisible(suggestion), 1000);
          await suggestion.click();
          suggestionClicked = true;
          console.log(`✓ Location suggestion clicked using index [${i}]: ${locationName}`);
          break;
        } catch (e2) {
          continue;
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
    await driver.sleep(500);
    
    // Find and click the "Confirm Location" button - verified working selector from MCP
    // MCP verified: //*[contains(text(), 'Confirm Location')]
    const confirmButton = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Confirm Location')]")),
      5000
    );
    await driver.wait(until.elementIsVisible(confirmButton), 2000);
    await confirmButton.click();
    console.log(`✓ Confirm location button clicked`);

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
    
    const htmlPath = `jiomart-${locationName.toLowerCase().replace(/\s+/g, '-')}-selected.html`;
    fs.writeFileSync(htmlPath, minifiedHtml, 'utf8');
    console.log(`✓ Page HTML saved: ${htmlPath}`);
    console.log(`✓ HTML length: ${minifiedHtml.length} characters`);
    console.log(`✓ HTML saved in compact format (similar to Nature's Basket)`);

    console.log(`\n✅ Location "${locationName}" selected successfully!`);
    console.log(`📄 Final page HTML returned and saved to: ${htmlPath}`);
    console.log(`📸 Final screenshot saved to: ${screenshotPath}`);

    // Return the HTML before closing
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
    // Close the browser
    console.log('\n=== Closing browser ===');
    await driver.quit();
    console.log('Browser closed.');
  }
}

// Main execution
async function main() {
  // Example: Select different locations
  const locations = ['Mumbai', 'Bangalore', 'Chennai', 'Delhi'];
  
  // Get location and URL from command line arguments
  const locationToSelect = process.argv[2] || locations[0];
  const searchUrl = process.argv[3] || 'https://www.jiomart.com/search?q=tomoto';
  
  console.log(`Starting location selection for: ${locationToSelect}`);
  console.log(`URL: ${searchUrl}`);
  const pageHtml = await selectLocationOnJioMart(locationToSelect, searchUrl);
  console.log(`\nPage HTML length: ${pageHtml.length} characters`);
  return pageHtml;
}

// Run the script
main().catch(console.error);

export { selectLocationOnJioMart };

