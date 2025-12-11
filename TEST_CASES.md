# Test Cases for Location Selector Orchestrator

This document contains all test cases for the location selector orchestrator that supports multiple e-commerce websites.

## Test Execution

Run tests using the orchestrator:
```bash
node location-selector-orchestrator.js <url> <location> [product]
```

---

## Test Case 1: D-Mart - Mumbai with Potato

**Test ID:** TC-DMART-001  
**Priority:** High  
**Description:** Test D-Mart location selection and product search with Mumbai location and potato product

**Input:**
- URL: `https://www.dmart.in/search?searchTerm=potato`
- Location: `Mumbai`
- Product: `potato`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.dmart.in/search?searchTerm=potato" Mumbai potato
```

**Expected Results:**
- ✅ Browser opens and navigates to D-Mart search page
- ✅ Location selector is clicked successfully
- ✅ Mumbai location is selected from suggestions
- ✅ Location is confirmed
- ✅ Product "potato" is searched
- ✅ Search results page is displayed
- ✅ HTML file is saved: `dmart-mumbai-potato-[timestamp].html`
- ✅ Screenshot is saved: `dmart-mumbai-potato-search-results.png`
- ✅ Returns HTML content of search results page

**Validation:**
- Check that HTML file contains product search results
- Verify location is set to Mumbai in the page
- Confirm search results are displayed

---

## Test Case 2: D-Mart - Bangalore with Rice

**Test ID:** TC-DMART-002  
**Priority:** High  
**Description:** Test D-Mart with different location (Bangalore) and different product (rice)

**Input:**
- URL: `https://www.dmart.in/search?searchTerm=rice`
- Location: `Bangalore`
- Product: `rice`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.dmart.in/search?searchTerm=rice" Bangalore rice
```

**Expected Results:**
- ✅ Location selector opens
- ✅ Bangalore location is selected
- ✅ Product "rice" is searched
- ✅ HTML file saved: `dmart-bangalore-rice-[timestamp].html`
- ✅ Returns HTML with search results

---

## Test Case 3: D-Mart - Chennai with Onion

**Test ID:** TC-DMART-003  
**Priority:** Medium  
**Description:** Test D-Mart with Chennai location and onion product

**Input:**
- URL: `https://www.dmart.in/search?searchTerm=onion`
- Location: `Chennai`
- Product: `onion`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.dmart.in/search?searchTerm=onion" Chennai onion
```

**Expected Results:**
- ✅ Chennai location selected successfully
- ✅ Onion search results displayed
- ✅ HTML file generated

---

## Test Case 4: D-Mart - Delhi with Tomato

**Test ID:** TC-DMART-004  
**Priority:** Medium  
**Description:** Test D-Mart with Delhi location and tomato product

**Input:**
- URL: `https://www.dmart.in/search?searchTerm=tomato`
- Location: `Delhi`
- Product: `tomato`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.dmart.in/search?searchTerm=tomato" Delhi tomato
```

**Expected Results:**
- ✅ Delhi location selected
- ✅ Tomato search completed
- ✅ Results page HTML returned

---

## Test Case 5: JioMart - Mumbai with Tomato

**Test ID:** TC-JIOMART-001  
**Priority:** High  
**Description:** Test JioMart location selection with Mumbai location

**Input:**
- URL: `https://www.jiomart.com/search?q=tomato`
- Location: `Mumbai`
- Product: `tomato` (optional, not yet implemented)

**Command:**
```bash
node location-selector-orchestrator.js "https://www.jiomart.com/search?q=tomato" Mumbai tomato
```

**Expected Results:**
- ✅ Browser opens JioMart search page
- ✅ Location selector is clicked
- ✅ Mumbai location is selected
- ✅ Location is confirmed
- ✅ HTML file saved: `jiomart-mumbai-tomato-[timestamp].html`
- ✅ Returns HTML after location selection
- ⚠️ Note: Product search not yet implemented, only location selection

**Validation:**
- Verify location is set to Mumbai
- Check HTML contains location confirmation

---

## Test Case 6: JioMart - Bangalore

**Test ID:** TC-JIOMART-002  
**Priority:** Medium  
**Description:** Test JioMart with Bangalore location

**Input:**
- URL: `https://www.jiomart.com/search?q=apple`
- Location: `Bangalore`
- Product: `apple`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.jiomart.com/search?q=apple" Bangalore apple
```

**Expected Results:**
- ✅ Bangalore location selected
- ✅ HTML file generated
- ⚠️ Product search not implemented

---

## Test Case 7: JioMart - Chennai

**Test ID:** TC-JIOMART-003  
**Priority:** Medium  
**Description:** Test JioMart with Chennai location

**Input:**
- URL: `https://www.jiomart.com/search?q=milk`
- Location: `Chennai`
- Product: `milk`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.jiomart.com/search?q=milk" Chennai milk
```

**Expected Results:**
- ✅ Chennai location selected
- ✅ HTML saved

---

## Test Case 8: Nature's Basket - Mumbai with Tomato

**Test ID:** TC-NATURESBASKET-001  
**Priority:** High  
**Description:** Test Nature's Basket location selection with Mumbai

**Input:**
- URL: `https://www.naturesbasket.co.in/search?q=tomato`
- Location: `Mumbai`
- Product: `tomato` (optional, not yet implemented)

