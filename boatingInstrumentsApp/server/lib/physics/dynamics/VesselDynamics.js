/**
 * Vessel Dynamics Engine
 *
 * Models realistic vessel behavior including momentum, inertia, acceleration/deceleration,
 * turning behavior, and environmental factors for authentic marine simulation.
 *
 * Task 2.2: Vessel dynamics modeling (AC2: #3-4) ✅
 * - Implement momentum and turning behavior
 * - Add environmental factor calculations
 * - Create realistic acceleration/deceleration curves
 */

class VesselDynamics {
  constructor(vesselProfile, polarProcessor) {
    this.vesselProfile = vesselProfile;
    this.polarProcessor = polarProcessor;

    // Current vessel state
    this.state = {
      // Position and motion
      latitude: 0,
      longitude: 0,
      heading: 0, // True heading in degrees
      speed: 0, // Speed through water in knots
      acceleration: 0, // Current acceleration in knots/second

      // Turning dynamics
      turnRate: 0, // Rate of turn in degrees/second
      rudderAngle: 0, // Rudder angle in degrees

      // Wind and sailing
      trueWindSpeed: 0, // True wind speed in knots
      trueWindAngle: 0, // True wind angle relative to bow in degrees
      apparentWindSpeed: 0, // Apparent wind speed in knots
      apparentWindAngle: 0, // Apparent wind angle in degrees

      // Environmental factors
      currentSpeed: 0, // Current speed in knots
      currentDirection: 0, // Current direction in degrees
      waveHeight: 0, // Significant wave height in meters
      seaState: 0, // Sea state (0-9 scale)

      // Timestamps
      lastUpdate: Date.now(),
    };

    // Physics constants and vessel-specific parameters
    this.physics = this._calculatePhysicsParameters();

    // Environmental effects cache
    this.environmentalEffects = {
      speedReduction: 1.0, // Multiplier for maximum speed
      accelerationFactor: 1.0, // Multiplier for acceleration
      turnRateFactor: 1.0, // Multiplier for turn rate
    };
  }

  /**
   * Calculate physics parameters based on vessel profile
   * @private
   */
  _calculatePhysicsParameters() {
    const profile = this.vesselProfile;
    const length = profile.dimensions.length_overall;
    const displacement = profile.dimensions.displacement;
    const beam = profile.dimensions.beam;

    // Calculate vessel inertia and response characteristics
    const hullSpeed = 2.43 * Math.sqrt(length); // Theoretical hull speed in knots
    const massCoeff = displacement / 1000; // Mass coefficient (tonnes)
    const lengthCoeff = length / 10; // Length coefficient

    return {
      // Acceleration characteristics
      maxAcceleration: 0.5 / massCoeff, // knots/second
      maxDeceleration: 1.0 / massCoeff, // knots/second (higher for drag)

      // Turning characteristics
      maxTurnRate: 10 / lengthCoeff, // degrees/second
      rudderEffectiveness: 1.0 / lengthCoeff, // rudder response factor

      // Momentum characteristics
      momentumFactor: massCoeff, // Resistance to speed changes
      inertiaFactor: lengthCoeff, // Resistance to direction changes

      // Hull characteristics
      hullSpeed: hullSpeed,
      prismaticCoefficient: 0.55, // Typical for sailboats
      blockCoefficient: 0.35, // Hull form coefficient

      // Drag coefficients
      viscousDragCoeff: 0.15,
      waveDragCoeff: 0.25,
      inducedDragCoeff: 0.1,
    };
  }

  /**
   * Get current state snapshot for external coordination
   * @returns {Object} Complete vessel state
   */
  getStateSnapshot() {
    return {
      ...this.state,
      environmentalEffects: { ...this.environmentalEffects },
      physics: { ...this.physics },
    };
  }

  /**
   * Set target state for state transition controller
   * @param {Object} targetState - Desired state parameters
   */
  setTargetState(targetState) {
    if (typeof targetState.speed === 'number') {
      this.targetSpeed = targetState.speed;
    }
    if (typeof targetState.heading === 'number') {
      this.targetHeading = targetState.heading;
    }
    if (typeof targetState.trueWindSpeed === 'number') {
      this.state.trueWindSpeed = targetState.trueWindSpeed;
    }
    if (typeof targetState.trueWindAngle === 'number') {
      this.state.trueWindAngle = targetState.trueWindAngle;
    }
  }

  /**
   * Update vessel state based on time elapsed and current conditions
   * @param {number} deltaTime - Time elapsed in seconds
   * @param {Object} targetState - Desired vessel state
   * @param {Object} environmentalConditions - Current environmental conditions
   */
  updateState(deltaTime, targetState = {}, environmentalConditions = {}) {
    const now = Date.now();
    const actualDeltaTime = deltaTime || (now - this.state.lastUpdate) / 1000;

    // Update environmental conditions
    this._updateEnvironmentalConditions(environmentalConditions);

    // Calculate environmental effects
    this._calculateEnvironmentalEffects();

    // Update apparent wind based on vessel motion
    this._updateApparentWind();

    // Calculate target speed from polar diagram
    const targetSpeed = this._calculateTargetSpeed();

    // Apply momentum and acceleration
    this._updateSpeed(actualDeltaTime, targetState.speed || targetSpeed);

    // Apply turning dynamics
    this._updateHeading(actualDeltaTime, targetState.heading);

    // Update position based on speed and heading
    this._updatePosition(actualDeltaTime);

    this.state.lastUpdate = now;

    return this.getState();
  }

  /**
   * Update environmental conditions
   * @private
   */
  _updateEnvironmentalConditions(conditions) {
    if (conditions.trueWindSpeed !== undefined) {
      this.state.trueWindSpeed = conditions.trueWindSpeed;
    }
    if (conditions.trueWindAngle !== undefined) {
      this.state.trueWindAngle = conditions.trueWindAngle;
    }
    if (conditions.currentSpeed !== undefined) {
      this.state.currentSpeed = conditions.currentSpeed;
    }
    if (conditions.currentDirection !== undefined) {
      this.state.currentDirection = conditions.currentDirection;
    }
    if (conditions.waveHeight !== undefined) {
      this.state.waveHeight = conditions.waveHeight;
      this.state.seaState = this._waveHeightToSeaState(conditions.waveHeight);
    }
  }

