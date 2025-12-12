import * as cheerio from 'cheerio';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extract data from D-Mart HTML
 */
function extractFromDmart(html, filename) {
  const $ = cheerio.load(html);
  const products = [];
  const location = extractLocationFromDmart($);

  // Extract products from vertical cards (grid view)
  $('.vertical-card_title__pMGg9').each((index, element) => {
    const productName = $(element).text().trim();
    const productCard = $(element).closest('[class*="vertical-card_card"]').first();
    
    let price = null;
    let mrp = null;
    
    // Try to find price in the same card
    const priceContainer = productCard.find('.vertical-card_price__OEmV3');
    if (priceContainer.length > 0) {
      // Look for DMart price (current selling price) - not in strike-through section
      const priceSection = priceContainer.find('.vertical-card_price-left__1ecs8');
      const dmartPriceSection = priceSection.find('section:not(.vertical-card_strike-through__rRL1B)');
      const dmartPriceElement = dmartPriceSection.find('.vertical-card_amount__80Zwk').first();
      if (dmartPriceElement.length > 0 && !dmartPriceElement.attr('style')?.includes('line-through')) {
        price = parseFloat(dmartPriceElement.text().trim());
      }
      
      // Look for MRP (strikethrough price)
      const mrpElement = priceSection.find('.vertical-card_strike-through__rRL1B .vertical-card_amount__80Zwk').first();
      if (mrpElement.length > 0) {
        mrp = parseFloat(mrpElement.text().trim());
      }
    }

    if (productName) {
      products.push({
        name: productName,
        price: price,
        mrp: mrp,
        website: 'DMart'
      });
    }
  });

  // Also extract from stretched cards (list view)
  $('.stretched-card_title__1mqeI').each((index, element) => {
    const productName = $(element).text().trim();
    if (productName && !products.some(p => p.name === productName)) {
      const productCard = $(element).closest('[class*="stretched-card"]').first();
      
      let price = null;
      // Try to find price in stretched card
      const priceText = productCard.text();
      const priceMatch = priceText.match(/₹\s*(\d+[.,]?\d*)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(/,/g, ''));
      }

      products.push({
        name: productName,
        price: price,
        mrp: null,
        website: 'DMart'
      });
    }
  });

  return {
    website: 'DMart',
    location: location,
    products: products,
    filename: filename
  };
}

/**
 * Extract location from D-Mart HTML
 */
function extractLocationFromDmart($) {
  // Try to find location in header - pincode element
  const pincodeElement = $('.header_pincode__KryhE').first();
  if (pincodeElement.length > 0) {
    let locationText = pincodeElement.text().trim();
    // Clean up the location text - remove extra whitespace and format
    locationText = locationText.replace(/\s+/g, ' ').trim();
    if (locationText && locationText.length < 100) {
      return locationText;
    }
  }
  
  // Try to find in any location-related element in header
  const headerLocation = $('header [class*="pincode"], header [class*="location"], header [class*="area"]').first();
  if (headerLocation.length > 0) {
    let locationText = headerLocation.text().trim().replace(/\s+/g, ' ');
    if (locationText && locationText.length < 100) {
      return locationText;
    }
  }
  
  return null;
}

/**
 * Extract data from JioMart HTML
 */
