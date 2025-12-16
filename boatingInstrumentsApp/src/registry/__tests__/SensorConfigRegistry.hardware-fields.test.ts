/**
 * Hardware Field Loading Pattern Tests
 * 
 * Validates that the sensor[instance][hardwareField] pattern works correctly
 * for readOnlyIfValue iostate fields.
 */

import { getSensorConfig, shouldShowField, validateFieldDependencies } from '../SensorConfigRegistry';

describe('Hardware Field Loading Pattern', () => {
  describe('Battery sensor', () => {
    const config = getSensorConfig('battery');
    
    it('should define hardwareField for chemistry', () => {
      const chemistryField = config.fields.find(f => f.key === 'batteryChemistry');
      expect(chemistryField).toBeDefined();
      expect(chemistryField?.hardwareField).toBe('chemistry');
      expect(chemistryField?.iostate).toBe('readOnlyIfValue');
    });
    
    it('should define hardwareField for capacity', () => {
      const capacityField = config.fields.find(f => f.key === 'capacity');
      expect(capacityField).toBeDefined();
      expect(capacityField?.hardwareField).toBe('capacity');
      expect(capacityField?.iostate).toBe('readOnlyIfValue');
    });
    
    it('should simulate hardware value loading', () => {
      // Simulate sensor data structure
      const sensorData = {
        battery: {
          0: {
            voltage: 12.5,
            chemistry: 'lifepo4', // Hardware provides chemistry
            capacity: 300, // Hardware provides capacity
            soc: 85,
          },
        },
      };
      
      const batteryInstance = sensorData.battery[0];
      
      // Test chemistry field loading
      const chemistryField = config.fields.find(f => f.key === 'batteryChemistry');
      const chemistryValue = batteryInstance[chemistryField!.hardwareField!];
      expect(chemistryValue).toBe('lifepo4');
      
      // Test capacity field loading
      const capacityField = config.fields.find(f => f.key === 'capacity');
      const capacityValue = batteryInstance[capacityField!.hardwareField!];
      expect(capacityValue).toBe(300);
    });
    
    it('should fall back to default when hardware value not available', () => {
      const sensorData = {
        battery: {
          0: {
            voltage: 12.5,
            // No chemistry or capacity from hardware
          },
        },
      };
      
      const batteryInstance = sensorData.battery[0];
      
      const chemistryField = config.fields.find(f => f.key === 'batteryChemistry');
      const capacityField = config.fields.find(f => f.key === 'capacity');
      
      const chemistryValue = batteryInstance[chemistryField!.hardwareField!] ?? chemistryField!.default;
      const capacityValue = batteryInstance[capacityField!.hardwareField!] ?? capacityField!.default;
      
      // Should use defaults when hardware doesn't provide
      expect(chemistryValue).toBeUndefined(); // No default in this case, should be undefined
      expect(capacityValue).toBe(140); // Should use default
    });
  });
  
  describe('Engine sensor', () => {
    const config = getSensorConfig('engine');
    
    it('should have readWrite fields (no hardwareField)', () => {
      const typeField = config.fields.find(f => f.key === 'engineType');
      const maxRpmField = config.fields.find(f => f.key === 'maxRpm');
      
      expect(typeField?.iostate).toBe('readWrite');
      expect(typeField?.hardwareField).toBeUndefined();
      
      expect(maxRpmField?.iostate).toBe('readWrite');
      expect(maxRpmField?.hardwareField).toBeUndefined();
    });
  });
  
  describe('Tank sensor', () => {
    const config = getSensorConfig('tank');
    
    it('should have slider field with readWrite iostate', () => {
      const capacityField = config.fields.find(f => f.key === 'capacity');
      
      expect(capacityField?.type).toBe('slider');
      expect(capacityField?.iostate).toBe('readWrite');
      expect(capacityField?.default).toBe(200);
      expect(capacityField?.min).toBe(10);
      expect(capacityField?.max).toBe(5000);
      expect(capacityField?.step).toBe(10);
    });
  });
});