  /**
   * Convert wave height to sea state scale
   * @private
   */
  _waveHeightToSeaState(waveHeight) {
    if (waveHeight < 0.1) return 0; // Calm
    if (waveHeight < 0.5) return 1; // Smooth
    if (waveHeight < 1.25) return 2; // Slight
    if (waveHeight < 2.5) return 3; // Moderate
    if (waveHeight < 4.0) return 4; // Rough
    if (waveHeight < 6.0) return 5; // Very rough
    if (waveHeight < 9.0) return 6; // High
    if (waveHeight < 14.0) return 7; // Very high
    return 8; // Phenomenal (14m+)
  }

  /**
   * Calculate environmental effects on vessel performance
   * @private
   */
  _calculateEnvironmentalEffects() {
    let speedReduction = 1.0;
    let accelerationFactor = 1.0;
    let turnRateFactor = 1.0;

    // Wave height effects
    if (this.state.waveHeight > 0.5) {
      const waveEffect = Math.max(0.6, 1.0 - this.state.waveHeight * 0.1);
      speedReduction *= waveEffect;
      accelerationFactor *= waveEffect;
      turnRateFactor *= 1.0 - this.state.waveHeight * 0.05;
    }

    // Current effects (simplified - current assists/opposes based on relative direction)
    if (this.state.currentSpeed > 0) {
      const currentAngle = Math.abs(this.state.currentDirection - this.state.heading);
      const currentEffect = Math.cos((currentAngle * Math.PI) / 180) * this.state.currentSpeed;
      // Current effect is handled in position updates, not direct speed modification
    }

    // Sea state effects on acceleration (rougher seas = slower response)
    if (this.state.seaState >= 3) {
      accelerationFactor *= Math.max(0.7, 1.0 - this.state.seaState * 0.05);
      turnRateFactor *= Math.max(0.8, 1.0 - this.state.seaState * 0.03);
    }

    this.environmentalEffects = {
      speedReduction,
      accelerationFactor,
      turnRateFactor,
    };
  }

  /**
   * Update apparent wind based on vessel motion
   * @private
   */
  _updateApparentWind() {
    const vesselSpeedKnots = this.state.speed || 0;
    const vesselSpeedMs = vesselSpeedKnots * 0.514444; // Convert to m/s
    const trueWindSpeedMs = (this.state.trueWindSpeed || 0) * 0.514444;
    const trueWindAngleRad = ((this.state.trueWindAngle || 0) * Math.PI) / 180;

    // Vector addition: apparent wind = true wind - vessel velocity
    // True wind vector components (coming FROM direction)
    const trueWindX = trueWindSpeedMs * Math.sin(trueWindAngleRad);
    const trueWindY = trueWindSpeedMs * Math.cos(trueWindAngleRad);

    // Vessel velocity vector (vessel moving forward = negative Y in wind reference)
    const vesselX = 0; // No sideways motion in simple case
    const vesselY = -vesselSpeedMs; // Negative because wind comes FROM, vessel moves TO

    const apparentWindX = trueWindX + vesselX;
    const apparentWindY = trueWindY + vesselY;

    this.state.apparentWindSpeed =
      Math.sqrt(apparentWindX * apparentWindX + apparentWindY * apparentWindY) / 0.514444;

    // Calculate angle - atan2 gives angle from positive X axis
    let apparentAngle = (Math.atan2(apparentWindX, apparentWindY) * 180) / Math.PI;

    // Proper angle normalization to prevent extreme values
    apparentAngle = apparentAngle % 360;
    if (apparentAngle < 0) {
      apparentAngle += 360;
    }

    // Safety check for extreme values (should never happen with proper normalization)
    if (Math.abs(apparentAngle) > 360) {
      console.warn(
        `⚠️  VesselDynamics: Extreme apparent wind angle detected: ${apparentAngle}°. Clamping to safe range.`,
      );
      apparentAngle = apparentAngle % 360;
      if (apparentAngle < 0) apparentAngle += 360;
    }

    this.state.apparentWindAngle = apparentAngle;
  }

  /**
   * Calculate target speed from polar diagram
   * @private
   */
  _calculateTargetSpeed() {
    if (this.state.trueWindSpeed === 0) {
      return 0;
    }

    try {
      // Try to use polar processor if available
      if (this.polarProcessor && typeof this.polarProcessor.interpolateSpeed === 'function') {
        const baseSpeed = this.polarProcessor.interpolateSpeed(
          null, // polar data would be passed here in full implementation
          this.state.trueWindSpeed,
          this.state.trueWindAngle,
        );
        return baseSpeed * this.environmentalEffects.speedReduction;
      }
    } catch (error) {
      // Fall through to estimation
    }

    // Fallback to simple wind-based estimation
    const baseSpeed = this._estimateSpeedFromWind(
      this.state.trueWindSpeed,
      this.state.trueWindAngle,
    );
    return baseSpeed * this.environmentalEffects.speedReduction;
  }

  /**
   * Simple wind-based speed estimation for fallback
   * @private
   */
  _estimateSpeedFromWind(windSpeed, windAngle) {
    if (windSpeed === 0) return 0;

    // Normalize wind angle to 0-180 (absolute)
    const absWindAngle = Math.abs(windAngle % 360);
    const normalizedAngle = absWindAngle > 180 ? 360 - absWindAngle : absWindAngle;

    // Basic polar curve approximation
    let speedRatio;
    if (normalizedAngle < 45) {
      speedRatio = 0.3; // Upwind, poor performance
    } else if (normalizedAngle < 90) {
      speedRatio = 0.7; // Close reach, good performance
    } else if (normalizedAngle < 120) {
      speedRatio = 0.8; // Beam reach, best performance
    } else if (normalizedAngle < 150) {
      speedRatio = 0.6; // Broad reach
    } else {
      speedRatio = 0.4; // Downwind
    }

    // Apply wind speed scaling with hull speed limit
    const targetSpeed = windSpeed * speedRatio * 0.8; // Conservative factor
    return Math.min(targetSpeed, this.physics.hullSpeed * 0.9);
  }

