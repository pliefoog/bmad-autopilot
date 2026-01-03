const { performance } = require('perf_hooks');

async function testBrowserPerformance() {
  const start = performance.now();

  try {
    const response = await fetch('http://localhost:8082');
    const html = await response.text();

    const loadTime = performance.now() - start;

    console.log(`Load Time: ${loadTime.toFixed(2)}ms`);
    console.log(`Response Size: ${html.length} bytes`);
    console.log(`Status: ${response.status}`);

    return {
      loadTime,
      responseSize: html.length,
      status: response.status,
    };
  } catch (error) {
    console.error('Performance test failed:', error.message);
    return { error: error.message };
  }
}

testBrowserPerformance()
  .then((result) => {
    console.log('Performance Result:', JSON.stringify(result, null, 2));
  })
  .catch(console.error);
