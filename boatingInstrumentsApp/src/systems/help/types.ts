/**
 * Help System Type Definitions
 * Defines interfaces for tutorial management, help content, and diagnostic systems
 */

/**
 * Tutorial step definition for interactive tutorials
 */
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetRef?: string; // Reference ID for highlighting
  action?: 'tap' | 'swipe' | 'longPress' | 'none';
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  optional?: boolean;
  validation?: () => boolean; // Optional validation before proceeding
}

/**
 * Tutorial progress tracking
 */
export interface TutorialProgress {
  tutorialId: string;
  currentStep: number;
  totalSteps: number;
  completed: boolean;
  startedAt: Date;
  completedAt?: Date;
  skipped: boolean;
}

/**
 * Tutorial definition with metadata
 */
export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: 'onboarding' | 'feature' | 'troubleshooting' | 'safety';
  priority: 'required' | 'recommended' | 'optional';
  estimatedMinutes: number;
  steps: TutorialStep[];
  prerequisites?: string[]; // IDs of tutorials that should be completed first
  safetyWarning?: string; // For autopilot and safety-critical features
}

/**
 * Help content types
 */
export type HelpContentType =
  | 'tutorial'
  | 'guide'
  | 'faq'
  | 'troubleshooting'
  | 'reference'
  | 'video'
  | 'safety';

/**
 * Help content structure
 */
export interface HelpContent {
  id: string;
  type: HelpContentType;
  title: string;
  description: string;
  content: string; // Markdown or HTML content
  category: string;
  tags: string[];
  language: string;
  version: string;
  lastUpdated: Date;
  relatedContent?: string[]; // IDs of related content
  videoUrl?: string; // For video tutorials
  thumbnailUrl?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Help search result
 */
export interface HelpSearchResult {
  contentId: string;
  title: string;
  snippet: string;
  type: HelpContentType;
  relevanceScore: number;
  category: string;
}

/**
 * System diagnostic information
 */
export interface SystemDiagnostics {
  timestamp: Date;
  appVersion: string;
  platform: 'ios' | 'android' | 'web';
  platformVersion: string;
  deviceModel?: string;
  screenSize: { width: number; height: number };
  memoryUsage?: {
    used: number;
    total: number;
  };
  batteryLevel?: number;
  networkType?: string;
  isConnected: boolean;
}

/**
 * Connection log entry for diagnostics
 */
export interface ConnectionLog {
  timestamp: Date;
  type: 'info' | 'warning' | 'error';
  source: string;
  message: string;
  details?: any;
}

/**
 * Support report for user assistance
 */
export interface SupportReport {
  reportId: string;
  generatedAt: Date;
  systemInfo: SystemDiagnostics;
  connectionLogs: ConnectionLog[];
  userDescription?: string;
  category?: 'connection' | 'performance' | 'feature' | 'crash' | 'other';
  attachedScreenshot?: string;
}

/**
 * Video tutorial chapter/bookmark
 */
export interface VideoChapter {
  time: number; // Seconds
  title: string;
  description?: string;
}

/**
 * User feedback on help content
 */
export interface FeedbackData {
  contentId: string;
  rating: number; // 1-5
  feedback?: string;
  category: 'helpful' | 'confusing' | 'outdated' | 'missing';
  timestamp: Date;
  anonymous: boolean;
}

/**
 * Language definition for i18n
 */
export interface Language {
  code: string; // ISO 639-1 (e.g., 'en', 'es', 'fr')
  name: string;
  nativeName: string;
  rtl?: boolean; // Right-to-left languages
}

/**
 * Quick start guide step
 */
export interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  icon: string; // Ionicons name
  completed: boolean;
  action?: () => void;
  tutorialId?: string; // Link to full tutorial
}

/**
 * Quick start progress
 */
export interface QuickStartProgress {
  started: boolean;
  currentStep: number;
  totalSteps: number;
  stepsCompleted: string[];
  completedAt?: Date;
  dismissed: boolean;
}
