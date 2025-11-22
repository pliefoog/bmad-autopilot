const { VesselDynamics, CoordinatedVesselState, SynchronizedNMEAGenerator } = require('./server/lib/physics/dynamics/VesselDynamics.js');
const VesselProfileManager = require('./server/lib/physics/vessel-profile.js');

async function profilePhysicsPerformance() {
    console.log('=== Physics Engine Performance Profiling ===\n');

    // Load test vessel profile
    const profileManager = new VesselProfileManager();
    const profile = await profileManager.loadProfile('j35');
    console.log('Loaded vessel profile:', profile.name);

    // Initialize physics engines
    const dynamics = new VesselDynamics(profile);
    const coordState = new CoordinatedVesselState(profile);
    const nmeaGen = new SynchronizedNMEAGenerator(coordState);

    console.log('\n--- Physics Engine Component Performance ---');

    // Test 1: Basic vessel dynamics updates
    console.log('\n1. Vessel Dynamics Updates:');
    let iterations = 10000;
    let startTime = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
        dynamics.updateState(0.1, {
            speed: 5 + Math.sin(i * 0.01) * 2,
            heading: 180 + Math.cos(i * 0.005) * 30
        }, {
            trueWindSpeed: 15 + Math.sin(i * 0.01) * 5,
            trueWindAngle: 45 + Math.cos(i * 0.005) * 30
        });
    }

    let endTime = process.hrtime.bigint();
    let duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds
    let updatesPerSec = Math.round((iterations / duration) * 1000);

    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Updates/sec: ${updatesPerSec.toLocaleString()}`);
    console.log(`  Target: 500+ msg/sec (${(updatesPerSec / 500).toFixed(1)}x target)`);

    // Test 2: Coordinated state management updates
    console.log('\n2. Coordinated State Updates:');
    iterations = 5000;
    startTime = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
        coordState.updateState({
            environmentalConditions: {
                trueWindSpeed: 12 + Math.sin(i * 0.02) * 4,
                trueWindAngle: 60 + Math.cos(i * 0.01) * 20
            },
            controlInputs: {
                rudderAngle: Math.sin(i * 0.005) * 15,
                sailTrim: 0.6 + Math.cos(i * 0.003) * 0.2
            }
        });
    }

    endTime = process.hrtime.bigint();
    duration = Number(endTime - startTime) / 1e6;
    updatesPerSec = Math.round((iterations / duration) * 1000);

    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Updates/sec: ${updatesPerSec.toLocaleString()}`);
    console.log(`  Target: 500+ msg/sec (${(updatesPerSec / 500).toFixed(1)}x target)`);

    // Test 3: NMEA generation performance
    console.log('\n3. NMEA Sentence Generation:');
    iterations = 5000;
    startTime = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
        // Update state first
        coordState.updateState({
            environmentalConditions: {
                trueWindSpeed: 10 + Math.sin(i * 0.015) * 3,
                trueWindAngle: 90 + Math.cos(i * 0.008) * 45
            }
        });
        
        // Generate NMEA sentences
        const result = nmeaGen.generateSynchronizedSentences();
    }

    endTime = process.hrtime.bigint();
    duration = Number(endTime - startTime) / 1e6;
    updatesPerSec = Math.round((iterations / duration) * 1000);

    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Updates/sec: ${updatesPerSec.toLocaleString()}`);
    console.log(`  Target: 500+ msg/sec (${(updatesPerSec / 500).toFixed(1)}x target)`);

    // Test 4: Memory usage assessment
    console.log('\n4. Memory Usage Assessment:');
    const used = process.memoryUsage();
    console.log(`  RSS: ${Math.round(used.rss / 1024 / 1024)} MB`);
    console.log(`  Heap Used: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
    console.log(`  Heap Total: ${Math.round(used.heapTotal / 1024 / 1024)} MB`);
    console.log(`  External: ${Math.round(used.external / 1024 / 1024)} MB`);
    console.log(`  Target: <100MB RAM constraint`);

    console.log('\n=== Performance Analysis Complete ===');
}

// Run the profiling
profilePhysicsPerformance().catch(console.error);