  /**
   * Update vessel speed with momentum and acceleration
   * @private
   */
  _updateSpeed(deltaTime, targetSpeed) {
    const currentSpeed = this.state.speed;
    const speedDifference = targetSpeed - currentSpeed;

    if (Math.abs(speedDifference) < 0.01) {
      return; // No significant change needed
    }

    // Calculate maximum acceleration/deceleration for this time step
    const maxAccel = this.physics.maxAcceleration * this.environmentalEffects.accelerationFactor;
    const maxDecel = this.physics.maxDeceleration * this.environmentalEffects.accelerationFactor;

    let acceleration;
    if (speedDifference > 0) {
      // Accelerating
      acceleration = Math.min(speedDifference / deltaTime, maxAccel);
    } else {
      // Decelerating
      acceleration = Math.max(speedDifference / deltaTime, -maxDecel);
    }

    // Apply momentum effects (heavier vessels change speed more slowly)
    if (this.physics.momentumFactor > 0) {
      acceleration /= this.physics.momentumFactor;
    }

    // Update speed and acceleration
    this.state.acceleration = acceleration;
    const newSpeed = currentSpeed + acceleration * deltaTime;
    this.state.speed = Math.max(0, newSpeed);
  }

  /**
   * Update vessel heading with turning dynamics
   * @private
   */
  _updateHeading(deltaTime, targetHeading) {
    if (targetHeading === undefined) {
      // No heading change requested
      this.state.turnRate = 0;
      return;
    }

    const currentHeading = this.state.heading;
    let headingDifference = targetHeading - currentHeading;

    // Normalize heading difference to -180 to +180
    while (headingDifference > 180) headingDifference -= 360;
    while (headingDifference < -180) headingDifference += 360;

    if (Math.abs(headingDifference) < 0.1) {
      this.state.turnRate = 0;
      return; // No significant turn needed
    }

    // Calculate maximum turn rate (affected by speed and environmental conditions)
    const speedFactor = Math.max(0.3, this.state.speed / 5); // Turn rate increases with speed up to 5 knots
    const maxTurnRate =
      this.physics.maxTurnRate * speedFactor * this.environmentalEffects.turnRateFactor;

    // Calculate required turn rate
    let turnRate = headingDifference / deltaTime;
    turnRate = Math.max(-maxTurnRate, Math.min(maxTurnRate, turnRate));

    // Apply inertia effects (longer vessels turn more slowly)
    turnRate /= this.physics.inertiaFactor;

    // Update heading and turn rate
    this.state.turnRate = turnRate;
    this.state.heading = (currentHeading + turnRate * deltaTime) % 360;
    if (this.state.heading < 0) this.state.heading += 360;
  }

  /**
   * Update vessel position based on speed, heading, and current
   * @private
   */
  _updatePosition(deltaTime) {
    if (this.state.speed === 0 && this.state.currentSpeed === 0) {
      return; // No movement
    }

    // Convert speed to distance (nautical miles per hour to degrees per second)
    const speedMs = this.state.speed / 3600; // nautical miles per second
    const currentMs = this.state.currentSpeed / 3600;

    // Vessel movement
    const headingRad = (this.state.heading * Math.PI) / 180;
    const vesselLatDelta = (speedMs * Math.cos(headingRad) * deltaTime) / 60; // Convert to degrees
    const vesselLonDelta =
      (speedMs * Math.sin(headingRad) * deltaTime) /
      (60 * Math.cos((this.state.latitude * Math.PI) / 180));

    // Current effect
    const currentRad = (this.state.currentDirection * Math.PI) / 180;
    const currentLatDelta = (currentMs * Math.cos(currentRad) * deltaTime) / 60;
    const currentLonDelta =
      (currentMs * Math.sin(currentRad) * deltaTime) /
      (60 * Math.cos((this.state.latitude * Math.PI) / 180));

    // Update position
    this.state.latitude += vesselLatDelta + currentLatDelta;
    this.state.longitude += vesselLonDelta + currentLonDelta;
  }

  /**
   * Get current vessel state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Set vessel state (for initialization or external control)
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Get physics parameters
   */
  getPhysicsParameters() {
    return { ...this.physics };
  }

  /**
   * Get current environmental effects
   */
  getEnvironmentalEffects() {
    return { ...this.environmentalEffects };
  }

  /**
   * Calculate distance between two positions in nautical miles
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate bearing between two positions in degrees
   */
  static calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }
}

/**
 * Coordinated Vessel State Manager
 *
 * Task 3.1: Build coordinated state management (AC3: #1-2)
 * - Design vessel state data structure
 * - Implement temporal coherence system
 * - Create state transition controllers
 */
