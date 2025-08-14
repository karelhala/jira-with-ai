#!/usr/bin/env node

import dotenv from 'dotenv';
import { select, confirm, checkbox } from '@inquirer/prompts';
import { JiraBot } from './jira.js';
import { GeminiBot } from './gemini.js';
import { ACTION_CHOICES, CONFIDENCE_THRESHOLD_CHOICES } from './cli/prompts.js';
import {
  displayWelcome,
  displaySearchResults,
  displayCompletion,
  displayError,
} from './cli/display.js';
import { getSearchInput } from './cli/input.js';
import { saveIssues } from './helpers/fileOperations.js';
import { filterIssuesByConfidence } from './helpers/confidenceUtils.js';
import { DEFAULT_ISSUES_FILE } from './constants.js';

// Action handlers
import { handleEditIssues } from './actions/editIssues.js';
import { handleAnalyzeIssues } from './actions/analyzeIssues.js';
import { handleStoryPoints } from './actions/storyPoints.js';
import { handleWorkflow } from './actions/workflow.js';
import { handleWorkType } from './actions/workType.js';
import { handleUpdateJiraWorkType } from './actions/updateJiraWorkType.js';
import { handleUpdateJiraEdit } from './actions/updateJiraEdit.js';
import { handleUpdateJiraStoryPoints } from './actions/updateJiraStoryPoints.js';
import { handleUpdateJiraWorkflow } from './actions/updateJiraWorkflow.js';

// Load environment variables
dotenv.config();

// Initialize services
const jira = new JiraBot();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const gemini = new GeminiBot(GEMINI_API_KEY, 'gemini-2.5-flash');

/**
 * Handle post-generation update workflow
 * @param {Array} processedIssues - Issues with AI modifications
 */
async function handleUpdateWorkflow(processedIssues) {
  console.log(`\n📊 Generated ${processedIssues.length} issues with AI enhancements.`);
  console.log(`💾 Results saved to ${DEFAULT_ISSUES_FILE}`);

  const shouldUpdate = await confirm({
    message: '\n🚀 Would you like to selectively update issues based on confidence levels?',
    default: false,
  });

  if (!shouldUpdate) {
    console.log('\n✅ Workflow completed. Review your results in the static folder.');
    return;
  }

  // Get confidence threshold
  const thresholdChoice = await select({
    message: '\n📊 Select minimum confidence threshold for updates:',
    choices: CONFIDENCE_THRESHOLD_CHOICES,
    default: 85,
  });

  // Filter eligible issues
  const eligibleIssues = filterIssuesByConfidence(processedIssues, thresholdChoice);
  const totalEligible = Object.values(eligibleIssues).reduce((sum, arr) => sum + arr.length, 0);

  if (totalEligible === 0) {
    console.log(`\n⚠️ No issues meet the ${thresholdChoice}% confidence threshold.`);
    console.log('💡 Try lowering the threshold or review issues manually.');
    return;
  }

  // Display summary of eligible issues
  console.log(
    `\n📈 Found ${totalEligible} issues meeting ${thresholdChoice}% confidence threshold:`
  );
  Object.entries(eligibleIssues).forEach(([action, issues]) => {
    if (issues.length > 0) {
      console.log(`   • ${action}: ${issues.length} issues`);
    }
  });

  // Allow user to select which action types to process
  const availableActions = Object.entries(eligibleIssues)
    .filter(([_, issues]) => issues.length > 0)
    .map(([action, issues]) => ({
      name: `${action} (${issues.length} issues)`,
      value: action,
      checked: action === 'work-type', // Default to work-type since it can update JIRA
    }));

  if (availableActions.length === 0) {
    console.log('\n⚠️ No actions available for the selected threshold.');
    return;
  }

  const selectedActions = await checkbox({
    message: '\n🎯 Select which types of updates to apply:',
    choices: availableActions,
  });

  if (selectedActions.length === 0) {
    console.log('\n✅ No actions selected. Workflow completed.');
    return;
  }

  // Action processors mapping
  const actionProcessors = {
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

  // Process selected actions
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
 * Process issues with AI based on user selection
 * @param {Array} issues - JIRA issues to process
 * @param {Object} gemini - Gemini bot instance
 */
async function processIssuesWithAI(issues, gemini) {
  const action = await select({
    message: '\n🤖 What would you like to do with these issues?',
    choices: ACTION_CHOICES,
  });

  if (action === 'skip') return;

  // Action handlers mapping
  const actionHandlers = {
    edit: () => handleEditIssues(issues, gemini),
    analysis: async () => {
      await handleAnalyzeIssues(issues, gemini);
      return null; // Special case: analysis doesn't modify issues
    },
    'story-points': () => handleStoryPoints(issues, gemini),
    workflow: () => handleWorkflow(issues, gemini),
    'work-type': () => handleWorkType(issues, gemini),
    'update-jira-work-type': async () => {
      await handleUpdateJiraWorkType(issues, jira);
      return null; // Special case: updates JIRA directly, doesn't return modified issues
    },
    'update-jira-edit': async () => {
      await handleUpdateJiraEdit(issues, jira);
      return null; // Special case: updates JIRA directly, doesn't return modified issues
    },
    'update-jira-story-points': async () => {
      await handleUpdateJiraStoryPoints(issues, jira);
      return null; // Special case: updates JIRA directly, doesn't return modified issues
    },
    'update-jira-workflow': async () => {
      await handleUpdateJiraWorkflow(issues, jira);
      return null; // Special case: updates JIRA directly, doesn't return modified issues
    },
  };

  const processedIssues = await actionHandlers[action]();

  // Early return for actions that don't modify/return issues
  const jiraUpdateActions = [
    'update-jira-work-type',
    'update-jira-edit',
    'update-jira-story-points',
    'update-jira-workflow',
  ];
  if (action === 'analysis' || jiraUpdateActions.includes(action)) return;

  // Save processed issues
  saveIssues(processedIssues);
  displayCompletion(processedIssues.length);

  // Offer update workflow
  await handleUpdateWorkflow(processedIssues);
}

/**
 * Main CLI application
 */
async function runInteractiveCLI() {
  displayWelcome();

  try {
    // Get search type and query from user
    const { searchType, query } = await getSearchInput();

    // Perform JIRA search
    console.log('\n🔍 Executing search...');
    const results = await jira.search(query.trim(), searchType);

    // Display search results
    const hasResults = displaySearchResults(results);
    if (!hasResults) return;

    // Process results with AI if available
    if (GEMINI_API_KEY && results.issues.length > 0) {
      await processIssuesWithAI(results.issues, gemini);
    }
  } catch (error) {
    displayError(error.message);
  }
}

// Run the interactive CLI application
runInteractiveCLI();
