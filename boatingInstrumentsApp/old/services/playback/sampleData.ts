/**
 * Sample Data Service
 * Provides realistic NMEA demo data for testing and demonstration
 */

export interface SampleDataSequence {
  name: string;
  description: string;
  duration: number; // seconds
  interval: number; // milliseconds between messages
  sentences: string[];
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  sequences: SampleDataSequence[];
  totalDuration: number;
}

class SampleDataServiceImpl {
  private static instance: SampleDataServiceImpl;

  static getInstance(): SampleDataServiceImpl {
    if (!SampleDataServiceImpl.instance) {
      SampleDataServiceImpl.instance = new SampleDataServiceImpl();
    }
    return SampleDataServiceImpl.instance;
  }

  /**
   * Get a basic navigation demo sequence
   */
  getBasicNavigationDemo(): SampleDataSequence {
    return {
      name: 'Basic Navigation',
      description: 'GPS position, heading, speed, and depth data',
      duration: 60,
      interval: 1000,
      sentences: [
        '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47',
        '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A',
        '$GPVTG,360.0,T,348.7,M,000.0,N,000.0,K*43',
        '$GPHDG,274.0,,,3.1,W*7C',
        '$IIVHW,274.0,T,271.0,M,5.2,N,9.6,K*52',
        '$IIDPT,12.5,0.0,*4A',
        '$IIMTW,18.5,C*02',
      ],
    };
  }

  /**
   * Get wind data demo sequence
   */
  getWindDemo(): SampleDataSequence {
    const sentences: string[] = [];
    
    // Generate varying wind data
    for (let i = 0; i < 30; i++) {
      const windAngle = 45 + Math.sin(i * 0.2) * 15; // Varying between 30-60 degrees
      const windSpeed = 12 + Math.sin(i * 0.3) * 3; // Varying between 9-15 knots
      
      // Apparent wind
      const vwr = `$IIVWR,${windAngle.toFixed(1)},R,${windSpeed.toFixed(1)},N,${(windSpeed * 0.514444).toFixed(1)},M,${(windSpeed * 1.852).toFixed(1)},K*`;
      sentences.push(this.addChecksum(vwr));
      
      // True wind
      const vwt = `$IIVWT,${(windAngle + 10).toFixed(1)},R,${(windSpeed * 0.9).toFixed(1)},N,${(windSpeed * 0.9 * 0.514444).toFixed(1)},M,${(windSpeed * 0.9 * 1.852).toFixed(1)},K*`;
      sentences.push(this.addChecksum(vwt));
    }

    return {
      name: 'Wind Data',
      description: 'Apparent and true wind speed and direction',
      duration: 30,
      interval: 1000,
      sentences,
    };
  }

  /**
   * Get engine data demo sequence
   */
  getEngineDemo(): SampleDataSequence {
    const sentences: string[] = [];
    
    // Generate engine RPM data
    for (let i = 0; i < 20; i++) {
      const rpm = 1800 + Math.sin(i * 0.1) * 200; // Varying between 1600-2000 RPM
      const temp = 85 + Math.sin(i * 0.05) * 5; // Varying between 80-90°C
      
      // Engine RPM (custom sentence)
      const rpm_sentence = `$IIRPM,E,1,${rpm.toFixed(0)},A,*`;
      sentences.push(this.addChecksum(rpm_sentence));
      
      // Engine temperature (custom sentence)
      const temp_sentence = `$IITEMP,${temp.toFixed(1)},C,*`;
      sentences.push(this.addChecksum(temp_sentence));
    }

    return {
      name: 'Engine Data',
      description: 'Engine RPM and temperature monitoring',
      duration: 20,
      interval: 1000,
      sentences,
    };
  }

  /**
   * Get autopilot simulation demo
   */
  getAutopilotDemo(): SampleDataSequence {
    const sentences: string[] = [];
    let heading = 270; // Start heading west
    
    // Simulate autopilot course change
    for (let i = 0; i < 40; i++) {
      if (i === 10) {
        // Course change command at 10 seconds
        sentences.push('$APAPB,A,A,0.00,R,N,V,V,300.0,M,DEST,300.0,M,300.0,M*4F');
      }
      
      if (i > 10) {
        // Gradually change heading to new course
        heading += (300 - 270) / 30; // Smooth transition over 30 seconds
        if (heading > 300) heading = 300;
      }
      
      // Current heading
      const hdg = `$IIHDG,${heading.toFixed(1)},,,3.1,W*`;
      sentences.push(this.addChecksum(hdg));
      
      // Autopilot status (custom sentence)
      const mode = i > 10 ? 'AUTO' : 'STANDBY';
      const ap_status = `$APMOD,${mode},${heading.toFixed(1)}*`;
      sentences.push(this.addChecksum(ap_status));
    }

    return {
      name: 'Autopilot Demo',
      description: 'Autopilot engagement and course change',
      duration: 40,
      interval: 1000,
      sentences,
    };
  }