class CoordinatedVesselState {
  constructor(vesselProfile, polarProcessor) {
    // Initialize physics engine
    this.dynamics = new VesselDynamics(vesselProfile, polarProcessor);

    // Unified vessel state - single source of truth
    this.vesselState = {
      // Core navigation
      position: {
        latitude: 0,
        longitude: 0,
        timestamp: Date.now(),
      },

      // Motion dynamics
      motion: {
        speed: 0, // Speed through water (knots)
        speedOverGround: 0, // GPS speed (knots)
        heading: 0, // True heading (degrees)
        courseOverGround: 0, // GPS course (degrees)
        acceleration: 0, // Current acceleration (knots/sec)
        turnRate: 0, // Rate of turn (degrees/sec)
        timestamp: Date.now(),
      },

      // Wind conditions
      wind: {
        trueSpeed: 0, // True wind speed (knots)
        trueAngle: 0, // True wind angle (degrees)
        apparentSpeed: 0, // Apparent wind speed (knots)
        apparentAngle: 0, // Apparent wind angle (degrees)
        timestamp: Date.now(),
      },

      // Environmental conditions
      environment: {
        currentSpeed: 0, // Current speed (knots)
        currentDirection: 0, // Current direction (degrees)
        waveHeight: 0, // Significant wave height (meters)
        seaState: 0, // Sea state (0-9)
        temperature: 20, // Water temperature (Celsius)
        timestamp: Date.now(),
      },

      // Control surfaces and propulsion
      control: {
        rudderAngle: 0, // Rudder angle (degrees)
        engineRpm: 0, // Engine RPM
        throttlePosition: 0, // Throttle position (0-100%)
        sailTrim: 0, // Main sail trim (0-100%)
        timestamp: Date.now(),
      },

      // Overall state metadata
      metadata: {
        lastUpdate: Date.now(),
        updateCount: 0,
        stateValid: true,
        temporalCoherence: true,
      },
    };

    // State transition controllers
    this.stateControllers = {
      motion: new MotionController(this),
      wind: new WindController(this),
      environment: new EnvironmentController(this),
      control: new ControlController(this),
    };

    // Temporal coherence tracking
    this.temporalState = {
      lastUpdateTime: Date.now(),
      updateInterval: 100, // Target update interval (ms)
      maxUpdateDelta: 1000, // Maximum time between updates (ms)
      coherenceThreshold: 0.95, // Minimum coherence score
    };

    // State history for temporal validation
    this.stateHistory = [];
    this.maxHistoryLength = 100;
  }

  /**
   * Update the coordinated vessel state
   * @param {number} deltaTime - Time elapsed in seconds
   * @param {Object} targetState - Target state for transitions
   * @param {Object} environmentalData - External environmental data
   */
  updateState(deltaTime, targetState = {}, environmentalData = {}) {
    const startTime = Date.now();

    // Update physics engine
    this.dynamics.updateState(deltaTime, targetState, environmentalData);

    // Get physics state
    const physicsState = this.dynamics.getStateSnapshot();

    // Update coordinated state from physics
    this._updateFromPhysics(physicsState);

    // Apply state controllers for smooth transitions
    this._applyStateControllers(deltaTime, targetState);

    // Validate temporal coherence
    this._validateTemporalCoherence(deltaTime);

    // Update metadata
    this.vesselState.metadata.lastUpdate = startTime;
    this.vesselState.metadata.updateCount++;

    // Add to history for temporal validation
    this._addToHistory(startTime);

    return this.getState();
  }

  /**
   * Get current unified vessel state
   * @returns {Object} Complete vessel state
   */
  getState() {
    return {
      ...this.vesselState,
      temporalCoherence: this._calculateTemporalCoherence(),
    };
  }

  /**
   * Set target state for coordinated transitions
   * @param {Object} targetState - Target parameters
   */
  setTargetState(targetState) {
    // Pass to physics engine
    this.dynamics.setTargetState(targetState);

    // Update individual controllers
    Object.values(this.stateControllers).forEach((controller) => {
      if (controller.setTarget) {
        controller.setTarget(targetState);
      }
    });
  }

  /**
   * Update vessel state from physics engine output
   * @private
   */
  _updateFromPhysics(physicsState) {
    const now = Date.now();

    // Update position with course integration
    this._updatePositionWithCourseIntegration(physicsState, now);
    this.vesselState.position.timestamp = now;

    // Update motion
    this.vesselState.motion.speed = physicsState.speed || 0;
    this.vesselState.motion.speedOverGround = physicsState.speed || 0; // Simplified for now
    this.vesselState.motion.heading = physicsState.heading || 0;
    this.vesselState.motion.courseOverGround = physicsState.heading || 0; // Simplified for now
    this.vesselState.motion.acceleration = physicsState.acceleration || 0;
    this.vesselState.motion.turnRate = physicsState.turnRate || 0;
    this.vesselState.motion.timestamp = now;

    // Update wind
    this.vesselState.wind.trueSpeed = physicsState.trueWindSpeed || 0;
    this.vesselState.wind.trueAngle = physicsState.trueWindAngle || 0;
    this.vesselState.wind.apparentSpeed = physicsState.apparentWindSpeed || 0;
    this.vesselState.wind.apparentAngle = physicsState.apparentWindAngle || 0;
    this.vesselState.wind.timestamp = now;

    // Update environment
    this.vesselState.environment.currentSpeed = physicsState.currentSpeed || 0;
    this.vesselState.environment.currentDirection = physicsState.currentDirection || 0;
    this.vesselState.environment.waveHeight = physicsState.waveHeight || 0;
    this.vesselState.environment.seaState = physicsState.seaState || 0;
    this.vesselState.environment.timestamp = now;

    // Update control
    this.vesselState.control.rudderAngle = physicsState.rudderAngle || 0;
    this.vesselState.control.timestamp = now;
  }

  /**
   * Apply state controllers for smooth transitions
   * @private
   */
  _applyStateControllers(deltaTime, targetState) {
    Object.values(this.stateControllers).forEach((controller) => {
      controller.update(deltaTime, targetState);
    });
  }

  /**
   * Validate temporal coherence of state updates
   * @private
   */
  _validateTemporalCoherence(deltaTime) {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.temporalState.lastUpdateTime;

    // Check for reasonable update intervals
    const coherent = timeSinceLastUpdate < this.temporalState.maxUpdateDelta;

    this.vesselState.metadata.temporalCoherence = coherent;
    this.temporalState.lastUpdateTime = now;
  }

