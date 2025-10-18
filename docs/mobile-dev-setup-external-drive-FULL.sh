#!/bin/bash
# Mobile Development Environment Setup - FULL EXTERNAL DRIVE
# Project: bmad-autopilot
# Author: Mary (Business Analyst)
# Date: 2025-10-18
#
# USE CASE: System drive has limited space (<20 GB free)
# STRATEGY: Install EVERYTHING on external drive except Android Studio app

set -e  # Exit on error

echo "=== Full External Drive Mobile Development Setup ==="
echo ""
echo "⚠️  CRITICAL: This setup installs EVERYTHING on external drive"
echo "    Required due to limited system drive space"
echo ""
echo "External Drive: /Volumes/SSD_I"
echo "System Drive: / (only ~14 GB free)"
echo ""

# Verify external drive is mounted
if [ ! -d "/Volumes/SSD_I" ]; then
  echo "ERROR: External drive /Volumes/SSD_I not found!"
  echo "Please mount the external drive and try again."
  exit 1
fi

echo "✅ External drive found: /Volumes/SSD_I"
echo "   Free space: $(df -h /Volumes/SSD_I | awk 'NR==2 {print $4}')"
echo ""

# Create comprehensive directory structure
echo "📁 Creating directory structure on external drive..."
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Applications
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/avd
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/Xcode
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/CoreSimulator
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Build-Caches
echo "✅ Directory structure created"
echo ""

# Backup existing .zshrc
echo "💾 Backing up shell configuration..."
cp ~/.zshrc ~/.zshrc.backup-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup created: ~/.zshrc.backup-$(date +%Y%m%d-%H%M%S)"
echo ""

# Configure environment variables
echo "⚙️  Configuring environment variables..."

cat >> ~/.zshrc << 'EOF'

# ============================================
# Mobile Development - FULL EXTERNAL DRIVE
# Added by mobile-dev-setup-external-drive-FULL.sh
# Date: $(date +%Y-%m-%d)
# ============================================

# Android Configuration
export ANDROID_HOME=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk
export ANDROID_AVD_HOME=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/avd
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Xcode on External Drive
export DEVELOPER_DIR=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/Xcode/Xcode.app/Contents/Developer

# Build Caches on External Drive
export GRADLE_USER_HOME=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Build-Caches/gradle
export COCOAPODS_CACHE_DIR=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Build-Caches/cocoapods

# iOS Simulator on External Drive
export DARWIN_CORESIMULATOR_DEVICE_SET=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/CoreSimulator

# Verify external drive is mounted
if [ ! -d "/Volumes/SSD_I" ]; then
  echo ""
  echo "⚠️  ⚠️  ⚠️  CRITICAL WARNING ⚠️  ⚠️  ⚠️"
  echo "External drive not mounted at /Volumes/SSD_I"
  echo "Mobile development tools will NOT work!"
  echo "Please connect the external drive."
  echo ""
fi

# Convenience aliases
alias xcode-external="open /Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/Xcode/Xcode.app"
alias mobile-tools-check='echo "Android SDK: $ANDROID_HOME" && echo "Xcode: $DEVELOPER_DIR" && ls -lah /Volumes/SSD_I/Dev/Mobile-Dev-Tools/'

EOF

echo "✅ Environment variables configured"
echo ""

# Create Android local.properties
echo "📝 Configuring Android project settings..."
PROJECT_PATH="/Volumes/SSD_I/Dev/JSDev/bmad-autopilot/boatingInstrumentsApp"

if [ -d "$PROJECT_PATH/android" ]; then
  cat > "$PROJECT_PATH/android/local.properties" << EOF
sdk.dir=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk
EOF
  echo "✅ Android local.properties created"
else
  echo "⚠️  WARNING: Android project directory not found"
fi
echo ""

# Create gradle.properties for external cache
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Build-Caches/gradle
cat > /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Build-Caches/gradle/gradle.properties << EOF
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true
EOF

# Instructions
echo "=========================================="
echo "✅ CONFIGURATION COMPLETE"
echo "=========================================="
echo ""
echo "SYSTEM DRIVE USAGE: Minimal (~20-25 GB total)"
echo "EXTERNAL DRIVE USAGE: ~60 GB for all development tools"
echo ""
echo "=========================================="
echo "INSTALLATION STEPS - DO IN ORDER:"
echo "=========================================="
echo ""
echo "STEP 1: RELOAD SHELL"
echo "  source ~/.zshrc"
echo ""
echo "STEP 2: VERIFY CONFIGURATION"
echo "  echo \$ANDROID_HOME"
echo "  echo \$DEVELOPER_DIR"
echo ""
echo "STEP 3: INSTALL ANDROID STUDIO (App on system drive, SDK on external)"
echo "  brew install --cask android-studio"
echo ""
echo "STEP 4: CONFIGURE ANDROID STUDIO"
echo "  open -a 'Android Studio'"
echo "  - Choose 'Custom' installation"
echo "  - SDK Location: /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk"
echo "  - Install API 33, 34"
echo "  - Install Platform-Tools, Build-Tools 36.0.0, Emulator"
echo ""
echo "STEP 5: INSTALL XCODE TO EXTERNAL DRIVE"
echo "  # Download Xcode from App Store to ~/Downloads/"
echo "  # After download completes:"
echo "  sudo mv /Applications/Xcode.app /Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/Xcode/"
echo "  sudo xcode-select --switch /Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/Xcode/Xcode.app/Contents/Developer"
echo "  sudo xcodebuild -license accept"
echo ""
echo "STEP 6: INSTALL SUPPORT TOOLS"
echo "  brew install cocoapods watchman"
echo ""
echo "STEP 7: INSTALL iOS DEPENDENCIES"
echo "  cd /Volumes/SSD_I/Dev/JSDev/bmad-autopilot/boatingInstrumentsApp/ios"
echo "  pod install"
echo ""
echo "STEP 8: CREATE ANDROID EMULATOR (AVD will auto-use external drive)"
echo "  # In Android Studio:"
echo "  # Tools → Device Manager → Create Device → Pixel 8 Pro → API 34"
echo ""
echo "STEP 9: TEST iOS BUILD"
echo "  cd /Volumes/SSD_I/Dev/JSDev/bmad-autopilot/boatingInstrumentsApp"
echo "  npx react-native run-ios"
echo ""
echo "STEP 10: TEST ANDROID BUILD"
echo "  cd /Volumes/SSD_I/Dev/JSDev/bmad-autopilot/boatingInstrumentsApp"
echo "  npx react-native run-android"
echo ""
echo "=========================================="
echo "CONVENIENCE COMMANDS:"
echo "=========================================="
echo "  xcode-external          # Launch Xcode from external drive"
echo "  mobile-tools-check      # Verify configuration"
echo ""
echo "=========================================="
echo "⚠️  CRITICAL REMINDERS:"
echo "=========================================="
echo "1. External drive MUST be mounted for all development work"
echo "2. Do NOT eject /Volumes/SSD_I while developing"
echo "3. Builds will fail if drive is not connected"
echo "4. Xcode/simulators will be slightly slower (2-3 seconds) but fully functional"
echo ""
echo "=========================================="
echo "DISK SPACE SAVED ON SYSTEM DRIVE: ~40 GB"
echo "=========================================="
echo ""