function extractFromJioMart(html, filename) {
  const $ = cheerio.load(html);
  const products = [];
  const location = extractLocationFromJioMart($);

  // JioMart product selectors - look for specific product card patterns
  // Filter out navigation items and other non-product elements
  const excludedTexts = ['Home', 'Shop By Category', 'My Orders', 'My Account', 'Cart', 'Login', 'Sign Up', 'Search', 'Menu'];
  
  $('[class*="product"], [class*="item-card"], [class*="jm-product"], [data-testid*="product"]').each((index, element) => {
    const $el = $(element);
    
    // Skip if it's clearly a navigation element
    const elementText = $el.text().trim();
    if (excludedTexts.some(text => elementText.includes(text) && elementText.length < 50)) {
      return;
    }
    
    // Try multiple selectors for product name - look for product-specific classes
    const productName = $el.find('[class*="product-title"], [class*="product-name"], [class*="item-title"], [class*="title"]').first().text().trim();
    
    // If no specific product title found, try to find any heading that's not too short
    const fallbackName = productName || $el.find('h2, h3, h4, h5, [class*="name"]').first().text().trim();
    
    // Validate product name - should be meaningful and not a navigation item
    if (fallbackName && fallbackName.length > 5 && 
        !excludedTexts.some(text => fallbackName.includes(text)) &&
        !fallbackName.match(/^(Home|Shop|My|Cart|Login|Sign|Search|Menu)$/i)) {
      
      // Try to find price
      let price = null;
      let mrp = null;
      
      // Look for price in specific price containers
      const priceElement = $el.find('[class*="price"], [class*="amount"], [class*="cost"]').first();
      if (priceElement.length > 0) {
        const priceText = priceElement.text();
        const priceMatches = priceText.match(/₹\s*(\d+[.,]?\d*)/g);
        if (priceMatches && priceMatches.length > 0) {
          const prices = priceMatches.map(m => extractPrice(m));
          if (prices.length > 1) {
            mrp = prices[0];
            price = prices[1];
          } else {
            price = prices[0];
          }
        }
      } else {
        // Fallback: search in entire element text
        const priceText = $el.text();
        const priceMatches = priceText.match(/₹\s*(\d+[.,]?\d*)/g);
        if (priceMatches && priceMatches.length > 0) {
          const prices = priceMatches.map(m => extractPrice(m));
          if (prices.length > 1) {
            mrp = prices[0];
            price = prices[1];
          } else {
            price = prices[0];
          }
        }
      }

      // Only add if we haven't seen this product name before
      if (!products.some(p => p.name === fallbackName)) {
        products.push({
          name: fallbackName,
          price: price,
          mrp: mrp,
          website: 'JioMart'
        });
      }
    }
  });

  return {
    website: 'JioMart',
    location: location,
    products: products,
    filename: filename
  };
}

/**
 * Extract location from JioMart HTML
 */
function extractLocationFromJioMart($) {
  // Try to find location in header or location selector
  const locationSelectors = [
    '[class*="location"]',
    '[class*="pincode"]',
    '[class*="area"]',
    '[class*="address"]',
    '[data-testid*="location"]'
  ];

  for (const selector of locationSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      const text = element.text().trim();
      if (text && text.length < 100) { // Reasonable location name length
        return text;
      }
    }
  }

  return null;
}

/**
 * Extract data from Nature's Basket HTML
 */
function extractFromNaturesBasket(html, filename) {
  const $ = cheerio.load(html);
  const products = [];
  const location = extractLocationFromNaturesBasket($);

  // Nature's Basket uses product links with h3 tags inside
  // Structure: <a href="/product-detail/..."><h3>Product Name</h3></a>
  $('a[href*="/product-detail/"]').each((index, element) => {
    const $link = $(element);
    
    // Extract product name from h3 tag inside the link
    const productName = $link.find('h3').first().text().trim() || 
                       $link.text().trim();
    
    if (!productName || productName.length < 3) return;
    
    // Find the parent container that likely contains price information
    const $container = $link.closest('div, article, section, li');
    
    // Extract prices from the container
    let mrp = null;
    let price = null;
    const containerText = $container.text();
    const priceMatches = containerText.match(/₹\s*(\d+(?:\.\d+)?)/g);
    
    if (priceMatches && priceMatches.length > 0) {
      const prices = priceMatches.map(m => extractPrice(m)).filter(p => p !== null && p > 0);
      if (prices.length > 0) {
        // Check for strikethrough (MRP) vs regular price
        const hasStrike = $container.find('s, del, [style*="line-through"], [style*="text-decoration: line-through"], [class*="strike"], [class*="line-through"]').length > 0;
        if (hasStrike && prices.length > 1) {
          // First price with strike is MRP, second is selling price
          mrp = prices[0];
          price = prices[1];
        } else if (prices.length > 1) {
          // If multiple prices, assume first is MRP, second is selling price
          mrp = prices[0];
          price = prices[1];
        } else {
          // Single price - assume it's the selling price
          price = prices[0];
        }
      }
    }

    // Only add if we have a product name and price
    if (productName && price && productName.length >= 3) {
      // Remove duplicates
      if (!products.some(p => p.name === productName)) {
        products.push({
          name: productName,
          price: price,
          mrp: mrp,
          website: "Nature's Basket"
        });
      }
    }
  });

  // Remove duplicates
  const uniqueProducts = [];
  const seenNames = new Set();
  for (const product of products) {
    const normalizedName = product.name.toLowerCase().trim();
    if (!seenNames.has(normalizedName) && product.name.length > 3) {
      seenNames.add(normalizedName);
      uniqueProducts.push(product);
    }
  }

  return {
    website: "Nature's Basket",
    location: location,
    products: uniqueProducts,
    filename: filename
  };
}

