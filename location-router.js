import readline from 'readline';
import { selectLocationOnZepto } from './zepto-location-selector.js';
import { selectLocationAndSearchOnDmart } from './dmart-location-selector.js';
import { selectLocationOnJioMart } from './jiomart-location-selector.js';
import { selectLocationOnNaturesBasket } from './naturesbasket-location-selector.js';

/**
 * Location Router - Routes URL and location to appropriate website handler
 * Supports: JioMart, Zepto, Nature's Basket, and D-Mart
 */

// Helper function to get user input
function getUserInput(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}


// Route to appropriate handler based on website
async function routeToHandler(website, url, location) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Routing to ${website.toUpperCase()} handler`);
  console.log(`URL: ${url}`);
  console.log(`Location: ${location}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    switch (website.toLowerCase()) {
      case 'jiomart':
      case 'jeomart':
        // JioMart accepts URL and location
        return await selectLocationOnJioMart(location, url);
      
      case 'zepto':
        // Zepto accepts URL and location
        return await selectLocationOnZepto(location, url);
      
      case 'naturesbasket':
        // Nature's Basket accepts URL and location
        return await selectLocationOnNaturesBasket(location, url);
      
      case 'dmart':
        // D-Mart doesn't accept URL, it constructs it from product name
        // Extract product from URL if possible, otherwise use default
        let searchTerm = 'potato'; // default
        try {
          const urlParams = new URL(url);
          searchTerm = urlParams.searchParams.get('searchTerm') || searchTerm;
        } catch (e) {
          console.log(`⚠️ Could not parse URL, using default product: ${searchTerm}`);
        }
        return await selectLocationAndSearchOnDmart(location, searchTerm);
      
      default:
        throw new Error(`Unknown website: ${website}. Supported websites: jiomart, zepto, naturesbasket, dmart`);
    }
  } catch (error) {
    console.error(`\n❌ Error in ${website} handler:`, error.message);
    throw error;
  }
}

// Main function
async function main() {
  let website, url, location;

  // Check if arguments are provided via command line
  const args = process.argv.slice(2);
  
  if (args.length >= 3) {
    // Use command line arguments: <website> <url> <location>
    website = args[0];
    url = args[1];
    location = args[2];
    console.log(`\n📥 Using command line arguments:`);
    console.log(`   Website: ${website}`);
    console.log(`   URL: ${url}`);
    console.log(`   Location: ${location}`);
  } else {
    // Prompt for input
    console.log(`\n${'='.repeat(60)}`);
    console.log(`   Location Router - E-commerce Location Selector`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nSupported websites:`);
    console.log(`  - jiomart (or jeomart)`);
    console.log(`  - zepto`);
    console.log(`  - naturesbasket`);
    console.log(`  - dmart`);
    console.log(`\n${'='.repeat(60)}\n`);

    website = await getUserInput('Enter website name (zepto/jiomart/naturesbasket/dmart): ');
    url = await getUserInput('Enter URL: ');
    location = await getUserInput('Enter location: ');
  }

  // Validate inputs
  if (!website || !url || !location) {
    console.error('\n❌ Error: Website name, URL, and location are all required');
    console.log('\nUsage:');
    console.log('  node location-router.js <website> <url> <location>');
    console.log('\nExamples:');
    console.log('  node location-router.js zepto https://www.zepto.com/search?query=Paracetamol Mumbai');
    console.log('  node location-router.js jiomart https://www.jiomart.com/search?q=tomoto Bangalore');
    console.log('  node location-router.js naturesbasket https://www.naturesbasket.co.in/search?q=potato Chennai');
    console.log('  node location-router.js dmart https://www.dmart.in/search?searchTerm=potato Mumbai');
    process.exit(1);
  }

  // Normalize website name
  website = website.toLowerCase().trim();
  
  // Validate website name
  const validWebsites = ['zepto', 'jiomart', 'jeomart', 'naturesbasket', 'dmart'];
  if (!validWebsites.includes(website)) {
    console.error(`\n❌ Error: Invalid website name: ${website}`);
    console.log(`\nSupported websites: ${validWebsites.join(', ')}`);
    process.exit(1);
  }

  // Route to appropriate handler
  try {
    const result = await routeToHandler(website, url, location);
    console.log(`\n✅ Success! Location "${location}" selected on ${website}`);
    if (result) {
      console.log(`📄 HTML length: ${result.length} characters`);
    }
    return result;
  } catch (error) {
    console.error(`\n❌ Failed to select location: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

export { routeToHandler };

