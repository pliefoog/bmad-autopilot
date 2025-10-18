#!/bin/bash
# System Drive Cleanup Script
# Project: bmad-autopilot
# Author: Mary (Business Analyst)
# Date: 2025-10-18
#
# PURPOSE: Free up space on system drive before mobile dev setup
# SAFETY: Only removes caches that applications will regenerate

set -e

echo "=========================================="
echo "System Drive Cleanup Script"
echo "=========================================="
echo ""
echo "This script will safely remove caches and temporary files"
echo "that applications will automatically regenerate when needed."
echo ""

# Check current space
BEFORE=$(df -h / | awk 'NR==2 {print $4}')
echo "Current free space: $BEFORE"
echo ""

# Function to show size before deletion
show_size() {
    if [ -d "$1" ] || [ -f "$1" ]; then
        SIZE=$(du -sh "$1" 2>/dev/null | awk '{print $1}')
        echo "  📦 $SIZE - $2"
    fi
}

# Function to safely remove
safe_remove() {
    if [ -d "$1" ] || [ -f "$1" ]; then
        rm -rf "$1"
        echo "  ✅ Removed: $2"
    else
        echo "  ⏭️  Not found: $2"
    fi
}

echo "=========================================="
echo "STEP 1: Development Tool Caches (SAFE)"
echo "=========================================="
echo ""

echo "Analyzing development caches..."
show_size ~/Library/Caches/Homebrew "Homebrew cache"
show_size ~/.npm "npm cache"
show_size ~/Library/Caches/pip "Python pip cache"
show_size ~/Library/Caches/Cypress "Cypress test cache"
show_size ~/Library/Caches/typescript "TypeScript cache"
echo ""

read -p "Clean development tool caches? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning development caches..."
    safe_remove ~/Library/Caches/Homebrew "Homebrew cache"
    safe_remove ~/.npm/_cacache "npm cache"
    safe_remove ~/Library/Caches/pip "pip cache"
    safe_remove ~/Library/Caches/Cypress "Cypress cache"
    safe_remove ~/Library/Caches/typescript "TypeScript cache"
    echo "✅ Development caches cleaned"
else
    echo "⏭️  Skipped development caches"
fi
echo ""

echo "=========================================="
echo "STEP 2: VS Code Caches (SAFE)"
echo "=========================================="
echo ""

echo "Analyzing VS Code caches..."
show_size ~/Library/Caches/Code "VS Code cache"
show_size ~/Library/Caches/com.microsoft.VSCode.ShipIt "VS Code update cache"
show_size ~/Library/Application\ Support/Code/CachedData "VS Code cached data"
echo ""

read -p "Clean VS Code caches? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning VS Code caches..."
    safe_remove ~/Library/Caches/Code "VS Code cache"
    safe_remove ~/Library/Caches/com.microsoft.VSCode.ShipIt "VS Code update cache"
    safe_remove ~/Library/Application\ Support/Code/CachedData "VS Code cached data"
    echo "✅ VS Code caches cleaned"
else
    echo "⏭️  Skipped VS Code caches"
fi
echo ""

echo "=========================================="
echo "STEP 3: Browser Caches (PARTIAL - Chrome)"
echo "=========================================="
echo ""

echo "⚠️  WARNING: This will clear Chrome cache (logged-in sessions stay)"
show_size ~/Library/Caches/Google/Chrome "Chrome cache"
echo ""

read -p "Clean Chrome cache? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning Chrome cache..."
    safe_remove ~/Library/Caches/Google/Chrome/Default/Cache "Chrome main cache"
    safe_remove ~/Library/Caches/Google/Chrome/Default/Code\ Cache "Chrome code cache"
    echo "✅ Chrome cache cleaned"
else
    echo "⏭️  Skipped Chrome cache"
fi
echo ""

echo "=========================================="
echo "STEP 4: Application Caches (OPTIONAL)"
echo "=========================================="
echo ""

echo "Analyzing application caches..."
show_size ~/Library/Caches/com.spotify.client "Spotify cache"
show_size ~/Library/Caches/com.postmanlabs.mac.ShipIt "Postman cache"
echo ""

read -p "Clean application caches? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning application caches..."
    safe_remove ~/Library/Caches/com.spotify.client/Data "Spotify cache"
    safe_remove ~/Library/Caches/com.postmanlabs.mac.ShipIt "Postman cache"
    echo "✅ Application caches cleaned"
else
    echo "⏭️  Skipped application caches"
fi
echo ""

echo "=========================================="
echo "STEP 5: System Trash (SAFE)"
echo "=========================================="
echo ""

show_size ~/.Trash "Trash folder"
echo ""

read -p "Empty Trash? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Emptying trash..."
    rm -rf ~/.Trash/*
    echo "✅ Trash emptied"
else
    echo "⏭️  Skipped trash"
fi
echo ""

echo "=========================================="
echo "STEP 6: Downloads Folder (REVIEW FIRST)"
echo "=========================================="
echo ""

show_size ~/Downloads "Downloads folder"
echo ""
echo "⚠️  CAUTION: Review Downloads folder manually before deleting"
echo "   Some files may be important!"
echo ""

read -p "Open Downloads folder for review? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open ~/Downloads
    echo "📂 Downloads folder opened - review and delete manually"
else
    echo "⏭️  Skipped Downloads review"
fi
echo ""

echo "=========================================="
echo "STEP 7: macOS System Cleanup (SAFE)"
echo "=========================================="
echo ""

echo "Running macOS maintenance..."
echo "  - Clearing system log files..."
sudo rm -rf /private/var/log/asl/*.asl 2>/dev/null || true
echo "  - Clearing temporary files..."
sudo rm -rf /private/var/tmp/* 2>/dev/null || true
echo "  - Purging inactive memory..."
sudo purge 2>/dev/null || true
echo "✅ System cleanup complete"
echo ""

echo "=========================================="
echo "CLEANUP SUMMARY"
echo "=========================================="
echo ""

AFTER=$(df -h / | awk 'NR==2 {print $4}')
echo "Free space before: $BEFORE"
echo "Free space after:  $AFTER"
echo ""

# Show detailed space breakdown
df -h / | awk 'NR==2 {print "Total: " $2 "\nUsed: " $3 "\nFree: " $4 "\nCapacity: " $5}'
echo ""

echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo ""
echo "1. Check if you now have enough space:"
echo "   - Minimum needed: ~25 GB for system + Android Studio"
echo "   - Xcode and large SDKs will go to external drive"
echo ""
echo "2. If space is sufficient, run mobile setup:"
echo "   cd /Volumes/SSD_I/Dev/JSDev/bmad-autopilot/docs"
echo "   ./mobile-dev-setup-external-drive-FULL.sh"
echo ""
echo "3. If still tight on space:"
echo "   - Consider moving more to external drive"
echo "   - Check for large files: du -sh ~/* | sort -hr | head -20"
echo ""
echo "✅ Cleanup complete!"
echo ""