/**
 * Extract location from Nature's Basket HTML
 */
function extractLocationFromNaturesBasket($) {
  const locationSelectors = [
    '[class*="location"]',
    '[class*="pincode"]',
    '[class*="area"]',
    '[class*="address"]'
  ];

  for (const selector of locationSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      const text = element.text().trim();
      if (text && text.length < 100) {
        return text;
      }
    }
  }

  return null;
}

/**
 * Extract data from Zepto HTML
 */
function extractFromZepto(html, filename) {
  const $ = cheerio.load(html);
  const products = [];
  const location = extractLocationFromZepto($);

  // Zepto uses data-slot-id="ProductName" for product names
  // Product names are also in img alt/title attributes
  // Strategy 1: Find products by img alt/title (primary method for Zepto)
  $('img[alt], img[title]').each((index, element) => {
    const $img = $(element);
    let productName = $img.attr('alt')?.trim() || $img.attr('title')?.trim();
    
    if (!productName || productName.length < 3) return;
    
    // Skip if it's not a product image (check for common non-product alt text)
    if (productName.match(/^(P3|Ad|logo|icon|button|arrow|close|menu|search|Zepto)$/i) || 
        productName.match(/\.(png|jpg|jpeg|gif|svg)$/i) || // Skip image filenames
        productName.length < 5) return;
    
    // Find the parent container - look for a div that contains both the img and price
    let $container = $img.parent();
    let depth = 0;
    const maxDepth = 5;
    
    // Walk up the DOM tree to find a container with price
    while (depth < maxDepth && $container.length > 0) {
      const containerText = $container.text();
      const hasPrice = containerText.match(/₹\s*\d+/);
      
      if (hasPrice) {
        break; // Found a container with price
      }
      
      $container = $container.parent();
      depth++;
    }
    
    // If no container with price found, try siblings
    if (!$container.text().match(/₹\s*\d+/)) {
      $container = $img.closest('div, article, section');
    }
    
    // Must have price in the container
    const hasPrice = $container.text().match(/₹\s*\d+/);
    if (!hasPrice) return;
    
    // Extract prices
    let mrp = null;
    let price = null;
    const containerText = $container.text();
    const priceMatches = containerText.match(/₹\s*(\d+(?:\.\d+)?)/g);
    
    if (priceMatches && priceMatches.length > 0) {
      const prices = priceMatches.map(m => extractPrice(m)).filter(p => p !== null && p > 0);
      if (prices.length > 0) {
        const hasStrike = $container.find('s, del, [style*="line-through"], [class*="strike"]').length > 0;
        if (hasStrike && prices.length > 1) {
          mrp = prices[0];
          price = prices[1];
        } else if (prices.length > 1) {
          mrp = prices[0];
          price = prices[1];
        } else {
          price = prices[0];
        }
      }
    }
    
    if (productName && price && productName.length >= 3) {
      // Remove duplicates
      if (!products.some(p => p.name === productName)) {
        products.push({
          name: productName,
          price: price,
          mrp: mrp,
          website: 'Zepto'
        });
      }
    }
  });
  
  // Strategy 2: Fallback - Find product containers using data-slot-id
  if (products.length === 0) {
    $('[data-slot-id="ProductName"]').each((index, element) => {
      const $nameContainer = $(element);
      const $productCard = $nameContainer.closest('div, article, section, a');
      
      // Extract product name from the container or nearby img
      let productName = $nameContainer.text().trim();
      
      if (!productName || productName.length < 3) {
        productName = $productCard.find('img[alt]').first().attr('alt')?.trim() ||
                     $productCard.find('img[title]').first().attr('title')?.trim();
      }
      
      if (!productName || productName.length < 3) return;
      
      // Extract prices from the product card
      let mrp = null;
      let price = null;
      const cardText = $productCard.text();
      const priceMatches = cardText.match(/₹\s*(\d+(?:\.\d+)?)/g);
      
      if (priceMatches && priceMatches.length > 0) {
        const prices = priceMatches.map(m => extractPrice(m)).filter(p => p !== null && p > 0);
        if (prices.length > 0) {
          const hasStrike = $productCard.find('s, del, [style*="line-through"], [class*="strike"]').length > 0;
          if (hasStrike && prices.length > 1) {
            mrp = prices[0];
            price = prices[1];
          } else if (prices.length > 1) {
            mrp = prices[0];
            price = prices[1];
          } else {
            price = prices[0];
          }
        }
      }
      
      if (productName && price && productName.length >= 3) {
        // Remove duplicates
        if (!products.some(p => p.name === productName)) {
          products.push({
            name: productName,
            price: price,
            mrp: mrp,
            website: 'Zepto'
          });
        }
      }
    });
  }
  
  // Remove duplicates and filter out invalid products
  const uniqueProducts = [];
  const seenNames = new Set();
  for (const product of products) {
    const normalizedName = product.name.toLowerCase().trim();
    // Additional validation: product name should not be just numbers or special chars
    if (!seenNames.has(normalizedName) && 
        product.name.length >= 3 && 
        product.name.length < 200 &&
        !product.name.match(/^[\d\s₹\-]+$/) && // Not just numbers and symbols
        product.price > 0) {
      seenNames.add(normalizedName);
      uniqueProducts.push(product);
    }
  }

  return {
    website: 'Zepto',
    location: location,
    products: uniqueProducts,
    filename: filename
  };
}

