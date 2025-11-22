#!/bin/bash

# BMad Marine Instruments - App File Management Script
# 
# This script helps you switch between the sample theme demo and the full dashboard app
#
# Usage:
#   ./switch-app.sh demo     # Switch to theme demo
#   ./switch-app.sh full     # Switch to full dashboard
#   ./switch-app.sh status   # Show current status

APP_DIR="app"
DEMO_FILE="index.tsx"
BACKUP_FILE="index.tsx.backup"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR" || exit 1

show_status() {
    echo "=== BMad App Status ==="
    
    if [[ -f "$APP_DIR/$DEMO_FILE" ]]; then
        # Check first few lines to determine which version is active
        if grep -q "MarineThemeDemo" "$APP_DIR/$DEMO_FILE"; then
            echo "Current app: 🎨 THEME DEMO (Story 2.14 sample)"
            echo "Description: Simple demo showing marine-compliant theme system"
        else
            echo "Current app: 🚢 FULL DASHBOARD"
            echo "Description: Complete marine instruments dashboard"
        fi
    else
        echo "❌ No app file found!"
        exit 1
    fi
    
    if [[ -f "$APP_DIR/$BACKUP_FILE" ]]; then
        echo "Backup available: ✅ $BACKUP_FILE exists"
    else
        echo "Backup available: ❌ No backup found"
    fi
    
    echo ""
    echo "Theme compliance tests: $(ls __tests__/themeCompliance.test.ts 2>/dev/null && echo "✅" || echo "❌")"
    echo "Web dev server: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081 | grep -q 200 && echo "🟢 Running" || echo "🔴 Stopped")"
}

switch_to_demo() {
    echo "🎨 Switching to Theme Demo App..."
    
    # Backup current version if not already backed up
    if [[ ! -f "$APP_DIR/$BACKUP_FILE" ]]; then
        echo "📁 Creating backup of current app..."
        cp "$APP_DIR/$DEMO_FILE" "$APP_DIR/$BACKUP_FILE"
    fi
    
    # Create the demo app
    cat > "$APP_DIR/$DEMO_FILE" << 'EOF'
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useThemeStore, useTheme } from '../src/core/themeStore';
import { ThemeSwitcher } from '../src/widgets/ThemeSwitcher';

/**
 * Sample Marine Theme Demo App
 * Demonstrates the implemented Story 2.14: Marine-Compliant Theme System
 */
export default function MarineThemeDemo() {
  const { mode, nativeBrightnessControl } = useThemeStore();
  const theme = useTheme();

  const showThemeInfo = () => {
    Alert.alert(
      'Marine Theme System',
      \`Current Mode: \${mode.toUpperCase()}\\n\` +
      \`Native Brightness: \${nativeBrightnessControl ? 'ON' : 'OFF'}\\n\\n\` +
      \`This demonstrates Story 2.14 implementation:\\n\` +
      \`• Day mode: High contrast for sunlight\\n\` +
      \`• Night mode: Dark with reduced brightness\\n\` +
      \`• Red-Night mode: Pure red spectrum only\\n\` +
      \`• Native brightness control integration\`
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.appBackground }]}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Switcher - Most Important Feature */}
        <ThemeSwitcher />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>BMad Marine Instruments</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Story 2.14: Marine Theme Demo ✅
          </Text>
        </View>

        {/* Theme Status Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Current Theme Status</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Mode:</Text>
            <Text style={[styles.statusValue, { color: theme.accent }]}>{mode.toUpperCase()}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Native Control:</Text>
            <Text style={[styles.statusValue, { color: nativeBrightnessControl ? theme.success : theme.textSecondary }]}>
              {nativeBrightnessControl ? 'ENABLED' : 'DISABLED'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.infoButton, { backgroundColor: theme.primary }]}
            onPress={showThemeInfo}
          >
            <Text style={[styles.infoButtonText, { color: theme.surface }]}>View Details</Text>
          </TouchableOpacity>
        </View>

        {/* Sample Marine Widgets */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Sample Marine Data</Text>
          
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCell, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>DEPTH</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>12.4</Text>
              <Text style={[styles.metricUnit, { color: theme.textSecondary }]}>m</Text>
            </View>
            
            <View style={[styles.metricCell, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>SPEED</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>6.8</Text>
              <Text style={[styles.metricUnit, { color: theme.textSecondary }]}>kts</Text>
            </View>
            
            <View style={[styles.metricCell, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>WIND</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>15.2</Text>
              <Text style={[styles.metricUnit, { color: theme.textSecondary }]}>kts</Text>
            </View>
            
            <View style={[styles.metricCell, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>HDG</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>045°</Text>
              <Text style={[styles.metricUnit, { color: theme.textSecondary }]}>M</Text>
            </View>
          </View>
        </View>

        {/* Warning States Demo */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Marine Alert States</Text>
          
          <View style={[styles.alertRow, { backgroundColor: theme.background }]}>
            <View style={[styles.alertDot, { backgroundColor: theme.success }]} />
            <Text style={[styles.alertText, { color: theme.text }]}>All Systems Normal</Text>
          </View>
          
          <View style={[styles.alertRow, { backgroundColor: theme.background }]}>
            <View style={[styles.alertDot, { backgroundColor: theme.warning }]} />
            <Text style={[styles.alertText, { color: theme.text }]}>Shallow Water Warning</Text>
          </View>
          
          <View style={[styles.alertRow, { backgroundColor: theme.background }]}>
            <View style={[styles.alertDot, { backgroundColor: theme.error }]} />
            <Text style={[styles.alertText, { color: theme.text }]}>Engine Temperature High</Text>
          </View>
        </View>

        {/* Footer Info */}
        <View style={[styles.footer, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            🌊 Marine-compliant theme system with night vision preservation
          </Text>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Try switching between Day, Night, and Red-Night modes above! 🌅🌙🔴
          </Text>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Story 2.14 Implementation Complete ✅
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  infoButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCell: {
    flex: 1,
    minWidth: 80,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
});
EOF
    
    echo "✅ Theme Demo App is now active!"
    echo "🌐 Refresh your browser at http://localhost:8081 to see the demo"
    echo ""
    echo "🎯 What to test:"
    echo "  • Switch between Day/Night/Red-Night modes"
    echo "  • Toggle Native Brightness Control"
    echo "  • Notice marine-compliant colors in Red-Night mode"
    echo "  • Tap 'View Details' for more info"
}

switch_to_full() {
    echo "🚢 Switching to Full Dashboard App..."
    
    if [[ -f "$APP_DIR/$BACKUP_FILE" ]]; then
        cp "$APP_DIR/$BACKUP_FILE" "$APP_DIR/$DEMO_FILE"
        echo "✅ Full Dashboard App is now active!"
        echo "🌐 Refresh your browser at http://localhost:8081 to see the full app"
    else
        echo "❌ No backup file found! Cannot restore full dashboard."
        echo "The backup should be at: $APP_DIR/$BACKUP_FILE"
        exit 1
    fi
}

# Main script logic
case "${1:-status}" in
    "demo")
        switch_to_demo
        show_status
        ;;
    "full")
        switch_to_full
        show_status
        ;;
    "status")
        show_status
        ;;
    *)
        echo "Usage: $0 {demo|full|status}"
        echo ""
        echo "  demo   - Switch to theme demo app"
        echo "  full   - Switch to full dashboard app" 
        echo "  status - Show current app status"
        exit 1
        ;;
esac