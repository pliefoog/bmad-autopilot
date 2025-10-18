#!/bin/bash
# Mobile Development Environment Setup on External Drive
# Project: bmad-autopilot
# Author: Mary (Business Analyst)
# Date: 2025-10-18

set -e  # Exit on error

echo "=== Mobile Development Environment Setup on External Drive ==="
echo ""
echo "This script will configure Android SDK and AVD on external drive"
echo "while keeping applications on system drive for optimal performance."
echo ""
echo "External Drive: /Volumes/SSD_I"
echo "System Drive: /"
echo ""

# Verify external drive is mounted
if [ ! -d "/Volumes/SSD_I" ]; then
  echo "ERROR: External drive /Volumes/SSD_I not found!"
  echo "Please mount the external drive and try again."
  exit 1
fi

echo "✅ External drive found: /Volumes/SSD_I"
echo ""

# Create directory structure
echo "📁 Creating directory structure on external drive..."
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/avd
mkdir -p /Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/CoreSimulator
echo "✅ Directory structure created"
echo ""

# Configure Android SDK environment variables
echo "⚙️  Configuring Android SDK environment variables..."

# Backup existing .zshrc
cp ~/.zshrc ~/.zshrc.backup-$(date +%Y%m%d-%H%M%S)

# Add Android configuration
cat >> ~/.zshrc << 'EOF'

# ============================================
# Android Development on External Drive
# Added by mobile-dev-setup-external-drive.sh
# Date: $(date +%Y-%m-%d)
# ============================================

export ANDROID_HOME=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk
export ANDROID_AVD_HOME=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/avd
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Verify external drive is mounted (prevents errors if drive not connected)
if [ ! -d "$ANDROID_HOME" ]; then
  echo "⚠️  WARNING: Android SDK drive not mounted at $ANDROID_HOME"
fi

EOF

echo "✅ Environment variables configured in ~/.zshrc"
echo ""

# Create Android local.properties for project
echo "📝 Configuring Android project settings..."
PROJECT_PATH="/Volumes/SSD_I/Dev/JSDev/bmad-autopilot/boatingInstrumentsApp"

if [ -d "$PROJECT_PATH/android" ]; then
  echo "sdk.dir=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk" > "$PROJECT_PATH/android/local.properties"
  echo "✅ Android local.properties created"
else
  echo "⚠️  WARNING: Android project directory not found at $PROJECT_PATH/android"
  echo "   You'll need to create local.properties manually when project is ready."
fi
echo ""

# Instructions for user
echo "=========================================="
echo "✅ SETUP COMPLETE"
echo "=========================================="
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. RELOAD SHELL CONFIGURATION:"
echo "   source ~/.zshrc"
echo ""
echo "2. INSTALL ANDROID STUDIO:"
echo "   brew install --cask android-studio"
echo ""
echo "3. LAUNCH ANDROID STUDIO:"
echo "   open -a 'Android Studio'"
echo ""
echo "   During setup wizard:"
echo "   - Choose 'Custom' installation"
echo "   - Set SDK location to: /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk"
echo "   - Select API levels: 33, 34"
echo "   - Install SDK Platform-Tools, Build-Tools 36.0.0, Emulator"
echo ""
echo "4. VERIFY ENVIRONMENT:"
echo "   echo \$ANDROID_HOME"
echo "   # Should show: /Volumes/SSD_I/Dev/Mobile-Dev-Tools/Android/sdk"
echo ""
echo "5. INSTALL XCODE (on system drive):"
echo "   - Open App Store"
echo "   - Search 'Xcode'"
echo "   - Click Install (15-20 GB)"
echo ""
echo "6. INSTALL COCOAPODS:"
echo "   brew install cocoapods watchman"
echo ""
echo "7. INSTALL iOS DEPENDENCIES:"
echo "   cd /Volumes/SSD_I/Dev/JSDev/bmad-autopilot/boatingInstrumentsApp/ios"
echo "   pod install"
echo ""
echo "=========================================="
echo "DISK SPACE SAVINGS:"
echo "=========================================="
echo "System Drive: ~25-40 GB saved"
echo "External Drive: ~25-40 GB used"
echo ""
echo "All large SDK/AVD files will be on external drive."
echo "Applications (Xcode, Android Studio) on system drive for performance."
echo ""
echo "⚠️  IMPORTANT: External drive must be mounted for Android development!"
echo ""
