# Multilingual Support Integration Guide

## Overview

BMad Autopilot now includes comprehensive multilingual support with 5 languages:
- **English** (en) - Base language
- **Spanish** (es - Español)
- **French** (fr - Français)
- **German** (de - Deutsch)
- **Italian** (it - Italiano)

## Architecture

### i18n Configuration

Located in `src/i18n/config.ts`, this provides:
- Language detection with AsyncStorage persistence
- Fallback to English for missing translations
- Device language detection (extensible)
- Programmatic language switching

### Translation Files

Located in `src/i18n/locales/`, organized by language code:
- `en.json` - English (complete reference)
- `es.json` - Spanish
- `fr.json` - French
- `de.json` - German
- `it.json` - Italian

### Structure

```json
{
  "help": {
    "title": "Help & Documentation",
    "search": {
      "placeholder": "Search help articles...",
      ...
    },
    "quickStart": { ... },
    "tutorial": { ... },
    "troubleshooting": { ... }
  },
  "common": {
    "loading": "Loading...",
    ...
  },
  "errors": { ... },
  "settings": { ... }
}
```

## Integration Steps

### 1. Initialize i18n in App Root

```typescript
// App.tsx or index.js
import './src/i18n/config'; // Import BEFORE any components

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

### 2. Use Translations in Components

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <View>
      <Text>{t('help.title')}</Text>
      <Text>{t('common.loading')}</Text>
    </View>
  );
}
```

### 3. Translations with Interpolation

```typescript
// Translation file:
{
  "help.tutorial.stepOf": "Step {{current}} of {{total}}"
}

// Component:
<Text>{t('help.tutorial.stepOf', { current: 2, total: 5 })}</Text>
// Output: "Step 2 of 5"
```

### 4. Add Language Selector to Settings

```typescript
import { LanguageSelector } from './components/settings/LanguageSelector';

function SettingsScreen() {
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  
  return (
    <>
      <TouchableOpacity onPress={() => setShowLanguageSelector(true)}>
        <Text>Change Language</Text>
      </TouchableOpacity>
      
      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
        onLanguageChanged={(lang) => {
          console.log('Language changed to:', lang);
        }}
      />
    </>
  );
}
```

### 5. Inline Language Selector (for Settings Pages)

```typescript
import { InlineLanguageSelector } from './components/settings/LanguageSelector';

function SettingsPage() {
  return (
    <ScrollView>
      <InlineLanguageSelector 
        onLanguageChanged={(lang) => {
          // Optional callback
        }}
      />
    </ScrollView>
  );
}
```

## API Reference

### changeLanguage(languageCode: LanguageCode)

```typescript
import { changeLanguage } from '../i18n';

await changeLanguage('es'); // Switch to Spanish
```

### getCurrentLanguage()

```typescript
import { getCurrentLanguage } from '../i18n';

const currentLang = getCurrentLanguage(); // 'en', 'es', etc.
```

### getLanguageDisplayName(code: string)

```typescript
import { getLanguageDisplayName } from '../i18n';

const displayName = getLanguageDisplayName('es'); // 'Español'
```

### SUPPORTED_LANGUAGES

```typescript
import { SUPPORTED_LANGUAGES } from '../i18n';

SUPPORTED_LANGUAGES.forEach(lang => {
  console.log(lang.code, lang.name, lang.nativeName);
});
// Output:
// en English English
// es Spanish Español
// fr French Français
// de German Deutsch
// it Italian Italiano
```

## Adding New Translations

### 1. Add to Existing Translation Files

Update all language files in `src/i18n/locales/`:

```json
// en.json
{
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}

// es.json
{
  "newFeature": {
    "title": "Nueva Función",
    "description": "Esta es una nueva función"
  }
}
```

### 2. Use in Components

```typescript
const { t } = useTranslation();

<Text>{t('newFeature.title')}</Text>
```

## Adding New Languages

### 1. Create Translation File

Create `src/i18n/locales/[code].json` with complete translations.

### 2. Update Config

```typescript
// src/i18n/config.ts

// Import new translation
import pt from './locales/pt.json'; // Portuguese

// Add to resources
resources: {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  pt: { translation: pt }, // Add here
},

// Add to SUPPORTED_LANGUAGES
export const SUPPORTED_LANGUAGES = [
  ...
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
] as const;
```

## Best Practices

### 1. Always Use Translation Keys

❌ **Don't:**
```typescript
<Text>Loading...</Text>
```

✅ **Do:**
```typescript
<Text>{t('common.loading')}</Text>
```

