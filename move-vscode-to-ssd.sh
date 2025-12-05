#!/bin/zsh
# Move VS Code to SSD
# Run this AFTER closing VS Code

set -e

echo "📦 Moving VS Code data to SSD (9GB)..."
echo ""

# Create target directory
mkdir -p /Volumes/SSD_I/Dev/VSCode-Data

# Move VS Code Application Support
echo "1/3 Moving Application Support/Code..."
if [ -d ~/Library/Application\ Support/Code ]; then
    mv ~/Library/Application\ Support/Code /Volumes/SSD_I/Dev/VSCode-Data/
    ln -s /Volumes/SSD_I/Dev/VSCode-Data/Code ~/Library/Application\ Support/Code
    echo "  ✅ Application Support moved and symlinked"
else
    echo "  ⚠️  Already moved or not found"
fi

# Move .vscode directory
echo "2/3 Moving ~/.vscode..."
if [ -d ~/.vscode ]; then
    mv ~/.vscode /Volumes/SSD_I/Dev/VSCode-Data/
    ln -s /Volumes/SSD_I/Dev/VSCode-Data/.vscode ~/.vscode
    echo "  ✅ .vscode moved and symlinked"
else
    echo "  ⚠️  Already moved or not found"
fi

# Check disk usage
echo "3/3 Checking disk space..."
df -h / | tail -1

echo ""
echo "✅ VS Code migration complete!"
echo "📍 Data now at: /Volumes/SSD_I/Dev/VSCode-Data/"
echo "🔗 Symlinks created - VS Code will work normally"
echo ""
echo "💡 You can now restart VS Code"
