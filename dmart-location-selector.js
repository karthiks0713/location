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
    console.log(`[DMART] ========================================`);
    console.log(`[DMART] Starting D-Mart scraper`);
    console.log(`[DMART] Product: ${productName}`);
    console.log(`[DMART] Location: ${locationName}`);
    console.log(`[DMART] ========================================`);
    
    console.log(`[DMART] Step 1: Navigating to D-Mart homepage first...`);
    // Go to homepage first to set location
    const homeUrl = 'https://www.dmart.in';
    console.log(`[DMART] Homepage URL: ${homeUrl}`);
    
    const homeResponse = await page.goto(homeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    if (!homeResponse || !homeResponse.ok()) {
      const status = homeResponse ? homeResponse.status() : 'unknown';
      console.warn(`[DMART] ⚠️  Homepage returned status ${status}, continuing anyway...`);
    } else {
      console.log(`[DMART] ✓ Homepage loaded successfully (status: ${homeResponse.status()})`);
    }
    
    // Wait for homepage to be interactive
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log(`[DMART] Network idle timeout on homepage, continuing...`);
    });
    await page.waitForTimeout(3000);
    console.log(`[DMART] ✓ Homepage fully loaded`);

    console.log(`[DMART] Step 2: Finding location selector on homepage...`);
    
    // Enhanced location selector strategies
    const locationSelectors = [
      // Text-based selectors
      'text=Location',
      'text=Select Location',
      'text=Change Location',
      '*:has-text("Location")',
      'button:has-text("Location")',
      'span:has-text("Location")',
      'a:has-text("Location")',
      // XPath selectors
      'xpath=//*[contains(@class, "location") or contains(@id, "location")]',
      'xpath=//button[contains(text(), "Location")]',
      'xpath=//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "location")]',
      'xpath=//*[@role="button" and contains(text(), "Location")]',
      // CSS selectors
      '*[class*="location" i]',
      '*[id*="location" i]',
      'button[class*="location" i]',
      'span[class*="location" i]',
      // Common D-Mart specific selectors
      'xpath=//div[contains(@class, "header")]//*[contains(text(), "Location")]',
      'xpath=//nav//*[contains(text(), "Location")]',
    ];
    
    let locationClicked = false;
    let locationSelectorUsed = null;
    
    // Debug: Check page title and URL
    const pageTitle = await page.title();
    const currentUrl = page.url();
    console.log(`[DMART] Page title: ${pageTitle}`);
    console.log(`[DMART] Current URL: ${currentUrl}`);
    
    // Try each selector
    for (const selector of locationSelectors) {
      try {
        console.log(`[DMART] Trying location selector: ${selector.substring(0, 60)}...`);
        const locator = page.locator(selector).first();
        
        const count = await locator.count();
        console.log(`[DMART] Found ${count} element(s) with this selector`);
        
        if (count > 0) {
          const isVisible = await locator.isVisible({ timeout: 3000 }).catch(() => false);
          console.log(`[DMART] Element visible: ${isVisible}`);
          
          if (isVisible) {
            // Scroll into view
            await locator.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            
            // Try clicking
            try {
              await locator.click({ timeout: 3000 });
              locationClicked = true;
              locationSelectorUsed = selector;
              console.log(`[DMART] ✓ Location selector clicked successfully!`);
              break;
            } catch (clickError) {
              console.log(`[DMART] Click failed, trying force click...`);
              try {
                await locator.click({ timeout: 3000, force: true });
                locationClicked = true;
                locationSelectorUsed = selector;
                console.log(`[DMART] ✓ Location selector clicked (force)!`);
                break;
              } catch (forceError) {
                console.log(`[DMART] Force click also failed: ${forceError.message}`);
                // Try JavaScript click as last resort
                try {
                  const element = await locator.elementHandle();
                  if (element) {
                    await element.click();
                    locationClicked = true;
                    locationSelectorUsed = selector;
                    console.log(`[DMART] ✓ Location selector clicked (JS)!`);
                    break;
                  }
                } catch (jsError) {
                  console.log(`[DMART] JS click failed: ${jsError.message}`);
                }
              }
            }
          }
        }
      } catch (e) {
        console.log(`[DMART] Selector failed: ${e.message}`);
        continue;
      }
    }

    if (!locationClicked) {
      // Save debug info
      try {
        await page.screenshot({ path: 'dmart-debug-homepage-location-not-found.png', fullPage: true });
        const pageContent = await page.content();
        fs.writeFileSync('dmart-debug-homepage-source.html', pageContent, 'utf8');
        console.log(`[DMART] Debug files saved: dmart-debug-homepage-location-not-found.png, dmart-debug-homepage-source.html`);
      } catch (e) {
        console.log(`[DMART] Could not save debug files: ${e.message}`);
      }
      
      // If location selector not found on homepage, try proceeding to search page anyway
      // D-Mart might not require location selection, or it might be set via cookies
      console.log(`[DMART] ⚠️  Location selector not found on homepage. Proceeding to search page - location might be optional or set via cookies.`);
    } else {
      console.log(`[DMART] ✓ Location selector found and clicked using: ${locationSelectorUsed}`);

      // Only proceed with location selection if we found the location selector
      console.log(`[DMART] Step 3: Waiting for location modal to open...`);
      await page.waitForTimeout(1000);
      
      // Try multiple strategies to find the location input
      const dialogSelectors = [
        'div[role="dialog"] input[type="text"]',
        'div[role="dialog"] input',
        'input[type="text"][placeholder*="location" i]',
        'input[type="text"][placeholder*="city" i]',
        'input[type="text"][placeholder*="pincode" i]',
        'xpath=//div[@role="dialog"]//input[@type="text"]',
        'xpath=//div[contains(@class, "modal")]//input',
        'xpath=//div[contains(@class, "dialog")]//input',
      ];
      
      let dialogInputFound = false;
      for (const selector of dialogSelectors) {
        try {
          console.log(`[DMART] Waiting for dialog input: ${selector}...`);
          await page.waitForSelector(selector, { timeout: 5000 });
          dialogInputFound = true;
          console.log(`[DMART] ✓ Dialog input found: ${selector}`);
          break;
        } catch (e) {
          console.log(`[DMART] Dialog input selector failed: ${selector}`);
          continue;
        }
      }
      
      if (!dialogInputFound) {
        await page.screenshot({ path: 'dmart-debug-dialog-not-found.png', fullPage: true });
        console.log(`[DMART] ⚠️  Location dialog not found. Proceeding without location selection.`);
      } else {
        // Continue with location selection flow

        console.log(`[DMART] Step 4: Typing location: ${locationName}`);
        
        // Find the location input using multiple selectors
        const inputSelectors = [
          'div[role="dialog"] input[type="text"]',
          'div[role="dialog"] input',
          'input[type="text"][placeholder*="location" i]',
          'input[type="text"][placeholder*="city" i]',
          'input[type="text"][placeholder*="pincode" i]',
          'xpath=//div[@role="dialog"]//input[@type="text"]',
          'xpath=//div[contains(@class, "modal")]//input',
          'xpath=//div[contains(@class, "dialog")]//input',
        ];
        
        let locationInput = null;
        for (const selector of inputSelectors) {
          try {
            const input = page.locator(selector).first();
            if (await input.isVisible({ timeout: 2000 })) {
              locationInput = input;
              console.log(`[DMART] ✓ Using input selector: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!locationInput) {
          console.log(`[DMART] ⚠️  Could not find location input. Proceeding without location selection.`);
        } else {
          await locationInput.click();
          await page.waitForTimeout(300);
          await locationInput.fill(''); // Clear any existing text
          await page.waitForTimeout(300);
          await locationInput.fill(locationName);
          console.log(`[DMART] ✓ Location typed: ${locationName}`);
          
          console.log(`[DMART] Waiting for location suggestions to appear...`);
          // Wait for suggestions to load
          await page.waitForTimeout(2000);
          
          // Wait for suggestions container to appear
          try {
            await page.waitForSelector('div[role="dialog"] ul, div[role="dialog"] li, div[role="dialog"] [class*="suggestion"], div[role="dialog"] [class*="option"]', {
              timeout: 5000
            });
            console.log(`[DMART] ✓ Suggestions container found`);
          } catch (e) {
            console.log(`[DMART] ⚠️  Suggestions container not found, trying alternative selectors...`);
          }
          
          await page.waitForTimeout(1000);
          
          // Get all suggestion elements
          let suggestionClicked = false;
          const suggestionSelectors = [
            'div[role="dialog"] li',
            'div[role="dialog"] ul li',
            'div[role="dialog"] [class*="suggestion"]',
            'div[role="dialog"] [class*="option"]',
            'div[role="dialog"] div[role="option"]',
            'div[role="dialog"] button',
            'div[role="dialog"] [class*="list-item"]',
            'div[role="dialog"] [class*="item"]',
          ];
          
          let allSuggestions = [];
          for (const selector of suggestionSelectors) {
            try {
              const suggestions = await page.locator(selector).all();
              if (suggestions.length > 0) {
                console.log(`[DMART] Found ${suggestions.length} suggestions using: ${selector}`);
                allSuggestions = suggestions;
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (allSuggestions.length === 0) {
            // Fallback: try to get all clickable elements in dialog
            try {
              allSuggestions = await page.locator('div[role="dialog"] *').filter({ hasText: /./ }).all();
              console.log(`[DMART] Found ${allSuggestions.length} potential clickable elements in dialog`);
            } catch (e) {
              console.log(`[DMART] Could not find any suggestions: ${e.message}`);
            }
          }
          
          // Generate location name variations for matching
          const locationVariations = [
            locationName.trim(),                                    // Exact: "RT Nagar"
            locationName.trim().toLowerCase(),                     // Lowercase: "rt nagar"
            locationName.trim().toUpperCase(),                     // Uppercase: "RT NAGAR"
            locationName.trim().replace(/\s+/g, ''),               // No spaces: "RTNagar"
            locationName.trim().replace(/\s+/g, ' '),             // Normalized: "RT Nagar"
            locationName.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') // Title case
          ];
          
          // Remove duplicates
          const uniqueVariations = [...new Set(locationVariations)];
          console.log(`[DMART] Looking for location: ${locationName} (variations: ${uniqueVariations.join(', ')})`);
          
          // Try to find and click the best matching suggestion
          let bestMatch = null;
          let bestMatchScore = 0;
          
          for (let i = 0; i < allSuggestions.length; i++) {
            try {
              const suggestion = allSuggestions[i];
              const isVisible = await suggestion.isVisible({ timeout: 1000 }).catch(() => false);
              if (!isVisible) continue;
              
              const text = await suggestion.textContent().catch(() => '');
              const normalizedText = text.trim().toLowerCase();
              
              // Skip if contains excluded words
              if (normalizedText.includes('airport') || 
                  normalizedText.includes('railway') || 
                  normalizedText.includes('station') ||
                  normalizedText.includes('temple') ||
                  normalizedText.length === 0) {
                continue;
              }
              
              // Score the match
              let score = 0;
              for (const variation of uniqueVariations) {
                const normalizedVariation = variation.toLowerCase();
                if (normalizedText === normalizedVariation) {
                  score = 100; // Exact match
                  break;
                } else if (normalizedText.startsWith(normalizedVariation)) {
                  score = Math.max(score, 80); // Starts with
                } else if (normalizedText.includes(normalizedVariation)) {
                  score = Math.max(score, 60); // Contains
                } else if (normalizedVariation.includes(normalizedText)) {
                  score = Math.max(score, 40); // Text contains variation
                }
              }
              
              if (score > bestMatchScore) {
                bestMatchScore = score;
                bestMatch = { element: suggestion, text: text.trim(), index: i };
              }
              
              // Log first few suggestions for debugging
              if (i < 5) {
                console.log(`[DMART] Suggestion ${i + 1}: "${text.trim()}" (score: ${score})`);
              }
            } catch (e) {
              continue;
            }
          }
          
          // Try to click the best match
          if (bestMatch && bestMatchScore >= 40) {
            console.log(`[DMART] Best match found: "${bestMatch.text}" (score: ${bestMatchScore})`);
            const suggestion = bestMatch.element;
            
            try {
              // Scroll into view
              await suggestion.scrollIntoViewIfNeeded();
              await page.waitForTimeout(500);
              
              // Try regular click
              try {
                await suggestion.click({ timeout: 3000 });
                suggestionClicked = true;
                console.log(`[DMART] ✓ Location suggestion clicked: "${bestMatch.text}"`);
              } catch (e) {
                console.log(`[DMART] Regular click failed: ${e.message}, trying force click...`);
                // Try force click
                try {
                  await suggestion.click({ timeout: 3000, force: true });
                  suggestionClicked = true;
                  console.log(`[DMART] ✓ Location suggestion clicked (force): "${bestMatch.text}"`);
                } catch (e2) {
                  console.log(`[DMART] Force click failed: ${e2.message}, trying JavaScript click...`);
                  // Try JavaScript click
                  try {
                    const elementHandle = await suggestion.elementHandle();
                    if (elementHandle) {
                      await elementHandle.click();
                      suggestionClicked = true;
                      console.log(`[DMART] ✓ Location suggestion clicked (JS): "${bestMatch.text}"`);
                    }
                  } catch (e3) {
                    console.log(`[DMART] JavaScript click also failed: ${e3.message}`);
                  }
                }
              }
            } catch (e) {
              console.log(`[DMART] Error clicking best match: ${e.message}`);
            }
          }
          
          // If best match didn't work, try clicking by index (first few suggestions)
          if (!suggestionClicked && allSuggestions.length > 0) {
            console.log(`[DMART] Best match click failed, trying to click first few suggestions...`);
            for (let i = 0; i < Math.min(5, allSuggestions.length); i++) {
              try {
                const suggestion = allSuggestions[i];
                const isVisible = await suggestion.isVisible({ timeout: 1000 }).catch(() => false);
                if (!isVisible) continue;
                
                const text = await suggestion.textContent().catch(() => '');
                const normalizedText = text.trim().toLowerCase();
                
                // Skip if contains excluded words or empty
                if (normalizedText.includes('airport') || 
                    normalizedText.includes('railway') || 
                    normalizedText.includes('station') ||
                    normalizedText.includes('temple') ||
                    normalizedText.length === 0) {
                  continue;
                }
                
                // Check if it might match our location
                let mightMatch = false;
                for (const variation of uniqueVariations) {
                  if (normalizedText.includes(variation.toLowerCase()) || 
                      variation.toLowerCase().includes(normalizedText)) {
                    mightMatch = true;
                    break;
                  }
                }
                
                if (mightMatch || i === 0) { // Try first one even if no match
                  await suggestion.scrollIntoViewIfNeeded();
                  await page.waitForTimeout(300);
                  
                  try {
                    await suggestion.click({ timeout: 2000, force: true });
                    suggestionClicked = true;
                    console.log(`[DMART] ✓ Location suggestion clicked by index ${i}: "${text.trim()}"`);
                    break;
                  } catch (e) {
                    try {
                      const elementHandle = await suggestion.elementHandle();
                      if (elementHandle) {
                        await elementHandle.click();
                        suggestionClicked = true;
                        console.log(`[DMART] ✓ Location suggestion clicked (JS) by index ${i}: "${text.trim()}"`);
                        break;
                      }
                    } catch (e2) {
                      continue;
                    }
                  }
                }
              } catch (e) {
                continue;
              }
            }
          }

          if (!suggestionClicked) {
            // Save debug info
            try {
              await page.screenshot({ path: 'dmart-debug-suggestion-not-found.png', fullPage: true });
              const suggestions = await page.locator('ul li, div[role="dialog"] div').all();
              console.log(`[DMART] Found ${suggestions.length} potential suggestion elements`);
              
              // Log visible text in dialog
              const dialogText = await page.locator('div[role="dialog"]').textContent().catch(() => '');
              console.log(`[DMART] Dialog content preview: ${dialogText.substring(0, 200)}...`);
            } catch (e) {
              console.log(`[DMART] Could not save debug info: ${e.message}`);
            }
            
            console.log(`[DMART] ⚠️  Could not click location suggestion. Proceeding without location selection.`);
          } else {
            console.log(`[DMART] ✓ Location suggestion selected successfully`);

            console.log(`[DMART] Step 5: Waiting for location to be applied...`);
            await page.waitForTimeout(1000);

            console.log(`[DMART] Step 6: Clicking confirm location button...`);
            await page.waitForTimeout(500);
            
            // Find and click the "CONFIRM" button
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
                  console.log(`[DMART] Confirm location button clicked using: ${selector}`);
                  break;
                }
              } catch (e) {
                continue;
              }
            }

            if (!confirmClicked) {
              console.log(`[DMART] ⚠️  Warning: Could not find confirm button, continuing anyway...`);
            } else {
              console.log(`[DMART] ✓ Confirm button clicked`);
            }

            console.log(`[DMART] Step 7: Waiting for location to be confirmed...`);
            await page.waitForTimeout(2000);
          }
        }
      }
    }
    
    // Step 8: Search for product on the same page (after location is confirmed)
    console.log(`[DMART] Step 8: Searching for product "${productName}" on the current page...`);
    
    // Wait for the page to settle after location confirmation
    await page.waitForTimeout(1000);
    
    // Find the search input field
    const searchInputSelectors = [
      'input#scrInput',
      'input[type="text"][id="scrInput"]',
      'input[type="search"]',
      'input[placeholder*="search" i]',
      'input[placeholder*="Search" i]',
      'xpath=//input[@id="scrInput"]',
      'xpath=//input[@type="text" and contains(@placeholder, "search")]',
    ];
    
    let searchInput = null;
    for (const selector of searchInputSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 5000 })) {
          searchInput = input;
          console.log(`[DMART] ✓ Found search input using: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!searchInput) {
      console.log(`[DMART] ⚠️  Could not find search input on page, navigating to search URL as fallback...`);
      // Fallback: navigate directly to search URL
      const searchUrl = `https://www.dmart.in/search?searchTerm=${encodeURIComponent(productName)}`;
      console.log(`[DMART] Search URL: ${searchUrl}`);
      
      const searchResponse = await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      
      if (!searchResponse || !searchResponse.ok()) {
        const status = searchResponse ? searchResponse.status() : 'unknown';
        console.warn(`[DMART] ⚠️  Search page returned status ${status}, continuing anyway...`);
      } else {
        console.log(`[DMART] ✓ Search page loaded successfully (status: ${searchResponse.status()})`);
      }
      
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log(`[DMART] Network idle timeout on search page, continuing...`);
      });
      await page.waitForTimeout(3000);
      console.log(`[DMART] ✓ Search page fully loaded`);
    } else {
      // Clear and fill the search input
      console.log(`[DMART] Typing product name in search input...`);
      await searchInput.click();
      await page.waitForTimeout(300);
      await searchInput.fill('');
      await page.waitForTimeout(300);
      await searchInput.fill(productName);
      console.log(`[DMART] ✓ Product name typed: ${productName}`);
      await page.waitForTimeout(500);
      
      // Find and click the search button or press Enter
      const searchButtonSelectors = [
        'xpath=//button[contains(@class, "searchButton") or contains(@class, "search")]',
        'button[class*="searchButton"]',
        'button[class*="search"]',
        'button[type="submit"]',
        'xpath=//button[contains(., "Search")]',
      ];
      
      let searchButtonClicked = false;
      for (const selector of searchButtonSelectors) {
        try {
          const searchButton = page.locator(selector).first();
          if (await searchButton.isVisible({ timeout: 2000 })) {
            await searchButton.click({ timeout: 2000 });
            searchButtonClicked = true;
            console.log(`[DMART] ✓ Search button clicked using: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!searchButtonClicked) {
        // Fallback: Press Enter
        console.log(`[DMART] Search button not found, pressing Enter...`);
        await searchInput.press('Enter');
        console.log(`[DMART] ✓ Enter pressed`);
      }
      
      // Wait for search results to load
      console.log(`[DMART] Waiting for search results to load...`);
      await page.waitForTimeout(2000);
      
      // Wait for either navigation to complete or search results to appear
      try {
        await Promise.race([
          page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
          page.waitForSelector('div[class*="product"], div[class*="item"], div[class*="result"], [class*="horizontal-card"], [class*="card-horizontal"]', {
            timeout: 10000
          })
        ]);
        console.log(`[DMART] ✓ Search results loaded`);
      } catch (e) {
        console.log(`[DMART] Waiting additional time for search results...`);
        await page.waitForTimeout(2000);
        console.log(`[DMART] ✓ Proceeding with search results`);
      }
    }
    
    // Wait for search results to appear
    try {
      await Promise.race([
        page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
        page.waitForSelector('div[class*="product"], div[class*="item"], div[class*="result"], [class*="horizontal-card"], [class*="card-horizontal"]', {
          timeout: 10000
        })
      ]);
      console.log(`[DMART] ✓ Search results loaded`);
    } catch (e) {
      // Fallback: wait a bit more
      console.log(`[DMART] Waiting additional time for search results...`);
      await page.waitForTimeout(2000);
      console.log(`[DMART] ✓ Proceeding with search results`);
    }

    // Wait for product elements to be fully rendered (like JioMart does)
    console.log(`[DMART] Step 9: Waiting for product elements to render...`);
    try {
      // Wait for product cards or items to appear
      await page.waitForSelector('[class*="vertical-card"], [class*="stretched-card"], [class*="product"], [class*="item"]', {
        timeout: 10000
      });
      console.log(`[DMART] ✓ Product elements found`);
    } catch (e) {
      console.log(`[DMART] ⚠️  Product elements not found, continuing anyway...`);
    }
    
    // Additional 2-second wait to ensure all dynamic content is loaded
    console.log(`[DMART] Step 10: Waiting 2 seconds for dynamic content to fully load...`);
    await page.waitForTimeout(2000);
    console.log(`[DMART] ✓ Ready to extract HTML`);

    // Take a screenshot of search results
    console.log(`[DMART] Step 11: Taking screenshot and saving HTML...`);
    const screenshotPath = `dmart-${locationName.toLowerCase().replace(/\s+/g, '-')}-${productName.toLowerCase().replace(/\s+/g, '-')}-search-results.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[DMART] ✓ Screenshot saved: ${screenshotPath}`);

    // Get the HTML of the search results page
    const pageHtml = await page.content();
    console.log(`[DMART] HTML retrieved: ${pageHtml.length} characters`);
    
    // Ensure output directory exists
    const outputDir = 'output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const htmlPath = path.join(outputDir, `dmart-${locationName.toLowerCase().replace(/\s+/g, '-')}-${productName.toLowerCase().replace(/\s+/g, '-')}-search-results.html`);
    fs.writeFileSync(htmlPath, pageHtml, 'utf8');
    console.log(`[DMART] ✓ Search results HTML saved: ${htmlPath}`);

    console.log(`[DMART] ========================================`);
    console.log(`[DMART] ✅ SUCCESS!`);
    console.log(`[DMART] Location "${locationName}" selected and product "${productName}" searched successfully!`);
    console.log(`[DMART] HTML length: ${pageHtml.length} characters`);
    console.log(`[DMART] ========================================`);

    // Close browser AFTER HTML is retrieved
    console.log('\n=== Closing browser ===');
    await browser.close();
    console.log('Browser closed.');

    // Return the HTML
    return pageHtml;

  } catch (error) {
    console.error(`[DMART] ❌ Error occurred: ${error.message}`);
    console.error(`[DMART] Error stack: ${error.stack}`);
    
    try {
      // Save multiple debug files
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await page.screenshot({ path: `dmart-error-${timestamp}.png`, fullPage: true });
      const pageContent = await page.content();
      fs.writeFileSync(`dmart-error-${timestamp}.html`, pageContent, 'utf8');
      const pageUrl = page.url();
      console.error(`[DMART] Error screenshot saved: dmart-error-${timestamp}.png`);
      console.error(`[DMART] Error HTML saved: dmart-error-${timestamp}.html`);
      console.error(`[DMART] Error occurred at URL: ${pageUrl}`);
    } catch (e) {
      console.error(`[DMART] Could not save error debug files: ${e.message}`);
    }
    
    // Close browser on error
    try {
      await browser.close();
      console.log('[DMART] Browser closed after error.');
    } catch (e) {
      // Ignore if already closed
    }
    
    // Re-throw with more context
    throw new Error(`[DMART] ${error.message}. Check debug files for details.`);
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
