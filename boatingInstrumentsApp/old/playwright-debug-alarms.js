const { chromium } = require('playwright');

(async () => {
  console.log('🎭 Starting Playwright inspection of alarm settings...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error));

  console.log('📱 Navigating to alarm settings...');
  await page.goto('http://localhost:8081/settings/alarms');
  
  // Wait for page to load
  await page.waitForTimeout(3000);

  console.log('\n🔍 Checking page structure...');
  
  // Check if loading indicator appears
  const loadingText = await page.locator('text=Loading alarm settings').count();
  console.log('Loading indicator found:', loadingText > 0);

  // Wait for content to load
  await page.waitForTimeout(2000);

  // Check for alarm cards
  const alarmCards = await page.locator('[style*="backgroundColor"][style*="#FFFFFF"]').count();
  console.log('Alarm cards found:', alarmCards);

  // Check for switches
  const switches = await page.locator('input[type="checkbox"]').count();
  console.log('Switch controls found:', switches);

  // Check for text inputs
  const textInputs = await page.locator('input[type="text"], input:not([type])').count();
  console.log('Text input controls found:', textInputs);

  // Check for buttons
  const buttons = await page.locator('button, [role="button"]').count();
  console.log('Button controls found:', buttons);

  // Try to get the first switch element
  console.log('\n🎯 Testing first switch interaction...');
  const firstSwitch = page.locator('input[type="checkbox"]').first();
  const switchExists = await firstSwitch.count();
  
  if (switchExists > 0) {
    console.log('Switch found! Attempting to click...');
    const isChecked = await firstSwitch.isChecked();
    console.log('Initial checked state:', isChecked);
    
    try {
      await firstSwitch.click();
      await page.waitForTimeout(500);
      const newChecked = await firstSwitch.isChecked();
      console.log('After click checked state:', newChecked);
      console.log('Switch toggled successfully:', isChecked !== newChecked);
    } catch (error) {
      console.error('Failed to click switch:', error.message);
    }
  } else {
    console.log('❌ No switches found on page');
  }

  // Try to get the first text input
  console.log('\n📝 Testing first text input interaction...');
  const firstInput = page.locator('input[type="text"]').first();
  const inputExists = await firstInput.count();
  
  if (inputExists > 0) {
    console.log('Text input found! Attempting to type...');
    try {
      await firstInput.click();
      await firstInput.fill('5.5');
      const value = await firstInput.inputValue();
      console.log('Input value after typing:', value);
      console.log('Input interaction successful:', value === '5.5');
    } catch (error) {
      console.error('Failed to interact with input:', error.message);
    }
  } else {
    console.log('❌ No text inputs found on page');
  }

  // Check for any pointer-events: none styling
  console.log('\n🚫 Checking for pointer-events blocking...');
  const blockedElements = await page.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    const blocked = [];
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.pointerEvents === 'none') {
        blocked.push({
          tag: el.tagName,
          classes: el.className,
          id: el.id
        });
      }
    });
    return blocked;
  });
  
  console.log('Elements with pointer-events: none:', blockedElements.length);
  if (blockedElements.length > 0) {
    console.log('First few blocked elements:', blockedElements.slice(0, 5));
  }

  // Take a screenshot
  console.log('\n📸 Taking screenshot...');
  await page.screenshot({ path: 'alarm-settings-debug.png', fullPage: true });
  console.log('Screenshot saved to alarm-settings-debug.png');

  console.log('\n✅ Inspection complete. Browser will stay open for manual inspection.');
  console.log('Press Ctrl+C to exit when done.');

  // Keep browser open for manual inspection
  await page.waitForTimeout(300000); // 5 minutes
  
  await browser.close();
})();