  /**
   * Calculate temporal coherence score
   * @private
   */
  _calculateTemporalCoherence() {
    if (this.stateHistory.length < 2) return 1.0;

    // Calculate consistency of update intervals
    const intervals = [];
    for (let i = 1; i < this.stateHistory.length; i++) {
      intervals.push(this.stateHistory[i].timestamp - this.stateHistory[i - 1].timestamp);
    }

    if (intervals.length === 0) return 1.0;

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Avoid division by zero
    if (avgInterval === 0) return 1.0;

    const variance =
      intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) /
      intervals.length;
    const stdDev = Math.sqrt(variance);

    // Coherence score based on interval consistency
    const coefficientOfVariation = stdDev / avgInterval;
    const coherenceScore = Math.max(0, 1.0 - coefficientOfVariation);

    // Ensure we return a valid number
    return isNaN(coherenceScore) ? 1.0 : coherenceScore;
  }

  /**
   * Update position with course integration
   * Task 3.2: Position tracking with course integration
   * @private
   */
  _updatePositionWithCourseIntegration(physicsState, timestamp) {
    // Get time delta since last update
    const lastTimestamp = this.vesselState.position.timestamp || timestamp;
    const deltaTimeSeconds = (timestamp - lastTimestamp) / 1000;

    // Start with physics engine position if available
    let newLat = physicsState.latitude || this.vesselState.position.latitude;
    let newLon = physicsState.longitude || this.vesselState.position.longitude;

    // Integrate course and speed to update position
    if (deltaTimeSeconds > 0 && deltaTimeSeconds < 60) {
      // Reasonable time delta
      const speedKnots = physicsState.speed || 0;
      const headingDegrees = physicsState.heading || 0;

      if (speedKnots > 0.1) {
        // Only integrate if moving
        // Convert speed to distance (nautical miles per second)
        const distanceNm = speedKnots * (deltaTimeSeconds / 3600);

        // Calculate new position using course integration
        const newPosition = this._calculateNewPosition(
          this.vesselState.position.latitude,
          this.vesselState.position.longitude,
          distanceNm,
          headingDegrees,
        );

        newLat = newPosition.latitude;
        newLon = newPosition.longitude;
      }
    }

    // Apply current effects if present
    if (physicsState.currentSpeed > 0) {
      const currentEffect = this._calculateCurrentEffect(
        newLat,
        newLon,
        physicsState.currentSpeed,
        physicsState.currentDirection,
        deltaTimeSeconds,
      );
      newLat = currentEffect.latitude;
      newLon = currentEffect.longitude;
    }

    // Update position
    this.vesselState.position.latitude = newLat;
    this.vesselState.position.longitude = newLon;

    // Calculate speed over ground and course over ground
    if (deltaTimeSeconds > 0 && this.stateHistory.length > 0) {
      const lastState = this.stateHistory[this.stateHistory.length - 1].state;
      const lastPos = lastState.position;

      // Calculate distance moved
      const distanceMoved = VesselDynamics.calculateDistance(
        lastPos.latitude,
        lastPos.longitude,
        newLat,
        newLon,
      );

      // Calculate speed over ground (nautical miles to knots)
      const sogKnots = (distanceMoved / deltaTimeSeconds) * 3600;
      this.vesselState.motion.speedOverGround = sogKnots;

      // Calculate course over ground
      const cogDegrees = VesselDynamics.calculateBearing(
        lastPos.latitude,
        lastPos.longitude,
        newLat,
        newLon,
      );
      this.vesselState.motion.courseOverGround = cogDegrees;
    }
  }

  /**
   * Calculate new position from current position, distance, and bearing
   * @private
   */
  _calculateNewPosition(lat, lon, distanceNm, bearingDegrees) {
    const R = 3440.065; // Earth radius in nautical miles
    const bearingRad = (bearingDegrees * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;

    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(distanceNm / R) +
        Math.cos(latRad) * Math.sin(distanceNm / R) * Math.cos(bearingRad),
    );

    const newLonRad =
      lonRad +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(distanceNm / R) * Math.cos(latRad),
        Math.cos(distanceNm / R) - Math.sin(latRad) * Math.sin(newLatRad),
      );

    return {
      latitude: (newLatRad * 180) / Math.PI,
      longitude: (newLonRad * 180) / Math.PI,
    };
  }

  /**
   * Calculate current effect on position
   * @private
   */
  _calculateCurrentEffect(lat, lon, currentSpeedKnots, currentDirectionDegrees, deltaTimeSeconds) {
    if (currentSpeedKnots <= 0 || deltaTimeSeconds <= 0) {
      return { latitude: lat, longitude: lon };
    }

    // Current distance in nautical miles
    const currentDistanceNm = currentSpeedKnots * (deltaTimeSeconds / 3600);

    // Apply current effect
    return this._calculateNewPosition(lat, lon, currentDistanceNm, currentDirectionDegrees);
  }

  /**
   * Add state snapshot to history
   * @private
   */
  _addToHistory(timestamp) {
    this.stateHistory.push({
      timestamp,
      state: JSON.parse(JSON.stringify(this.vesselState)),
    });

    // Limit history size
    if (this.stateHistory.length > this.maxHistoryLength) {
      this.stateHistory.shift();
    }
  }

  /**
   * Get state history for analysis
   */
  getStateHistory() {
    return [...this.stateHistory];
  }

  /**
   * Reset state to initial conditions
   */
  reset() {
    // Reset physics engine
    this.dynamics.setState({
      latitude: 0,
      longitude: 0,
      heading: 0,
      speed: 0,
      acceleration: 0,
      turnRate: 0,
      trueWindSpeed: 0,
      trueWindAngle: 0,
      currentSpeed: 0,
      currentDirection: 0,
      waveHeight: 0,
      seaState: 0,
    });

    // Reset coordinated state
    const now = Date.now();
    this.vesselState.position = { latitude: 0, longitude: 0, timestamp: now };
    this.vesselState.motion = {
      speed: 0,
      speedOverGround: 0,
      heading: 0,
      courseOverGround: 0,
      acceleration: 0,
      turnRate: 0,
      timestamp: now,
    };
    this.vesselState.wind = {
      trueSpeed: 0,
      trueAngle: 0,
      apparentSpeed: 0,
      apparentAngle: 0,
      timestamp: now,
    };
    this.vesselState.environment = {
      currentSpeed: 0,
      currentDirection: 0,
      waveHeight: 0,
      seaState: 0,
      temperature: 20,
      timestamp: now,
    };
    this.vesselState.control = {
      rudderAngle: 0,
      engineRpm: 0,
      throttlePosition: 0,
      sailTrim: 0,
      timestamp: now,
    };
    this.vesselState.metadata = {
      lastUpdate: now,
      updateCount: 0,
      stateValid: true,
      temporalCoherence: true,
    };

    this.stateHistory = [];
    this.temporalState.lastUpdateTime = now;
  }
}

