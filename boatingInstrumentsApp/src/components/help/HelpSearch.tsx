/**
 * HelpSearch - Searchable help content interface
 *
 * Features:
 * - Real-time search with debouncing
 * - Search result highlighting
 * - Category filtering
 * - Loading states
 * - Empty states with suggestions
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { HelpSearchResult } from '../../systems/help/types';
import { useTheme } from '../../store/themeStore';

interface HelpSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  results: HelpSearchResult[];
  loading: boolean;
  onResultSelect: (result: HelpSearchResult) => void;
  debounceMs?: number;
}

export const HelpSearch: React.FC<HelpSearchProps> = ({
  placeholder = 'Search help...',
  onSearch,
  results,
  loading,
  onResultSelect,
  debounceMs = 300,
}) => {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length > 0) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  const renderResult = useCallback(
    ({ item }: { item: HelpSearchResult }) => (
      <TouchableOpacity
        style={[styles.resultItem, { borderBottomColor: colors.border }]}
        onPress={() => onResultSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} - ${item.category}`}
      >
        <View style={styles.resultHeader}>
          <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type, colors) }]}>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
        </View>
        <Text style={[styles.resultSnippet, { color: colors.textSecondary }]} numberOfLines={3}>
          {item.snippet}
        </Text>
        {item.category && (
          <Text style={[styles.resultCategory, { color: colors.textSecondary }]}>
            {item.category}
          </Text>
        )}
      </TouchableOpacity>
    ),
    [colors, onResultSelect],
  );

  const renderEmpty = useCallback(() => {
    if (loading) {
      return null;
    }

    if (query.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            🔍 Search Help & Documentation
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            Enter keywords to search tutorials, guides, and troubleshooting tips
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Results Found</Text>
        <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
          Try different keywords or browse by category
        </Text>
      </View>
    );
  }, [loading, query, colors]);

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View
        style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search help content"
          accessibilityRole="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <Text style={[styles.clearIcon, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Searching...</Text>
        </View>
      )}
      {!loading && (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item.contentId}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.resultsContainer,
            results.length === 0 && styles.resultsContainerEmpty,
          ]}
          showsVerticalScrollIndicator={true}
        />
      )}
    </View>
  );
};

/**
 * Get color for content type badge
 */
function getTypeColor(type: string, colors: any): string {
  const typeColors: Record<string, string> = {
    tutorial: colors.primary,
    guide: '#4CAF50',
    faq: '#FF9800',
    troubleshooting: '#F44336',
    reference: '#9C27B0',
    video: '#2196F3',
    safety: '#FF5722',
  };
  return typeColors[type] || colors.primary;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearIcon: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  resultsContainer: {
    paddingBottom: 20,
  },
  resultsContainerEmpty: {
    flex: 1,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.surface,
    textTransform: 'capitalize',
  },
  resultSnippet: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  resultCategory: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default HelpSearch;