/**
 * Extract location from Zepto HTML
 */
function extractLocationFromZepto($) {
  const locationSelectors = [
    '[class*="location"]',
    '[class*="pincode"]',
    '[class*="area"]',
    '[class*="address"]',
    '[data-testid*="location"]'
  ];

  for (const selector of locationSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      const text = element.text().trim();
      if (text && text.length < 100) {
        return text;
      }
    }
  }

  return null;
}

/**
 * Extract data from Swiggy HTML
 */
function extractFromSwiggy(html, filename) {
  const $ = cheerio.load(html);
  const products = [];
  const location = extractLocationFromSwiggy($, html);

  // Swiggy Instamart uses obfuscated class names, so we need multiple strategies
  // Exclude navigation and UI elements
  const excludedTexts = ['Careers', 'Swiggy One', 'Swiggy Instamart', 'Home', 'Cart', 'Search', 'Menu', 
                         'Login', 'Sign', 'Add', 'Remove', 'Quantity', 'View Cart', 'Checkout', 
                         'Delivery', 'Pickup', 'Filters', 'Sort', 'Categories'];
  
  // Strategy 1: Look for data-testid attributes related to products
  $('[data-testid*="product"], [data-testid*="item-card"], [data-testid*="search-item"]').each((index, element) => {
    const $el = $(element);
    const productName = $el.find('[class*="title"], [class*="name"], h2, h3, h4').first().text().trim();
    
    // Validate product name
    if (productName && productName.length > 5 && 
        !excludedTexts.some(text => productName.includes(text)) &&
        !productName.match(/^(Home|Cart|Search|Menu|Login|Sign|Add|Remove|View|Checkout|Delivery|Pickup)$/i)) {
      
      let price = null;
      let mrp = null;
      
      // Look for price in the element
      const priceText = $el.text();
      const priceMatches = priceText.match(/₹\s*(\d+[.,]?\d*)/g);
      if (priceMatches && priceMatches.length > 0) {
        const prices = priceMatches.map(m => extractPrice(m)).filter(p => p !== null);
        if (prices.length > 1) {
          // Usually first is MRP, second is selling price
          mrp = prices[0];
          price = prices[1];
        } else if (prices.length === 1) {
          price = prices[0];
        }
      }

      // Only add if we have a price (products should have prices)
      if (price !== null && !products.some(p => p.name === productName)) {
        products.push({
          name: productName,
          price: price,
          mrp: mrp,
          website: 'Swiggy'
        });
      }
    }
  });

  // Strategy 2: Look for elements with price patterns and meaningful text
  $('div, section, article').each((index, element) => {
    const $el = $(element);
    const text = $el.text().trim();
    
    // Check if this element contains a price and meaningful product-like text
    if (text.match(/₹\s*\d+/) && text.length > 10 && text.length < 200) {
      // Extract potential product name (text before price)
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const priceLineIndex = lines.findIndex(l => l.match(/₹\s*\d+/));
      
      if (priceLineIndex > 0) {
        const productName = lines[priceLineIndex - 1] || lines[0];
        
        // Validate it's a product name (not navigation, not too short)
        if (productName && productName.length > 5 && 
            !productName.match(/^(Home|Cart|Search|Menu|Login|Sign|Add|Remove|Quantity)$/i) &&
            !products.some(p => p.name === productName)) {
          
          const priceMatches = text.match(/₹\s*(\d+[.,]?\d*)/g);
          if (priceMatches && priceMatches.length > 0) {
            const prices = priceMatches.map(m => extractPrice(m)).filter(p => p !== null);
            if (prices.length > 1) {
              mrp = prices[0];
              price = prices[1];
            } else if (prices.length === 1) {
              price = prices[0];
            }
          }

          products.push({
            name: productName,
            price: price,
            mrp: mrp,
            website: 'Swiggy'
          });
        }
      }
    }
  });

  // Strategy 3: Try to extract from JSON state if available
  try {
    // Try to find the JSON state - it might span multiple lines
    const jsonMatch = html.match(/window\.___INITIAL_STATE___\s*=\s*(\{[\s\S]+?\});/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const state = JSON.parse(jsonMatch[1]);
        
        // Extract products from search results if available
        if (state.searchPLV2 && state.searchPLV2.data && state.searchPLV2.data.items) {
          state.searchPLV2.data.items.forEach(item => {
            if (item.name && !products.some(p => p.name === item.name)) {
              products.push({
                name: item.name,
                price: item.price || item.finalPrice || item.sellingPrice || null,
                mrp: item.mrp || item.originalPrice || null,
                website: 'Swiggy'
              });
            }
          });
        }
        
        // Extract from product listing if available
        if (state.categoryListingV2 && state.categoryListingV2.data && state.categoryListingV2.data.items) {
          state.categoryListingV2.data.items.forEach(item => {
            if (item.name && !products.some(p => p.name === item.name)) {
              products.push({
                name: item.name,
                price: item.price || item.finalPrice || item.sellingPrice || null,
                mrp: item.mrp || item.originalPrice || null,
                website: 'Swiggy'
              });
            }
          });
        }
        
        // Try other possible paths in the state
        if (state.instamart && state.instamart.searchResults && Array.isArray(state.instamart.searchResults)) {
          state.instamart.searchResults.forEach(item => {
            if (item.name && !products.some(p => p.name === item.name)) {
              products.push({
                name: item.name,
                price: item.price || item.finalPrice || item.sellingPrice || null,
                mrp: item.mrp || item.originalPrice || null,
                website: 'Swiggy'
              });
            }
          });
        }
        
        // Try nested paths
        const findProductsInObject = (obj, path = '') => {
          if (!obj || typeof obj !== 'object') return;
          
          if (Array.isArray(obj)) {
            obj.forEach((item, idx) => {
              if (item && typeof item === 'object' && item.name && (item.price || item.finalPrice || item.sellingPrice)) {
                if (!products.some(p => p.name === item.name)) {
                  products.push({
                    name: item.name,
                    price: item.price || item.finalPrice || item.sellingPrice || null,
                    mrp: item.mrp || item.originalPrice || null,
                    website: 'Swiggy'
                  });
                }
              } else {
                findProductsInObject(item, `${path}[${idx}]`);
              }
            });
          } else {
            Object.keys(obj).forEach(key => {
              if (key.toLowerCase().includes('product') || key.toLowerCase().includes('item')) {
                findProductsInObject(obj[key], `${path}.${key}`);
              }
            });
          }
        };
        
        // Only do deep search if we haven't found products yet
        if (products.length === 0) {
          findProductsInObject(state);
        }
      } catch (parseError) {
        // JSON parsing failed, continue with DOM extraction
        console.error(`Error parsing Swiggy JSON state: ${parseError.message}`);
      }
    }
  } catch (e) {
    // JSON extraction failed, continue with DOM extraction
  }

  return {
    website: 'Swiggy',
    location: location,
    products: products,
    filename: filename
  };
}

