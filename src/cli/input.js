import { select, input } from '@inquirer/prompts';
import { SEARCH_TYPE_CHOICES, validateJqlQuery, validateFilterId } from './prompts.js';

/**
 * Get search input from user
 * @returns {Object} Object containing searchType and query
 */
export async function getSearchInput() {
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
