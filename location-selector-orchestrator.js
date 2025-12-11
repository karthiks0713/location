// Dynamic imports - only load the module needed based on URL

/**
 * Unified orchestrator for location selection and product search across multiple e-commerce sites
 * 
 * Usage:
 *   node location-selector-orchestrator.js <url> <location> <product>
 * 
 * Example:
 *   node location-selector-orchestrator.js "https://www.dmart.in/search?searchTerm=potato" Mumbai potato
 *   node location-selector-orchestrator.js "https://www.jiomart.com/search?q=tomato" Mumbai tomato
 *   node location-selector-orchestrator.js "https://www.naturesbasket.co.in/search?q=tomato" Mumbai tomato
 *   node location-selector-orchestrator.js "https://www.zepto.com/search?query=Paracetamol" Mumbai Paracetamol
 */

/**
 * Determines which site handler to use based on the URL
 */
function determineSite(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('dmart.in')) {
    return 'dmart';
  } else if (urlLower.includes('jiomart.com')) {
    return 'jiomart';
  } else if (urlLower.includes('naturesbasket.co.in')) {
    return 'naturesbasket';
  } else if (urlLower.includes('zepto.com')) {
    return 'zepto';
  } else {
    throw new Error(`Unsupported site. URL must be from one of: dmart.in, jiomart.com, naturesbasket.co.in, zepto.com`);
  }
}

/**
 * Extracts product name from URL if not provided
 */
function extractProductFromUrl(url, site) {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    switch (site) {
      case 'dmart':
        return params.get('searchTerm') || null;
      case 'jiomart':
        return params.get('q') || null;
      case 'naturesbasket':
        return params.get('q') || null;
      case 'zepto':
        return params.get('query') || null;
      default:
        return null;
    }
  } catch (e) {
    return null;
  }
}

/**
 * Main orchestrator function
 */
async function selectLocationAndSearch(url, locationName, productName) {
  const site = determineSite(url);
  
  console.log(`\n=== Location Selector Orchestrator ===`);
  console.log(`Site: ${site}`);
  console.log(`URL: ${url}`);
  console.log(`Location: ${locationName}`);
  console.log(`Product: ${productName || 'N/A'}`);
  console.log(`========================================\n`);

  let pageHtml;

  try {
    switch (site) {
      case 'dmart':
        console.log(`Loading D-Mart location selector module...`);
        const { selectLocationAndSearchOnDmart } = await import('./dmart-location-selector.js');
        console.log(`Calling D-Mart location selector and product search...`);
        // D-Mart function constructs URL internally, so we extract product from URL if not provided
        const dmartProduct = productName || extractProductFromUrl(url, 'dmart') || 'potato';
        pageHtml = await selectLocationAndSearchOnDmart(locationName, dmartProduct);
        break;

      case 'jiomart':
        console.log(`Loading JioMart location selector module...`);
        const { selectLocationOnJioMart } = await import('./jiomart-location-selector.js');
        console.log(`Calling JioMart location selector with URL...`);
        // JioMart function accepts URL as second parameter
        pageHtml = await selectLocationOnJioMart(locationName, url);
        break;

      case 'naturesbasket':
        console.log(`Loading Nature's Basket location selector module...`);
        const { selectLocationOnNaturesBasket } = await import('./naturesbasket-location-selector.js');
        console.log(`Calling Nature's Basket location selector with URL...`);
        // Nature's Basket function accepts URL as second parameter
        pageHtml = await selectLocationOnNaturesBasket(locationName, url);
        break;

      case 'zepto':
        console.log(`Loading Zepto location selector module...`);
        const { selectLocationOnZepto } = await import('./zepto-location-selector.js');
        console.log(`Calling Zepto location selector with URL...`);
        // Zepto function accepts URL as second parameter
        pageHtml = await selectLocationOnZepto(locationName, url);
        break;

      default:
        throw new Error(`Unknown site: ${site}`);
    }

    console.log(`\n=== Process Completed Successfully ===`);
    console.log(`Final HTML length: ${pageHtml.length} characters`);
    console.log(`========================================\n`);

    return pageHtml;

  } catch (error) {
    console.error(`\n=== Error Occurred ===`);
    console.error(`Site: ${site}`);
    console.error(`Error: ${error.message}`);
    console.error(`======================\n`);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node location-selector-orchestrator.js <url> <location> [product]');
    console.error('');
    console.error('Description:');
    console.error('  Automatically identifies the website from the URL and routes to the appropriate location selector.');
    console.error('  The URL is passed to the respective handler function.');
    console.error('');
    console.error('Arguments:');
    console.error('  url       - Full URL of the website (required)');
    console.error('  location  - Location name to select (required)');
    console.error('  product   - Product name (optional, extracted from URL if not provided)');
    console.error('');
    console.error('Examples:');
    console.error('  node location-selector-orchestrator.js "https://www.dmart.in/search?searchTerm=potato" Mumbai');
    console.error('  node location-selector-orchestrator.js "https://www.jiomart.com/search?q=tomato" Mumbai');
    console.error('  node location-selector-orchestrator.js "https://www.naturesbasket.co.in/search?q=tomato" Mumbai');
    console.error('  node location-selector-orchestrator.js "https://www.zepto.com/search?query=Paracetamol" Mumbai');
    console.error('');
    console.error('Supported websites:');
    console.error('  - dmart.in');
    console.error('  - jiomart.com');
    console.error('  - naturesbasket.co.in');
    console.error('  - zepto.com');
    process.exit(1);
  }

  const url = args[0];
  const locationName = args[1];
  const productName = args[2] || null; // Optional product name (mainly for D-Mart)

  try {
    const pageHtml = await selectLocationAndSearch(url, locationName, productName);
    
    // Optionally save the HTML to a file
    const fsModule = await import('fs');
    const fs = fsModule.default || fsModule;
    const site = determineSite(url);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlPath = `${site}-${locationName.toLowerCase().replace(/\s+/g, '-')}-${productName ? productName.toLowerCase().replace(/\s+/g, '-') + '-' : ''}${timestamp}.html`;
    fs.writeFileSync(htmlPath, pageHtml, 'utf8');
    console.log(`HTML saved to: ${htmlPath}`);
    
    return pageHtml;
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

export { selectLocationAndSearch, determineSite, extractProductFromUrl };
