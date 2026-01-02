/**
 * Tooltip Component
 * Story 4.4 AC12: Contextual help tooltip overlay
 *
 * Displays help content in an overlay with proper positioning,
 * dismissal handling, and accessibility support.
 */

import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/themeStore';
import { AccessibilityService } from '../../services/accessibility/AccessibilityService';

export interface TooltipProps {
  /**
   * Whether the tooltip is visible
   */
  visible: boolean;

  /**
   * Callback when tooltip should be dismissed
   */
  onDismiss: () => void;

  /**
   * Title of the help content
   */
  title: string;

  /**
   * Main help content (can include multiple paragraphs)
   */
  content: string | string[];

  /**
   * Optional additional tips or warnings
   */
  tips?: string[];

  /**
   * Optional related help topics (shows as links)
   */
  relatedTopics?: Array<{
    title: string;
    onPress: () => void;
  }>;

  /**
   * Test ID for automated testing
   */
  testID?: string;
}

/**
 * Tooltip - Contextual help overlay component
 *
 * Usage:
 * ```tsx
 * <Tooltip
 *   visible={showHelp}
 *   onDismiss={() => setShowHelp(false)}
 *   title="WiFi Bridge Connection"
 *   content={[
 *     "Connect to your boat's WiFi bridge to receive NMEA data.",
 *     "Typical bridge IP addresses: 192.168.1.1 or 10.0.0.1"
 *   ]}
 *   tips={["Ensure WiFi is enabled", "Check bridge power"]}
 * />
 * ```
 */
export const Tooltip: React.FC<TooltipProps> = ({
  visible,
  onDismiss,
  title,
  content,
  tips,
  relatedTopics,
  testID = 'tooltip',
}) => {
  const theme = useTheme();
  const { width: screenWidth } = Dimensions.get('window');

  // Announce tooltip content to screen readers when opened
  useEffect(() => {
    if (visible) {
      const contentText = Array.isArray(content) ? content.join('. ') : content;
      AccessibilityService.announce(`Help: ${title}. ${contentText}`, 'polite');
    }
  }, [visible, title, content]);

  if (!visible) return null;

  const contentArray = Array.isArray(content) ? content : [content];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
      accessibilityViewIsModal={true}
      testID={testID}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
        accessible={false}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.container,
            {
              backgroundColor: theme.background,
              borderColor: theme.text,
              maxWidth: Math.min(500, screenWidth - 40),
            },
          ]}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`Help tooltip: ${title}`}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons
                name="information-circle"
                size={24}
                color={theme.primary}
                style={styles.headerIcon}
              />
              <Text
                style={[styles.title, { color: theme.text }]}
                accessible={true}
                accessibilityRole="header"
              >
                {title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onDismiss}
              style={styles.closeButton}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close help"
              testID={`${testID}-close`}
            >
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            {/* Main Content */}
            {contentArray.map((paragraph, index) => (
              <Text
                key={`content-${index}`}
                style={[styles.content, { color: theme.text }, index > 0 && styles.contentSpacing]}
                accessible={true}
                accessibilityRole="text"
              >
                {paragraph}
              </Text>
            ))}
            {tips && tips.length > 0 && (
              <View
                style={[
                  styles.tipsContainer,
                  {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderLeftColor: theme.warning,
                  },
                ]}
              >
                <Text
                  style={[styles.tipsTitle, { color: theme.warning }]}
                  accessible={true}
                  accessibilityRole="header"
                >
                  💡 Tips
                </Text>
                {tips.map((tip, index) => (
                  <Text
                    key={`tip-${index}`}
                    style={[styles.tipText, { color: theme.text }, index > 0 && styles.tipSpacing]}
                    accessible={true}
                    accessibilityRole="text"
                  >
                    • {tip}
                  </Text>
                ))}
              </View>
            )}
            {relatedTopics && relatedTopics.length > 0 ? (
              <View style={styles.relatedContainer}>
                <Text
                  style={[styles.relatedTitle, { color: theme.textSecondary }]}
                  accessible={true}
                  accessibilityRole="header"
                >
                  Related Help Topics
                </Text>
                {relatedTopics.map((topic, index) => (
                  <TouchableOpacity
                    key={`related-${index}`}
                    onPress={topic.onPress}
                    style={[styles.relatedTopic, { borderBottomColor: theme.textSecondary + '30' }]}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`View help for ${topic.title}`}
                    testID={`${testID}-related-${index}`}
                  >
                    <Text style={[styles.relatedTopicText, { color: theme.primary }]}>
                      {topic.title}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipContainer: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: '80%',
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  scrollView: {
    maxHeight: 400,
  },
  contentContainer: {
    padding: 16,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
  },
  contentSpacing: {
    marginTop: 12,
  },
  tipsContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipSpacing: {
    marginTop: 6,
  },
  relatedContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  relatedTopic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  relatedTopicText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
