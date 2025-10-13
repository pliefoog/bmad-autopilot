#!/bin/bash

# Boating Instruments App - Web Setup Script
# This script installs all dependencies needed to run the app in a web browser

set -e  # Exit on error

echo "🌐 Boating Instruments App - Web Setup"
echo "======================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the boatingInstrumentsApp directory"
    exit 1
fi

echo "📦 Installing web dependencies..."
echo ""

# Install react-native-web and related packages
npm install --save-dev \
  react-native-web@^0.19.0 \
  react-dom@^19.1.1 \
  webpack@^5.89.0 \
  webpack-cli@^5.1.4 \
  webpack-dev-server@^4.15.1 \
  html-webpack-plugin@^5.5.4 \
  babel-loader@^9.1.3 \
  @babel/preset-react@^7.23.3 \
  @babel/plugin-proposal-class-properties@^7.18.6 \
  @babel/plugin-transform-runtime@^7.23.6 \
  style-loader@^3.3.3 \
  css-loader@^6.8.1 \
  react-native-svg-web@^1.0.9

echo ""
echo "✅ Web dependencies installed successfully!"
echo ""
echo "🚀 You can now run the app in a web browser:"
echo ""
echo "   npm run web"
echo ""
echo "The app will open at: http://localhost:3000"
echo ""
echo "📝 Notes:"
echo "   - Native modules (TCP sockets, file system) are mocked"
echo "   - Perfect for UI validation and rapid development"
echo "   - For full functionality, use iOS or Android"
echo ""
echo "📚 See WEB-SETUP-GUIDE.md for more information"
echo ""
