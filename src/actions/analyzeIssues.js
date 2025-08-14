import { prepareIssuesForGemini } from '../helpers/dataProcessing.js';
import { saveRawResponse } from '../helpers/fileOperations.js';
import { displayAiResponse } from '../cli/display.js';

/**
 * Handle analyze issues action
 * @param {Array} issues - JIRA issues to analyze
 * @param {Object} gemini - Gemini bot instance
 */
export async function handleAnalyzeIssues(issues, gemini) {
  const sanitizedAnalysisIssues = prepareIssuesForGemini(issues.slice(0, 100));
  const analysisPrompt = `Analyze these JIRA issues and provide comprehensive insights with confidence ratings.

Provide analysis in the following structured format:
{
  "summary": {
    "totalIssues": 25,
    "confidence": "95%",
    "overview": "Brief overview of the issues"
  },
  "priorityAnalysis": {
    "distribution": {"High": 10, "Medium": 15},
    "confidence": "90%",
    "insights": "Analysis of priority patterns"
  },
  "issueTypeDistribution": {
    "types": {"Bug": 12, "Story": 13},
    "confidence": "85%",
    "patterns": "Observed patterns in issue types"
  },
  "commonThemes": {
    "themes": ["theme1", "theme2"],
    "confidence": "80%",
    "analysis": "Common patterns and themes found"
  },
  "recommendations": {
    "actionItems": ["recommendation1", "recommendation2"],
    "confidence": "85%",
    "reasoning": "Why these recommendations are suggested"
  },
  "overallConfidence": "87%"
}

Note: Use percentage values for confidence based on data clarity and analysis certainty.

Issues:
${JSON.stringify(sanitizedAnalysisIssues, null, 2)}`;

  console.log('\n🤖 Analyzing issues...');
  const analysis = await gemini.generateText(analysisPrompt);

  // Save raw response for debugging
  saveRawResponse(analysis, 1, 'analysis');

  // Display the analysis
  displayAiResponse(analysis, '📊 AI Analysis');
}