/**
 * Extract location from Swiggy HTML
 */
function extractLocationFromSwiggy($, html) {
  // Strategy 1: Try to extract from JSON state (most reliable for Swiggy)
  try {
    const jsonMatch = html.match(/window\.___INITIAL_STATE___\s*=\s*({.+?});/);
    if (jsonMatch) {
      const state = JSON.parse(jsonMatch[1]);
      if (state.userLocation && state.userLocation.address) {
        return state.userLocation.address;
      }
      if (state.userLocation && state.userLocation.annotation) {
        return state.userLocation.annotation;
      }
    }
    
    // Also check App.userLocation
    const appLocationMatch = html.match(/userLocation:\s*({[^}]+})/);
    if (appLocationMatch) {
      try {
        const locationObj = eval('(' + appLocationMatch[1] + ')');
        if (locationObj.address) {
          return locationObj.address;
        }
        if (locationObj.annotation) {
          return locationObj.annotation;
        }
      } catch (e) {
        // Try JSON parse
        try {
          const locationObj = JSON.parse(appLocationMatch[1]);
          if (locationObj.address) {
            return locationObj.address;
          }
          if (locationObj.annotation) {
            return locationObj.annotation;
          }
        } catch (e2) {
          // Continue to DOM extraction
        }
      }
    }
  } catch (e) {
    // JSON extraction failed, try DOM
  }

  // Strategy 2: Try DOM selectors
  const locationSelectors = [
    '[class*="location"]',
    '[class*="pincode"]',
    '[class*="area"]',
    '[class*="address"]',
    '[data-testid*="location"]',
    '[aria-label*="location"]',
    '[aria-label*="address"]'
  ];

  for (const selector of locationSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      const text = element.text().trim();
      if (text && text.length > 3 && text.length < 100) {
        return text;
      }
    }
  }

  return null;
}

