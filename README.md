# 🎯 JIRA with Gemini AI

An interactive CLI tool for JIRA issue management powered by Google's Gemini AI.

## ✨ Features

- **🔍 Smart Search**: Query JIRA using JQL or filter IDs
- **🤖 AI-Powered Processing**: 
  - Edit issues with natural language instructions
  - Analyze issues for insights and patterns
  - Estimate story points automatically
  - Get workflow transition recommendations
  - Classify work types intelligently
- **⚡ Batch Processing**: Handle large datasets efficiently (100 issues per batch)
- **💾 Export Results**: Save processed issues to JSON files
- **🛠️ Debug-Friendly**: Raw AI responses saved for inspection

## 🚀 Installation

```bash
# Run directly with npx (recommended)
npx jira-gemini

# Or install globally
npm install -g @khala/jira-ai
jira-gemini
```

## ⚙️ Setup

1. **Environment Variables**: Create a `.env` file with:
   ```env
   # JIRA Configuration
   JIRA_TOKEN=your-jira-token
   JIRA_STAGE_TOKEN=your-stage-token  # Optional for staging
   IS_PROD=true  # false for staging environment
   PROXY_URL=your-proxy-url  # Optional for staging

   # Gemini AI Configuration
   GEMINI_API_KEY=your-gemini-api-key
   ```

2. **JIRA Token**: Get your token from JIRA settings → Personal Access Tokens
3. **Gemini API Key**: Get your key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🎮 Usage

Run the interactive CLI:
```bash
npx jira-gemini
```

### Search Options
- **JQL Query**: Use JIRA Query Language for advanced searches
- **Filter ID**: Use saved JIRA filter by ID

### AI Actions
- **Edit Issues**: Provide natural language instructions to modify issues
- **Analysis**: Get insights about issue patterns, priorities, and trends
- **Story Points**: Automatically estimate story points using AI
- **Workflow**: Get recommendations for issue transitions
- **Work Type Classification**: Categorize issues by work type with confidence percentages

## 📊 Work Type Categories

- **Associate well being**: Engineer's well being
- **Future sustainability**: Better future work
- **Incidents and support**: Outages and problems
- **Quality / Stability / Reliability**: Quality assurance
- **Security and compliance**: Product security
- **Product / Portfolio work**: Product itself

## 🔧 Development

```bash
# Clone and install
git clone https://github.com/karelhala/jira-with-ai.git
cd jira-with-ai
npm install

# Run locally
npm start

# Lint code
npm run lint
npm run lint:fix
```

## 📝 Output

- **Console**: Real-time progress and results
- **issues.json**: Processed issues with AI enhancements
- **raw_*_*.txt**: Debug files with raw AI responses

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` to ensure code quality
5. Submit a pull request

## 📄 License

Apache-2.0 - see [LICENSE](LICENSE) file for details.

## 🏷️ Keywords

`jira` `ai` `gemini` `cli` `automation` `issue-management` `google-ai` `workflow`
