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
- **📝 Manual Execution**: Auto-generate bash scripts for manual JIRA updates

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

### 🔍 Dry Run Mode

Test the application without making actual changes to JIRA:
```bash
npx jira-gemini --dry-run
# or
npx jira-gemini -d
```

In dry run mode:
- **No JIRA updates**: All JIRA operations are simulated
- **Clear indication**: All prompts and messages show `[DRY RUN]` prefix
- **Full workflow**: Complete AI processing and confidence-based selection
- **Simulated results**: Issues saved to `static/success.json` as if updates succeeded
- **Safe testing**: Perfect for validating AI suggestions before applying changes

### Search Options
- **JQL Query**: Use JIRA Query Language for advanced searches
- **Filter ID**: Use saved JIRA filter by ID

### AI Actions
- **Edit Issues**: Provide natural language instructions to modify issues
- **Analysis**: Get insights about issue patterns, priorities, and trends
- **Story Points**: Automatically estimate story points using AI
- **Workflow**: Get recommendations for issue transitions
- **Work Type Classification**: Categorize issues by work type with confidence percentages

### 🎯 Confidence-Based JIRA Updates

After AI processing, the application offers a smart update workflow where you can selectively apply changes to JIRA:

1. **📊 Review Results**: All AI enhancements saved to `static/issues.json`
2. **🎚️ Set Confidence Threshold**: Choose minimum confidence level (default: 85%)
3. **🔍 Filter Eligible Issues**: Only issues meeting the threshold are shown
4. **☑️ Select Update Types**: Choose which AI-generated changes to apply:
   - **Work Type Classifications** → Update JIRA custom fields
   - **AI Edits** → Apply summary/description changes
   - **Story Points** → Update story points field
   - **Workflow Transitions** → Apply state changes
5. **📝 Select Specific Tickets**: Choose individual tickets to update for each action type
6. **🚀 Apply to JIRA**: Selectively update JIRA with high-confidence AI suggestions
7. **📜 Bash Scripts Generated**: Receive executable scripts for manual review and execution

**Confidence Levels:**
- **95%**: Very High Confidence (Most Restrictive)
- **85%**: High Confidence (Default)
- **75%**: Medium-High Confidence  
- **65%**: Medium Confidence
- **50%**: Any Confidence (Least Restrictive)

## 📝 Manual Execution Scripts

For every JIRA update operation, the application automatically generates executable bash scripts that allow you to review and manually execute the exact API calls:

### 🎯 **What's Generated**
- **Timestamped Scripts**: `static/jira-update-{action}-{timestamp}.sh`
- **Complete API Calls**: Ready-to-run curl commands with proper authentication
- **Environment Setup**: Automatic JIRA URL and token configuration  
- **Error Handling**: Success/failure tracking and reporting
- **Prerequisites Guide**: Installation and setup instructions included

### 🚀 **Usage**
```bash
# Make executable
chmod +x static/jira-update-*.sh

# Execute specific action script
./static/jira-update-work-type-2025-01-15T10-30-45.sh

# Review before execution
cat static/jira-update-story-points-2025-01-15T10-31-20.sh
```

### ✅ **Benefits**
- **Review Control**: Inspect exact API calls before execution
- **Manual Timing**: Execute updates when convenient
- **Audit Trail**: Keep scripts as records of changes
- **Debugging**: Easy to modify and re-run specific updates
- **Offline Capability**: Execute later without the CLI tool

### 🔧 **Prerequisites for Script Execution**
```bash
# Install jq for JSON processing
sudo apt-get install jq  # Ubuntu/Debian
brew install jq          # macOS

# Set environment variables
export JIRA_TOKEN="your-jira-token"
export IS_PROD="true"  # or "false" for staging
```

Scripts are generated in **both regular and dry run modes**, giving you maximum flexibility and control.

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

# Lint and format code
npm run lint      # Check for issues
npm run lint:fix  # Fix linting and formatting issues
```

## 📝 Output

- **Console**: Real-time progress and results
- **static/issues.json**: Processed issues with AI enhancements
- **static/success_issues.json**: Successfully updated issues (moved from issues.json after JIRA updates)
- **static/success.json**: Dry run results with simulated successful updates (dry run mode only)
- **static/raw_*_*.txt**: Debug files with raw AI responses
- **static/jira-update-*-{timestamp}.sh**: Executable bash scripts for manual JIRA updates

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
