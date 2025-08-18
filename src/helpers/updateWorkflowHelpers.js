import { confirm } from '@inquirer/prompts';
import { handleUpdateJiraWorkType } from '../actions/updateJiraWorkType.js';
import { handleUpdateJiraEdit } from '../actions/updateJiraEdit.js';
import { handleUpdateJiraStoryPoints } from '../actions/updateJiraStoryPoints.js';
import { handleUpdateJiraWorkflow } from '../actions/updateJiraWorkflow.js';
import { simulateJiraUpdates, saveDryRunResults } from './dryRunUtils.js';
import { generateBashScript } from './bashScriptGenerator.js';
import { DEFAULT_ISSUES_FILE } from '../constants.js';

/**
 * Create action processors mapping for different update types
 * @param {boolean} dryRun - Whether to run in dry run mode
 * @returns {Object} Action processors mapping
 */
export function createActionProcessors(dryRun = false) {
  return {
    'work-type': async (actionIssues, jira) => {
      // For work-type, offer to update JIRA directly
      const updateJira = await confirm({
        message: `🔄 ${dryRun ? '[DRY RUN] Simulate updating' : 'Update'} JIRA work type field for these ${actionIssues.length} issues?`,
        default: true,
      });

      if (updateJira) {
        // Always generate bash script for manual execution
        const scriptPath = generateBashScript(actionIssues, 'work-type', dryRun);
        console.log(`📝 Manual bash script generated: ${scriptPath}`);

        if (dryRun) {
          simulateJiraUpdates(actionIssues, 'work-type');
          saveDryRunResults(actionIssues, 'work-type');
        } else {
          await handleUpdateJiraWorkType(actionIssues, jira);
        }
      }
    },
    edit: async (actionIssues, jira) => {
      // For edits, offer to update JIRA directly
      const updateJira = await confirm({
        message: `🔄 ${dryRun ? '[DRY RUN] Simulate applying' : 'Apply'} AI edits to these ${actionIssues.length} issues in JIRA?`,
        default: false,
      });

      if (updateJira) {
        // Always generate bash script for manual execution
        const scriptPath = generateBashScript(actionIssues, 'edit', dryRun);
        console.log(`📝 Manual bash script generated: ${scriptPath}`);

        if (dryRun) {
          simulateJiraUpdates(actionIssues, 'edit');
          saveDryRunResults(actionIssues, 'edit');
        } else {
          await handleUpdateJiraEdit(actionIssues, jira);
        }
      } else {
        console.log(`   💡 Review AI edits in ${DEFAULT_ISSUES_FILE}`);
      }
    },
    'story-points': async (actionIssues, jira) => {
      // For story points, offer to update JIRA directly
      const updateJira = await confirm({
        message: `🔄 ${dryRun ? '[DRY RUN] Simulate updating' : 'Update'} story points for these ${actionIssues.length} issues in JIRA?`,
        default: false,
      });

      if (updateJira) {
        // Always generate bash script for manual execution
        const scriptPath = generateBashScript(actionIssues, 'story-points', dryRun);
        console.log(`📝 Manual bash script generated: ${scriptPath}`);

        if (dryRun) {
          simulateJiraUpdates(actionIssues, 'story-points');
          saveDryRunResults(actionIssues, 'story-points');
        } else {
          await handleUpdateJiraStoryPoints(actionIssues, jira);
        }
      } else {
        console.log(`   💡 Review story point estimates in ${DEFAULT_ISSUES_FILE}`);
      }
    },
    workflow: async (actionIssues, jira) => {
      // For workflow, offer to update JIRA directly
      const updateJira = await confirm({
        message: `🔄 ${dryRun ? '[DRY RUN] Simulate applying' : 'Apply'} workflow transitions for these ${actionIssues.length} issues in JIRA?`,
        default: false,
      });

      if (updateJira) {
        // Always generate bash script for manual execution
        const scriptPath = generateBashScript(actionIssues, 'workflow', dryRun);
        console.log(`📝 Manual bash script generated: ${scriptPath}`);

        if (dryRun) {
          simulateJiraUpdates(actionIssues, 'workflow');
          saveDryRunResults(actionIssues, 'workflow');
        } else {
          await handleUpdateJiraWorkflow(actionIssues, jira);
        }
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
 * @param {boolean} dryRun - Whether to run in dry run mode
 */
export async function processSelectedActions(
  selectedActions,
  eligibleIssues,
  jira,
  dryRun = false
) {
  const actionProcessors = createActionProcessors(dryRun);

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

  console.log(`\n🎉 ${dryRun ? '[DRY RUN] ' : ''}Update workflow completed!`);

  // Announce bash script availability
  console.log('\n📝 Manual execution scripts have been generated!');
  console.log('🗂️  Find your bash scripts in the static/ directory:');
  console.log('   • Each action type has its own timestamped script');
  console.log('   • Scripts include complete JIRA API calls with curl');
  console.log('   • Review and execute manually for full control');
  console.log('\n💡 Usage:');
  console.log('   chmod +x static/jira-update-*.sh');
  console.log('   ./static/jira-update-work-type-*.sh');
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