/**
 * Extract price from text string
 */
function extractPrice(priceText) {
  if (!priceText) return null;
  
  // Remove currency symbols and extract numbers
  const match = priceText.match(/₹?\s*(\d+(?:[.,]\d+)?)/);
  if (match) {
    const priceStr = match[1].replace(/,/g, '');
    const price = parseFloat(priceStr);
    // Round to 2 decimal places if it's a valid number
    return isNaN(price) ? null : Math.round(price * 100) / 100;
  }
  
  return null;
}

/**
 * Determine website from filename
 */
function determineWebsite(filename) {
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename.includes('dmart')) return 'dmart';
  if (lowerFilename.includes('jiomart')) return 'jiomart';
  if (lowerFilename.includes('naturesbasket')) return 'naturesbasket';
  if (lowerFilename.includes('zepto')) return 'zepto';
  if (lowerFilename.includes('swiggy')) return 'swiggy';
  return null;
}

/**
 * Extract data from a single HTML file
 */
function extractDataFromFile(filepath, filename) {
  try {
    const html = readFileSync(filepath, 'utf8');
    const website = determineWebsite(filename);
    
    if (!website) {
      console.warn(`⚠️  Could not determine website for file: ${filename}`);
      return null;
    }

    let result;
    switch (website) {
      case 'dmart':
        result = extractFromDmart(html, filename);
        break;
      case 'jiomart':
        result = extractFromJioMart(html, filename);
        break;
      case 'naturesbasket':
        result = extractFromNaturesBasket(html, filename);
        break;
      case 'zepto':
        result = extractFromZepto(html, filename);
        break;
      case 'swiggy':
        result = extractFromSwiggy(html, filename);
        break;
      default:
        console.warn(`⚠️  Unknown website: ${website}`);
        return null;
    }

    return result;
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
    return null;
  }
}

