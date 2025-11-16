// Test script to demonstrate the factory reset timing issue
// Run this in the browser console when the app is loaded

console.log('=== Factory Reset Timing Test ===');

// Get the widget store
const widgetStore = window.__widgetStore || (() => {
  try {
    // Try to import the store (this may not work in browser console)
    return require('./src/store/widgetStore').useWidgetStore;
  } catch (e) {
    console.error('Could not access widget store:', e);
    return null;
  }
})();

if (!widgetStore) {
  console.error('Widget store not accessible. Run this test from within the React app context.');
} else {
  console.log('Widget store found, running test...');
  
  // 1. Add some test data
  console.log('1. Adding test widget...');
  widgetStore.getState().addWidget('depth', { x: 0, y: 0 });
  
  // 2. Check localStorage before reset
  console.log('2. localStorage before reset:');
  console.log('widget-store key:', localStorage.getItem('widget-store'));
  
  // 3. Perform factory reset
  console.log('3. Performing factory reset...');
  widgetStore.getState().resetAppToDefaults().then(() => {
    console.log('4. Factory reset completed');
    
    // 4. Check localStorage immediately after
    setTimeout(() => {
      console.log('5. localStorage after reset (immediate):');
      console.log('widget-store key:', localStorage.getItem('widget-store'));
      
      // 5. Check again after a delay
      setTimeout(() => {
        console.log('6. localStorage after reset (delayed):');
        console.log('widget-store key:', localStorage.getItem('widget-store'));
        
        console.log('7. Current widget store state:');
        const state = widgetStore.getState();
        console.log({
          selectedWidgets: state.selectedWidgets,
          dashboards: state.dashboards?.length,
          currentDashboard: state.currentDashboard
        });
      }, 500);
    }, 50);
  }).catch(error => {
    console.error('Factory reset failed:', error);
  });
}