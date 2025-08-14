import { processBatches } from '../helpers/batchProcessing.js';
import { prepareIssuesForGemini, cleanGeminiResponse } from '../helpers/dataProcessing.js';
import { saveRawResponse } from '../helpers/fileOperations.js';
import { displayAiResponse } from '../cli/display.js';

/**
 * Handle story points estimation action
 * @param {Array} issues - JIRA issues to estimate
 * @param {Object} gemini - Gemini bot instance
 * @returns {Array} Issues with story point estimates
 */
export async function handleStoryPoints(issues, gemini) {
  return await processBatches(issues, async (batch, batchNumber) => {
    const sanitizedBatch = prepareIssuesForGemini(batch);
    const prompt = `Analyze these JIRA issues and estimate story points for each issue. Return the issues with added/updated story point estimates.

Instructions:
- Add story point estimates using fibonacci sequence (1, 2, 3, 5, 8, 13, 21)
- Consider complexity, effort, and uncertainty when estimating
- For each issue, add a "storyPointEstimate" field with the following structure:
  {
    "points": 5,
    "confidence": "80%",
    "reasoning": "Brief explanation of the complexity factors considered",
    "factors": ["complexity", "effort", "uncertainty"]
  }

Note: Use percentage values for confidence (e.g., "95%", "80%", "65%") based on how certain you are about the story point estimate.

Issues:
${JSON.stringify(sanitizedBatch, null, 2)}`;

    const response = await gemini.generateText(prompt);
    displayAiResponse(response, '📊 Story Points Analysis for this batch');

    // Save raw response for debugging
    saveRawResponse(response, batchNumber, 'story-points');

    try {
      const cleanedResponse = cleanGeminiResponse(response);
      const updatedIssues = JSON.parse(cleanedResponse);
      return Array.isArray(updatedIssues) ? updatedIssues : batch;
    } catch (e) {
      console.log('JSON Parse Error:', e.message);
      return batch;
    }
  });
}
