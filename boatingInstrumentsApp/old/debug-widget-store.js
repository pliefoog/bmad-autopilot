#!/usr/bin/env node

console.log('🔍 Widget Store Debug Tool');
console.log('==========================');

// Simple test to understand the widget flow
console.log('📋 Expected Behavior:');
console.log('1. App starts with 6 base widgets (compass, gps, speed, wind, depth, water-temperature)');
console.log('2. NMEA detection adds instance widgets (engines, batteries, tanks)');
console.log('3. Final result: Base widgets + Instance widgets displayed together');
console.log('');

console.log('🚨 Current Issue:');
console.log('Base widgets disappear when instance widgets are detected');
console.log('');

console.log('💡 Check browser console for these key logs:');
console.log('   [WidgetStore] initializeWidgetStatesOnAppStart - Dashboard widgets: {...}');
console.log('   [WidgetStore] updateInstanceWidgets called with: {...}');
console.log('   [WidgetStore] Classification result: {...}');
console.log('   [WidgetStore] Final widget update: {...}');
console.log('');

console.log('🔍 Debug Questions:');
console.log('1. Does initialization show 6 base widgets?');
console.log('2. Are base widgets correctly classified as non-instance?'); 
console.log('3. Are they preserved in the finalWidgets array?');
console.log('');

console.log('✅ Open http://localhost:8082 and check browser console (F12)');