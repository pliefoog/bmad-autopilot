/**
 * VesselContextDetector - Vessel state detection and context analysis for smart alarm filtering
 * Analyzes NMEA data patterns to determine vessel operating state and environmental context
 */

import { VesselContext } from './PriorityQueueManager';

/**
 * NMEA data patterns for context detection
 */
export interface NmeaDataSnapshot {
  // Position and movement
  position?: { latitude: number; longitude: number };
  speed?: number; // SOG in knots
  courseOverGround?: number; // COG in degrees
  heading?: number; // HDG in degrees

  // Wind and weather
  windSpeed?: number; // Apparent wind speed in knots
  windAngle?: number; // Apparent wind angle in degrees
  trueWindSpeed?: number; // True wind speed in knots
  trueWindDirection?: number; // True wind direction in degrees

  // Depth and navigation
  depth?: number; // Depth below transducer in meters

  // Engine data
  engineRunning?: boolean;
  engineRpm?: number;
  engineTemp?: number;

  // Electrical
  batteryVoltage?: number;
  chargingCurrent?: number;

  // Autopilot
  autopilotEngaged?: boolean;
  autopilotMode?: string;

  // Time-based data
  timestamp: number;
  gpsFixValid?: boolean;
  satelliteCount?: number;
}

/**
 * Historical data for pattern analysis
 */
export interface MovementPattern {
  avgSpeed: number;
  maxSpeed: number;
  speedVariation: number; // Standard deviation
  courseStability: number; // How stable the course has been (0-1)
  positionChange: number; // Total distance moved in meters
  timeSpan: number; // Duration of the pattern in milliseconds
}

/**
 * Context detection configuration
 */
export interface ContextDetectionConfig {
  // State detection thresholds
  anchoredSpeedThreshold: number; // knots - below this is considered anchored
  anchoredPositionRadius: number; // meters - max movement when anchored
  minimumMotorRpm: number; // RPM - minimum to be considered motoring
  sailingWindThreshold: number; // knots - minimum wind to be considered sailing

  // Time windows for analysis
  shortTermWindowMs: number; // For immediate state detection
  longTermWindowMs: number; // For pattern analysis
  historicalRetentionMs: number; // How long to keep data

  // Confidence parameters
  minimumDataPoints: number; // Minimum data points for confident detection
  confidenceDecayRate: number; // How fast confidence decays without fresh data

  // Weather detection
  roughWeatherThreshold: number; // Wind speed for rough conditions
  severeWeatherThreshold: number; // Wind speed for severe conditions

  // Time-based detection
  dawnDuskThresholdMinutes: number; // Minutes around sunrise/sunset for dawn/dusk
}

/**
 * Vessel context detector with marine environment intelligence
 */
export class VesselContextDetector {
  private config: ContextDetectionConfig;
  private dataHistory: NmeaDataSnapshot[] = [];
  private currentContext: VesselContext;
  private lastDataUpdate: number = 0;
  private confidenceDecayTimer?: NodeJS.Timeout;

  // Cached calculations
  private lastMovementPattern?: MovementPattern;
  private lastPatternCalculation: number = 0;

  constructor(config?: Partial<ContextDetectionConfig>) {
    this.config = {
      // State detection thresholds
      anchoredSpeedThreshold: 0.5, // 0.5 knots
      anchoredPositionRadius: 50, // 50 meters
      minimumMotorRpm: 800, // 800 RPM
      sailingWindThreshold: 5, // 5 knots minimum wind

      // Time windows
      shortTermWindowMs: 5 * 60 * 1000, // 5 minutes
      longTermWindowMs: 30 * 60 * 1000, // 30 minutes
      historicalRetentionMs: 4 * 60 * 60 * 1000, // 4 hours

      // Confidence parameters
      minimumDataPoints: 10,
      confidenceDecayRate: 0.95, // 5% decay per minute without data

      // Weather thresholds
      roughWeatherThreshold: 20, // 20 knots
      severeWeatherThreshold: 35, // 35 knots

      // Time-based
      dawnDuskThresholdMinutes: 45, // 45 minutes around sunrise/sunset

      ...config,
    };

    this.currentContext = {
      state: 'unknown',
      weather: 'unknown',
      timeOfDay: this.calculateTimeOfDay(),
      operatingMode: 'normal',
      crewOnWatch: true, // Assume crew on watch by default
      confidence: 0.0,
    };

    this.startConfidenceDecayTimer();
  }

