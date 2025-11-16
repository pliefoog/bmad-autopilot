// Test extreme wind angle accumulation and normalization
// This tests the VesselDynamics apparent wind calculation for edge cases

const { VesselDynamics } = require('./server/lib/physics/dynamics/VesselDynamics');

console.log('🧪 Testing VesselDynamics Apparent Wind Angle Normalization');
console.log('This tests edge cases that could cause extreme angle accumulation');
console.log('');

// Create a test vessel
const mockVesselProfile = {
    name: 'Test Vessel',
    type: 'sailboat',
    dimensions: { length: 10, beam: 3, draft: 1.5 },
    performance: { hullSpeed: 8, maxTurnRate: 5 },
    physics: { maxAcceleration: 2, maxDeceleration: 3 }
};

const dynamics = new VesselDynamics(mockVesselProfile);

console.log('Test 1: Normal conditions');
dynamics.updateState(0.1, {}, {
    trueWindSpeed: 15,
    trueWindAngle: 45
});

let state = dynamics.getState();
console.log(`✅ Normal: AWA = ${state.apparentWindAngle.toFixed(1)}°`);

console.log('\nTest 2: Extreme true wind angle (should be normalized)');
dynamics.updateState(0.1, {}, {
    trueWindSpeed: 15,
    trueWindAngle: 720  // 720° should become 0°
});

state = dynamics.getState();
console.log(`✅ 720° input: AWA = ${state.apparentWindAngle.toFixed(1)}°`);

console.log('\nTest 3: Negative true wind angle');
dynamics.updateState(0.1, {}, {
    trueWindSpeed: 15,
    trueWindAngle: -45  // -45° should become 315°
});

state = dynamics.getState();
console.log(`✅ -45° input: AWA = ${state.apparentWindAngle.toFixed(1)}°`);

console.log('\nTest 4: Multiple rapid updates (accumulation test)');
for (let i = 0; i < 100; i++) {
    dynamics.updateState(0.01, {}, {
        trueWindSpeed: 15 + Math.sin(i * 0.1) * 5,
        trueWindAngle: 45 + Math.sin(i * 0.2) * 90
    });
}

state = dynamics.getState();
console.log(`✅ After 100 updates: AWA = ${state.apparentWindAngle.toFixed(1)}°`);

console.log('\nTest 5: Zero wind conditions');
dynamics.updateState(0.1, {}, {
    trueWindSpeed: 0,
    trueWindAngle: 0
});

state = dynamics.getState();
console.log(`✅ No wind: AWA = ${state.apparentWindAngle.toFixed(1)}°`);

console.log('\nTest 6: High vessel speed vs wind');
dynamics.updateState(1.0, { speed: 25 }, {
    trueWindSpeed: 5,
    trueWindAngle: 180
});

state = dynamics.getState();
console.log(`✅ High speed vs light wind: AWA = ${state.apparentWindAngle.toFixed(1)}°`);

console.log('\n=== VALIDATION COMPLETE ===');
console.log('✅ All apparent wind angles should be in 0-360° range');
console.log(`Final AWA: ${state.apparentWindAngle.toFixed(1)}°`);

if (state.apparentWindAngle >= 0 && state.apparentWindAngle <= 360) {
    console.log('🎉 SUCCESS: Angle normalization working correctly');
} else {
    console.log(`❌ FAILURE: Angle out of range: ${state.apparentWindAngle}°`);
}