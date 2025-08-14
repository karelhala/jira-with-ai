import { select, confirm, checkbox } from '@inquirer/prompts';
import { CONFIDENCE_THRESHOLD_CHOICES } from './prompts.js';

/**
 * Get confidence threshold selection from user
 * @returns {number} Selected confidence threshold percentage
 */
export async function getConfidenceThreshold() {
  const thresholdChoice = await select({
    message: '\n📊 Select minimum confidence threshold for updates:',
    choices: CONFIDENCE_THRESHOLD_CHOICES,
    default: 85,
  });

  return thresholdChoice;
}

/**
 * Display summary of eligible issues grouped by action type
 * @param {Object} eligibleIssues - Issues grouped by action type
 * @param {number} threshold - The confidence threshold used
 */
export function displayEligibleIssuesSummary(eligibleIssues, threshold) {
  const totalEligible = Object.values(eligibleIssues).reduce((sum, arr) => sum + arr.length, 0);

  console.log(`\n📈 Found ${totalEligible} issues meeting ${threshold}% confidence threshold:`);
  Object.entries(eligibleIssues).forEach(([action, issues]) => {
    if (issues.length > 0) {
      console.log(`   • ${action}: ${issues.length} issues`);
    }
  });

  return totalEligible;
}

/**
 * Let user select which action types to process
 * @param {Object} eligibleIssues - Issues grouped by action type
 * @returns {Array} Selected action types
 */
export async function selectActionsToProcess(eligibleIssues) {
  // Create choices for available actions
  const availableActions = Object.entries(eligibleIssues)
    .filter(([_, issues]) => issues.length > 0)
    .map(([action, issues]) => ({
      name: `${action} (${issues.length} issues)`,
      value: action,
      checked: action === 'work-type', // Default to work-type since it can update JIRA
    }));

  if (availableActions.length === 0) {
    console.log('\n⚠️ No actions available for the selected threshold.');
    return [];
  }

  const selectedActions = await checkbox({
    message: '\n🎯 Select which types of updates to apply:',
    choices: availableActions,
  });

  return selectedActions;
}

/**
 * Ask user for initial confirmation to proceed with confidence-based updates
 * @returns {boolean} Whether user wants to proceed
 */
export async function confirmUpdateWorkflow() {
  const shouldUpdate = await confirm({
    message: '\n🚀 Would you like to selectively update issues based on confidence levels?',
    default: false,
  });

  return shouldUpdate;
}