  /**
   * Update context with new NMEA data
   */
  public updateWithNmeaData(data: Partial<NmeaDataSnapshot>): VesselContext {
    // Create complete snapshot with timestamp
    const snapshot: NmeaDataSnapshot = {
      timestamp: Date.now(),
      ...data,
    };

    // Add to history
    this.addDataSnapshot(snapshot);

    // Clean old data
    this.cleanOldData();

    // Analyze and update context
    this.analyzeContext();

    this.lastDataUpdate = Date.now();

    return { ...this.currentContext };
  }

  /**
   * Force context recalculation with current data
   */
  public recalculateContext(): VesselContext {
    this.analyzeContext();
    return { ...this.currentContext };
  }

  /**
   * Get current context
   */
  public getCurrentContext(): VesselContext {
    // Apply confidence decay if data is stale
    this.applyConfidenceDecay();

    return { ...this.currentContext };
  }

  /**
   * Get movement pattern analysis
   */
  public getMovementPattern(): MovementPattern | null {
    if (
      !this.lastMovementPattern ||
      Date.now() - this.lastPatternCalculation > this.config.shortTermWindowMs
    ) {
      this.calculateMovementPattern();
    }

    return this.lastMovementPattern || null;
  }

  /**
   * Get historical data for external analysis
   */
  public getHistoricalData(windowMs?: number): NmeaDataSnapshot[] {
    const cutoff = windowMs ? Date.now() - windowMs : Date.now() - this.config.longTermWindowMs;

    return this.dataHistory.filter((snapshot) => snapshot.timestamp >= cutoff);
  }

  /**
   * Set manual context override (for testing or manual operation)
   */
  public setManualOverride(context: Partial<VesselContext>): void {
    this.currentContext = {
      ...this.currentContext,
      ...context,
      confidence: Math.max(this.currentContext.confidence, 0.8), // High confidence for manual
    };
  }

  /**
   * Clear manual overrides and return to automatic detection
   */
  public clearManualOverrides(): void {
    // Force recalculation
    this.analyzeContext();
  }

  /**
   * Get detection statistics for monitoring
   */
  public getDetectionStats(): {
    dataPoints: number;
    dataSpanMs: number;
    confidence: number;
    lastUpdateMs: number;
    patternStability: number;
  } {
    const pattern = this.getMovementPattern();

    return {
      dataPoints: this.dataHistory.length,
      dataSpanMs: this.dataHistory.length > 0 ? Date.now() - this.dataHistory[0].timestamp : 0,
      confidence: this.currentContext.confidence,
      lastUpdateMs: Date.now() - this.lastDataUpdate,
      patternStability: pattern?.courseStability || 0,
    };
  }

  // Private implementation methods

  private addDataSnapshot(snapshot: NmeaDataSnapshot): void {
    this.dataHistory.push(snapshot);

    // Keep only recent data based on retention policy
    const cutoff = Date.now() - this.config.historicalRetentionMs;
    this.dataHistory = this.dataHistory.filter((s) => s.timestamp >= cutoff);
  }

  private cleanOldData(): void {
    const cutoff = Date.now() - this.config.historicalRetentionMs;
    this.dataHistory = this.dataHistory.filter((s) => s.timestamp >= cutoff);
  }