### 2. Group Related Translations

```json
{
  "widget": {
    "speed": { ... },
    "depth": { ... },
    "wind": { ... }
  }
}
```

### 3. Use Namespaces for Large Apps

```json
// navigation.json
{
  "home": "Home",
  "settings": "Settings"
}

// widgets.json
{
  "add": "Add Widget",
  "remove": "Remove Widget"
}
```

```typescript
const { t } = useTranslation(['navigation', 'widgets']);

<Text>{t('navigation:home')}</Text>
<Text>{t('widgets:add')}</Text>
```

### 4. Handle Plurals

```json
{
  "items": "{{count}} item",
  "items_plural": "{{count}} items"
}
```

```typescript
<Text>{t('items', { count: 1 })}</Text> // "1 item"
<Text>{t('items', { count: 5 })}</Text> // "5 items"
```

### 5. Test with Long Text

German translations are typically 30% longer than English. Test layouts with German to ensure text doesn't overflow:

```typescript
// Test component
<View style={{ width: 200 }}>
  <Text numberOfLines={1}>{t('help.title')}</Text>
</View>
```

## Troubleshooting

### Translations Not Loading

1. Ensure i18n config is imported before components:
```typescript
// App.tsx
import './src/i18n/config'; // Must be first
import { App } from './App';
```

2. Check for typos in translation keys:
```typescript
console.log(t('help.title')); // Correct
console.log(t('Help.Title')); // Won't work (case-sensitive)
```

### Language Not Persisting

Ensure AsyncStorage permissions are set:

```typescript
// Test storage
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('@bmad:test', 'value');
const value = await AsyncStorage.getItem('@bmad:test');
console.log(value); // Should print 'value'
```

### Missing Translations

Add to fallback language (English):

```json
// en.json
{
  "newKey": "New value"
}
```

i18next will use English if translation is missing in other languages.

## Help System Integration

The help system is fully internationalized with:

- **Tutorial content** - Translatable tutorial steps and instructions
- **Help articles** - Language-specific help content via HelpContentProvider
- **Search** - Searches in user's language
- **Troubleshooting** - Localized troubleshooting steps

### Multilingual Help Content

Help content can be language-specific:

```typescript
// Create Spanish help article
const helpContentES: HelpContent = {
  id: 'getting-started_es',
  title: 'Comenzando',
  description: 'Guía de inicio para BMad Autopilot',
  content: '# Comenzando\n\n...',
  type: 'guide',
  category: 'gettingStarted',
  tags: ['inicio', 'configuración'],
  lastUpdated: new Date(),
};

HelpContentProvider.getInstance().addContent(helpContentES);
```

## Testing

### Test Language Switching

```typescript
import { changeLanguage } from '../i18n';

// Switch languages
await changeLanguage('en');
await changeLanguage('es');
await changeLanguage('fr');
```

### Test Translation Coverage

```typescript
// Check all keys exist
const keys = ['help.title', 'common.loading', 'errors.generic'];
keys.forEach(key => {
  console.log(`${key}: ${t(key)}`);
});
```

### Test Layout with German

```typescript
// Force German to test long text
await changeLanguage('de');
// Navigate through app, check for text overflow
```

## Performance Considerations

### 1. Lazy Load Translations

For large apps, load translations on demand:

```typescript
i18n.addResourceBundle('es', 'widgets', widgetsES);
```

### 2. Cache Translations

i18next caches translations automatically. No additional caching needed.

### 3. Minimize Bundle Size

Only include needed languages:

```typescript
// Production build with subset of languages
const resources = {
  en: { translation: en },
  es: { translation: es },
};
```

## Future Enhancements

### Right-to-Left (RTL) Support

For Arabic/Hebrew support:

```typescript
import { I18nManager } from 'react-native';

if (language === 'ar' || language === 'he') {
  I18nManager.forceRTL(true);
}
```

### Professional Translations

Consider using translation services:
- Lokalise
- Crowdin
- POEditor

### Dynamic Content Updates

Update help content remotely:

```typescript
// Fetch translated help content
const response = await fetch(`https://help.bmad.com/${language}/content.json`);
const content = await response.json();
HelpContentProvider.getInstance().updateHelpContent(content);
```

## Summary

Multilingual support is now fully integrated with:
- ✅ 5 languages (EN, ES, FR, DE, IT)
- ✅ AsyncStorage persistence
- ✅ Language selector components
- ✅ Help system integration
- ✅ Extensible architecture for additional languages
- ✅ Professional marine-specific translations

All UI strings should use `t()` function for proper internationalization.
