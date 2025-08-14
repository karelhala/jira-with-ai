#!/usr/bin/env node

import dotenv from 'dotenv';
import { select } from '@inquirer/prompts';
import { JiraBot } from './jira.js';
import { GeminiBot } from './gemini.js';
import { ACTION_CHOICES } from './cli/prompts.js';
import {
  displayWelcome,
  displaySearchResults,
  displayCompletion,
  displayError,
} from './cli/display.js';
import { getSearchInput } from './cli/input.js';
import { saveIssues } from './helpers/fileOperations.js';
import { filterIssuesByConfidence } from './helpers/confidenceUtils.js';
import {
  confirmUpdateWorkflow,
  getConfidenceThreshold,
  displayEligibleIssuesSummary,
  selectActionsToProcess,
} from './cli/updateWorkflow.js';
import {
  displayWorkflowStatus,
  handleNoEligibleIssues,
  processSelectedActions,
} from './helpers/updateWorkflowHelpers.js';
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
  // Display initial status
  displayWorkflowStatus(processedIssues.length, DEFAULT_ISSUES_FILE);

  // Ask if user wants to proceed with confidence-based updates
  const shouldUpdate = await confirmUpdateWorkflow();
  if (!shouldUpdate) {
    console.log('\n✅ Workflow completed. Review your results in the static folder.');
    return;
  }

  // Get confidence threshold from user
  const thresholdChoice = await getConfidenceThreshold();

  // Filter issues by confidence threshold
  const eligibleIssues = filterIssuesByConfidence(processedIssues, thresholdChoice);
  const totalEligible = Object.values(eligibleIssues).reduce((sum, arr) => sum + arr.length, 0);

  // Handle case when no issues meet threshold
  if (totalEligible === 0) {
    handleNoEligibleIssues(thresholdChoice);
    return;
  }

  // Display summary of eligible issues
  displayEligibleIssuesSummary(eligibleIssues, thresholdChoice);

  // Let user select which action types to process
  const selectedActions = await selectActionsToProcess(eligibleIssues);
  if (selectedActions.length === 0) {
    console.log('\n✅ No actions selected. Workflow completed.');
    return;
  }

  // Process the selected actions
  await processSelectedActions(selectedActions, eligibleIssues, jira);
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
