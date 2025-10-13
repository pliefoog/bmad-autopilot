import { AppRegistry } from 'react-native';
import App from '../App';
import { name as appName } from '../app.json';

// Register the app
AppRegistry.registerComponent(appName, () => App);

// Run the app
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('app-container'),
});

// Log web mode startup
console.log('🌐 Boating Instruments App - Web Preview Mode');
console.log('📱 UI validation mode - native modules are mocked');
console.log('✅ Perfect for testing layouts, themes, and widget appearance');
console.log('⚠️  For full functionality, run on iOS or Android');
