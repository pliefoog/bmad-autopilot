/**
 * NMEA Protocol Conversion Module
 *
 * Exports protocol conversion services for NMEA 2000 ↔ NMEA 0183 conversion
 */

export {
  NMEAProtocolConverter,
  type BridgeProfile,
  type ConversionRule,
  type ConversionRuleSet,
  type PGNData,
  type ConversionResult,
  type PCDINData,
} from './NMEAProtocolConverter';

// Re-export for convenience
export type {
  BridgeProfile as DeviceProfile,
  ConversionResult as ProtocolConversionResult,
} from './NMEAProtocolConverter';
