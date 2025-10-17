import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../core/themeStore';
import { createThemedStyles, getStateColor } from '../styles/theme.stylesheet';

/**
 * ExampleWidget - Comprehensive demonstration of all theme stylesheet patterns.
 * 
 * This widget serves as a reference implementation showing how to use every
 * style category in the centralized theme system. Use this as a guide when
 * creating new widgets or migrating existing ones.
 * 
 * Demonstrates:
 * - Container structures (header, body, footer)
 * - Typography system (title, mnemonic, values, units)
 * - Grid layouts (1x1, 2x1, 2x2, 2x3)
 * - Button styles (primary, secondary, danger)
 * - State indicators (normal, warning, error, success)
 * - Utility classes (spacers, dividers, containers)
 */
export const ExampleWidget: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createThemedStyles(theme), [theme]);
  
  // Demo state for interactive examples
  const [currentView, setCurrentView] = useState<'typography' | 'layouts' | 'buttons' | 'states'>('typography');
  const [selectedState, setSelectedState] = useState<'normal' | 'warning' | 'error' | 'success'>('normal');
  
  // Sample data for demonstrations
  const sampleMetrics = {
    speed: 12.4,
    depth: 8.2,
    wind: 15.6,
    heading: 285,
    rpm: 2400,
    temp: 85,
    pressure: 12,
    hours: 1247,
  };

  const renderTypographyDemo = () => (
    <View>
      {/* Typography Scale Demonstration */}
      <Text style={styles.title}>Typography Examples</Text>
      <View style={styles.spacer} />
      
      <Text style={styles.mnemonic}>MNEMONIC LABEL</Text>
      <View style={styles.valueContainer}>
        <Text style={styles.valueMonospace}>36pt</Text>
        <Text style={styles.unit}>Large</Text>
      </View>
      
      <View style={styles.spacer} />
      
      <Text style={styles.mnemonic}>MEDIUM VALUE</Text>
      <View style={styles.valueContainerCentered}>
        <Text style={styles.valueMedium}>24pt</Text>
        <Text style={styles.unit}>Medium</Text>
      </View>
      
      <View style={styles.spacer} />
      
      <Text style={styles.mnemonic}>SMALL VALUE</Text>
      <View style={styles.valueContainerCentered}>
        <Text style={styles.valueSmall}>18pt</Text>
        <Text style={styles.unitSmall}>Small</Text>
      </View>
      
      <View style={styles.spacer} />
      
      <Text style={styles.secondary}>Secondary information text (12pt)</Text>
      <Text style={styles.caption}>Caption text for minimal info (10pt)</Text>
    </View>
  );

  const renderLayoutDemo = () => (
    <View>
      <Text style={styles.title}>Layout Examples</Text>
      <View style={styles.spacer} />
      
      {/* 1x1 Layout */}
      <Text style={styles.secondary}>Single Metric (1×1)</Text>
      <View style={styles.grid1x1}>
        <Text style={styles.mnemonic}>SPEED</Text>
        <View style={styles.valueContainer}>
          <Text style={styles.valueMonospace}>{sampleMetrics.speed}</Text>
          <Text style={styles.unit}>kn</Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      {/* 2x1 Layout */}
      <Text style={styles.secondary}>Two Metrics Side-by-Side (2×1)</Text>
      <View style={styles.grid2x1}>
        <View style={styles.gridCell}>
          <Text style={styles.mnemonic}>SPEED</Text>
          <Text style={styles.valueMedium}>{sampleMetrics.speed}</Text>
          <Text style={styles.unitSmall}>kn</Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.mnemonic}>DEPTH</Text>
          <Text style={styles.valueMedium}>{sampleMetrics.depth}</Text>
          <Text style={styles.unitSmall}>m</Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      {/* 2x2 Layout */}
      <Text style={styles.secondary}>Four Metrics Grid (2×2)</Text>
      <View style={styles.grid2x2}>
        <View style={styles.gridRow}>
          <View style={styles.gridCell}>
            <Text style={styles.mnemonic}>RPM</Text>
            <Text style={styles.valueSmall}>{sampleMetrics.rpm}</Text>
            <Text style={styles.unitSmall}>rpm</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.mnemonic}>TEMP</Text>
            <Text style={styles.valueSmall}>{sampleMetrics.temp}</Text>
            <Text style={styles.unitSmall}>°C</Text>
          </View>
        </View>
        <View style={styles.gridRow}>
          <View style={styles.gridCell}>
            <Text style={styles.mnemonic}>PRESS</Text>
            <Text style={styles.valueSmall}>{sampleMetrics.pressure}</Text>
            <Text style={styles.unitSmall}>psi</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.mnemonic}>HOURS</Text>
            <Text style={styles.valueSmall}>{sampleMetrics.hours}</Text>
            <Text style={styles.unitSmall}>h</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderButtonDemo = () => (
    <View>
      <Text style={styles.title}>Button Examples</Text>
      <View style={styles.spacer} />
      
      <TouchableOpacity style={styles.buttonPrimary}>
        <Text style={styles.buttonTextPrimary}>Primary Action</Text>
      </TouchableOpacity>
      
      <View style={styles.spacer} />
      
      <TouchableOpacity style={styles.buttonSecondary}>
        <Text style={styles.buttonTextSecondary}>Secondary Action</Text>
      </TouchableOpacity>
      
      <View style={styles.spacer} />
      
      <TouchableOpacity style={styles.buttonDanger}>
        <Text style={styles.buttonTextDanger}>Danger Action</Text>
      </TouchableOpacity>
      
      <View style={styles.spacer} />
      
      <View style={styles.buttonDisabled}>
        <Text style={styles.buttonTextSecondary}>Disabled</Text>
      </View>
    </View>
  );

  const renderStateDemo = () => (
    <View>
      <Text style={styles.title}>State Examples</Text>
      <View style={styles.spacer} />
      
      {/* State Selection Buttons */}
      <View style={styles.grid2x2}>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={selectedState === 'normal' ? styles.buttonPrimary : styles.buttonSecondary}
            onPress={() => setSelectedState('normal')}
          >
            <Text style={selectedState === 'normal' ? styles.buttonTextPrimary : styles.buttonTextSecondary}>
              Normal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={selectedState === 'warning' ? styles.buttonPrimary : styles.buttonSecondary}
            onPress={() => setSelectedState('warning')}
          >
            <Text style={selectedState === 'warning' ? styles.buttonTextPrimary : styles.buttonTextSecondary}>
              Warning
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={selectedState === 'error' ? styles.buttonPrimary : styles.buttonSecondary}
            onPress={() => setSelectedState('error')}
          >
            <Text style={selectedState === 'error' ? styles.buttonTextPrimary : styles.buttonTextSecondary}>
              Error
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={selectedState === 'success' ? styles.buttonPrimary : styles.buttonSecondary}
            onPress={() => setSelectedState('success')}
          >
            <Text style={selectedState === 'success' ? styles.buttonTextPrimary : styles.buttonTextSecondary}>
              Success
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.spacerLarge} />
      
      {/* State-Colored Values */}
      <View style={styles.grid1x1}>
        <Text style={styles.mnemonic}>ENGINE TEMP</Text>
        <View style={styles.valueContainer}>
          <Text style={[
            styles.valueMonospace,
            { color: getStateColor(selectedState, theme) }
          ]}>
            {selectedState === 'error' ? '105' : 
             selectedState === 'warning' ? '95' :
             selectedState === 'success' ? '75' : '85'}
          </Text>
          <Text style={styles.unit}>°C</Text>
        </View>
        <Text style={[
          styles.secondary,
          { color: getStateColor(selectedState, theme) }
        ]}>
          {selectedState === 'error' ? 'OVERHEATING!' : 
           selectedState === 'warning' ? 'High Temperature' :
           selectedState === 'success' ? 'Optimal' : 'Normal Operation'}
        </Text>
      </View>
      
      <View style={styles.spacer} />
      
      {/* State Style Demonstrations */}
      <Text style={styles.stateNormal}>Normal State Text</Text>
      <Text style={styles.stateWarning}>Warning State Text</Text>
      <Text style={styles.stateError}>Error State Text</Text>
      <Text style={styles.stateSuccess}>Success State Text</Text>
      <Text style={styles.stateNoData}>No Data State Text</Text>
    </View>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'typography':
        return renderTypographyDemo();
      case 'layouts':
        return renderLayoutDemo();
      case 'buttons':
        return renderButtonDemo();
      case 'states':
        return renderStateDemo();
      default:
        return renderTypographyDemo();
    }
  };

  return (
    <View style={styles.widgetContainer}>
      {/* Widget Header */}
      <View style={styles.widgetHeader}>
        <Text style={styles.title}>Style Demo</Text>
        <Text style={styles.chevron}>⌄</Text>
      </View>
      
      {/* Navigation Tabs */}
      <View style={styles.widgetBody}>
        <View style={styles.grid2x2}>
          <View style={styles.gridRow}>
            <TouchableOpacity 
              style={currentView === 'typography' ? styles.buttonPrimary : styles.buttonSecondary}
              onPress={() => setCurrentView('typography')}
            >
              <Text style={currentView === 'typography' ? styles.buttonTextPrimary : styles.buttonTextSecondary}>
                Text
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={currentView === 'layouts' ? styles.buttonPrimary : styles.buttonSecondary}
              onPress={() => setCurrentView('layouts')}
            >
              <Text style={currentView === 'layouts' ? styles.buttonTextPrimary : styles.buttonTextSecondary}>
                Layouts
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.gridRow}>
            <TouchableOpacity 
              style={currentView === 'buttons' ? styles.buttonPrimary : styles.buttonSecondary}
              onPress={() => setCurrentView('buttons')}
            >
              <Text style={currentView === 'buttons' ? styles.buttonTextPrimary : styles.buttonTextSecondary}>
                Buttons
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={currentView === 'states' ? styles.buttonPrimary : styles.buttonSecondary}
              onPress={() => setCurrentView('states')}
            >
              <Text style={currentView === 'states' ? styles.buttonTextPrimary : styles.buttonTextSecondary}>
                States
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        {/* Content Area */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderCurrentView()}
        </ScrollView>
      </View>
      
      {/* Widget Footer */}
      <View style={styles.widgetFooter}>
        <Text style={styles.caption}>
          Theme: {theme.background === '#F8FAFC' ? 'Day' : 
                  theme.background === '#0F172A' ? 'Night' : 'Red-Night'}
        </Text>
      </View>
    </View>
  );
};

/**
 * Export as default for easy importing in testing and development.
 */
export default ExampleWidget;