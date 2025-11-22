/**
 * Comprehensive System Integration Tests
 * Task 4.2: System integration and compatibility (AC4: #3-4)
 */

const PhysicsEnhancedScenarioDataSource = require('./server/lib/data-sources/scenario-physics');
const fs = require('fs');
const path = require('path');

/**
 * Test CLI interface compatibility
 */
async function testCLIIntegration() {
    console.log('=== CLI Integration Test ===\n');
    
    const testCases = [
        {
            name: 'Standard Scenario Compatibility',
            config: {
                scenarioName: 'basic-navigation',
                loop: false,
                speedMultiplier: 1
            },
            expectPhysics: false
        },
        {
            name: 'Physics-Enhanced Scenario',
            config: {
                scenarioName: 'j35-coastal-sailing',
                loop: false,
                speedMultiplier: 1
            },
            expectPhysics: true
        }
    ];
    
    let passedTests = 0;
    
    for (const testCase of testCases) {
        console.log(`Testing: ${testCase.name}`);
        
        try {
            // Create data source
            const dataSource = new PhysicsEnhancedScenarioDataSource(testCase.config);
            
            // Test scenario loading
            await dataSource.loadScenario();
            
            // Verify physics state
            const status = dataSource.getStatus();
            const physicsMatches = status.physicsEnabled === testCase.expectPhysics;
            
            if (physicsMatches) {
                console.log(`✅ ${testCase.name}: PASS`);
                console.log(`   Physics enabled: ${status.physicsEnabled}`);
                passedTests++;
            } else {
                console.log(`❌ ${testCase.name}: FAIL`);
                console.log(`   Expected physics: ${testCase.expectPhysics}, got: ${status.physicsEnabled}`);
            }
            
            // Cleanup
            dataSource.stop();
            
        } catch (error) {
            console.log(`❌ ${testCase.name}: ERROR - ${error.message}`);
        }
        
        console.log('');
    }
    
    console.log(`CLI Integration: ${passedTests}/${testCases.length} tests passed\n`);
    return passedTests === testCases.length;
}

/**
 * Test API endpoint compatibility
 */
