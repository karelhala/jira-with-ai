import { GoogleGenAI } from '@google/genai';

export class GeminiBot {
  constructor(apiKey, modelName = 'gemini-2.0-flash-exp') {
    this.ai = new GoogleGenAI(apiKey);
    this.model = modelName;
  }

  async generateText(prompt) {
    try {
      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return result.text;
    } catch (error) {
      console.error('Error generating text:', error);
      throw error;
    }
  }

  async analyzeJiraIssues(issues, analysisPrompt) {
    const issuesText = issues
      .map(issue => `${issue.key}: ${issue.fields.summary} (Status: ${issue.fields.status.name})`)
      .join('\n');

    const fullPrompt = `${analysisPrompt}\n\nJIRA Issues:\n${issuesText}`;

    return await this.generateText(fullPrompt);
  }
}
