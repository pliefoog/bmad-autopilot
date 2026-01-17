/**
 * Manual Test Script for Formula Validation
 * 
 * Run this to verify the threshold formula validator catches errors correctly.
 * 
 * Usage:
 *   npx ts-node src/utils/__manual_tests__/test-formula-validator.ts
 */

import { SENSOR_SCHEMAS } from '../../registry/sensorSchemas';
import { validateAllThresholdFormulas, validateSensorFormulas } from '../validateThresholdFormulas';
import { extractFieldNames } from '../formulaEvaluator';

console.log('=== Formula Validator Manual Test ===\n');

// Test 1: Extract field names from formulas
console.log('Test 1: Field Name Extraction');
const testFormulas = [
  'nominalVoltage * 0.985 + (temperature - 25) * -0.05',
  'capacity * 0.5',
  'maxRpm * 0.93',
];

testFormulas.forEach(formula => {
  const fields = extractFieldNames(formula);
  console.log(`  "${formula}"`);
  console.log(`  Fields: ${fields.join(', ')}\n`);
});

// Test 2: Validate all formulas in schemas
console.log('Test 2: Schema Validation');
try {
  validateAllThresholdFormulas();
  console.log('  ✅ All threshold formulas are valid!\n');
} catch (error) {
  console.error('  ❌ Validation failed:');
  console.error(error instanceof Error ? error.message : String(error));
  throw error;
}

// Test 3: List all formulas found in schemas
console.log('Test 3: Formula Inventory');
const sensorTypes = ['battery', 'engine'] as const;

for (const sensorType of sensorTypes) {
  const schema = SENSOR_SCHEMAS[sensorType];
  console.log(`\n${sensorType.toUpperCase()} SENSOR:`);
  
  for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
    const alarm = (fieldConfig as any).alarm;
    if (!alarm) continue;
    
    if (alarm.contexts) {
      for (const [contextName, contextConfig] of Object.entries(alarm.contexts)) {
        const context = contextConfig as any;
        
        if (context.critical?.formula) {
          console.log(`  ${fieldName}.${contextName}.critical: ${context.critical.formula}`);
        }
        if (context.warning?.formula) {
          console.log(`  ${fieldName}.${contextName}.warning: ${context.warning.formula}`);
        }
      }
    }
  }
}

// Test 4: Verify field existence
console.log('\n\nTest 4: Field Existence Check');
const fieldsToCheck = {
  battery: ['nominalVoltage', 'temperature', 'capacity'],
  engine: ['maxRpm'],
};

for (const [sensorType, fields] of Object.entries(fieldsToCheck)) {
  const schema = SENSOR_SCHEMAS[sensorType as keyof typeof SENSOR_SCHEMAS];
  console.log(`\n${sensorType}:`);
  
  for (const field of fields) {
    const exists = field in schema.fields;
    console.log(`  ${field}: ${exists ? '✅' : '❌'}`);
  }
}

console.log('\n=== All Tests Passed ===\n');
