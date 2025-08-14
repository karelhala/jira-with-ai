import { processBatches } from '../helpers/batchProcessing.js';
import { prepareIssuesForGemini, cleanGeminiResponse } from '../helpers/dataProcessing.js';
import { saveRawResponse } from '../helpers/fileOperations.js';
import { displayAiResponse } from '../cli/display.js';
import { WORK_TYPES } from '../constants.js';

/**
 * Handle work type classification action
 * @param {Array} issues - JIRA issues to classify
 * @param {Object} gemini - Gemini bot instance
 * @returns {Array} Issues with work type classifications
 */
export async function handleWorkType(issues, gemini) {
  return await processBatches(issues, async (batch, batchNumber) => {
    const sanitizedBatch = prepareIssuesForGemini(batch);
    const workTypesDescription = WORK_TYPES.map(wt => `- ${wt.name}: ${wt.description}`).join('\n');

    const prompt = `Analyze these JIRA issues and classify each one into the most appropriate work type category based on the issue's summary and priority.

Available work type categories:
${workTypesDescription}

For each issue, analyze the content and assign the most fitting work type. Add a "workType" field with the following structure:
{
  "category": "work-type-value",
  "categoryName": "Work Type Name",
  "confidence": "85%",
  "reasoning": "Brief explanation of why this category was chosen"
}

Note: Use percentage values for confidence (e.g., "95%", "80%", "65%") based on how certain you are about the classification.

Return the issues in the same JSON format with the added workType field.

Issues to classify:
${JSON.stringify(sanitizedBatch, null, 2)}`;

    const response = await gemini.generateText(prompt);
    displayAiResponse(response, '🏷️ AI Work Type Classification for this batch');

    // Save raw response for debugging
    saveRawResponse(response, batchNumber, 'work-type');

    try {
      const cleanedResponse = cleanGeminiResponse(response);
      console.log(
        'Cleaned response:',
        cleanedResponse.substring(0, 200) + (cleanedResponse.length > 200 ? '...' : '')
      );
      const classifiedIssues = JSON.parse(cleanedResponse);
      return Array.isArray(classifiedIssues) ? classifiedIssues : batch;
    } catch (e) {
      console.log('JSON Parse Error:', e.message);
      return batch;
    }
  });
}
