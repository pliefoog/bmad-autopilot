import React from 'react';
import { View, Text } from 'react-native';

// Simple debug component to test text node rendering
export const TextNodeDebugger: React.FC = () => {
  const period = '.';
  const emptyString = '';
  const undefinedValue = undefined;
  const nullValue = null;
  const numericValue = 42;
  const booleanValue = true;

  return (
    <View>
      <Text>Debug: Text Node Issues</Text>

      {/* Safe patterns */}
      <Text>Period: {period}</Text>
      <Text>Number: {numericValue}</Text>
      <Text>String: {'safe string'}</Text>

      {/* These might be problematic */}
      <Text>Empty: "{emptyString}"</Text>
      <Text>Undefined: {undefinedValue ? 'defined' : 'undefined'}</Text>
      <Text>Null: {nullValue ? 'not null' : 'null'}</Text>
      <Text>Boolean: {booleanValue ? 'true' : 'false'}</Text>

      {/* Test spaces and dots */}
      <Text>
        Space Test: {numericValue} {period}
      </Text>

      {/* Potentially unsafe patterns */}
      <View>
        <Text>Safe in View: {numericValue}</Text>
      </View>

      <View>
        <Text>Unsafe period: {period}</Text>
      </View>
    </View>
  );
};