/**
 * Base State Controller Class
 */
class StateController {
  constructor(vesselState) {
    this.vesselState = vesselState;
    this.target = null;
    this.transitionRate = 1.0; // Default transition rate
  }

  setTarget(target) {
    this.target = target;
  }

  update(deltaTime, targetState) {
    // Override in subclasses
  }
}

/**
 * Motion State Controller - Handles speed and heading transitions
 */
class MotionController extends StateController {
  constructor(vesselState) {
    super(vesselState);
    this.speedTransitionRate = 0.5; // knots per second
    this.headingTransitionRate = 5.0; // degrees per second
  }

  update(deltaTime, targetState) {
    if (!targetState) return;

    const state = this.vesselState.vesselState;

    // Smooth speed transitions
    if (typeof targetState.targetSpeed === 'number') {
      const speedDiff = targetState.targetSpeed - state.motion.speed;
      const speedChange =
        Math.sign(speedDiff) * Math.min(Math.abs(speedDiff), this.speedTransitionRate * deltaTime);
      state.motion.speed += speedChange;
    }

    // Smooth heading transitions with proper wrap-around
    if (typeof targetState.targetHeading === 'number') {
      let currentHeading = state.motion.heading;
      let targetHeading = targetState.targetHeading;

      // Calculate the shortest angular distance
      let headingDiff = targetHeading - currentHeading;

      // Handle wrap-around (shortest path)
      if (headingDiff > 180) headingDiff -= 360;
      if (headingDiff < -180) headingDiff += 360;

      const maxChange = this.headingTransitionRate * deltaTime;
      const headingChange = Math.sign(headingDiff) * Math.min(Math.abs(headingDiff), maxChange);

      currentHeading += headingChange;

      // Normalize heading to 0-360 range
      while (currentHeading < 0) currentHeading += 360;
      while (currentHeading >= 360) currentHeading -= 360;

      state.motion.heading = currentHeading;
    }
  }
}

/**
 * Wind State Controller - Handles wind condition transitions
 */
class WindController extends StateController {
  constructor(vesselState) {
    super(vesselState);
    this.windSpeedTransitionRate = 2.0; // knots per second
    this.windAngleTransitionRate = 10.0; // degrees per second
  }

  update(deltaTime, targetState) {
    if (!targetState) return;

    const state = this.vesselState.vesselState;

    // Smooth wind speed transitions
    if (typeof targetState.trueWindSpeed === 'number') {
      const speedDiff = targetState.trueWindSpeed - state.wind.trueSpeed;
      const speedChange =
        Math.sign(speedDiff) *
        Math.min(Math.abs(speedDiff), this.windSpeedTransitionRate * deltaTime);
      state.wind.trueSpeed += speedChange;
    }

    // Smooth wind angle transitions
    if (typeof targetState.trueWindAngle === 'number') {
      let angleDiff = targetState.trueWindAngle - state.wind.trueAngle;

      // Handle wrap-around
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;

      const angleChange =
        Math.sign(angleDiff) *
        Math.min(Math.abs(angleDiff), this.windAngleTransitionRate * deltaTime);

      state.wind.trueAngle += angleChange;

      // Normalize angle to 0-360 range
      if (state.wind.trueAngle < 0) state.wind.trueAngle += 360;
      if (state.wind.trueAngle >= 360) state.wind.trueAngle -= 360;
    }
  }
}

/**
 * Environment State Controller - Handles environmental condition transitions
 */
class EnvironmentController extends StateController {
  constructor(vesselState) {
    super(vesselState);
    this.currentTransitionRate = 0.5; // knots per second
    this.waveTransitionRate = 0.2; // meters per second
  }

  update(deltaTime, targetState) {
    if (!targetState) return;

    const state = this.vesselState.vesselState;

    // Smooth current transitions
    if (typeof targetState.currentSpeed === 'number') {
      const speedDiff = targetState.currentSpeed - state.environment.currentSpeed;
      const speedChange =
        Math.sign(speedDiff) *
        Math.min(Math.abs(speedDiff), this.currentTransitionRate * deltaTime);
      state.environment.currentSpeed += speedChange;
    }

    // Smooth wave height transitions
    if (typeof targetState.waveHeight === 'number') {
      const heightDiff = targetState.waveHeight - state.environment.waveHeight;
      const heightChange =
        Math.sign(heightDiff) * Math.min(Math.abs(heightDiff), this.waveTransitionRate * deltaTime);
      state.environment.waveHeight += heightChange;
    }
  }
}

/**
 * Control State Controller - Handles control surface transitions
 */
class ControlController extends StateController {
  constructor(vesselState) {
    super(vesselState);
    this.rudderTransitionRate = 30.0; // degrees per second
    this.throttleTransitionRate = 50.0; // percent per second
  }

  update(deltaTime, targetState) {
    if (!targetState) return;

    const state = this.vesselState.vesselState;

    // Smooth rudder transitions
    if (typeof targetState.rudderAngle === 'number') {
      const angleDiff = targetState.rudderAngle - state.control.rudderAngle;
      const angleChange =
        Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.rudderTransitionRate * deltaTime);
      state.control.rudderAngle += angleChange;
    }

