import { input } from '@inquirer/prompts';
import { processBatches } from '../helpers/batchProcessing.js';
import { prepareIssuesForGemini, cleanGeminiResponse } from '../helpers/dataProcessing.js';
import { saveRawResponse } from '../helpers/fileOperations.js';
import { validateEditInstructions } from '../cli/prompts.js';
import { displayAiResponse } from '../cli/display.js';

/**
 * Handle edit issues action
 * @param {Array} issues - JIRA issues to edit
 * @param {Object} gemini - Gemini bot instance
 * @returns {Array} Processed issues
 */
export async function handleEditIssues(issues, gemini) {
  const editInstructions = await input({
    message: 'Enter instructions for editing the issues:',
    validate: validateEditInstructions
  });

  return await processBatches(issues, async (batch, batchNumber) => {
    const sanitizedBatch = prepareIssuesForGemini(batch);
    const prompt = `Please edit these JIRA issues according to the following instructions: ${editInstructions}

Instructions:
- Return the modified issues in the same JSON format
- Only modify fields that need to be changed according to the instructions
- Preserve the original structure and any unchanged fields

Issues to edit:
${JSON.stringify(sanitizedBatch, null, 2)}`;

    const response = await gemini.generateText(prompt);
    displayAiResponse(response, '📝 AI Response for this batch');
    
    // Save raw response for debugging
    saveRawResponse(response, batchNumber, 'edit');
    
    try {
      // Clean and parse the response as JSON
      const cleanedResponse = cleanGeminiResponse(response);
      const editedIssues = JSON.parse(cleanedResponse);
      return Array.isArray(editedIssues) ? editedIssues : batch;
    } catch (e) {
      console.log('JSON Parse Error:', e.message);
      // If parsing fails, return original batch
      return batch;
    }
  });
}
