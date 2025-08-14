#!/usr/bin/env node

import dotenv from 'dotenv';
import { select, input } from '@inquirer/prompts';
import { JiraBot } from './jira.js';
import { GeminiBot } from './gemini.js';
import {
  SEARCH_TYPE_CHOICES,
  ACTION_CHOICES,
  validateJqlQuery,
  validateFilterId,
} from './cli/prompts.js';
import {
  displayWelcome,
  displaySearchResults,
  displayCompletion,
  displayError,
} from './cli/display.js';
import { saveIssues } from './helpers/fileOperations.js';

// Action handlers
import { handleEditIssues } from './actions/editIssues.js';
import { handleAnalyzeIssues } from './actions/analyzeIssues.js';
import { handleStoryPoints } from './actions/storyPoints.js';
import { handleWorkflow } from './actions/workflow.js';
import { handleWorkType } from './actions/workType.js';
import { handleUpdateJiraWorkType } from './actions/updateJiraWorkType.js';

// Load environment variables
dotenv.config();

// Initialize services
const jira = new JiraBot();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const gemini = new GeminiBot(GEMINI_API_KEY, 'gemini-2.5-flash');

/**
 * Get search input from user
 * @returns {Object} Object containing searchType and query
 */
async function getSearchInput() {
  // Prompt for search type
  const searchType = await select({
    message: 'What type of search would you like to perform?',
    choices: SEARCH_TYPE_CHOICES,
  });

  // Prompt for query input based on search type
  let query;
  if (searchType === 'jql') {
    query = await input({
      message: 'Enter your JQL query:',
      validate: validateJqlQuery,
    });
  } else {
    query = await input({
      message: 'Enter the filter ID:',
      validate: validateFilterId,
    });
  }

  return { searchType, query };
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
  };

  const processedIssues = await actionHandlers[action]();

  // Early return for actions that don't modify/return issues
  if (action === 'analysis' || action === 'update-jira-work-type') return;

  // Save processed issues
  saveIssues(processedIssues);
  displayCompletion(processedIssues.length);
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
