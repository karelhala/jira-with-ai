import dotenv from "dotenv";
import { select, input, confirm } from '@inquirer/prompts';
import { writeFileSync } from 'fs';
import { JiraBot } from './jira.js';
import { GeminiBot } from './gemini.js';

dotenv.config();

const jira = new JiraBot();

// Initialize Gemini AI with model - no need to pass model each time
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const gemini = new GeminiBot(GEMINI_API_KEY, 'gemini-2.5-flash');

// Work type options
const WORK_TYPES = [
  { name: 'Associate well being', value: 'associate-wellbeing', description: 'Work associated with engineer\'s well being' },
  { name: 'Future sustainability', value: 'future-sustainability', description: 'Work associated for better future work' },
  { name: 'Incidents and support', value: 'incidents-support', description: 'Work associated for outages and problems' },
  { name: 'Quality / Stability / Reliability', value: 'quality-stability', description: 'Work associated with quality assurance' },
  { name: 'Security and compliance', value: 'security-compliance', description: 'Work associated with making product secure and up to date' },
  { name: 'Product / Portfolio work', value: 'product-portfolio', description: 'Work associated with product itself' }
];

// Helper function to process issues in batches of 100
async function processBatches(issues, processor) {
  const batchSize = 100;
  const results = [];
  
  for (let i = 0; i < issues.length; i += batchSize) {
    const batch = issues.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(issues.length / batchSize);
    
    console.log(`\n🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} issues)...`);
    
    try {
      const batchResult = await processor(batch, batchNumber);
      results.push(...batchResult);
      
      console.log(`✅ Batch ${batchNumber} completed`);
    } catch (error) {
      console.error(`❌ Error processing batch ${batchNumber}:`, error.message);
      // Continue with other batches even if one fails
      results.push(...batch); // Add unchanged issues
    }
  }
  
  return results;
}

