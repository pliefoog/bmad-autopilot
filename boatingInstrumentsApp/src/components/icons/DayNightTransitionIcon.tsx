/**
 * Custom Day/Night Transition Icon for Auto Mode
 * Clean vertical line with sun on left and moon on right
 * Perfect for celestial-based auto theme switching
 */

import React from 'react';
import Svg, { Line, Circle, Path } from 'react-native-svg';

interface DayNightTransitionIconProps {
  size?: number;
  color?: string;
}

export const DayNightTransitionIcon: React.FC<DayNightTransitionIconProps> = ({
  size = 24,
  color = '#000000',
}) => {
  const halfSize = size / 2;
  const sunRadius = size * 0.18;
  const moonRadius = size * 0.16;
  const rayLength = size * 0.08;
  const rayDistance = size * 0.25;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Vertical divider line */}
      <Line
        x1={halfSize}
        y1={size * 0.1}
        x2={halfSize}
        y2={size * 0.9}
        stroke={color}
        strokeWidth={2}
      />

      {/* Sun (left side) with rays */}
      <Circle cx={halfSize - size * 0.25} cy={halfSize} r={sunRadius} fill={color} />

      {/* Sun rays - 8 rays around the sun */}
      {/* Top ray */}
      <Line
        x1={halfSize - size * 0.25}
        y1={halfSize - rayDistance - rayLength}
        x2={halfSize - size * 0.25}
        y2={halfSize - rayDistance}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Top-right ray */}
      <Line
        x1={halfSize - size * 0.25 + rayDistance * 0.7}
        y1={halfSize - rayDistance * 0.7 - rayLength * 0.7}
        x2={halfSize - size * 0.25 + rayDistance * 0.7}
        y2={halfSize - rayDistance * 0.7}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Right ray */}
      <Line
        x1={halfSize - size * 0.25 + rayDistance + rayLength}
        y1={halfSize}
        x2={halfSize - size * 0.25 + rayDistance}
        y2={halfSize}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Bottom-right ray */}
      <Line
        x1={halfSize - size * 0.25 + rayDistance * 0.7}
        y1={halfSize + rayDistance * 0.7 + rayLength * 0.7}
        x2={halfSize - size * 0.25 + rayDistance * 0.7}
        y2={halfSize + rayDistance * 0.7}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Bottom ray */}
      <Line
        x1={halfSize - size * 0.25}
        y1={halfSize + rayDistance + rayLength}
        x2={halfSize - size * 0.25}
        y2={halfSize + rayDistance}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Bottom-left ray */}
      <Line
        x1={halfSize - size * 0.25 - rayDistance * 0.7}
        y1={halfSize + rayDistance * 0.7 + rayLength * 0.7}
        x2={halfSize - size * 0.25 - rayDistance * 0.7}
        y2={halfSize + rayDistance * 0.7}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Left ray */}
      <Line
        x1={halfSize - size * 0.25 - rayDistance - rayLength}
        y1={halfSize}
        x2={halfSize - size * 0.25 - rayDistance}
        y2={halfSize}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Top-left ray */}
      <Line
        x1={halfSize - size * 0.25 - rayDistance * 0.7}
        y1={halfSize - rayDistance * 0.7 - rayLength * 0.7}
        x2={halfSize - size * 0.25 - rayDistance * 0.7}
        y2={halfSize - rayDistance * 0.7}
        stroke={color}
        strokeWidth={1.5}
      />

      {/* Moon (right side) - crescent shape */}
      <Path
        d={`M ${halfSize + size * 0.25 - moonRadius} ${halfSize - moonRadius}
           A ${moonRadius} ${moonRadius} 0 1 1 ${halfSize + size * 0.25 - moonRadius} ${
          halfSize + moonRadius
        }
           A ${moonRadius * 0.6} ${moonRadius * 0.6} 0 1 0 ${halfSize + size * 0.25 - moonRadius} ${
          halfSize - moonRadius
        } Z`}
        fill={color}
      />
    </Svg>
  );
};
