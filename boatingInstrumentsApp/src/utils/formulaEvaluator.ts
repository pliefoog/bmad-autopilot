/**
 * Formula Evaluator for Threshold Calculations
 * 
 * Evaluates mathematical formulas for dynamic threshold calculations using JavaScript's
 * built-in Function constructor. Formulas are declarative expressions defined in sensor
 * schemas that reference sensor configuration fields.
 * 
 * Example formulas:
 * - "nominalVoltage * 0.985 + (temperature - 25) * -0.04"
 * - "capacity * 1.0"
 * - "maxRpm * 0.93"
 * 
 * Security: Formulas are developer-defined in schema files, not user input.
 * All field references are validated against sensor schemas at startup.
 * 
 * TODO: Add helper functions (min, max, abs, clamp) by injecting into Function scope for advanced formulas.
 * Example: min(nominalVoltage * 1.0, 14.4) or clamp(temperature, -10, 60)
 */

/**
 * Evaluates a mathematical formula string with sensor configuration context
 * 
 * @param formula - JavaScript expression string (e.g., "nominalVoltage * 0.985")
 * @param context - Object mapping field names to numeric values
 * @returns Calculated threshold value, or undefined if evaluation fails
 * 
 * @example
 * evaluateFormula("nominalVoltage * 0.985", { nominalVoltage: 12.0 }) // Returns 11.82
 * evaluateFormula("capacity * 0.5", { capacity: 140 }) // Returns 70
 * evaluateFormula("maxRpm * 0.93", {}) // Returns undefined (missing field)
 */
export function evaluateFormula(
  formula: string,
  context: Record<string, number | undefined>
): number | undefined {
  try {
    // Extract all field names referenced in the formula
    // Matches valid JavaScript identifiers (alphanumeric + underscore, not starting with number)
    const fieldNames = extractFieldNames(formula);
    
    // Build evaluation context: check all required fields have numeric values
    const fieldValues: number[] = [];
    for (const fieldName of fieldNames) {
      const value = context[fieldName];
      
      // Missing or non-numeric field: cannot evaluate formula
      if (typeof value !== 'number' || isNaN(value)) {
        return undefined; // Graceful degradation: field not available
      }
      
      fieldValues.push(value);
    }
    
    // Create function with field names as parameters: new Function('nominalVoltage', 'temperature', 'return ...')
    // This is safe because formula comes from developer-written schema, not user input
    const func = new Function(...fieldNames, `return ${formula}`);
    
    // Execute function with field values
    const result = func(...fieldValues);
    
    // Validate result is a finite number
    if (typeof result !== 'number' || !isFinite(result)) {
      console.error(`[formulaEvaluator] Formula returned non-finite result`, {
        formula,
        context,
        result,
      });
      return undefined;
    }
    
    return result;
  } catch (error) {
    // Log evaluation errors with full context for debugging
    console.error(`[formulaEvaluator] Failed to evaluate formula`, {
      formula,
      context,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

/**
 * Extracts field names from a formula string
 * 
 * @param formula - JavaScript expression string
 * @returns Array of unique field names referenced in formula
 * 
 * @example
 * extractFieldNames("nominalVoltage * 0.985") // ["nominalVoltage"]
 * extractFieldNames("capacity * 0.5 + offset") // ["capacity", "offset"]
 * extractFieldNames("nominalVoltage * 1.0 + (temperature - 25) * -0.04") // ["nominalVoltage", "temperature"]
 */
export function extractFieldNames(formula: string): string[] {
  // Match valid JavaScript identifiers, excluding numeric literals
  const identifierRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const matches = formula.match(identifierRegex);
  
  if (!matches) {
    return [];
  }
  
  // Remove duplicates and filter out JavaScript keywords/constants
  const jsKeywords = new Set([
    'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
    'Math', 'Number', 'String', 'Boolean', 'Array', 'Object',
  ]);
  
  const uniqueFields = Array.from(new Set(matches)).filter(
    (name) => !jsKeywords.has(name)
  );
  
  return uniqueFields;
}