**Command:**
```bash
node location-selector-orchestrator.js "https://www.naturesbasket.co.in/search?q=tomato" Mumbai tomato
```

**Expected Results:**
- ✅ Browser opens Nature's Basket search page
- ✅ "Select Location" button is clicked
- ✅ Location modal opens
- ✅ Mumbai is typed in location input
- ✅ Mumbai suggestion is selected
- ✅ Confirm location button is clicked
- ✅ HTML file saved: `naturesbasket-mumbai-tomato-[timestamp].html`
- ✅ Returns HTML after location selection
- ⚠️ Note: Product search not yet implemented

**Validation:**
- Verify location modal opens correctly
- Check Mumbai location is confirmed
- Verify HTML contains location confirmation

---

## Test Case 9: Nature's Basket - Bangalore

**Test ID:** TC-NATURESBASKET-002  
**Priority:** Medium  
**Description:** Test Nature's Basket with Bangalore location

**Input:**
- URL: `https://www.naturesbasket.co.in/search?q=coffee`
- Location: `Bangalore`
- Product: `coffee`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.naturesbasket.co.in/search?q=coffee" Bangalore coffee
```

**Expected Results:**
- ✅ Bangalore location selected
- ✅ HTML file generated

---

## Test Case 10: Nature's Basket - Chennai

**Test ID:** TC-NATURESBASKET-003  
**Priority:** Medium  
**Description:** Test Nature's Basket with Chennai location

**Input:**
- URL: `https://www.naturesbasket.co.in/search?q=bread`
- Location: `Chennai`
- Product: `bread`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.naturesbasket.co.in/search?q=bread" Chennai bread
```

**Expected Results:**
- ✅ Chennai location selected
- ✅ HTML saved

---

## Test Case 11: Nature's Basket - Madurai

**Test ID:** TC-NATURESBASKET-004  
**Priority:** Low  
**Description:** Test Nature's Basket with Madurai location

**Input:**
- URL: `https://www.naturesbasket.co.in/search?q=cheese`
- Location: `Madurai`
- Product: `cheese`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.naturesbasket.co.in/search?q=cheese" Madurai cheese
```

**Expected Results:**
- ✅ Madurai location selected
- ✅ HTML file generated

---

## Test Case 12: Zepto - Mumbai with Paracetamol

**Test ID:** TC-ZEPTO-001  
**Priority:** High  
**Description:** Test Zepto location selection with Mumbai location

**Input:**
- URL: `https://www.zepto.com/search?query=Paracetamol`
- Location: `Mumbai`
- Product: `Paracetamol` (optional, not yet implemented)

**Command:**
```bash
node location-selector-orchestrator.js "https://www.zepto.com/search?query=Paracetamol" Mumbai Paracetamol
```

**Expected Results:**
- ✅ Browser opens Zepto search page
- ✅ Location selector is clicked
- ✅ Mumbai location is selected
- ✅ Location is confirmed
- ✅ HTML file saved: `zepto-mumbai-paracetamol-[timestamp].html`
- ✅ Returns HTML after location selection
- ⚠️ Note: Product search not yet implemented

**Validation:**
- Verify location selection works
- Check HTML contains location confirmation

---

## Test Case 13: Zepto - Bangalore

**Test ID:** TC-ZEPTO-002  
**Priority:** Medium  
**Description:** Test Zepto with Bangalore location

