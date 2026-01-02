/**
 * EmptyCell - Placeholder for empty grid slots
 * 
 * Use this when you want an explicit empty space in a grid layout.
 * Example: Leave a slot open for future metrics or create visual spacing.
 */

import React from 'react';
import { View } from 'react-native';

export const EmptyCell: React.FC = () => {
  return <View />;
};

export default EmptyCell;
