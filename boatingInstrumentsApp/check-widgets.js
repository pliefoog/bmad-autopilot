// Run in browser console to see current widget state
console.log('=== CURRENT DASHBOARD WIDGETS ===');
const state = JSON.parse(localStorage.getItem('widget-store'));
if (state?.state?.dashboard?.widgets) {
  const widgets = state.state.dashboard.widgets;
  console.log(`Total widgets: ${widgets.length}`);
  widgets.forEach((w, i) => {
    console.log(`${i+1}. ${w.id} (${w.type}) - ${w.title}${w.isSystemWidget ? ' [SYSTEM]' : ''}${w.settings?.instanceId ? ` [instance: ${w.settings.instanceId}]` : ''}`);
  });
} else {
  console.log('No persisted dashboard found');
}
