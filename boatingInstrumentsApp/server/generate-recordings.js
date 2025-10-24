#!/usr/bin/env node

/**
 * NMEA Recording Generation Utility
 * 
 * Generates standardized test recordings from YAML scenario definitions.
 * Creates JSON recording files following the v1.0 format specification.
 * 
 * Usage:
 *   node server/generate-recordings.js <scenario-file> [options]
 *   node server/generate-recordings.js --all [options]
 *   
 * Examples:
 *   node server/generate-recordings.js vendor/test-scenarios/navigation/basic.yml
 *   node server/generate-recordings.js --all --output-dir server/recordings
 *   node server/generate-recordings.js scenario.yml --duration 300 --compress
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const zlib = require('zlib');

class RecordingGenerator {
  constructor(options = {}) {
    this.outputDir = options.outputDir || 'server/recordings';
    this.compress = options.compress || false;
    this.verbose = options.verbose || false;
    this.overwrite = options.overwrite || false;
  }

  /**
   * Load YAML scenario definition
   */
  loadScenario(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const scenario = yaml.parse(content);
      
      if (this.verbose) {
        console.log(`📋 Loaded scenario: ${scenario.name || path.basename(filePath)}`);
      }
      
      return scenario;
    } catch (error) {
      throw new Error(`Failed to load scenario ${filePath}: ${error.message}`);
    }
  }

  /**
   * Generate recording from scenario
   */
  generateRecording(scenario, options = {}) {
    const duration = options.duration || scenario.duration || 60;
    const messageRate = scenario.messageRate || 1.0; // messages per second
    const bridgeMode = scenario.bridge_mode || 'nmea0183';
    
    // Create metadata
    const metadata = this.createMetadata(scenario, duration, bridgeMode);
    
    // Generate message sequence
    const messages = this.generateMessages(scenario, duration, messageRate, bridgeMode);
    
    // Update message count in metadata
    metadata.message_count = messages.length;
    
    const recording = {
      metadata: metadata,
      messages: messages
    };

    if (this.verbose) {
      console.log(`📦 Generated recording: ${messages.length} messages over ${duration}s`);
    }

    return recording;
  }

  /**
   * Create recording metadata from scenario
   */
  createMetadata(scenario, duration, bridgeMode) {
    const now = new Date().toISOString();
    
    return {
      name: scenario.name || 'Generated Test Recording',
      description: scenario.description || 'Auto-generated test recording from scenario definition',
      duration: duration,
      message_count: 0, // Will be updated after message generation
      created: now,
      version: '1.0',
      bridge_mode: bridgeMode,
      vessel_type: scenario.vessel_type || scenario.vessel?.type || 'Test Vessel',
      scenario_type: scenario.scenario_type || this.inferScenarioType(scenario),
      test_coverage: scenario.test_coverage || this.inferTestCoverage(scenario),
      conditions: scenario.conditions || {},
      equipment: scenario.equipment || {},
      author: 'BMad Recording Generator v1.0',
      tags: scenario.tags || ['generated', 'test'],
      related_stories: scenario.related_stories || ['story-7.4']
    };
  }

  /**
   * Infer scenario type from scenario definition
   */
  inferScenarioType(scenario) {
    const name = (scenario.name || '').toLowerCase();
    const description = (scenario.description || '').toLowerCase();
    const text = name + ' ' + description;
    
    if (text.includes('engine')) return 'engine';
    if (text.includes('autopilot')) return 'autopilot';
    if (text.includes('battery')) return 'battery';
    if (text.includes('tank')) return 'tank';
    if (text.includes('navigation')) return 'navigation';
    if (text.includes('environmental')) return 'environmental';
    
    return 'navigation'; // default
  }

  /**
   * Infer test coverage from scenario definition
   */
  inferTestCoverage(scenario) {
    const coverage = [];
    
    if (scenario.nmea_sentences) {
      const sentences = scenario.nmea_sentences;
      
      if (sentences.some(s => s.sentence_type?.includes('GGA') || s.sentence_type?.includes('RMC'))) {
        coverage.push('gps');
      }
      if (sentences.some(s => s.sentence_type?.includes('DBT') || s.sentence_type?.includes('DPT'))) {
        coverage.push('depth');
      }
      if (sentences.some(s => s.sentence_type?.includes('VHW') || s.sentence_type?.includes('VLW'))) {
        coverage.push('speed');
      }
      if (sentences.some(s => s.sentence_type?.includes('MWV') || s.sentence_type?.includes('VWR'))) {
        coverage.push('wind');
      }
      if (sentences.some(s => s.sentence_type?.includes('HDM') || s.sentence_type?.includes('HDG'))) {
        coverage.push('compass');
      }
      if (sentences.some(s => s.sentence_type?.includes('XTE') || s.sentence_type?.includes('APB'))) {
        coverage.push('autopilot');
      }
    }
    
    return coverage.length > 0 ? coverage : ['general'];
  }

  /**
   * Generate message sequence for recording
   */
  generateMessages(scenario, duration, messageRate, bridgeMode) {
    const messages = [];
    const baseTimestamp = Date.now() / 1000; // Current time in seconds
    
    if (!scenario.nmea_sentences || scenario.nmea_sentences.length === 0) {
      throw new Error('Scenario must define nmea_sentences array');
    }
    
    // Calculate timing
    const totalMessages = Math.floor(duration * messageRate);
    const timeStep = duration / totalMessages;
    
    for (let i = 0; i < totalMessages; i++) {
      const relativeTime = i * timeStep;
      const timestamp = baseTimestamp + relativeTime;
      
      // Select sentence template (cycle through available sentences)
      const sentenceTemplate = scenario.nmea_sentences[i % scenario.nmea_sentences.length];
      
      // Generate message
      const message = this.generateMessage(sentenceTemplate, timestamp, relativeTime, i, scenario);
      messages.push(message);
    }
    
    return messages;
  }

  /**
   * Generate individual message
   */
  generateMessage(template, timestamp, relativeTime, sequence, scenario) {
    let sentence = template.sentence;
    
    // Apply parameter substitution if defined
    if (template.parameters) {
      sentence = this.applySentenceParameters(sentence, template.parameters, relativeTime);
    }
    
    // Calculate checksum if needed
    if (sentence.includes('*') && sentence.endsWith('*XX')) {
      sentence = this.calculateChecksum(sentence);
    }
    
    const message = {
      timestamp: timestamp,
      relative_time: relativeTime,
      sentence: sentence,
      sentence_type: template.sentence_type || this.extractSentenceType(sentence),
      sequence: sequence
    };
    
    // Add optional fields if present in template
    if (template.description) {
      message.description = template.description;
    }
    
    if (template.source) {
      message.source = template.source;
    }
    
    // Always mark checksum as valid for generated sentences
    message.checksum_valid = true;
    
    return message;
  }

  /**
   * Apply parameter substitution to sentence template
   */
  applySentenceParameters(sentence, parameters, relativeTime) {
    let result = sentence;
    
    for (const [key, config] of Object.entries(parameters)) {
      const placeholder = `{${key}}`;
      
      if (result.includes(placeholder)) {
        let value;
        
        if (config.type === 'linear') {
          // Linear interpolation: start + (rate * time)
          value = config.start + (config.rate * relativeTime);
        } else if (config.type === 'sine') {
          // Sine wave: start + amplitude * sin(frequency * time + phase)
          const frequency = config.frequency || 1;
          const amplitude = config.amplitude || 1;
          const phase = config.phase || 0;
          value = config.start + amplitude * Math.sin(frequency * relativeTime + phase);
        } else if (config.type === 'random') {
          // Random value within range
          const min = config.min || 0;
          const max = config.max || 100;
          value = min + Math.random() * (max - min);
        } else if (config.type === 'constant') {
          // Constant value
          value = config.value;
        } else {
          // Default to constant
          value = config.value || config;
        }
        
        // Format the value according to specified format
        if (config.format) {
          if (config.format.includes('.')) {
            const decimals = config.format.split('.')[1].length;
            value = value.toFixed(decimals);
          } else {
            value = Math.round(value).toString();
          }
        } else {
          value = value.toString();
        }
        
        result = result.replace(placeholder, value);
      }
    }
    
    return result;
  }

  /**
   * Calculate NMEA checksum for sentence
   */
  calculateChecksum(sentence) {
    const dataEnd = sentence.indexOf('*');
    if (dataEnd === -1) return sentence;
    
    const data = sentence.substring(1, dataEnd); // Remove $ and everything after *
    let checksum = 0;
    
    for (let i = 0; i < data.length; i++) {
      checksum ^= data.charCodeAt(i);
    }
    
    const checksumHex = checksum.toString(16).toUpperCase().padStart(2, '0');
    return sentence.substring(0, dataEnd + 1) + checksumHex;
  }

  /**
   * Extract sentence type from NMEA sentence
   */
  extractSentenceType(sentence) {
    if (sentence.startsWith('$')) {
      return sentence.substring(3, 6); // Extract 3-character sentence type
    } else if (sentence.startsWith('$PCDIN')) {
      return 'PGN'; // NMEA 2000 PGN
    }
    return 'UNKNOWN';
  }

  /**
   * Save recording to file
   */
  saveRecording(recording, outputPath) {
    const dir = path.dirname(outputPath);
    
    // Ensure output directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Check if file exists and overwrite settings
    if (fs.existsSync(outputPath) && !this.overwrite) {
      throw new Error(`Output file exists: ${outputPath}. Use --overwrite to replace.`);
    }
    
    const jsonData = JSON.stringify(recording, null, 2);
    
    if (this.compress && outputPath.endsWith('.json')) {
      // Compress and save as .json.gz
      const compressedPath = outputPath + '.gz';
      const compressed = zlib.gzipSync(jsonData);
      fs.writeFileSync(compressedPath, compressed);
      
      if (this.verbose) {
        console.log(`💾 Saved compressed recording: ${compressedPath}`);
        console.log(`   Original: ${jsonData.length} bytes, Compressed: ${compressed.length} bytes`);
      }
      
      return compressedPath;
    } else {
      // Save as regular JSON
      fs.writeFileSync(outputPath, jsonData);
      
      if (this.verbose) {
        console.log(`💾 Saved recording: ${outputPath} (${jsonData.length} bytes)`);
      }
      
      return outputPath;
    }
  }

  /**
   * Generate output filename from scenario
   */
  generateOutputPath(scenario, scenarioPath, options = {}) {
    const scenarioType = this.inferScenarioType(scenario);
    const bridgeMode = scenario.bridge_mode || 'nmea0183';
    const duration = Math.round((options.duration || scenario.duration || 60) / 60); // Convert to minutes
    
    // Create base filename
    const scenarioName = scenario.name 
      ? scenario.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      : path.basename(scenarioPath, path.extname(scenarioPath));
    
    const filename = `${scenarioType}-${scenarioName}-${bridgeMode}-${duration}min.json`;
    
    // Determine output directory based on scenario type
    const categoryDir = path.join(this.outputDir, scenarioType);
    const protocolDir = path.join(categoryDir, bridgeMode);
    
    return path.join(protocolDir, filename);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
NMEA Recording Generation Utility

Usage:
  node generate-recordings.js <scenario-file> [options]
  node generate-recordings.js --all [options]
  
Options:
  --output-dir <dir>    Output directory (default: server/recordings)
  --duration <seconds>  Override scenario duration
  --compress           Compress output files with gzip
  --overwrite          Overwrite existing files
  --verbose            Enable verbose output
  --all                Process all scenario files
  --help               Show this help message

Examples:
  node generate-recordings.js vendor/test-scenarios/navigation/basic.yml
  node generate-recordings.js --all --compress --verbose
  node generate-recordings.js scenario.yml --duration 300 --output-dir ./test-recordings
    `);
    process.exit(0);
  }

  const options = {
    outputDir: args[args.indexOf('--output-dir') + 1] || 'server/recordings',
    duration: args.includes('--duration') ? parseInt(args[args.indexOf('--duration') + 1]) : undefined,
    compress: args.includes('--compress'),
    overwrite: args.includes('--overwrite'),
    verbose: args.includes('--verbose')
  };

  const generator = new RecordingGenerator(options);
  
  let scenarioFiles = [];
  
  if (args.includes('--all')) {
    // Find all YAML scenario files
    const scenarioDir = 'vendor/test-scenarios';
    if (fs.existsSync(scenarioDir)) {
      const findYamlFiles = (dir) => {
        const files = [];
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            files.push(...findYamlFiles(fullPath));
          } else if (item.name.endsWith('.yml') || item.name.endsWith('.yaml')) {
            files.push(fullPath);
          }
        }
        return files;
      };
      
      scenarioFiles = findYamlFiles(scenarioDir);
    }
  } else {
    // Process specific files
    scenarioFiles = args.filter(arg => !arg.startsWith('--') && fs.existsSync(arg));
  }

  if (scenarioFiles.length === 0) {
    console.error('❌ No scenario files found to process');
    process.exit(1);
  }

  let totalGenerated = 0;
  let totalErrors = 0;

  for (const scenarioPath of scenarioFiles) {
    try {
      console.log(`\n🔄 Processing: ${scenarioPath}`);
      
      const scenario = generator.loadScenario(scenarioPath);
      const recording = generator.generateRecording(scenario, {
        duration: options.duration
      });
      
      const outputPath = generator.generateOutputPath(scenario, scenarioPath, {
        duration: options.duration
      });
      
      const savedPath = generator.saveRecording(recording, outputPath);
      console.log(`✅ Generated: ${savedPath}`);
      
      totalGenerated++;
      
    } catch (error) {
      console.error(`❌ Failed to process ${scenarioPath}: ${error.message}`);
      totalErrors++;
    }
  }

  // Summary
  console.log(`\n📊 Generation Summary:`);
  console.log(`   Scenarios processed: ${scenarioFiles.length}`);
  console.log(`   Recordings generated: ${totalGenerated}`);
  console.log(`   Errors: ${totalErrors}`);

  if (totalGenerated > 0) {
    console.log(`\n🎉 Recording generation completed!`);
    console.log(`   Output directory: ${options.outputDir}`);
    process.exit(0);
  } else {
    console.log(`\n💥 No recordings were generated.`);
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  // Handle missing yaml dependency gracefully
  try {
    require('yaml');
  } catch (error) {
    console.error('❌ Missing dependency: yaml');
    console.error('Install with: npm install yaml');
    process.exit(1);
  }
  
  main().catch(error => {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  });
}

module.exports = RecordingGenerator;
