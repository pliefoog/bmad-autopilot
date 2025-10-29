const { VesselDynamics, CoordinatedVesselState, SynchronizedNMEAGenerator } = require('./server/lib/physics/dynamics/VesselDynamics.js');
const VesselProfileManager = require('./server/lib/physics/vessel-profile.js');

/**
 * Comprehensive Performance Integration Test
 * Task 4.1: Performance optimization and testing
 */
async function performanceIntegrationTest() {
    console.log('=== Performance Integration Test ===\n');

    const profileManager = new VesselProfileManager();
    const profile = await profileManager.loadProfile('j35');
    
    // Initialize complete physics stack
    const coordState = new CoordinatedVesselState(profile);
    const nmeaGen = new SynchronizedNMEAGenerator(coordState);
    
    console.log('--- Simulated Real-World Load Test ---');
    
    // Test under simulated real-world conditions
    const testDuration = 10000; // 10 seconds
    const targetMessageRate = 500; // messages per second
    const updateInterval = 1000 / targetMessageRate; // 2ms between updates
    
    let messageCount = 0;
    let lastMemoryCheck = Date.now();
    let peakMemoryUsage = 0;
    
    const startTime = Date.now();
    let lastUpdateTime = startTime;
    
    console.log(`Target: ${targetMessageRate} msg/sec for ${testDuration/1000}s`);
    console.log(`Update interval: ${updateInterval.toFixed(2)}ms\n`);
    
    // Run simulation loop
    while (Date.now() - startTime < testDuration) {
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastUpdateTime) / 1000;
        
        // Update vessel state with realistic conditions
        coordState.updateState(deltaTime, {
            targetSpeed: 6 + Math.sin(currentTime * 0.001) * 2,
            targetHeading: 180 + Math.cos(currentTime * 0.0005) * 45
        }, {
            trueWindSpeed: 15 + Math.sin(currentTime * 0.002) * 5,
            trueWindAngle: 60 + Math.cos(currentTime * 0.001) * 30,
            waveHeight: 1.5 + Math.sin(currentTime * 0.0003) * 0.8,
            currentSpeed: 1.2,
            currentDirection: 270
        });
        
        // Generate NMEA sentences
        const nmeaResult = nmeaGen.generateSynchronizedSentences();
        messageCount += nmeaResult.sentences.length;
        
        lastUpdateTime = currentTime;
        
        // Memory monitoring every second
        if (currentTime - lastMemoryCheck > 1000) {
            const memUsage = process.memoryUsage();
            const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            peakMemoryUsage = Math.max(peakMemoryUsage, memMB);
            lastMemoryCheck = currentTime;
            
            const elapsed = (currentTime - startTime) / 1000;
            const currentRate = Math.round(messageCount / elapsed);
            process.stdout.write(`\rElapsed: ${elapsed.toFixed(1)}s | Messages: ${messageCount} | Rate: ${currentRate}/sec | Memory: ${memMB}MB`);
        }
        
        // Controlled pacing to avoid overwhelming the system
        await new Promise(resolve => setImmediate(resolve));
    }
    
    const totalTime = Date.now() - startTime;
    const actualRate = Math.round((messageCount / totalTime) * 1000);
    
    console.log('\n\n--- Performance Integration Results ---');
    console.log(`Total runtime: ${totalTime}ms`);
    console.log(`Total messages: ${messageCount}`);
    console.log(`Actual rate: ${actualRate} msg/sec`);
    console.log(`Target rate: ${targetMessageRate} msg/sec`);
    console.log(`Performance ratio: ${(actualRate / targetMessageRate).toFixed(2)}x target`);
    console.log(`Peak memory: ${peakMemoryUsage}MB`);
    console.log(`Memory efficiency: ${((100 - peakMemoryUsage) / 100 * 100).toFixed(1)}% under 100MB limit`);
    
    // Performance assessment
    const performanceGrade = actualRate >= targetMessageRate ? 'PASS' : 'FAIL';
    const memoryGrade = peakMemoryUsage < 100 ? 'PASS' : 'FAIL';
    
    console.log(`\nPerformance Grade: ${performanceGrade}`);
    console.log(`Memory Grade: ${memoryGrade}`);
    
    // Test state coherence during high load
    console.log('\n--- State Coherence Validation ---');
    const finalState = coordState.getState();
    console.log(`Temporal coherence: ${finalState.temporalCoherence ? 'COHERENT' : 'FRAGMENTED'}`);
    console.log(`State updates: ${finalState.metadata.updateCount}`);
    console.log(`Position tracking: [${finalState.position.latitude.toFixed(6)}, ${finalState.position.longitude.toFixed(6)}]`);
    console.log(`Speed over ground: ${finalState.motion.speedOverGround.toFixed(2)} knots`);
    console.log(`Course over ground: ${finalState.motion.courseOverGround.toFixed(1)}°`);
    
    return {
        messageRate: actualRate,
        memoryUsage: peakMemoryUsage,
        performancePassed: actualRate >= targetMessageRate,
        memoryPassed: peakMemoryUsage < 100,
        temporalCoherence: finalState.temporalCoherence
    };
}

// Run the integration test
performanceIntegrationTest()
    .then(results => {
        console.log('\n=== Integration Test Complete ===');
        if (results.performancePassed && results.memoryPassed) {
            console.log('✅ ALL PERFORMANCE TARGETS MET');
            process.exit(0);
        } else {
            console.log('❌ PERFORMANCE TARGETS NOT MET');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Integration test failed:', error);
        process.exit(1);
    });
