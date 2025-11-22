#!/bin/bash
# Fix missing caret controls for remaining widgets

echo "🔧 Adding proper caret controls to remaining widgets..."

widgets=("TanksWidget" "RudderPositionWidget" "WaterTemperatureWidget")

for widget in "${widgets[@]}"; do
  echo "Processing ${widget}..."
  
  file="src/widgets/${widget}.tsx"
  
  # Create backup
  cp "$file" "${file}.backup"
  
  # Replace old header pattern with new caret pattern
  sed -i '' '
    # Find and replace the old header pattern
    /<View style={styles.header}>/{
      N
      N
      N
      s|<View style={styles.header}>.*<Text style={styles.title}>{title}</Text>.*<View style={styles.statusIndicator} />.*</View>|{/* Widget Header with Title and Controls */}\
      <View style={styles.header}>\
        <Text style={[styles.title, { fontSize: 11, fontWeight: '\''bold'\'', letterSpacing: 0.5, textTransform: '\''uppercase'\'', color: theme.textSecondary }]}>{title}</Text>\
        \
        {/* Expansion Caret and Pin Controls */}\
        <View style={styles.controls}>\
          {pinned ? (\
            <TouchableOpacity\
              onLongPress={handleLongPress}\
              style={styles.controlButton}\
              testID={`pin-button-${id}`}\
            >\
              <Text style={styles.pinIcon}>📌</Text>\
            </TouchableOpacity>\
          ) : (\
            <TouchableOpacity\
              onPress={handlePress}\
              onLongPress={handleLongPress}\
              style={styles.controlButton}\
              testID={`caret-button-${id}`}\
            >\
              <Text style={styles.caret}>\
                {expanded ? '\''⌃'\'' : '\''⌄'\''}\
              </Text>\
            </TouchableOpacity>\
          )}\
        </View>\
      </View>|
    }
  ' "$file"
  
  echo "✅ ${widget} header pattern updated"
done

echo "🎉 All widget headers updated with proper caret controls!"