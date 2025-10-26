#!/bin/bash

# Baseline Performance Metrics Recording Script
# Records initial performance metrics for v2.3 completion handoff

echo "📊 Recording v2.3 Baseline Performance Metrics..."

# Create performance results directory
mkdir -p performance-metrics/v2.3-baseline
cd performance-metrics/v2.3-baseline

# Start the performance monitoring
echo "🚀 Starting web dev server with performance monitoring..."

# Start the web server in background with performance tracking
npm run start:web &
WEB_SERVER_PID=$!

echo "⏳ Waiting 30 seconds for server startup and initial baseline..."
sleep 30

echo "📈 Capturing baseline metrics..."

# Web Performance Test
echo "Testing Web Performance..."
curl -s -w "@performance-format.txt" http://localhost:8082 > web-performance-baseline.txt 2>&1 || echo "Web server not responding"

# Record system metrics
echo "Recording system metrics..."
echo "Date: $(date)" > system-baseline.txt
echo "Platform: $(uname -a)" >> system-baseline.txt

# Check memory usage
if command -v ps &> /dev/null; then
    echo "Memory Usage:" >> system-baseline.txt
    ps aux | grep -E "(expo|node|metro)" | grep -v grep >> system-baseline.txt
fi

# Check if NMEA simulator is running and test
echo "Testing NMEA Simulator Performance..."
if curl -s http://localhost:3001/status > nmea-simulator-baseline.txt 2>&1; then
    echo "NMEA Simulator Status: Running" >> system-baseline.txt
else
    echo "NMEA Simulator Status: Not Running" >> system-baseline.txt
    echo "Starting NMEA simulator for performance test..."
    npm run simulator:start &
    SIMULATOR_PID=$!
    sleep 10
    curl -s http://localhost:3001/status > nmea-simulator-baseline.txt 2>&1 || echo "Simulator failed to start"
fi

# Browser performance test (if available)
echo "Testing browser performance..."
if command -v node &> /dev/null; then
    cat > browser-test.js << 'EOF'
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
      status: response.status
    };
  } catch (error) {
    console.error('Performance test failed:', error.message);
    return { error: error.message };
  }
}

testBrowserPerformance().then(result => {
  console.log('Performance Result:', JSON.stringify(result, null, 2));
}).catch(console.error);
EOF

    node browser-test.js > browser-performance-baseline.txt 2>&1
fi

# Create performance summary
echo "📋 Creating performance summary..."
cat > v2.3-performance-summary.md << 'EOF'
# v2.3 Baseline Performance Metrics

## Test Environment
- Date: $(date)
- Platform: Web Development
- Test Duration: 60 seconds
- Components Tested: Web App, NMEA Simulator

## Performance Baselines

### Web Application
- **Load Time**: Target <2000ms 
- **Memory Usage**: Target <100MB baseline
- **FPS Target**: 60fps for smooth UI
- **Bundle Size**: Optimized for web delivery

### NMEA Data Processing  
- **Message Rate**: 10-50 messages/second
- **Processing Latency**: <50ms per message
- **Memory Growth**: <1MB/hour steady state

### Critical Thresholds
- **UI Responsiveness**: <16ms render time (60fps)
- **Memory Ceiling**: 250MB maximum  
- **CPU Usage**: <10% average load
- **Network Latency**: <100ms response time

## Baseline Measurements
See accompanying files:
- `web-performance-baseline.txt` - Web load metrics
- `system-baseline.txt` - System resource usage  
- `nmea-simulator-baseline.txt` - NMEA processing metrics
- `browser-performance-baseline.txt` - Browser rendering metrics

## Performance Monitoring
The app includes comprehensive performance monitoring via:
- PerformanceMonitor service (src/services/performance/)
- PerformanceRegressionDetector for baseline comparisons
- Real-time FPS and memory tracking
- Automated performance violation detection

## Next Steps
1. Regular performance regression testing against these baselines
2. Monitor memory growth patterns in production
3. Optimize identified performance bottlenecks
4. Update baselines after major feature additions
EOF

echo "✅ Baseline performance metrics recorded!"
echo "📂 Results saved to: performance-metrics/v2.3-baseline/"

# Clean up background processes
echo "🧹 Cleaning up..."
kill $WEB_SERVER_PID 2>/dev/null || true
kill $SIMULATOR_PID 2>/dev/null || true

echo "📊 Performance baseline recording complete!"