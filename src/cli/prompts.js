/**
 * CLI prompt configurations and utilities
 */

export const SEARCH_TYPE_CHOICES = [
  {
    name: 'JQL (JIRA Query Language)',
    value: 'jql',
    description: 'Use JQL syntax for advanced queries',
  },
  {
    name: 'Filter ID',
    value: 'filter',
    description: 'Search using a saved JIRA filter ID',
  },
];

export const ACTION_CHOICES = [
  {
    name: 'Edit Issues',
    value: 'edit',
    description: 'Provide instructions to modify issues using AI',
  },
  {
    name: 'Analysis',
    value: 'analysis',
    description: 'Get AI analysis and insights about the issues',
  },
  {
    name: 'Count Story Points',
    value: 'story-points',
    description: 'Calculate and analyze story points using AI',
  },
  {
    name: 'Transition in Workflow',
    value: 'workflow',
    description: 'Get AI recommendations for workflow transitions',
  },
  {
    name: 'Classify Work Type',
    value: 'work-type',
    description: 'Classify issues by work type categories',
  },
  {
    name: 'Skip',
    value: 'skip',
    description: 'Do nothing and exit',
  },
];

/**
 * Validation function for JQL queries
 * @param {string} input - User input
 * @returns {boolean|string} True if valid, error message if invalid
 */
export function validateJqlQuery(input) {
  if (!input.trim()) {
    return 'JQL query cannot be empty';
  }
  return true;
}

/**
 * Validation function for filter IDs
 * @param {string} input - User input
 * @returns {boolean|string} True if valid, error message if invalid
 */
export function validateFilterId(input) {
  if (!input.trim()) {
    return 'Filter ID cannot be empty';
  }
  if (!/^\d+$/.test(input.trim())) {
    return 'Filter ID must be a number';
  }
  return true;
}

/**
 * Validation function for edit instructions
 * @param {string} input - User input
 * @returns {boolean|string} True if valid, error message if invalid
 */
export function validateEditInstructions(input) {
  return input.trim() ? true : 'Instructions cannot be empty';
}

/**
 * Confidence threshold choices for issue updates
 */
export const CONFIDENCE_THRESHOLD_CHOICES = [
  {
    name: '95% - Very High Confidence (Most Restrictive)',
    value: 95,
    description: 'Only update issues with very high confidence ratings',
  },
  {
    name: '85% - High Confidence (Default)',
    value: 85,
    description: 'Update issues with high confidence ratings',
  },
  {
    name: '75% - Medium-High Confidence',
    value: 75,
    description: 'Update issues with medium-high confidence ratings',
  },
  {
    name: '65% - Medium Confidence',
    value: 65,
    description: 'Update issues with medium confidence ratings',
  },
  {
    name: '50% - Any Confidence (Least Restrictive)',
    value: 50,
    description: 'Update all issues regardless of confidence level',
  },
];

/**
 * Validation function for confidence threshold
 * @param {string} input - User input
 * @returns {boolean|string} True if valid, error message if invalid
 */
export function validateConfidenceThreshold(input) {
  const num = parseInt(input.trim());
  if (isNaN(num)) {
    return 'Confidence threshold must be a number';
  }
  if (num < 1 || num > 100) {
    return 'Confidence threshold must be between 1 and 100';
  }
  return true;
}