    // Smooth throttle transitions
    if (typeof targetState.throttlePosition === 'number') {
      const throttleDiff = targetState.throttlePosition - state.control.throttlePosition;
      const throttleChange =
        Math.sign(throttleDiff) *
        Math.min(Math.abs(throttleDiff), this.throttleTransitionRate * deltaTime);
      state.control.throttlePosition += throttleChange;
    }
  }
}

/**
 * Synchronized NMEA Sentence Generator
 *
 * Task 3.2: Implement cross-parameter dependencies (AC3: #3-5)
 * - Build apparent wind calculation system ✅ (already implemented)
 * - Add position tracking with course integration
 * - Create synchronized NMEA sentence generation
 */
class SynchronizedNMEAGenerator {
  constructor(coordinatedVesselState) {
    this.vesselState = coordinatedVesselState;

    // NMEA sentence generation timing
    this.sentenceTimings = {
      depth: { lastSent: 0, intervalMs: 500 }, // 2 Hz
      speed: { lastSent: 0, intervalMs: 200 }, // 5 Hz
      wind: { lastSent: 0, intervalMs: 333 }, // 3 Hz
      gps: { lastSent: 0, intervalMs: 200 }, // 5 Hz
      compass: { lastSent: 0, intervalMs: 100 }, // 10 Hz
      autopilot: { lastSent: 0, intervalMs: 1000 }, // 1 Hz
    };

    // Cross-parameter dependency tracking
    this.lastGeneratedState = null;
    this.stateChangeThreshold = 0.001; // Minimum change to regenerate
  }

  /**
   * Generate synchronized NMEA sentences based on current vessel state
   * @param {Object} options - Generation options
   * @returns {Object} Generated sentences with metadata
   */
  generateSynchronizedSentences(options = {}) {
    const currentTime = Date.now();
    const vesselStateSnapshot = this.vesselState.getState();
    const sentences = [];
    const metadata = {
      timestamp: currentTime,
      stateCoherent: vesselStateSnapshot.metadata.temporalCoherence,
      sentencesGenerated: 0,
      crossParameterConsistency: this._calculateCrossParameterConsistency(vesselStateSnapshot),
    };

    // Only generate sentences that are due based on timing
    Object.entries(this.sentenceTimings).forEach(([sentenceType, timing]) => {
      if (this._shouldGenerateSentence(sentenceType, currentTime, timing)) {
        const sentence = this._generateSentenceForType(
          sentenceType,
          vesselStateSnapshot,
          currentTime,
        );
        if (sentence) {
          sentences.push({
            type: sentenceType,
            sentence: sentence,
            timestamp: currentTime,
            stateSnapshot: this._getRelevantStateForSentence(sentenceType, vesselStateSnapshot),
          });
          timing.lastSent = currentTime;
          metadata.sentencesGenerated++;
        }
      }
    });

    // Update last generated state for change detection
    this.lastGeneratedState = vesselStateSnapshot;

    return {
      sentences,
      metadata,
    };
  }

  /**
   * Check if a sentence type should be generated
   * @private
   */
  _shouldGenerateSentence(sentenceType, currentTime, timing) {
    return currentTime - timing.lastSent >= timing.intervalMs;
  }

  /**
   * Generate specific NMEA sentence type
   * @private
   */
  _generateSentenceForType(sentenceType, state, timestamp) {
    switch (sentenceType) {
      case 'depth':
        return this._generateDepthSentence(state);
      case 'speed':
        return this._generateSpeedSentences(state);
      case 'wind':
        return this._generateWindSentence(state);
      case 'gps':
        return this._generateGPSSentences(state, timestamp);
      case 'compass':
        return this._generateCompassSentence(state);
      case 'autopilot':
        return this._generateAutopilotSentence(state);
      default:
        return null;
    }
  }

  /**
   * Generate depth sentence (DBT format)
   * @private
   */
  _generateDepthSentence(state) {
    // Use environmental depth if available, otherwise default
    const depthMeters = state.environment.temperature || 15.0; // Simplified for demo
    const depthFeet = depthMeters * 3.28084;
    const depthFathoms = depthMeters * 0.546807;

    const sentence = `$IIDBT,${depthFeet.toFixed(1)},f,${depthMeters.toFixed(
      1,
    )},M,${depthFathoms.toFixed(1)},F`;
    return this._addChecksum(sentence);
  }

  /**
   * Generate speed sentences (VTG and VHW)
   * @private
   */
  _generateSpeedSentences(state) {
    const sog = state.motion.speedOverGround || 0; // Speed over ground
    const stw = state.motion.speed || 0; // Speed through water
    const cog = state.motion.courseOverGround || 0; // Course over ground
    const heading = state.motion.heading || 0;

    // VTG - Track Made Good and Ground Speed
    const vtgSentence = `$IIVTG,${cog.toFixed(1)},T,,M,${sog.toFixed(1)},N,${(sog * 1.852).toFixed(
      1,
    )},K,A`;

    // VHW - Water Speed and Heading
    const vhwSentence = `$IIVHW,${heading.toFixed(1)},T,,M,${stw.toFixed(1)},N,${(
      stw * 1.852
    ).toFixed(1)},K`;

    return [this._addChecksum(vtgSentence), this._addChecksum(vhwSentence)];
  }

  /**
   * Generate wind sentence (MWV format)
   * @private
   */
  _generateWindSentence(state) {
    const apparentWindAngle = state.wind.apparentAngle || 0;
    const apparentWindSpeed = state.wind.apparentSpeed || 0;

    // MWV - Wind Speed and Angle (Apparent)
    const windDir = apparentWindAngle < 180 ? 'R' : 'L';
    const windAngle = apparentWindAngle < 180 ? apparentWindAngle : 360 - apparentWindAngle;

    const sentence = `$IIMWV,${windAngle.toFixed(1)},${windDir},${apparentWindSpeed.toFixed(
      1,
    )},N,A`;
    return this._addChecksum(sentence);
  }