  private analyzeContext(): void {
    if (this.dataHistory.length < this.config.minimumDataPoints) {
      this.currentContext.confidence = Math.min(
        this.dataHistory.length / this.config.minimumDataPoints,
        0.3, // Max 30% confidence with insufficient data
      );
      return;
    }

    // Get recent data for analysis
    const recentData = this.getRecentData(this.config.shortTermWindowMs);

    if (recentData.length === 0) {
      this.currentContext.confidence = 0.1;
      return;
    }

    // Detect vessel state
    this.detectVesselState(recentData);

    // Detect weather conditions
    this.detectWeatherConditions(recentData);

    // Update time of day
    this.currentContext.timeOfDay = this.calculateTimeOfDay();

    // Detect operating mode
    this.detectOperatingMode(recentData);

    // Calculate overall confidence
    this.calculateConfidence(recentData);
  }

  private getRecentData(windowMs: number): NmeaDataSnapshot[] {
    const cutoff = Date.now() - windowMs;
    return this.dataHistory.filter((snapshot) => snapshot.timestamp >= cutoff);
  }

  private detectVesselState(data: NmeaDataSnapshot[]): void {
    const speeds = data.map((d) => d.speed).filter((s) => s !== undefined) as number[];
    const positions = data.map((d) => d.position).filter((p) => p !== undefined) as {
      latitude: number;
      longitude: number;
    }[];

    if (speeds.length === 0) {
      this.currentContext.state = 'unknown';
      return;
    }

    const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    const maxSpeed = Math.max(...speeds);

    // Check if anchored
    if (this.isAnchored(avgSpeed, maxSpeed, positions)) {
      this.currentContext.state = 'anchored';
      return;
    }

    // Check if motoring (engine running with significant speed)
    if (this.isMotoring(data)) {
      this.currentContext.state = 'motoring';
      return;
    }

    // Check if sailing (moving with wind, engine not primary)
    if (this.isSailing(data, avgSpeed)) {
      this.currentContext.state = 'sailing';
      return;
    }

    // Default to unknown if can't determine
    this.currentContext.state =
      avgSpeed > this.config.anchoredSpeedThreshold ? 'unknown' : 'anchored';
  }

  private isAnchored(
    avgSpeed: number,
    maxSpeed: number,
    positions: { latitude: number; longitude: number }[],
  ): boolean {
    // Speed check
    if (
      avgSpeed > this.config.anchoredSpeedThreshold ||
      maxSpeed > this.config.anchoredSpeedThreshold * 2
    ) {
      return false;
    }

    // Position stability check
    if (positions.length >= 2) {
      const positionSpread = this.calculatePositionSpread(positions);
      if (positionSpread > this.config.anchoredPositionRadius) {
        return false;
      }
    }

    return true;
  }

  private isMotoring(data: NmeaDataSnapshot[]): boolean {
    const engineData = data.filter(
      (d) => d.engineRunning !== undefined || d.engineRpm !== undefined,
    );

    if (engineData.length === 0) {
      return false; // Can't determine without engine data
    }

    // Check if engine is running at significant RPM
    const runningCount = engineData.filter(
      (d) =>
        d.engineRunning === true ||
        (d.engineRpm !== undefined && d.engineRpm >= this.config.minimumMotorRpm),
    ).length;

    // Need majority of recent data to show engine running
    return runningCount > engineData.length * 0.7;
  }

  private isSailing(data: NmeaDataSnapshot[], avgSpeed: number): boolean {
    const windData = data.filter((d) => d.windSpeed !== undefined || d.trueWindSpeed !== undefined);

    if (windData.length === 0) {
      return false; // Can't determine without wind data
    }

    // Check if there's sufficient wind for sailing
    const avgWindSpeed = this.calculateAverageWind(windData);

    if (avgWindSpeed < this.config.sailingWindThreshold) {
      return false;
    }

    // Check if moving at reasonable sailing speed
    if (avgSpeed < 1.0) {
      return false;
    }

    // Check if engine is not primary propulsion
    const notMotoring = !this.isMotoring(data);

    return notMotoring && avgSpeed > 1.0 && avgWindSpeed >= this.config.sailingWindThreshold;
  }