// Clean JIRA issues by replacing backticks with single quotes
function sanitizeIssues(issues) {
  const sanitizedIssues = JSON.parse(JSON.stringify(issues)); // Deep clone
  
  function replaceBackticks(obj) {
    if (typeof obj === 'string') {
      return obj.replace(/`/g, "'");
    } else if (Array.isArray(obj)) {
      return obj.map(replaceBackticks);
    } else if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = replaceBackticks(value);
      }
      return result;
    }
    return obj;
  }
  
  return replaceBackticks(sanitizedIssues);
}

// Clean Gemini response by removing markdown code block formatting
function cleanGeminiResponse(response) {
  if (typeof response !== 'string') {
    return response;
  }
  
  // Remove ```json and ``` wrappers
  let cleaned = response.trim();
  
  // Check for various markdown code block patterns
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '');
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  
  return cleaned.trim();
}

// Save issues to JSON file
function saveIssues(issues, filename = 'issues.json') {
  try {
    writeFileSync(filename, JSON.stringify(issues, null, 2));
    console.log(`\n💾 Issues saved to ${filename}`);
  } catch (error) {
    console.error(`❌ Error saving issues: ${error.message}`);
  }
}

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
      
      console.log(`Total: ${results.total} issues (showing all ${results.issues.length})`);

      // Ask what to do with the found issues
      if (GEMINI_API_KEY && results.issues.length > 0) {
        const action = await select({
          message: '\n🤖 What would you like to do with these issues?',
          choices: [
            {
              name: 'Edit Issues',
              value: 'edit',
              description: 'Provide instructions to modify issues using AI'
            },
            {
              name: 'Analysis',
              value: 'analysis',
              description: 'Get AI analysis and insights about the issues'
            },
            {
              name: 'Count Story Points',
              value: 'story-points',
              description: 'Calculate and analyze story points using AI'
            },
            {
              name: 'Transition in Workflow',
              value: 'workflow',
              description: 'Get AI recommendations for workflow transitions'
            },
            {
              name: 'Classify Work Type',
              value: 'work-type',
              description: 'Classify issues by work type categories'
            },
            {
              name: 'Skip',
              value: 'skip',
              description: 'Do nothing and exit'
            }
          ]
        });

        if (action !== 'skip') {
          let processedIssues = [...results.issues];

          switch (action) {
            case 'edit':
              const editInstructions = await input({
                message: 'Enter instructions for editing the issues:',
                validate: (input) => input.trim() ? true : 'Instructions cannot be empty'
              });

              processedIssues = await processBatches(results.issues, async (batch) => {
                const sanitizedBatch = sanitizeIssues(batch);
                const prompt = `Please edit these JIRA issues according to the following instructions: ${editInstructions}

Instructions:
- Return the modified issues in the same JSON format
- Only modify fields that need to be changed according to the instructions
- Preserve the original structure and any unchanged fields

Issues to edit:
${JSON.stringify(sanitizedBatch, null, 2)}`;

                const response = await gemini.generateText(prompt);
                console.log('\n📝 AI Response for this batch:');
                console.log(response.substring(0, 500) + (response.length > 500 ? '...' : ''));
                
                try {
                  // Clean and parse the response as JSON
                  const cleanedResponse = cleanGeminiResponse(response);
                  const editedIssues = JSON.parse(cleanedResponse);
                  return Array.isArray(editedIssues) ? editedIssues : batch;
                } catch {
                  // If parsing fails, return original batch
                  return batch;
                }
              });
              break;

            case 'analysis':
              const sanitizedAnalysisIssues = sanitizeIssues(results.issues.slice(0, 100));
              const analysisPrompt = `Analyze these JIRA issues and provide insights including:
- Overall summary and patterns
- Status distribution
- Priority analysis
- Common themes and recommendations

Issues:
${JSON.stringify(sanitizedAnalysisIssues, null, 2)}`;

              console.log('\n🤖 Analyzing issues...');
              const analysis = await gemini.generateText(analysisPrompt);
              console.log('\n📊 AI Analysis:');
              console.log(analysis);
              break;

            case 'story-points':
              processedIssues = await processBatches(results.issues, async (batch) => {
                const sanitizedBatch = sanitizeIssues(batch);
                const prompt = `Analyze these JIRA issues and estimate story points for each issue. Return the issues with added/updated story point estimates in the customfield_storypoints field.

Consider complexity, effort, and uncertainty when estimating. Use fibonacci sequence (1, 2, 3, 5, 8, 13, 21).

Issues:
${JSON.stringify(sanitizedBatch, null, 2)}`;

                const response = await gemini.generateText(prompt);
                console.log('\n📊 Story Points Analysis for this batch:');
                console.log(response.substring(0, 500) + (response.length > 500 ? '...' : ''));
                
                try {
                  const cleanedResponse = cleanGeminiResponse(response);
                  const updatedIssues = JSON.parse(cleanedResponse);
                  return Array.isArray(updatedIssues) ? updatedIssues : batch;
                } catch {
                  return batch;
                }
              });
              break;

            case 'workflow':
              processedIssues = await processBatches(results.issues, async (batch) => {
                const sanitizedBatch = sanitizeIssues(batch);
                const prompt = `Analyze these JIRA issues and recommend appropriate workflow transitions based on their current status, content, and context. Add recommendations to each issue.

Consider:
- Current status and typical workflow progression
- Issue content and completion indicators
- Dependencies and blockers

Issues:
${JSON.stringify(sanitizedBatch, null, 2)}`;

                const response = await gemini.generateText(prompt);
                console.log('\n🔄 Workflow Recommendations for this batch:');
                console.log(response.substring(0, 500) + (response.length > 500 ? '...' : ''));
                
                try {
                  const cleanedResponse = cleanGeminiResponse(response);
                  const updatedIssues = JSON.parse(cleanedResponse);
                  return Array.isArray(updatedIssues) ? updatedIssues : batch;
                } catch {
                  return batch;
                }
              });
              break;

            case 'work-type':
              processedIssues = await processBatches(results.issues, async (batch) => {
                const sanitizedBatch = sanitizeIssues(batch);
                const workTypesDescription = WORK_TYPES.map(wt => 
                  `- ${wt.name}: ${wt.description}`
                ).join('\n');

                const prompt = `Analyze these JIRA issues and classify each one into the most appropriate work type category based on the issue's summary and priority.

Available work type categories:
${workTypesDescription}

For each issue, analyze the content and assign the most fitting work type. Add a "workType" field with the following structure:
{
  "category": "work-type-value",
  "categoryName": "Work Type Name",
  "confidence": "high/medium/low",
  "reasoning": "Brief explanation of why this category was chosen"
}

Return the issues in the same JSON format with the added workType field.

Issues to classify:
${JSON.stringify(sanitizedBatch, null, 2)}`;

                const response = await gemini.generateText(prompt);
                console.log('\n🏷️ AI Work Type Classification for this batch:');
                console.log(response.substring(0, 500) + (response.length > 500 ? '...' : ''));
                
                try {
                  const cleanedResponse = cleanGeminiResponse(response);
                  console.log('Cleaned response:', cleanedResponse.substring(0, 200) + (cleanedResponse.length > 200 ? '...' : ''));
                  const classifiedIssues = JSON.parse(cleanedResponse);
                  return Array.isArray(classifiedIssues) ? classifiedIssues : batch;
                } catch (e) {
                  console.log(e);
                  return batch;
                }
              });
              break;
          }

          // Save processed issues
          saveIssues(processedIssues);
          console.log(`\n🎉 Processing complete! ${processedIssues.length} issues processed.`);
        }
      }

    } else {
      console.log('\n❌ No issues found or search failed.');
    }
    
  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
  }
}

// Run the interactive CLI
runInteractiveCLI();
