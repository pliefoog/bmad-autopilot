/**
 * Grid Template Registry
 * 
 * Defines reusable grid layout templates for widgets.
 * Templates specify independent primary and secondary grid sections
 * with flexible column counts and cell spanning.
 * 
 * **Registry-First Architecture:**
 * Widgets reference templates by name, eliminating hardcoded layouts.
 * All layout logic lives here, widgets are pure configuration.
 * 
 * **For AI Agents:**
 * - Template names: {rows}Rx{cols}C-{SEP|NONE}[-WIDE]
 * - Primary/secondary sections are independent (can have different column counts)
 * - cellSpans array: indices of cells that span full width
 * - Wide variant: secondary section is 1 column instead of 2
 * 
 * **Example Usage:**
 * ```typescript
 * // Battery widget uses 2x2 grid with separator and 2x2 secondary
 * <TemplatedWidget template="2Rx2C-SEP-2Rx2C" />
 * 
 * // Engine widget uses wide variant (single-column secondary)
 * <TemplatedWidget template="2Rx2C-SEP-2Rx2C-WIDE" />
 * 
 * // Simple wind widget uses 2x1 layout
 * <TemplatedWidget template="2Rx1C-SEP-2Rx1C" />
 * ```
 */

/**
 * Grid section configuration (primary or secondary)
 */
export interface GridSection {
  /** Number of rows in this section */
  rows: number;
  
  /** Number of columns in this section */
  columns: number;
  
  /** Array of cell indices (0-based) that should span full width */
  cellSpans?: number[];
}

/**
 * Complete grid template definition
 */
export interface GridTemplate {
  /** Primary grid section (top section, always present) */
  primaryGrid: GridSection;
  
  /** Secondary grid section (bottom section, optional) */
  secondaryGrid?: GridSection;
  
  /** Whether to show visual separator between sections */
  showSeparator: boolean;
  
  /** Human-readable description for documentation */
  description: string;
}

/**
 * Grid Template Registry
 * 
 * Maps template names to their grid configurations.
 * Frozen at module initialization to prevent runtime mutations.
 */
