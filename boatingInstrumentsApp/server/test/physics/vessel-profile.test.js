/**
 * Unit Tests for Vessel Profile Management System
 * Tests vessel profile loading, validation, and parameter inheritance
 */

const VesselProfileManager = require('../../lib/physics/vessel-profile');
const fs = require('fs');
const path = require('path');

describe('VesselProfileManager', () => {
  let profileManager;

  beforeEach(() => {
    profileManager = new VesselProfileManager();
  });

  describe('Profile Discovery', () => {
    test('should list available vessel profiles', () => {
      const profiles = profileManager.getAvailableProfiles();

      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles).toContain('j35');
      expect(profiles).toContain('catalina34');
      expect(profiles).toContain('motor-yacht-45');
    });

    test('should handle missing profiles directory gracefully', () => {
      // Create manager with invalid directory
      const invalidManager = new VesselProfileManager();
      invalidManager.profilesDir = '/non/existent/path';

      const profiles = invalidManager.getAvailableProfiles();
      expect(profiles).toEqual([]);
    });
  });

  describe('Profile Loading', () => {
    test('should load J/35 profile successfully', async () => {
      const profile = await profileManager.loadProfile('j35');

      expect(profile).toBeDefined();
      expect(profile.name).toBe('J/35');
      expect(profile.type).toBe('sailboat');
      expect(profile.category).toBe('cruiser-racer');
      expect(profile.dimensions.length_overall).toBe(10.67); // Nautical (EU) units - meters
      expect(profile.performance.polar_diagram).toBe('j35-polar.csv');
    });

    test('should load motor yacht profile successfully', async () => {
      const profile = await profileManager.loadProfile('motor-yacht-45');

      expect(profile).toBeDefined();
      expect(profile.name).toBe('Motor Yacht 45');
      expect(profile.type).toBe('powerboat');
      expect(profile.category).toBe('motor-yacht');
      expect(profile.dimensions.length_overall).toBe(13.72);
      expect(profile.performance.cruise_speed).toBe(20);
    });

    test('should cache loaded profiles', async () => {
      const profile1 = await profileManager.loadProfile('j35');
      const profile2 = await profileManager.loadProfile('j35');

      expect(profile1).toBe(profile2); // Same object reference
    });

    test('should throw error for non-existent profile', async () => {
      await expect(profileManager.loadProfile('non-existent')).rejects.toThrow(
        'Vessel profile not found: non-existent',
      );
    });

    test('should throw error for malformed YAML', async () => {
      // Create a temporary malformed profile for testing
      const tempPath = path.join(profileManager.profilesDir, 'malformed.yaml');
      fs.writeFileSync(tempPath, 'invalid: yaml: content: [');

      try {
        await expect(profileManager.loadProfile('malformed')).rejects.toThrow(
          'Failed to load vessel profile',
        );
      } finally {
        // Clean up
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });
  });

  describe('Profile Validation', () => {
    test('should validate required fields', async () => {
      // Create a profile with missing required fields
      const tempPath = path.join(profileManager.profilesDir, 'invalid-test.yaml');
      const invalidProfile = {
        name: 'Test Boat',
        // Missing required fields: type, category, dimensions, performance, physics
      };

      fs.writeFileSync(tempPath, require('js-yaml').dump(invalidProfile));

      try {
        await expect(profileManager.loadProfile('invalid-test')).rejects.toThrow(
          'Missing required field',
        );
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });

    test('should validate vessel type', async () => {
      const tempPath = path.join(profileManager.profilesDir, 'invalid-type-test.yaml');
      const invalidProfile = {
        name: 'Test Boat',
        type: 'invalid-type',
        category: 'test',
        dimensions: { length_overall: 30, beam: 10, draft: 5 },
        performance: { hull_speed: 7 },
        physics: { keel_offset: 0.5 },
      };

      fs.writeFileSync(tempPath, require('js-yaml').dump(invalidProfile));

      try {
        await expect(profileManager.loadProfile('invalid-type-test')).rejects.toThrow(
          'Invalid vessel type',
        );
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });

    test('should validate dimension ranges', async () => {
      const tempPath = path.join(profileManager.profilesDir, 'invalid-dimensions-test.yaml');
      const invalidProfile = {
        name: 'Test Boat',
        type: 'sailboat',
        category: 'test',
        dimensions: {
          length_overall: 300, // Too large
          beam: 1, // Too small
          draft: 25, // Too large
        },
        performance: { hull_speed: 7, polar_diagram: 'test.csv' },
        physics: {
          keel_offset: 0.5,
          leeway_factor: 5,
          heel_sensitivity: 2,
          vmg_efficiency: 0.8,
          max_heel: 20,
          stall_angle: 45,
        },
      };

      fs.writeFileSync(tempPath, require('js-yaml').dump(invalidProfile));

      try {
        await expect(profileManager.loadProfile('invalid-dimensions-test')).rejects.toThrow(
          'must be between',
        );
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });

    test('should validate physics parameter ranges', async () => {
      const tempPath = path.join(profileManager.profilesDir, 'invalid-physics-test.yaml');
      const invalidProfile = {
        name: 'Test Boat',
        type: 'sailboat',
        category: 'test',
        dimensions: { length_overall: 30, beam: 10, draft: 5 },
        performance: { hull_speed: 7, polar_diagram: 'test.csv' },
        physics: {
          keel_offset: 1.5, // Out of range
          leeway_factor: 20, // Out of range
          heel_sensitivity: 10, // Out of range
          vmg_efficiency: 1.5, // Out of range
          max_heel: 50, // Out of range
          stall_angle: 80, // Out of range
        },
      };

      fs.writeFileSync(tempPath, require('js-yaml').dump(invalidProfile));

      try {
        await expect(profileManager.loadProfile('invalid-physics-test')).rejects.toThrow(
          'must be between',
        );
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });

    test('should validate sailboat-specific requirements', async () => {
      const tempPath = path.join(profileManager.profilesDir, 'invalid-sailboat-test.yaml');
      const invalidProfile = {
        name: 'Test Sailboat',
        type: 'sailboat',
        category: 'test',
        dimensions: { length_overall: 30, beam: 10, draft: 5 },
        performance: {
          hull_speed: 7,
          // Missing polar_diagram
        },
        physics: {
          keel_offset: 0.5,
          leeway_factor: 5,
          heel_sensitivity: 2,
          vmg_efficiency: 0.8,
          max_heel: 20,
          stall_angle: 45,
        },
      };

      fs.writeFileSync(tempPath, require('js-yaml').dump(invalidProfile));

      try {
        await expect(profileManager.loadProfile('invalid-sailboat-test')).rejects.toThrow(
          'must specify a polar_diagram',
        );
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });

    test('should validate powerboat-specific requirements', async () => {
      const tempPath = path.join(profileManager.profilesDir, 'invalid-powerboat-test.yaml');
      const invalidProfile = {
        name: 'Test Powerboat',
        type: 'powerboat',
        category: 'test',
        dimensions: { length_overall: 30, beam: 10, draft: 5 },
        performance: {
          hull_speed: 7,
          // Missing cruise_speed
        },
        physics: { turning_radius: 100, acceleration: 2, deceleration: 3 },
      };

      fs.writeFileSync(tempPath, require('js-yaml').dump(invalidProfile));

      try {
        await expect(profileManager.loadProfile('invalid-powerboat-test')).rejects.toThrow(
          'must specify cruise_speed',
        );
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });
  });

  describe('Computed Properties', () => {
    test('should calculate theoretical hull speed', async () => {
      const profile = await profileManager.loadProfile('j35');

      expect(profile._computed).toBeDefined();
      // 2.43 * sqrt(10.67) ≈ 7.94 knots (equivalent to original 35ft calculation)
      expect(profile._computed.theoretical_hull_speed).toBeCloseTo(7.94, 1);
    });

    test('should calculate displacement/length ratio for sailboats', async () => {
      const profile = await profileManager.loadProfile('j35');

      if (profile.dimensions.displacement) {
        expect(profile._computed.displacement_length_ratio).toBeDefined();
        expect(profile._computed.displacement_length_ratio).toBeGreaterThan(200);
      }
    });

    test('should calculate ballast ratio for sailboats', async () => {
      const profile = await profileManager.loadProfile('j35');

      expect(profile._computed.ballast_ratio).toBeDefined();
      expect(profile._computed.ballast_ratio).toBeCloseTo(0.43, 2);
    });
  });

  describe('Parameter Inheritance', () => {
    test('should apply overrides correctly', async () => {
      const baseProfile = await profileManager.loadProfile('j35');
      const overrides = {
        physics: {
          keel_offset: 0.8,
          max_heel: 30,
        },
        defaults: {
          crew_weight: 800,
        },
      };

      const modifiedProfile = profileManager.applyOverrides(baseProfile, overrides);

      expect(modifiedProfile.physics.keel_offset).toBe(0.8);
      expect(modifiedProfile.physics.max_heel).toBe(30);
      expect(modifiedProfile.defaults.crew_weight).toBe(800);

      // Original profile should be unchanged
      expect(baseProfile.physics.keel_offset).toBe(0.45);
      expect(baseProfile.physics.max_heel).toBe(25);
    });

    test('should handle nested overrides', async () => {
      const baseProfile = await profileManager.loadProfile('j35');
      const overrides = {
        dimensions: {
          length_overall: 36,
        },
      };

      const modifiedProfile = profileManager.applyOverrides(baseProfile, overrides);

      expect(modifiedProfile.dimensions.length_overall).toBe(36);
      expect(modifiedProfile.dimensions.beam).toBe(baseProfile.dimensions.beam); // Unchanged
    });

    test('should handle empty overrides', async () => {
      const baseProfile = await profileManager.loadProfile('j35');
      const modifiedProfile = profileManager.applyOverrides(baseProfile, {});

      expect(modifiedProfile).toEqual(baseProfile);
    });

    test('should handle null/undefined overrides', async () => {
      const baseProfile = await profileManager.loadProfile('j35');

      const modifiedProfile1 = profileManager.applyOverrides(baseProfile, null);
      const modifiedProfile2 = profileManager.applyOverrides(baseProfile, undefined);

      expect(modifiedProfile1).toEqual(baseProfile);
      expect(modifiedProfile2).toEqual(baseProfile);
    });
  });

  describe('Error Handling', () => {
    test('should provide helpful error messages with available profiles', async () => {
      try {
        await profileManager.loadProfile('non-existent');
      } catch (error) {
        expect(error.message).toContain('Available profiles:');
        expect(error.message).toContain('j35');
      }
    });

    test('should handle file system errors gracefully', async () => {
      // Mock fs.readFileSync to throw an error
      const originalReadFileSync = fs.readFileSync;
      fs.readFileSync = jest.fn(() => {
        throw new Error('Permission denied');
      });

      try {
        await expect(profileManager.loadProfile('j35')).rejects.toThrow(
          'Failed to load vessel profile',
        );
      } finally {
        fs.readFileSync = originalReadFileSync;
      }
    });
  });
});