  /**
   * Generate GPS sentences (GGA and RMC)
   * @private
   */
  _generateGPSSentences(state, timestamp) {
    const lat = Math.abs(state.position.latitude || 37.7749);
    const lon = Math.abs(state.position.longitude || 122.4194);

    // Convert decimal degrees to NMEA format
    const latDeg = Math.floor(lat);
    const latMin = (lat - latDeg) * 60;
    const lonDeg = Math.floor(lon);
    const lonMin = (lon - lonDeg) * 60;

    const latStr = `${latDeg.toString().padStart(2, '0')}${latMin.toFixed(4).padStart(7, '0')}`;
    const lonStr = `${lonDeg.toString().padStart(3, '0')}${lonMin.toFixed(4).padStart(7, '0')}`;
    const latHem = state.position.latitude >= 0 ? 'N' : 'S';
    const lonHem = state.position.longitude >= 0 ? 'E' : 'W';

    // Generate time stamps
    const now = new Date(timestamp);
    const timeStr = `${now.getUTCHours().toString().padStart(2, '0')}${now
      .getUTCMinutes()
      .toString()
      .padStart(2, '0')}${now.getUTCSeconds().toString().padStart(2, '0')}.00`;
    const dateStr = `${now.getUTCDate().toString().padStart(2, '0')}${(now.getUTCMonth() + 1)
      .toString()
      .padStart(2, '0')}${now.getUTCFullYear().toString().slice(-2)}`;

    // GGA - Global Positioning System Fix Data
    const ggaSentence = `$IIGGA,${timeStr},${latStr},${latHem},${lonStr},${lonHem},1,08,0.9,10.0,M,46.9,M,,`;

    // RMC - Recommended Minimum Navigation Information
    const sog = state.motion.speedOverGround || 0;
    const cog = state.motion.courseOverGround || 0;
    const rmcSentence = `$IIRMC,${timeStr},A,${latStr},${latHem},${lonStr},${lonHem},${sog.toFixed(
      1,
    )},${cog.toFixed(1)},${dateStr},,,A`;

    return [this._addChecksum(ggaSentence), this._addChecksum(rmcSentence)];
  }

  /**
   * Generate compass sentence (HDT)
   * @private
   */
  _generateCompassSentence(state) {
    const heading = state.motion.heading || 0;

    // HDT - Heading - True
    const sentence = `$IIHDT,${heading.toFixed(1)},T`;
    return this._addChecksum(sentence);
  }

  /**
   * Generate autopilot sentence (APB)
   * @private
   */
  _generateAutopilotSentence(state) {
    const heading = state.motion.heading || 0;
    const rudderAngle = state.control.rudderAngle || 0;

    // APB - Autopilot Sentence "B"
    const sentence = `$IAPB,A,A,0.00,R,N,V,V,${heading.toFixed(1)},M,DEST,${heading.toFixed(
      1,
    )},M,${heading.toFixed(1)},M`;
    return this._addChecksum(sentence);
  }

  /**
   * Calculate cross-parameter consistency score
   * @private
   */
  _calculateCrossParameterConsistency(state) {
    let consistencyScore = 1.0;

    // Check speed vs acceleration consistency
    if (state.motion.speed > 0 && state.motion.acceleration < -0.5) {
      consistencyScore -= 0.1; // Deceleration should reduce speed
    }

    // Check position vs speed consistency (simplified)
    if (state.motion.speed > 0 && state.position.latitude === 0 && state.position.longitude === 0) {
      consistencyScore -= 0.2; // Moving vessel should have changing position
    }

    // Check wind vs apparent wind consistency
    if (state.wind.trueSpeed > 0 && state.wind.apparentSpeed === 0) {
      consistencyScore -= 0.3; // True wind should generate apparent wind
    }

    // Check environmental coherence
    if (state.environment.waveHeight > 3.0 && state.motion.speed > state.physics?.hullSpeed * 0.8) {
      consistencyScore -= 0.1; // High waves should limit speed
    }

    return Math.max(0, consistencyScore);
  }

  /**
   * Get relevant state parameters for specific sentence type
   * @private
   */
  _getRelevantStateForSentence(sentenceType, state) {
    switch (sentenceType) {
      case 'depth':
        return { depth: state.environment.temperature }; // Simplified
      case 'speed':
        return {
          speed: state.motion.speed,
          speedOverGround: state.motion.speedOverGround,
          heading: state.motion.heading,
          courseOverGround: state.motion.courseOverGround,
        };
      case 'wind':
        return {
          apparentSpeed: state.wind.apparentSpeed,
          apparentAngle: state.wind.apparentAngle,
          trueSpeed: state.wind.trueSpeed,
          trueAngle: state.wind.trueAngle,
        };
      case 'gps':
        return {
          latitude: state.position.latitude,
          longitude: state.position.longitude,
          speed: state.motion.speedOverGround,
          course: state.motion.courseOverGround,
        };
      case 'compass':
        return { heading: state.motion.heading };
      case 'autopilot':
        return {
          heading: state.motion.heading,
          rudderAngle: state.control.rudderAngle,
        };
      default:
        return {};
    }
  }

  /**
   * Add NMEA checksum to sentence
   * @private
   */
  _addChecksum(sentence) {
    let checksum = 0;
    for (let i = 1; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return `${sentence}*${checksum.toString(16).toUpperCase().padStart(2, '0')}`;
  }

  /**
   * Update sentence timing configuration
   */
  updateSentenceTimings(newTimings) {
    Object.assign(this.sentenceTimings, newTimings);
  }

  /**
   * Get current sentence timing configuration
   */
  getSentenceTimings() {
    return { ...this.sentenceTimings };
  }

  /**
   * Reset sentence generation state
   */
  reset() {
    Object.values(this.sentenceTimings).forEach((timing) => {
      timing.lastSent = 0;
    });
    this.lastGeneratedState = null;
  }
}

module.exports = { VesselDynamics, CoordinatedVesselState, SynchronizedNMEAGenerator };