export const GRID_TEMPLATE_REGISTRY: Readonly<Record<string, GridTemplate>> = {
  /**
   * 2x2 Grid with separator and 2x2 secondary section
   * 
   * **Layout:**
   * ```
   * ┌─────┬─────┐
   * │  1  │  2  │  Primary: 2 rows × 2 columns
   * ├─────┼─────┤
   * │  3  │  4  │
   * ╞═════╪═════╡  Separator
   * │  5  │  6  │  Secondary: 2 rows × 2 columns
   * ├─────┼─────┤
   * │  7  │  8  │
   * └─────┴─────┘
   * ```
   * 
   * **Used by:** Battery widget, Engine widget (with WIDE variant)
   */
  '2Rx2C-SEP-2Rx2C': {
    primaryGrid: {
      rows: 2,
      columns: 2,
    },
    secondaryGrid: {
      rows: 2,
      columns: 2,
    },
    showSeparator: true,
    description: '2x2 grid with separator and 2x2 secondary section',
  },

  /**
   * 2x2 Grid with separator and 2x2 WIDE secondary section
   * 
   * **Layout:**
   * ```
   * ┌─────┬─────┐
   * │  1  │  2  │  Primary: 2 rows × 2 columns
   * ├─────┼─────┤
   * │  3  │  4  │
   * ╞═════╧═════╡  Separator
   * │      5     │  Secondary: 2 rows × 1 column (full-width cells)
   * ├───────────┤
   * │      6     │
   * └───────────┘
   * ```
   * 
   * **Used by:** Engine widget (for efficiency/hours display)
   */
  '2Rx2C-SEP-2Rx2C-WIDE': {
    primaryGrid: {
      rows: 2,
      columns: 2,
    },
    secondaryGrid: {
      rows: 2,
      columns: 1,  // Single column = full width
    },
    showSeparator: true,
    description: '2x2 grid with separator and full-width secondary section',
  },

  /**
   * 2x1 Grid with separator and 2x1 secondary section
   * 
   * **Layout:**
   * ```
   * ┌───────────┐
   * │     1     │  Primary: 2 rows × 1 column
   * ├───────────┤
   * │     2     │
   * ╞═══════════╡  Separator
   * │     3     │  Secondary: 2 rows × 1 column
   * ├───────────┤
   * │     4     │
   * └───────────┘
   * ```
   * 
   * **Used by:** Wind widget (simple vertical layout)
   */
  '2Rx1C-SEP-2Rx1C': {
    primaryGrid: {
      rows: 2,
      columns: 1,
    },
    secondaryGrid: {
      rows: 2,
      columns: 1,
    },
    showSeparator: true,
    description: '2x1 grid with separator and 2x1 secondary section',
  },

  /**
   * 4x2 Grid with no separator (single section)
   * 
   * **Layout:**
   * ```
   * ┌─────┬─────┐
   * │  1  │  2  │
   * ├─────┼─────┤
   * │  3  │  4  │  Primary: 4 rows × 2 columns
   * ├─────┼─────┤
   * │  5  │  6  │
   * ├─────┼─────┤
   * │  7  │  8  │
   * └─────┴─────┘
   * ```
   * 
   * **Used by:** Temperature widget, GPS widget (multi-metric, no sections)
   */
  '4Rx2C-NONE': {
    primaryGrid: {
      rows: 4,
      columns: 2,
    },
    showSeparator: false,
    description: '4x2 grid with no separator',
  },

  /**
   * 3x2 Grid with separator and 1x2 secondary section
   * 
   * **Layout:**
   * ```
   * ┌─────┬─────┐
   * │  1  │  2  │
   * ├─────┼─────┤
   * │  3  │  4  │  Primary: 3 rows × 2 columns
   * ├─────┼─────┤
   * │  5  │  6  │
   * ╞═════╪═════╡  Separator
   * │  7  │  8  │  Secondary: 1 row × 2 columns
   * └─────┴─────┘
   * ```
   * 
   * **Used by:** Navigation widget (large primary, small secondary)
   */
  '3Rx2C-SEP-1Rx2C': {
    primaryGrid: {
      rows: 3,
      columns: 2,
    },
    secondaryGrid: {
      rows: 1,
      columns: 2,
    },
    showSeparator: true,
    description: '3x2 grid with separator and 1x2 secondary section',
  },
};

/**
 * Get grid template by name
 * 
 * @param templateName - Template identifier (e.g., "2Rx2C-SEP-2Rx2C")
 * @returns Grid template configuration
 * @throws Error if template name is invalid
 */
export function getGridTemplate(templateName: string): GridTemplate {
  const template = GRID_TEMPLATE_REGISTRY[templateName];
  
  if (!template) {
    throw new Error(
      `Invalid grid template: "${templateName}"\n` +
      `Available templates: ${Object.keys(GRID_TEMPLATE_REGISTRY).join(', ')}`
    );
  }
  
  return template;
}

/**
 * Validate template cell count matches provided children
 * 
 * @param templateName - Template identifier
 * @param childCount - Number of child elements (metric cells)
 * @throws Error if cell count mismatch
 */
export function validateTemplateCellCount(
  templateName: string,
  childCount: number,
): void {
  const template = getGridTemplate(templateName);
  
  const primaryCells = template.primaryGrid.rows * template.primaryGrid.columns;
  const secondaryCells = template.secondaryGrid
    ? template.secondaryGrid.rows * template.secondaryGrid.columns
    : 0;
  const totalCells = primaryCells + secondaryCells;
  
  if (childCount !== totalCells) {
    throw new Error(
      `Template "${templateName}" expects ${totalCells} cells ` +
      `(${primaryCells} primary + ${secondaryCells} secondary), ` +
      `but received ${childCount} children`
    );
  }
}

/**
 * Freeze registry to prevent runtime mutations
 */
Object.freeze(GRID_TEMPLATE_REGISTRY);
Object.values(GRID_TEMPLATE_REGISTRY).forEach((template) => {
  Object.freeze(template);
  Object.freeze(template.primaryGrid);
  if (template.secondaryGrid) {
    Object.freeze(template.secondaryGrid);
  }
});