  private detectWeatherConditions(data: NmeaDataSnapshot[]): void {
    const windData = data.filter((d) => d.windSpeed !== undefined || d.trueWindSpeed !== undefined);

    if (windData.length === 0) {
      this.currentContext.weather = 'unknown';
      return;
    }

    const avgWindSpeed = this.calculateAverageWind(windData);

    if (avgWindSpeed >= this.config.severeWeatherThreshold) {
      this.currentContext.weather = 'severe';
    } else if (avgWindSpeed >= this.config.roughWeatherThreshold) {
      this.currentContext.weather = 'rough';
    } else if (avgWindSpeed >= 10) {
      this.currentContext.weather = 'moderate';
    } else {
      this.currentContext.weather = 'calm';
    }
  }

  private detectOperatingMode(data: NmeaDataSnapshot[]): void {
    // Check for maintenance mode indicators
    const recentEngineData = data.filter((d) => d.engineRpm !== undefined);

    if (recentEngineData.length > 0) {
      // High RPM with low speed might indicate maintenance
      const avgSpeed =
        data
          .map((d) => d.speed)
          .filter((s) => s !== undefined)
          .reduce((sum, s) => sum + s!, 0) / data.length;

      const avgRpm =
        recentEngineData.map((d) => d.engineRpm!).reduce((sum, rpm) => sum + rpm, 0) /
        recentEngineData.length;

      if (avgRpm > this.config.minimumMotorRpm * 1.5 && avgSpeed < 1.0) {
        this.currentContext.operatingMode = 'maintenance';
        return;
      }
    }

    // Default to normal operation
    this.currentContext.operatingMode = 'normal';
  }

  private calculateTimeOfDay(): 'day' | 'night' | 'dawn' | 'dusk' {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    // Simplified calculation - in production, would use actual sunrise/sunset times
    const sunrise = 6 * 60; // 6:00 AM
    const sunset = 18 * 60; // 6:00 PM
    const dawnDuskBuffer = this.config.dawnDuskThresholdMinutes;

    if (timeInMinutes >= sunrise - dawnDuskBuffer && timeInMinutes <= sunrise + dawnDuskBuffer) {
      return 'dawn';
    } else if (
      timeInMinutes >= sunset - dawnDuskBuffer &&
      timeInMinutes <= sunset + dawnDuskBuffer
    ) {
      return 'dusk';
    } else if (
      timeInMinutes > sunrise + dawnDuskBuffer &&
      timeInMinutes < sunset - dawnDuskBuffer
    ) {
      return 'day';
    } else {
      return 'night';
    }
  }

  private calculateConfidence(recentData: NmeaDataSnapshot[]): void {
    let confidence = 0.0;

    // Base confidence from data availability
    const dataRatio = Math.min(recentData.length / this.config.minimumDataPoints, 1.0);
    confidence += dataRatio * 0.4;

    // Bonus for GPS fix quality
    const gpsData = recentData.filter((d) => d.gpsFixValid === true);
    if (gpsData.length > 0) {
      const gpsRatio = gpsData.length / recentData.length;
      confidence += gpsRatio * 0.2;
    }

    // Bonus for engine data availability
    const engineData = recentData.filter(
      (d) => d.engineRunning !== undefined || d.engineRpm !== undefined,
    );
    if (engineData.length > 0) {
      confidence += 0.1;
    }

    // Bonus for wind data availability
    const windData = recentData.filter(
      (d) => d.windSpeed !== undefined || d.trueWindSpeed !== undefined,
    );
    if (windData.length > 0) {
      confidence += 0.1;
    }

    // Bonus for pattern consistency
    const pattern = this.getMovementPattern();
    if (pattern) {
      confidence += pattern.courseStability * 0.2;
    }

    // Apply data freshness factor
    const dataAge = Date.now() - this.lastDataUpdate;
    const freshnessFactor = Math.exp(-dataAge / (2 * 60 * 1000)); // Decay over 2 minutes
    confidence *= freshnessFactor;

    this.currentContext.confidence = Math.max(0, Math.min(1, confidence));
  }