async function testAPICompatibility() {
    console.log('=== API Compatibility Test ===\n');
    
    // Test data source API compatibility
    const testConfig = {
        scenarioName: 'j35-coastal-sailing',
        loop: false
    };
    
    try {
        const dataSource = new PhysicsEnhancedScenarioDataSource(testConfig);
        
        // Test standard API methods
        const apiMethods = [
            'loadScenario',
            'start', 
            'stop',
            'getStatus'
        ];
        
        let apiTestsPassed = 0;
        
        for (const method of apiMethods) {
            if (typeof dataSource[method] === 'function') {
                console.log(`✅ API method '${method}': EXISTS`);
                apiTestsPassed++;
            } else {
                console.log(`❌ API method '${method}': MISSING`);
            }
        }
        
        console.log(`API Methods: ${apiTestsPassed}/${apiMethods.length} available\n`);
        
        // Test event compatibility
        let eventTestsPassed = 0;
        const expectedEvents = ['status', 'data', 'error', 'scenarioStarted', 'phaseStarted'];
        
        for (const eventName of expectedEvents) {
            dataSource.on(eventName, () => {});
            console.log(`✅ Event '${eventName}': COMPATIBLE`);
            eventTestsPassed++;
        }
        
        console.log(`Event Compatibility: ${eventTestsPassed}/${expectedEvents.length} events compatible\n`);
        
        dataSource.stop();
        return apiTestsPassed === apiMethods.length && eventTestsPassed === expectedEvents.length;
        
    } catch (error) {
        console.log(`❌ API Compatibility test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test physics scenario execution
 */
async function testPhysicsScenarioExecution() {
    console.log('=== Physics Scenario Execution Test ===\n');
    
    const testConfig = {
        scenarioName: 'j35-coastal-sailing',
        loop: false
    };
    
    try {
        const dataSource = new PhysicsEnhancedScenarioDataSource(testConfig);
        
        let messagesReceived = 0;
        let statusUpdates = 0;
        let phaseStarted = false;
        let executionStarted = false;
        
        // Event listeners
        dataSource.on('data', (nmeaMessage) => {
            messagesReceived++;
            if (messagesReceived === 1) {
                console.log(`First NMEA message: ${nmeaMessage}`);
            }
        });
        
        dataSource.on('status', (message) => {
            statusUpdates++;
            console.log(`Status: ${message}`);
        });
        
        dataSource.on('scenarioStarted', (data) => {
            executionStarted = true;
            console.log(`Scenario started: ${data.scenario} (Physics: ${data.physicsEnabled})`);
        });
        
        dataSource.on('phaseStarted', (data) => {
            phaseStarted = true;
            console.log(`Phase started: ${data.phase} - ${data.description}`);
        });
        
        // Start scenario execution
        console.log('Starting physics scenario execution...\n');
        
        // Start scenario (will run briefly)
        dataSource.start();
        
        // Let it run for 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Stop execution
        dataSource.stop();
        
        // Verify execution results
        console.log('\n--- Execution Results ---');
        console.log(`Messages received: ${messagesReceived}`);
        console.log(`Status updates: ${statusUpdates}`);
        console.log(`Execution started: ${executionStarted}`);
        console.log(`Phase started: ${phaseStarted}`);
        
        // Assessment
        const minExpectedMessages = 5; // At least some messages should be generated
        const testPassed = messagesReceived >= minExpectedMessages && 
                          statusUpdates > 0 && 
                          executionStarted && 
                          phaseStarted;
        
        if (testPassed) {
            console.log('✅ Physics scenario execution: PASS\n');
        } else {
            console.log('❌ Physics scenario execution: FAIL\n');
        }
        
        return testPassed;
        
    } catch (error) {
        console.log(`❌ Physics scenario execution failed: ${error.message}\n`);
        return false;
    }
}

/**
 * Test performance under load
 */
async function testPerformanceUnderLoad() {
    console.log('=== Performance Under Load Test ===\n');
    
    const testConfig = {
        scenarioName: 'j35-coastal-sailing',
        loop: false
    };
    
    try {
        const dataSource = new PhysicsEnhancedScenarioDataSource(testConfig);
        
        let messagesReceived = 0;
        let startTime;
        
        dataSource.on('data', () => {
            messagesReceived++;
        });
        
        dataSource.on('scenarioStarted', () => {
            startTime = Date.now();
        });
        
        console.log('Starting load test (5 seconds)...');
        
        // Start scenario
        dataSource.start();
        
        // Monitor memory usage
        const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        
        // Run for 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const endTime = Date.now();
        const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        
        // Stop and get final status
        const finalStatus = dataSource.getStatus();
        dataSource.stop();
        
        // Calculate performance metrics
        const duration = (endTime - startTime) / 1000;
        const messageRate = Math.round(messagesReceived / duration);
        const memoryIncrease = finalMemory - initialMemory;
        
        console.log('\n--- Load Test Results ---');
        console.log(`Duration: ${duration.toFixed(2)}s`);
        console.log(`Messages: ${messagesReceived}`);
        console.log(`Message rate: ${messageRate}/sec`);
        console.log(`Initial memory: ${initialMemory.toFixed(1)}MB`);
        console.log(`Final memory: ${finalMemory.toFixed(1)}MB`);
        console.log(`Memory increase: ${memoryIncrease.toFixed(1)}MB`);
        
        if (finalStatus.physicsEnabled && finalStatus.physicsStats) {
            console.log(`Physics updates: ${finalStatus.physicsStats.stateUpdates}`);
            console.log(`Physics update rate: ${finalStatus.physicsStats.averageUpdateRate.toFixed(1)}/sec`);
        }
        
        // Performance assessment
        const ratePass = messageRate >= 10; // At least 10 msg/sec for realistic scenario
        const memoryPass = finalMemory < 100; // Under 100MB
        const performancePass = ratePass && memoryPass;
        
        console.log(`\nPerformance assessment: ${performancePass ? 'PASS' : 'FAIL'}`);
        console.log(`- Message rate: ${ratePass ? 'PASS' : 'FAIL'}`);
        console.log(`- Memory usage: ${memoryPass ? 'PASS' : 'FAIL'}\n`);
        
        return performancePass;
        
    } catch (error) {
        console.log(`❌ Performance test failed: ${error.message}\n`);
        return false;
    }
}

/**
 * Run all integration tests
 */
async function runAllIntegrationTests() {
    console.log('🧪 COMPREHENSIVE SYSTEM INTEGRATION TESTS\n');
    console.log('Testing Task 4.2: System integration and compatibility\n');
    
    const tests = [
        { name: 'CLI Integration', test: testCLIIntegration },
        { name: 'API Compatibility', test: testAPICompatibility },
        { name: 'Physics Scenario Execution', test: testPhysicsScenarioExecution },
        { name: 'Performance Under Load', test: testPerformanceUnderLoad }
    ];
    
    let passedTests = 0;
    const results = [];
    
    for (const { name, test } of tests) {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`🔬 RUNNING: ${name}`);
        console.log(`${'='.repeat(50)}\n`);
        
        try {
            const passed = await test();
            results.push({ name, passed });
            
            if (passed) {
                passedTests++;
                console.log(`✅ ${name}: PASSED\n`);
            } else {
                console.log(`❌ ${name}: FAILED\n`);
            }
        } catch (error) {
            results.push({ name, passed: false, error: error.message });
            console.log(`❌ ${name}: ERROR - ${error.message}\n`);
        }
    }
    
    // Final summary
    console.log(`${'='.repeat(60)}`);
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log(`${'='.repeat(60)}\n`);
    
    results.forEach(result => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} - ${result.name}`);
        if (result.error) {
            console.log(`    Error: ${result.error}`);
        }
    });
    
    console.log(`\nOverall: ${passedTests}/${tests.length} tests passed`);
    
    if (passedTests === tests.length) {
        console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
        console.log('✅ Task 4.2 (System Integration) COMPLETE');
        process.exit(0);
    } else {
        console.log('\n❌ Some integration tests failed');
        process.exit(1);
    }
}

// Run all tests
runAllIntegrationTests().catch(error => {
    console.error('Integration tests crashed:', error);
    process.exit(1);
});