/**
 * Extract data from all HTML files in the output directory
 */
function extractDataFromAllFiles(outputDir = 'output') {
  const results = [];
  
  try {
    const files = readdirSync(outputDir);
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    
    // Also check root directory for Swiggy files if outputDir is 'output'
    let rootSwiggyFiles = [];
    if (outputDir === 'output') {
      try {
        const rootFiles = readdirSync('.');
        rootSwiggyFiles = rootFiles.filter(file => 
          file.endsWith('.html') && 
          file.toLowerCase().includes('swiggy')
        ).map(file => ({ file, path: file }));
      } catch (e) {
        // Root directory not accessible, continue
      }
    }
    
    const allFiles = [
      ...htmlFiles.map(file => ({ file, path: join(outputDir, file) })),
      ...rootSwiggyFiles
    ];
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 HTML Data Selector`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Found ${allFiles.length} HTML file(s) to process\n`);

    for (const { file, path: filepath } of allFiles) {
      console.log(`Processing: ${file}...`);
      
      const result = extractDataFromFile(filepath, file);
      if (result) {
        results.push(result);
        console.log(`  ✅ Extracted ${result.products.length} product(s), Location: ${result.location || 'Not found'}`);
      } else {
        console.log(`  ⚠️  Failed to extract data`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 SUMMARY`);
    console.log(`${'='.repeat(60)}\n`);

    results.forEach(result => {
      console.log(`\n${result.website.toUpperCase()}:`);
      console.log(`  Location: ${result.location || 'Not found'}`);
      console.log(`  Products: ${result.products.length}`);
      if (result.products.length > 0) {
        console.log(`  Sample products:`);
        result.products.slice(0, 3).forEach((product, index) => {
          console.log(`    ${index + 1}. ${product.name}`);
          console.log(`       Price: ${product.price ? '₹' + product.price : 'N/A'}`);
          if (product.mrp) {
            console.log(`       MRP: ₹${product.mrp}`);
          }
        });
        if (result.products.length > 3) {
          console.log(`    ... and ${result.products.length - 3} more`);
        }
      }
    });

    // Return results for programmatic use
    return results;
  } catch (error) {
    console.error(`❌ Error reading output directory:`, error.message);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  // Parse arguments - filter out flags
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
  const outputDir = args[0] || 'output';
  const saveJson = process.argv.includes('--json') || process.argv.includes('-j');
  
  const results = extractDataFromAllFiles(outputDir);
  
  // Optionally save results to JSON
  if (saveJson) {
    const fs = await import('fs');
    const jsonPath = join(outputDir, 'extracted-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n💾 Results saved to: ${jsonPath}`);
  }
  
  return results;
}

// Run if called directly (not when imported)
const isMainModule = () => {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const runFile = process.argv[1] ? fileURLToPath(`file:///${process.argv[1]}`) : '';
    return currentFile === runFile || process.argv[1]?.endsWith('html-data-selector.js');
  } catch (e) {
    return false;
  }
};

if (isMainModule()) {
  main().catch(console.error);
}

export {
  extractDataFromFile,
  extractDataFromAllFiles,
  extractFromDmart,
  extractFromJioMart,
  extractFromNaturesBasket,
  extractFromZepto,
  extractFromSwiggy
};

