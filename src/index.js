import dotenv from "dotenv";
import { select, input } from '@inquirer/prompts';
import { JiraBot } from './jira.js';

dotenv.config();

const jira = new JiraBot();

async function runInteractiveCLI() {
  console.log('🎯 Welcome to JIRA Interactive Search CLI\n');
  
  try {
    // Prompt for search type
    const searchType = await select({
      message: 'What type of search would you like to perform?',
      choices: [
        {
          name: 'JQL (JIRA Query Language)',
          value: 'jql',
          description: 'Use JQL syntax for advanced queries'
        },
        {
          name: 'Filter ID',
          value: 'filter',
          description: 'Search using a saved JIRA filter ID'
        }
      ]
    });

    // Prompt for query input based on search type
    let query;
    if (searchType === 'jql') {
      query = await input({
        message: 'Enter your JQL query:',
        validate: (input) => {
          if (!input.trim()) {
            return 'JQL query cannot be empty';
          }
          return true;
        }
      });
    } else {
      query = await input({
        message: 'Enter the filter ID:',
        validate: (input) => {
          if (!input.trim()) {
            return 'Filter ID cannot be empty';
          }
          if (!/^\d+$/.test(input.trim())) {
            return 'Filter ID must be a number';
          }
          return true;
        }
      });
    }

    console.log('\n🔍 Executing search...');
    
    // Perform the search
    const results = await jira.search(query.trim(), searchType);
    
    // Display results
    if (results && results.issues && results.issues.length > 0) {
      console.log(`\n✅ Found ${results.issues.length} issue(s):\n`);
      
      results.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.key}: ${issue.fields.summary}`);
        console.log(`   Status: ${issue.fields.status.name}`);
        console.log(`   Priority: ${issue.fields.priority ? issue.fields.priority.name : 'None'}`);
        console.log(`   Assignee: ${issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned'}`);
        console.log(`   Created: ${new Date(issue.fields.created).toLocaleDateString()}`);
        console.log('');
      });
      
      console.log(`Total: ${results.total} issues (showing first ${results.issues.length})`);
    } else {
      console.log('\n❌ No issues found or search failed.');
    }
    
  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
  }
}

// Run the interactive CLI
runInteractiveCLI();
