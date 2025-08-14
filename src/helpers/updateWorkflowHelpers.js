import { confirm } from '@inquirer/prompts';
import { handleUpdateJiraWorkType } from '../actions/updateJiraWorkType.js';
import { handleUpdateJiraEdit } from '../actions/updateJiraEdit.js';
import { handleUpdateJiraStoryPoints } from '../actions/updateJiraStoryPoints.js';
import { handleUpdateJiraWorkflow } from '../actions/updateJiraWorkflow.js';
import { DEFAULT_ISSUES_FILE } from '../constants.js';

/**
 * Create action processors mapping for different update types
 * @returns {Object} Action processors mapping
 */
export function createActionProcessors() {
  return {
    'work-type': async (actionIssues, jira) => {
      // For work-type, offer to update JIRA directly
      const updateJira = await confirm({
        message: `🔄 Update JIRA work type field for these ${actionIssues.length} issues?`,
        default: true,
      });

      if (updateJira) {
        await handleUpdateJiraWorkType(actionIssues, jira);
      }
    },
    edit: async (actionIssues, jira) => {
      // For edits, offer to update JIRA directly
      const updateJira = await confirm({
        message: `🔄 Apply AI edits to these ${actionIssues.length} issues in JIRA?`,
        default: false,
      });

      if (updateJira) {
        await handleUpdateJiraEdit(actionIssues, jira);
      } else {
        console.log(`   💡 Review AI edits in ${DEFAULT_ISSUES_FILE}`);
      }
    },
    'story-points': async (actionIssues, jira) => {
      // For story points, offer to update JIRA directly
      const updateJira = await confirm({
        message: `🔄 Update story points for these ${actionIssues.length} issues in JIRA?`,
        default: false,
      });

      if (updateJira) {
        await handleUpdateJiraStoryPoints(actionIssues, jira);
      } else {
        console.log(`   💡 Review story point estimates in ${DEFAULT_ISSUES_FILE}`);
      }
    },
    workflow: async (actionIssues, jira) => {
      // For workflow, offer to update JIRA directly
      const updateJira = await confirm({
        message: `🔄 Apply workflow transitions for these ${actionIssues.length} issues in JIRA?`,
        default: false,
      });

      if (updateJira) {
        await handleUpdateJiraWorkflow(actionIssues, jira);
      } else {
        console.log(`   💡 Review workflow recommendations in ${DEFAULT_ISSUES_FILE}`);
      }
    },
  };
}

/**
 * Process selected actions with their respective processors
 * @param {Array} selectedActions - Actions selected by user
 * @param {Object} eligibleIssues - Issues grouped by action type
 * @param {Object} jira - JIRA bot instance
 */
export async function processSelectedActions(selectedActions, eligibleIssues, jira) {
  const actionProcessors = createActionProcessors();

  // Process each selected action
  for (const action of selectedActions) {
    const actionIssues = eligibleIssues[action];
    console.log(`\n🔄 Processing ${action} for ${actionIssues.length} issues...`);

    const processor = actionProcessors[action];
    if (processor) {
      await processor(actionIssues, jira);
    } else {
      // For other actions, just show summary
      console.log(`   ✅ ${actionIssues.length} issues ready for ${action} updates`);
      console.log(`   💡 Review detailed changes in ${DEFAULT_ISSUES_FILE}`);
    }
  }

  console.log('\n🎉 Update workflow completed!');
}

/**
 * Display initial workflow status
 * @param {number} issueCount - Number of processed issues
 * @param {string} fileName - File where results are saved
 */
export function displayWorkflowStatus(issueCount, fileName) {
  console.log(`\n📊 Generated ${issueCount} issues with AI enhancements.`);
  console.log(`💾 Results saved to ${fileName}`);
}

/**
 * Handle case when no issues meet the confidence threshold
 * @param {number} threshold - The confidence threshold percentage
 */
export function handleNoEligibleIssues(threshold) {
  console.log(`\n⚠️ No issues meet the ${threshold}% confidence threshold.`);
  console.log('💡 Try lowering the threshold or review issues manually.');
}