  /**
   * Get complete sailing demo scenario
   */
  getSailingScenario(): DemoScenario {
    return {
      id: 'sailing_demo',
      name: 'Sailing Demonstration',
      description: 'Complete sailing scenario with navigation, wind, and autopilot',
      sequences: [
        this.getBasicNavigationDemo(),
        this.getWindDemo(),
        this.getAutopilotDemo(),
      ],
      totalDuration: 130, // Sum of all sequence durations
    };
  }

  /**
   * Get motor yacht demo scenario
   */
  getMotorYachtScenario(): DemoScenario {
    return {
      id: 'motor_yacht_demo',
      name: 'Motor Yacht Demonstration',
      description: 'Motor yacht scenario with engine monitoring and navigation',
      sequences: [
        this.getBasicNavigationDemo(),
        this.getEngineDemo(),
        this.getBatteryTankDemo(),
      ],
      totalDuration: 100,
    };
  }

  /**
   * Get battery and tank monitoring demo
   */
  private getBatteryTankDemo(): SampleDataSequence {
    const sentences: string[] = [];
    
    for (let i = 0; i < 20; i++) {
      // Battery voltage varying slightly
      const voltage = 12.8 + Math.sin(i * 0.1) * 0.2; // 12.6 - 13.0V
      const current = -15 + Math.sin(i * 0.2) * 5; // -20 to -10A (charging)
      
      // Battery status (custom sentence)
      const battery = `$IIBAT,1,${voltage.toFixed(2)},V,${current.toFixed(1)},A,*`;
      sentences.push(this.addChecksum(battery));
      
      // Fuel tank level (slowly decreasing)
      const fuelLevel = 75 - (i * 0.5); // Slowly decreasing fuel
      const fuel = `$IITANK,FUEL,1,${fuelLevel.toFixed(1)},*`;
      sentences.push(this.addChecksum(fuel));
      
      // Water tank level (stable)
      const water = `$IITANK,WATER,1,85.0,*`;
      sentences.push(this.addChecksum(water));
    }

    return {
      name: 'Battery & Tank Monitoring',
      description: 'Battery status and tank levels',
      duration: 20,
      interval: 1000,
      sentences,
    };
  }

  /**
   * Get all available demo scenarios
   */
  getAllScenarios(): DemoScenario[] {
    return [
      this.getSailingScenario(),
      this.getMotorYachtScenario(),
    ];
  }

  /**
   * Get individual sample sequences
   */
  getAllSequences(): SampleDataSequence[] {
    return [
      this.getBasicNavigationDemo(),
      this.getWindDemo(),
      this.getEngineDemo(),
      this.getBatteryTankDemo(),
      this.getAutopilotDemo(),
    ];
  }

  /**
   * Generate a custom sequence with specified parameters
   */
  generateCustomSequence(
    sentenceTypes: string[],
    duration: number,
    interval: number = 1000
  ): SampleDataSequence {
    const sentences: string[] = [];
    const numSentences = Math.floor(duration * 1000 / interval);
    
    for (let i = 0; i < numSentences; i++) {
      sentenceTypes.forEach(type => {
        sentences.push(this.generateSampleSentence(type, i));
      });
    }

    return {
      name: 'Custom Sequence',
      description: `Custom demo with ${sentenceTypes.join(', ')} sentences`,
      duration,
      interval,
      sentences,
    };
  }

  /**
   * Generate a single sample sentence of the specified type
   */
  private generateSampleSentence(type: string, index: number): string {
    const timestamp = new Date().toISOString().substr(11, 8);
    
    switch (type.toUpperCase()) {
      case 'GGA':
        return this.addChecksum(`$GPGGA,${timestamp},4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*`);
      case 'RMC':
        return this.addChecksum(`$GPRMC,${timestamp},A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*`);
      case 'HDG':
        const heading = 270 + Math.sin(index * 0.1) * 20;
        return this.addChecksum(`$IIHDG,${heading.toFixed(1)},,,3.1,W*`);
      case 'VHW':
        const speed = 5 + Math.sin(index * 0.05) * 2;
        return this.addChecksum(`$IIVHW,274.0,T,271.0,M,${speed.toFixed(1)},N,${(speed * 1.852).toFixed(1)},K*`);
      case 'DPT':
        const depth = 12 + Math.sin(index * 0.02) * 3;
        return this.addChecksum(`$IIDPT,${depth.toFixed(1)},0.0,*`);
      default:
        return this.addChecksum(`$II${type},*`);
    }
  }

  /**
   * Calculate and add NMEA checksum to a sentence
   */
  private addChecksum(sentence: string): string {
    const withoutChecksum = sentence.split('*')[0];
    let checksum = 0;
    
    // Start after the $ or ! character
    for (let i = 1; i < withoutChecksum.length; i++) {
      checksum ^= withoutChecksum.charCodeAt(i);
    }
    
    const checksumHex = checksum.toString(16).toUpperCase().padStart(2, '0');
    return `${withoutChecksum}*${checksumHex}`;
  }
}

// Export singleton instance
export const sampleDataService = SampleDataServiceImpl.getInstance();