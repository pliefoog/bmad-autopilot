#!/usr/bin/env node

/**
 * NMEA Recording Validation Utility
 *
 * Validates NMEA recording files against the format specification.
 * Supports both JSON and compressed JSON.gz files.
 *
 * Usage:
 *   node server/validate-recording.js <file-path> [--strict] [--repair] [--verbose]
 *
 * Examples:
 *   node server/validate-recording.js server/recordings/navigation/basic.json
 *   node server/validate-recording.js server/recordings/engine/*.json --strict
 *   node server/validate-recording.js recording.json.gz --repair --verbose
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Validation configuration
const REQUIRED_METADATA_FIELDS = [
  'name',
  'description',
  'duration',
  'message_count',
  'created',
  'version',
  'bridge_mode',
];

const REQUIRED_MESSAGE_FIELDS = [
  'timestamp',
  'relative_time',
  'sentence',
  'sentence_type',
  'sequence',
];

const SUPPORTED_BRIDGE_MODES = ['nmea0183', 'nmea2000'];
const SUPPORTED_FORMAT_VERSIONS = ['1.0'];

const NMEA_SENTENCE_PATTERN = /^\$[A-Z]{2}[A-Z0-9]{3},.*\*[0-9A-F]{2}$/;
const NMEA2000_PGN_PATTERN = /^\$PCDIN,[0-9A-F]{6},.*\*[0-9A-F]{2}$/;

class RecordingValidator {
  constructor(options = {}) {
    this.strict = options.strict || false;
    this.repair = options.repair || false;
    this.verbose = options.verbose || false;
    this.errors = [];
    this.warnings = [];
    this.repaired = [];
  }

  /**
   * Load and parse recording file (supports .json and .json.gz)
   */
  async loadRecording(filePath) {
    try {
      let data;

      if (filePath.endsWith('.json.gz')) {
        if (this.verbose) console.log(`Reading compressed file: ${filePath}`);
        const compressed = fs.readFileSync(filePath);
        data = zlib.gunzipSync(compressed);
      } else {
        if (this.verbose) console.log(`Reading JSON file: ${filePath}`);
        data = fs.readFileSync(filePath);
      }

      const recording = JSON.parse(data.toString());
      if (this.verbose)
        console.log(`Parsed recording with ${recording.messages?.length || 0} messages`);

      return recording;
    } catch (error) {
      throw new Error(`Failed to load recording: ${error.message}`);
    }
  }

  /**
   * Main validation entry point
   */
  async validate(filePath) {
    this.errors = [];
    this.warnings = [];
    this.repaired = [];

    try {
      const recording = await this.loadRecording(filePath);

      // Core structure validation
      this.validateStructure(recording);

      // Metadata validation
      this.validateMetadata(recording.metadata, recording);

      // Messages validation
      if (recording.messages) {
        this.validateMessages(recording.messages, recording.metadata);
      }

      // Cross-validation between metadata and messages
      this.validateConsistency(recording);

      return {
        valid: this.errors.length === 0,
        errors: this.errors,
        warnings: this.warnings,
        repaired: this.repaired,
        recording: recording,
      };
    } catch (error) {
      this.errors.push(`Validation failed: ${error.message}`);
      return {
        valid: false,
        errors: this.errors,
        warnings: this.warnings,
        repaired: this.repaired,
      };
    }
  }

  /**
   * Validate basic recording structure
   */
  validateStructure(recording) {
    if (!recording || typeof recording !== 'object') {
      this.errors.push('Recording must be a valid JSON object');
      return;
    }

    if (!recording.metadata) {
      this.errors.push('Missing required metadata object');
    }

    if (!recording.messages) {
      this.errors.push('Missing required messages array');
    } else if (!Array.isArray(recording.messages)) {
      this.errors.push('Messages must be an array');
    }
  }

  /**
   * Validate metadata object
   */
  validateMetadata(metadata, recording) {
    if (!metadata || typeof metadata !== 'object') {
      this.errors.push('Metadata must be a valid object');
      return;
    }

    // Check required fields
    for (const field of REQUIRED_METADATA_FIELDS) {
      if (metadata[field] === undefined || metadata[field] === null) {
        this.errors.push(`Missing required metadata field: ${field}`);
      }
    }

    // Validate field types and values
    if (metadata.duration !== undefined) {
      if (typeof metadata.duration !== 'number' || metadata.duration <= 0) {
        this.errors.push('Duration must be a positive number');
      }
    }

    if (metadata.message_count !== undefined) {
      if (!Number.isInteger(metadata.message_count) || metadata.message_count < 0) {
        this.errors.push('Message count must be a non-negative integer');
      }
    }

    if (metadata.bridge_mode && !SUPPORTED_BRIDGE_MODES.includes(metadata.bridge_mode)) {
      this.errors.push(
        `Unsupported bridge mode: ${
          metadata.bridge_mode
        }. Must be one of: ${SUPPORTED_BRIDGE_MODES.join(', ')}`,
      );
    }

    if (metadata.version && !SUPPORTED_FORMAT_VERSIONS.includes(metadata.version)) {
      this.warnings.push(
        `Unsupported format version: ${
          metadata.version
        }. Supported: ${SUPPORTED_FORMAT_VERSIONS.join(', ')}`,
      );
    }

    // Validate ISO-8601 timestamp
    if (metadata.created) {
      try {
        const date = new Date(metadata.created);
        if (isNaN(date.getTime())) {
          this.errors.push('Created timestamp must be valid ISO-8601 format');
        }
      } catch (error) {
        this.errors.push('Created timestamp must be valid ISO-8601 format');
      }
    }
  }

  /**
   * Validate messages array
   */
  validateMessages(messages, metadata) {
    if (!Array.isArray(messages)) {
      this.errors.push('Messages must be an array');
      return;
    }

    if (messages.length === 0) {
      this.warnings.push('Recording contains no messages');
      return;
    }

    // Check each message
    for (let i = 0; i < messages.length; i++) {
      this.validateMessage(messages[i], i, metadata);
    }

    // Check timestamp ordering
    this.validateTimestampOrdering(messages);

    // Check sequence uniqueness
    this.validateSequenceNumbers(messages);
  }

  /**
   * Validate individual message
   */
  validateMessage(message, index, metadata) {
    const msgPrefix = `Message ${index}:`;

    if (!message || typeof message !== 'object') {
      this.errors.push(`${msgPrefix} Must be a valid object`);
      return;
    }

    // Check required fields
    for (const field of REQUIRED_MESSAGE_FIELDS) {
      if (message[field] === undefined || message[field] === null) {
        this.errors.push(`${msgPrefix} Missing required field: ${field}`);
      }
    }

    // Validate field types
    if (message.timestamp !== undefined && typeof message.timestamp !== 'number') {
      this.errors.push(`${msgPrefix} Timestamp must be a number`);
    }

    if (message.relative_time !== undefined && typeof message.relative_time !== 'number') {
      this.errors.push(`${msgPrefix} Relative time must be a number`);
    }

    if (message.relative_time !== undefined && message.relative_time < 0) {
      this.errors.push(`${msgPrefix} Relative time must be non-negative`);
    }

    if (message.sequence !== undefined && !Number.isInteger(message.sequence)) {
      this.errors.push(`${msgPrefix} Sequence must be an integer`);
    }

    // Validate NMEA sentence format
    if (message.sentence) {
      this.validateNmeaSentence(message.sentence, msgPrefix, metadata);
    }

    // Validate sentence type matches sentence content
    if (message.sentence && message.sentence_type) {
      this.validateSentenceType(message.sentence, message.sentence_type, msgPrefix);
    }
  }

  /**
   * Validate NMEA sentence format
   */
  validateNmeaSentence(sentence, msgPrefix, metadata) {
    const bridgeMode = metadata?.bridge_mode;

    if (bridgeMode === 'nmea0183') {
      if (!NMEA_SENTENCE_PATTERN.test(sentence)) {
        this.errors.push(`${msgPrefix} Invalid NMEA 0183 sentence format: ${sentence}`);
      } else {
        // Verify checksum
        const checksumValid = this.verifyNmea0183Checksum(sentence);
        if (!checksumValid) {
          this.errors.push(`${msgPrefix} Invalid NMEA 0183 checksum: ${sentence}`);
        }
      }
    } else if (bridgeMode === 'nmea2000') {
      if (!NMEA2000_PGN_PATTERN.test(sentence)) {
        this.errors.push(`${msgPrefix} Invalid NMEA 2000 PGN format: ${sentence}`);
      }
    }
  }

  /**
   * Verify NMEA 0183 checksum
   */
  verifyNmea0183Checksum(sentence) {
    const parts = sentence.split('*');
    if (parts.length !== 2) return false;

    const data = parts[0].substring(1); // Remove $
    const providedChecksum = parts[1].toUpperCase();

    let calculatedChecksum = 0;
    for (let i = 0; i < data.length; i++) {
      calculatedChecksum ^= data.charCodeAt(i);
    }

    const expectedChecksum = calculatedChecksum.toString(16).toUpperCase().padStart(2, '0');
    return providedChecksum === expectedChecksum;
  }

  /**
   * Validate sentence type matches sentence content
   */
  validateSentenceType(sentence, sentenceType, msgPrefix) {
    if (sentence.startsWith('$')) {
      // NMEA 0183 sentence
      const actualType = sentence.substring(3, 6); // Extract sentence type
      if (actualType !== sentenceType) {
        this.warnings.push(
          `${msgPrefix} Sentence type mismatch: expected ${sentenceType}, found ${actualType}`,
        );
      }
    } else if (sentence.startsWith('$PCDIN')) {
      // NMEA 2000 PGN - validate PGN number if provided
      if (sentenceType === 'PGN') {
        // This is correct for generic PGN type
      } else {
        // Could be specific PGN number
        this.warnings.push(
          `${msgPrefix} NMEA 2000 sentence type should typically be 'PGN' for generic or specific PGN number`,
        );
      }
    }
  }

  /**
   * Validate timestamp ordering
   */
  validateTimestampOrdering(messages) {
    for (let i = 1; i < messages.length; i++) {
      const prevMsg = messages[i - 1];
      const currentMsg = messages[i];

      if (prevMsg.timestamp && currentMsg.timestamp) {
        if (currentMsg.timestamp < prevMsg.timestamp) {
          this.errors.push(
            `Non-monotonic timestamp at message ${i}: ${currentMsg.timestamp} < ${prevMsg.timestamp}`,
          );
        }
      }

      if (prevMsg.relative_time !== undefined && currentMsg.relative_time !== undefined) {
        if (currentMsg.relative_time < prevMsg.relative_time) {
          this.errors.push(
            `Non-monotonic relative_time at message ${i}: ${currentMsg.relative_time} < ${prevMsg.relative_time}`,
          );
        }
      }
    }
  }

  /**
   * Validate sequence number uniqueness
   */
  validateSequenceNumbers(messages) {
    const sequences = new Set();
    const duplicates = [];

    for (let i = 0; i < messages.length; i++) {
      const seq = messages[i].sequence;
      if (seq !== undefined) {
        if (sequences.has(seq)) {
          duplicates.push(seq);
        } else {
          sequences.add(seq);
        }
      }
    }

    if (duplicates.length > 0) {
      this.errors.push(`Duplicate sequence numbers found: ${duplicates.join(', ')}`);
    }
  }

  /**
   * Cross-validate metadata and messages consistency
   */
  validateConsistency(recording) {
    const { metadata, messages } = recording;

    if (metadata && messages) {
      // Check message count consistency
      if (metadata.message_count !== undefined && metadata.message_count !== messages.length) {
        this.errors.push(
          `Message count mismatch: metadata says ${metadata.message_count}, but found ${messages.length} messages`,
        );

        if (this.repair) {
          metadata.message_count = messages.length;
          this.repaired.push(`Updated message_count to ${messages.length}`);
        }
      }

      // Check duration consistency with timestamps
      if (metadata.duration !== undefined && messages.length > 1) {
        const firstTime = messages[0].relative_time || 0;
        const lastTime = messages[messages.length - 1].relative_time;

        if (lastTime !== undefined) {
          const actualDuration = lastTime - firstTime;
          const tolerance = Math.max(1.0, actualDuration * 0.01); // 1% tolerance or 1 second

          if (Math.abs(metadata.duration - actualDuration) > tolerance) {
            this.warnings.push(
              `Duration mismatch: metadata says ${
                metadata.duration
              }s, but messages span ${actualDuration.toFixed(3)}s`,
            );

            if (this.repair) {
              metadata.duration = parseFloat(actualDuration.toFixed(3));
              this.repaired.push(`Updated duration to ${metadata.duration}s`);
            }
          }
        }
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
NMEA Recording Validation Utility

Usage:
  node validate-recording.js <file-path> [options]
  
Options:
  --strict    Enable strict validation mode
  --repair    Attempt to repair fixable issues
  --verbose   Enable verbose output
  --help      Show this help message

Examples:
  node validate-recording.js recording.json
  node validate-recording.js recording.json.gz --strict --verbose
  node validate-recording.js recordings/*.json --repair
    `);
    process.exit(0);
  }

  const files = args.filter((arg) => !arg.startsWith('--'));
  const options = {
    strict: args.includes('--strict'),
    repair: args.includes('--repair'),
    verbose: args.includes('--verbose'),
  };

  const validator = new RecordingValidator(options);
  let totalFiles = 0;
  let validFiles = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const filePattern of files) {
    // Handle glob patterns (basic implementation)
    const filesToProcess = filePattern.includes('*')
      ? require('glob').sync(filePattern)
      : [filePattern];

    for (const filePath of filesToProcess) {
      if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        continue;
      }

      totalFiles++;
      console.log(`\n🔍 Validating: ${filePath}`);

      const result = await validator.validate(filePath);

      if (result.valid) {
        console.log(`✅ Valid`);
        validFiles++;
      } else {
        console.log(`❌ Invalid`);
      }

      if (result.errors.length > 0) {
        console.log(`\n❌ Errors (${result.errors.length}):`);
        result.errors.forEach((error) => console.log(`   ${error}`));
        totalErrors += result.errors.length;
      }

      if (result.warnings.length > 0) {
        console.log(`\n⚠️  Warnings (${result.warnings.length}):`);
        result.warnings.forEach((warning) => console.log(`   ${warning}`));
        totalWarnings += result.warnings.length;
      }

      if (result.repaired.length > 0) {
        console.log(`\n🔧 Repairs (${result.repaired.length}):`);
        result.repaired.forEach((repair) => console.log(`   ${repair}`));

        if (options.repair) {
          // Save repaired file
          const outputPath = filePath.replace(/\.json(\.gz)?$/, '.repaired.json');
          fs.writeFileSync(outputPath, JSON.stringify(result.recording, null, 2));
          console.log(`   💾 Saved repaired version: ${outputPath}`);
        }
      }
    }
  }

  // Summary
  console.log(`\n📊 Validation Summary:`);
  console.log(`   Files processed: ${totalFiles}`);
  console.log(`   Valid files: ${validFiles}`);
  console.log(`   Invalid files: ${totalFiles - validFiles}`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log(`   Total warnings: ${totalWarnings}`);

  if (validFiles === totalFiles && totalErrors === 0) {
    console.log(`\n🎉 All files passed validation!`);
    process.exit(0);
  } else {
    console.log(`\n💥 Validation completed with issues.`);
    process.exit(1);
  }
}

// Handle glob dependency gracefully
try {
  require('glob');
} catch (error) {
  // Provide simple fallback for basic patterns
  require.cache[require.resolve('glob')] = {
    exports: {
      sync: (pattern) => {
        if (pattern.includes('*')) {
          const dir = path.dirname(pattern);
          const basePattern = path.basename(pattern);
          const files = fs.readdirSync(dir);
          return files
            .filter((file) => file.match(basePattern.replace('*', '.*')))
            .map((file) => path.join(dir, file));
        }
        return [pattern];
      },
    },
  };
}

// Run CLI if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  });
}

module.exports = RecordingValidator;
