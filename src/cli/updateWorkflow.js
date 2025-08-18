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

/**
 * Let user select specific tickets to update for each action type
 * @param {Object} selectedActionIssues - Issues grouped by selected action types
 * @returns {Object} Selected issues grouped by action type
 */
export async function selectSpecificTickets(selectedActionIssues) {
  const selectedTickets = {};

  for (const [action, issues] of Object.entries(selectedActionIssues)) {
    if (issues.length === 0) continue;

    console.log(`\n🎯 Select specific tickets for ${action} updates:`);

    // Create choices for each ticket showing title and action
    const ticketChoices = issues.map(issue => {
      const actionDescription = getActionDescription(action, issue);
      return {
        name: `${issue.key}: ${issue.fields.summary} - ${actionDescription}`,
        value: issue.key,
        checked: false, // Start with none selected to force deliberate choice
      };
    });

    // Add "Select All" option at the top
    ticketChoices.unshift({
      name: `🔄 Select All (${issues.length} tickets)`,
      value: '__SELECT_ALL__',
      checked: false,
    });

    const selectedKeys = await checkbox({
      message: `Select tickets to update with ${action}:`,
      choices: ticketChoices,
      pageSize: 15, // Show more items per page
    });

    // Handle "Select All" option
    if (selectedKeys.includes('__SELECT_ALL__')) {
      selectedTickets[action] = issues;
    } else {
      // Filter issues based on selected keys
      selectedTickets[action] = issues.filter(issue => selectedKeys.includes(issue.key));
    }

    if (selectedTickets[action].length > 0) {
      console.log(`   ✅ Selected ${selectedTickets[action].length} tickets for ${action}`);
    } else {
      console.log(`   ⏭️  No tickets selected for ${action}`);
    }
  }

  return selectedTickets;
}

/**
 * Get a human-readable description of what action will be performed
 * @param {string} action - The action type
 * @param {Object} issue - The JIRA issue
 * @returns {string} Description of the action
 */
function getActionDescription(action, issue) {
  switch (action) {
    case 'work-type': {
      const currentWorkType = issue.ai_work_type || 'Not classified';
      return `Set work type to: ${currentWorkType}`;
    }
    case 'edit':
      return 'Apply AI-generated edits to title/description';
    case 'story-points': {
      const storyPoints = issue.ai_story_points || 'TBD';
      return `Set story points to: ${storyPoints}`;
    }
    case 'workflow': {
      const transition = issue.ai_transition || 'No transition';
      return `Transition to: ${transition}`;
    }
    default:
      return `Apply ${action} changes`;
  }
}
