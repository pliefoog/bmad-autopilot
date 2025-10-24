#!/usr/bin/env node

/**
 * NMEA WebSocket Validator
 * Tests WebSocket connection to NMEA bridge simulator and validates SOG-capable messages
 */

const WebSocket = require('ws');

// NMEA sentences that can provide Speed Over Ground (SOG)
const SOG_CAPABLE_SENTENCES = {
  'VTG': 'Velocity over ground',
  'RMC': 'Recommended minimum course', 
  'VHW': 'Velocity through water (can provide SOG)',
  'GGA': 'GPS fix (no speed)',
  'GLL': 'Geographic position (no speed)',
  'DBT': 'Depth below transducer (no speed)',
  'MWV': 'Wind velocity (no speed)',
  'HDG': 'Heading (no speed)',
  'ROT': 'Rate of turn (no speed)'
};

class NmeaWebSocketValidator {
  constructor(url = 'ws://127.0.0.1:8080') {
    this.url = url;
    this.ws = null;
    this.messageCount = 0;
    this.sentenceStats = {};
    this.sogCapableMessages = [];
    this.startTime = Date.now();
    this.testDuration = 10000; // 10 seconds
  }

  connect() {
    console.log('🔗 Connecting to NMEA WebSocket:', this.url);
    
    this.ws = new WebSocket(this.url);
    
    this.ws.on('open', () => {
      console.log('✅ WebSocket connected successfully');
      console.log('📡 Listening for NMEA messages...');
      console.log('⏱️  Test duration: 10 seconds');
      console.log('');
      
      // Auto-close after test duration
      setTimeout(() => {
        this.summarizeResults();
        this.ws.close();
      }, this.testDuration);
    });
    
    this.ws.on('message', (data) => {
      this.processMessage(data.toString());
    });
    
    this.ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      process.exit(0);
    });
    
    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      process.exit(1);
    });
  }

  processMessage(message) {
    this.messageCount++;
    
    // Log first few messages for inspection
    if (this.messageCount <= 5) {
      console.log(`📨 Message ${this.messageCount}:`, message);
    }
    
    // Parse NMEA sentence
    const sentences = message.split('\r\n').filter(s => s.trim().length > 0);
    
    sentences.forEach(sentence => {
      if (sentence.startsWith('$')) {
        this.analyzeSentence(sentence);
      }
    });
  }

  analyzeSentence(sentence) {
    // Extract sentence ID (e.g., $IIVTG -> VTG)
    const match = sentence.match(/^\$[A-Z]{2}([A-Z]{3})/);
    if (!match) return;
    
    const sentenceId = match[1];
    
    // Track sentence statistics
    this.sentenceStats[sentenceId] = (this.sentenceStats[sentenceId] || 0) + 1;
    
    // Check if this sentence can provide SOG
    if (SOG_CAPABLE_SENTENCES[sentenceId]) {
      this.sogCapableMessages.push({
        sentenceId,
        description: SOG_CAPABLE_SENTENCES[sentenceId],
        rawSentence: sentence,
        timestamp: Date.now()
      });
      
      // Parse VTG specifically for speed data
      if (sentenceId === 'VTG') {
        this.parseVTG(sentence);
      }
      
      // Parse RMC specifically for speed data  
      if (sentenceId === 'RMC') {
        this.parseRMC(sentence);
      }
    }
  }

  parseVTG(sentence) {
    // VTG format: $IIVTG,course,T,,M,speed_knots,N,speed_kmh,K,mode*checksum
    const parts = sentence.split(',');
    if (parts.length >= 7) {
      const course = parts[1];
      const speedKnots = parts[5];
      const speedKmh = parts[7];
      
      console.log(`🚢 VTG parsed - Course: ${course}°, Speed: ${speedKnots} knots (${speedKmh} km/h)`);
    }
  }

  parseRMC(sentence) {
    // RMC format: $IIRMC,time,status,lat,N/S,lon,E/W,speed,course,date,variation,E/W*checksum
    const parts = sentence.split(',');
    if (parts.length >= 9) {
      const time = parts[1];
      const status = parts[2];
      const speed = parts[7];
      const course = parts[8];
      
      console.log(`🗺️  RMC parsed - Status: ${status}, Speed: ${speed} knots, Course: ${course}°`);
    }
  }

  summarizeResults() {
    const duration = (Date.now() - this.startTime) / 1000;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 NMEA WebSocket Validation Results');
    console.log('='.repeat(60));
    console.log(`⏱️  Test Duration: ${duration.toFixed(1)} seconds`);
    console.log(`📨 Total Messages: ${this.messageCount}`);
    console.log(`📡 Messages/second: ${(this.messageCount / duration).toFixed(1)}`);
    console.log('');
    
    // Sentence type breakdown
    console.log('📋 Sentence Types Received:');
    const sortedSentences = Object.entries(this.sentenceStats)
      .sort(([,a], [,b]) => b - a);
    
    sortedSentences.forEach(([sentenceId, count]) => {
      const description = SOG_CAPABLE_SENTENCES[sentenceId] || 'Unknown sentence type';
      const sogCapable = SOG_CAPABLE_SENTENCES[sentenceId] ? '🎯 SOG-capable' : '❌ No speed data';
      console.log(`  ${sentenceId}: ${count} messages - ${description} ${sogCapable}`);
    });
    
    console.log('');
    
    // SOG-capable message analysis
    console.log('🎯 SOG-Capable Messages Analysis:');
    if (this.sogCapableMessages.length === 0) {
      console.log('❌ NO SOG-capable messages found!');
      console.log('   This explains why SOG field remains undefined.');
    } else {
      console.log(`✅ Found ${this.sogCapableMessages.length} SOG-capable messages`);
      
      // Group by sentence type
      const sogByType = {};
      this.sogCapableMessages.forEach(msg => {
        sogByType[msg.sentenceId] = (sogByType[msg.sentenceId] || 0) + 1;
      });
      
      Object.entries(sogByType).forEach(([sentenceId, count]) => {
        console.log(`   ${sentenceId}: ${count} messages`);
      });
      
      // Show sample messages
      console.log('\n📝 Sample SOG-capable messages:');
      this.sogCapableMessages.slice(0, 3).forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.sentenceId}: ${msg.rawSentence}`);
      });
    }
    
    console.log('');
    console.log('🔍 Diagnostic Information:');
    console.log(`   • VTG messages: ${this.sentenceStats.VTG || 0} (primary SOG source)`);
    console.log(`   • RMC messages: ${this.sentenceStats.RMC || 0} (GPS SOG source)`);
    console.log(`   • VHW messages: ${this.sentenceStats.VHW || 0} (speed through water)`);
    
    if (!this.sentenceStats.VTG && !this.sentenceStats.RMC) {
      console.log('\n❗ DIAGNOSIS: Missing VTG and RMC sentences');
      console.log('   The simulator may not be generating SOG-capable messages.');
      console.log('   This explains why SOG remains undefined in the application.');
    } else if (this.sentenceStats.VTG > 0) {
      console.log('\n✅ DIAGNOSIS: VTG sentences are present');
      console.log('   The issue is likely in the parsing/processing pipeline.');
      console.log('   Check nmea-simple library compatibility or parsing logic.');
    }
  }
}

// Run the validator
const validator = new NmeaWebSocketValidator();
validator.connect();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  if (validator.ws) {
    validator.summarizeResults();
    validator.ws.close();
  } else {
    process.exit(0);
  }
});