  private calculateMovementPattern(): void {
    const windowData = this.getRecentData(this.config.longTermWindowMs);

    if (windowData.length < this.config.minimumDataPoints) {
      this.lastMovementPattern = undefined;
      return;
    }

    const speeds = windowData.map((d) => d.speed).filter((s) => s !== undefined) as number[];
    const courses = windowData
      .map((d) => d.courseOverGround)
      .filter((c) => c !== undefined) as number[];
    const positions = windowData.map((d) => d.position).filter((p) => p !== undefined) as {
      latitude: number;
      longitude: number;
    }[];

    // Calculate speed statistics
    const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
    const maxSpeed = Math.max(...speeds);
    const speedVariation = this.calculateStandardDeviation(speeds);

    // Calculate course stability
    const courseStability = this.calculateCourseStability(courses);

    // Calculate total position change
    const positionChange = this.calculateTotalDistance(positions);

    // Time span
    const timeSpan =
      windowData.length > 0
        ? windowData[windowData.length - 1].timestamp - windowData[0].timestamp
        : 0;

    this.lastMovementPattern = {
      avgSpeed,
      maxSpeed,
      speedVariation,
      courseStability,
      positionChange,
      timeSpan,
    };

    this.lastPatternCalculation = Date.now();
  }

  private calculatePositionSpread(positions: { latitude: number; longitude: number }[]): number {
    if (positions.length < 2) return 0;

    // Calculate the maximum distance between any two positions
    let maxDistance = 0;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const distance = this.calculateDistance(positions[i], positions[j]);
        maxDistance = Math.max(maxDistance, distance);
      }
    }

    return maxDistance;
  }

  private calculateDistance(
    pos1: { latitude: number; longitude: number },
    pos2: { latitude: number; longitude: number },
  ): number {
    // Haversine formula for great circle distance
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (pos1.latitude * Math.PI) / 180;
    const lat2Rad = (pos2.latitude * Math.PI) / 180;
    const deltaLatRad = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private calculateAverageWind(windData: NmeaDataSnapshot[]): number {
    const speeds = windData
      .map((d) => d.trueWindSpeed || d.windSpeed)
      .filter((s) => s !== undefined) as number[];

    return speeds.length > 0 ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length : 0;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  private calculateCourseStability(courses: number[]): number {
    if (courses.length < 2) return 1.0;

    // Calculate course changes (accounting for 0/360 wraparound)
    const changes: number[] = [];

    for (let i = 1; i < courses.length; i++) {
      let change = Math.abs(courses[i] - courses[i - 1]);
      // Handle wraparound (e.g., 359° to 1°)
      if (change > 180) {
        change = 360 - change;
      }
      changes.push(change);
    }

    // Calculate stability as inverse of average change
    const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;

    // Normalize to 0-1 scale (0° change = 1.0 stability, 90°+ change = 0.0 stability)
    return Math.max(0, Math.min(1, 1 - avgChange / 90));
  }

  private calculateTotalDistance(positions: { latitude: number; longitude: number }[]): number {
    if (positions.length < 2) return 0;

    let totalDistance = 0;

    for (let i = 1; i < positions.length; i++) {
      totalDistance += this.calculateDistance(positions[i - 1], positions[i]);
    }

    return totalDistance;
  }

  private startConfidenceDecayTimer(): void {
    if (this.confidenceDecayTimer) {
      clearInterval(this.confidenceDecayTimer);
    }

    // Apply confidence decay every minute
    this.confidenceDecayTimer = setInterval(() => {
      this.applyConfidenceDecay();
    }, 60 * 1000);
  }

  private applyConfidenceDecay(): void {
    const timeSinceUpdate = Date.now() - this.lastDataUpdate;
    const minutesSinceUpdate = timeSinceUpdate / (60 * 1000);

    // Apply exponential decay based on time without fresh data
    const decayFactor = Math.pow(this.config.confidenceDecayRate, minutesSinceUpdate);
    this.currentContext.confidence *= decayFactor;

    // Ensure confidence doesn't go below minimum threshold
    this.currentContext.confidence = Math.max(0.05, this.currentContext.confidence);
  }

  public cleanup(): void {
    if (this.confidenceDecayTimer) {
      clearInterval(this.confidenceDecayTimer);
      this.confidenceDecayTimer = undefined;
    }
  }
}