describe('Field Dependency Validation', () => {
  describe('shouldShowField', () => {
    it('should show field without dependencies', () => {
      const field = {
        key: 'name',
        label: 'Name',
        type: 'text' as const,
        iostate: 'readWrite' as const,
        default: '',
      };
      
      const formData = {};
      expect(shouldShowField(field, formData)).toBe(true);
    });
    
    it('should show field when dependency is satisfied', () => {
      const field = {
        key: 'subfield',
        label: 'Subfield',
        type: 'text' as const,
        iostate: 'readWrite' as const,
        dependsOn: 'parentField',
        default: '',
      };
      
      const formData = { parentField: 'someValue' };
      expect(shouldShowField(field, formData)).toBe(true);
    });
    
    it('should hide field when dependency not satisfied', () => {
      const field = {
        key: 'subfield',
        label: 'Subfield',
        type: 'text' as const,
        iostate: 'readWrite' as const,
        dependsOn: 'parentField',
        default: '',
      };
      
      const formData = {};
      expect(shouldShowField(field, formData)).toBe(false);
      
      const formDataEmpty = { parentField: '' };
      expect(shouldShowField(field, formDataEmpty)).toBe(false);
      
      const formDataNull = { parentField: null };
      expect(shouldShowField(field, formDataNull)).toBe(false);
    });
  });
  
  describe('validateFieldDependencies', () => {
    it('should return no errors for sensors without dependencies', () => {
      const errors = validateFieldDependencies('battery', {
        name: 'House Bank',
        batteryChemistry: 'lifepo4',
      });
      
      expect(errors).toHaveLength(0);
    });
    
    // Note: Current registry doesn't have dependsOn examples yet
    // This test structure is ready for when they're added
  });
});

describe('Default Values', () => {
  it('battery should have default values', () => {
    const config = getSensorConfig('battery');
    
    const nameField = config.fields.find(f => f.key === 'name');
    expect(nameField?.default).toBe('');
    
    const capacityField = config.fields.find(f => f.key === 'capacity');
    expect(capacityField?.default).toBe(140);
  });
  
  it('picker fields should have default option flag', () => {
    const batteryConfig = getSensorConfig('battery');
    const chemistryField = batteryConfig.fields.find(f => f.key === 'batteryChemistry');
    
    expect(chemistryField?.options).toBeDefined();
    const defaultOption = chemistryField?.options?.find(opt => opt.default);
    expect(defaultOption).toBeDefined();
    expect(defaultOption?.value).toBe('lead-acid');
  });
  
  it('tank should have default capacity', () => {
    const config = getSensorConfig('tank');
    const capacityField = config.fields.find(f => f.key === 'capacity');
    
    expect(capacityField?.default).toBe(200);
    expect(capacityField?.type).toBe('slider');
  });
});

describe('iostate Behavior', () => {
  it('readOnly fields cannot be edited', () => {
    // No current examples in registry, but pattern is established
    // readOnly = always read-only, regardless of hardware values
  });
  
  it('readWrite fields are always editable', () => {
    const engineConfig = getSensorConfig('engine');
    const typeField = engineConfig.fields.find(f => f.key === 'engineType');
    
    expect(typeField?.iostate).toBe('readWrite');
    expect(typeField?.hardwareField).toBeUndefined();
  });
  
  it('readOnlyIfValue fields conditional on hardware', () => {
    const batteryConfig = getSensorConfig('battery');
    const chemistryField = batteryConfig.fields.find(f => f.key === 'batteryChemistry');
    
    expect(chemistryField?.iostate).toBe('readOnlyIfValue');
    expect(chemistryField?.hardwareField).toBe('chemistry');
    
    // If hardware provides value → read-only
    // If hardware doesn't provide value → editable
  });
});

describe('helpText Property', () => {
  it('all fields should have helpText', () => {
    const batteryConfig = getSensorConfig('battery');
    
    batteryConfig.fields.forEach(field => {
      expect(field.helpText).toBeDefined();
      expect(field.helpText).toBeTruthy();
      expect(typeof field.helpText).toBe('string');
    });
  });
  
  it('helpText should be descriptive', () => {
    const batteryConfig = getSensorConfig('battery');
    const chemistryField = batteryConfig.fields.find(f => f.key === 'batteryChemistry');
    
    expect(chemistryField?.helpText).toContain('Hardware');
    expect(chemistryField?.helpText).toContain('may provide');
  });
});