**Input:**
- URL: `https://www.zepto.com/search?query=Medicine`
- Location: `Bangalore`
- Product: `Medicine`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.zepto.com/search?query=Medicine" Bangalore Medicine
```

**Expected Results:**
- ✅ Bangalore location selected
- ✅ HTML file generated

---

## Test Case 14: Zepto - Chennai

**Test ID:** TC-ZEPTO-003  
**Priority:** Medium  
**Description:** Test Zepto with Chennai location

**Input:**
- URL: `https://www.zepto.com/search?query=Tablets`
- Location: `Chennai`
- Product: `Tablets`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.zepto.com/search?query=Tablets" Chennai Tablets
```

**Expected Results:**
- ✅ Chennai location selected
- ✅ HTML saved

---

## Test Case 15: Zepto - Madurai

**Test ID:** TC-ZEPTO-004  
**Priority:** Low  
**Description:** Test Zepto with Madurai location

**Input:**
- URL: `https://www.zepto.com/search?query=Syrup`
- Location: `Madurai`
- Product: `Syrup`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.zepto.com/search?query=Syrup" Madurai Syrup
```

**Expected Results:**
- ✅ Madurai location selected
- ✅ HTML file generated

---

## Negative Test Cases

### Test Case 16: Invalid URL

**Test ID:** TC-NEGATIVE-001  
**Priority:** High  
**Description:** Test error handling for unsupported website URL

**Input:**
- URL: `https://www.invalid-site.com/search`
- Location: `Mumbai`
- Product: `test`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.invalid-site.com/search" Mumbai test
```

**Expected Results:**
- ❌ Error message displayed: "Unsupported site. URL must be from one of: dmart.in, jiomart.com, naturesbasket.co.in, zepto.com"
- ❌ Script exits with error code
- ❌ No HTML file generated

---

### Test Case 17: Missing Arguments

**Test ID:** TC-NEGATIVE-002  
**Priority:** High  
**Description:** Test validation for missing command line arguments

**Input:**
- No arguments provided

**Command:**
```bash
node location-selector-orchestrator.js
```

**Expected Results:**
- ❌ Usage instructions displayed
- ❌ Error message: "Usage: node location-selector-orchestrator.js <url> <location> [product]"
- ❌ Examples shown
- ❌ Script exits with error code 1

---

### Test Case 18: Missing Location Argument

**Test ID:** TC-NEGATIVE-003  
**Priority:** Medium  
**Description:** Test validation for missing location argument

**Input:**
- URL only provided

**Command:**
```bash
node location-selector-orchestrator.js "https://www.dmart.in/search?searchTerm=potato"
```

**Expected Results:**
- ❌ Usage instructions displayed
- ❌ Script exits with error

---

### Test Case 19: Invalid Location Format

**Test ID:** TC-NEGATIVE-004  
**Priority:** Low  
**Description:** Test with invalid location name (empty string or special characters)

**Input:**
- URL: `https://www.dmart.in/search?searchTerm=potato`
- Location: `` (empty)
- Product: `potato`

**Command:**
```bash
node location-selector-orchestrator.js "https://www.dmart.in/search?searchTerm=potato" "" potato
```

**Expected Results:**
- ⚠️ May fail during location selection
- ⚠️ Error in location selector script

---

## Performance Test Cases

### Test Case 20: Multiple Sequential Runs

**Test ID:** TC-PERF-001  
**Priority:** Medium  
**Description:** Test running multiple test cases sequentially

**Command:**
```bash
node location-selector-orchestrator.js "https://www.dmart.in/search?searchTerm=potato" Mumbai potato
node location-selector-orchestrator.js "https://www.jiomart.com/search?q=tomato" Mumbai tomato
node location-selector-orchestrator.js "https://www.naturesbasket.co.in/search?q=tomato" Mumbai tomato
node location-selector-orchestrator.js "https://www.zepto.com/search?query=Paracetamol" Mumbai Paracetamol
```

**Expected Results:**
- ✅ All four websites tested sequentially
- ✅ Each test completes successfully
- ✅ No memory leaks or browser session issues
- ✅ All HTML files generated

---

## Test Execution Summary

### Quick Test Suite (Smoke Tests)
Run these 4 tests to verify basic functionality:

1. **TC-DMART-001** - D-Mart Mumbai Potato
2. **TC-JIOMART-001** - JioMart Mumbai Tomato
3. **TC-NATURESBASKET-001** - Nature's Basket Mumbai Tomato
4. **TC-ZEPTO-001** - Zepto Mumbai Paracetamol

### Full Test Suite
Run all 20 test cases for comprehensive coverage.

### Regression Test Suite
Run test cases TC-DMART-001 through TC-ZEPTO-004 (14 tests) after code changes.

---

## Test Results Template

| Test ID | Status | Execution Time | Notes |
|---------|--------|----------------|-------|
| TC-DMART-001 | ⬜ Pass / ⬜ Fail | __ seconds | |
| TC-DMART-002 | ⬜ Pass / ⬜ Fail | __ seconds | |
| TC-JIOMART-001 | ⬜ Pass / ⬜ Fail | __ seconds | |
| TC-NATURESBASKET-001 | ⬜ Pass / ⬜ Fail | __ seconds | |
| TC-ZEPTO-001 | ⬜ Pass / ⬜ Fail | __ seconds | |

---

## Notes

1. **Browser Requirements:** Chrome browser must be installed and accessible
2. **Network:** Stable internet connection required
3. **Timeouts:** Some tests may take 30-60 seconds to complete
4. **Screenshots:** Screenshots are saved by individual scripts (not orchestrator)
5. **HTML Files:** All HTML files are saved with timestamp in filename
6. **Dynamic Imports:** Only the required module is loaded based on URL
7. **Product Search:** Currently only D-Mart supports product search after location selection

---

## Future Enhancements

- [ ] Add product search functionality for JioMart
- [ ] Add product search functionality for Nature's Basket
- [ ] Add product search functionality for Zepto
- [ ] Add automated test runner script
- [ ] Add test result reporting
- [ ] Add parallel test execution support
