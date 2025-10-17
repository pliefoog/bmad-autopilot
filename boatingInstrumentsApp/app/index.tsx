// Import polyfill first for web builds
import '../import-meta-polyfill.web.js';

// Import the original boating instruments app
import App from '../App';

/**
 * Expo Router Entry Point
 * Routes to the original boating instruments application
 */
export default function AppIndex() {
  return <App />;
}
