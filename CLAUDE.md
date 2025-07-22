# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Newsletter AI is a sophisticated pipeline that fetches blockchain/crypto newsletters from Gmail, analyzes them using Anthropic's Claude API, and generates structured daily reports delivered via Slack. The system operates in Korean Standard Time (KST) and uses a modular command structure.

## Common Development Commands

### Core Pipeline Commands
```bash
# Full pipeline (fetch → process → report → send to Slack)
npm run start

# Individual components
npm run fetch          # Fetch newsletters from Gmail
npm run process        # Process newsletters with AI analysis
npm run generate-report # Generate markdown reports
npm run send-report    # Send specific report to Slack

# With date/time options (all commands support these)
npm run start -- --date=2025-07-09        # Process specific date
npm run start -- --days=3                 # Process last 3 days
npm run process -- --force                # Force reprocessing existing data
```

### Direct CLI Usage
```bash
# Alternative CLI access
node cli/index.js full-run --date=2025-07-09
node cli/index.js fetch --days=3
node cli/index.js process --force
node cli/index.js generate-report --date=2025-07-09
node cli/index.js send-report data/reports/report-2025-07-09.md
```

## Architecture & Data Flow

### Pipeline Architecture
1. **Fetch** (`src/crawler.js`) → Gmail API → Raw newsletters in `data/raw/YYYY-MM-DD/`
2. **Process** (`src/processing.js` + `src/llm.js`) → AI analysis → Structured data in `data/processed/YYYY-MM-DD/`
3. **Report** (`src/reporting.js`) → Aggregated insights → Markdown reports in `data/reports/`
4. **Deliver** (`src/slack.js`) → Threaded Slack messages

### Core Modules
- **`src/processing.js`**: Main orchestrator for fetch/process workflows
- **`src/crawler.js`**: Gmail API integration for newsletter fetching
- **`src/llm.js`**: Anthropic Claude integration for AI analysis and report generation
- **`src/reporting.js`**: Report generation and Slack delivery orchestration
- **`src/slack.js`**: Slack Web API with threaded message handling
- **`src/auth.js`**: Google OAuth2 authentication helpers
- **`src/schema.js`**: Data validation schemas for processed articles

### Data Structure
- **Raw newsletters**: `data/raw/YYYY-MM-DD/[email-id].json` (original email content)
- **Processed articles**: `data/processed/YYYY-MM-DD/[email-id].json` (AI-analyzed structured data)
- **Generated reports**: `data/reports/report-YYYY-MM-DD.md` (daily summaries)

### Article Schema
```javascript
{
  source: "",          // Email sender (e.g., "10x Research <hi@update.10xresearch.com>")
  title: "",           // Article title
  summary: "",         // AI-generated 2-3 line summary
  categories: [],      // ['defi', 'funding', 'security', 'regulation', etc.]
  importance: "",      // 'fatal', 'high', 'medium', 'low'
  primary_link: "",    // Main article URL
  additional_links: [], // Array of related/supporting URLs
  images: [],          // Array of embedded image URLs
  emailDate: ""        // Original email date (e.g., "Tue, 22 Jul 2025 02:00:47 +0000 (UTC)")
}
```

## Development Patterns

### Error Handling Philosophy
- **Graceful degradation**: Single newsletter failures don't crash entire pipeline
- **Continue processing**: Log errors and process remaining items
- **Detailed logging**: Include context (newsletter ID, date, operation) in error messages

### Time Zone Handling
- **All operations use KST (Asia/Seoul)** for consistency
- Date folders and filtering based on KST timestamps
- Use `dayjs.tz(TIME_ZONE)` for date calculations

### Idempotent Processing
- **Processing is idempotent**: Already processed newsletters are skipped automatically
- Use `--force` flag to override and reprocess existing data
- Check for existing output files before API calls to minimize costs

### AI Integration Best Practices
- **Structured prompts**: Use consistent formatting for article analysis
- **Schema validation**: Validate AI responses against expected structure
- **Rate limiting**: Process newsletters sequentially to avoid API limits
- **Cost optimization**: Skip processing if output already exists

## Environment Setup

### Required Environment Variables
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=your_slack_channel_id
```

### Google Authentication
- First run triggers OAuth2 flow in browser
- Creates `token.json` for subsequent runs
- Delete `token.json` if encountering `invalid_grant` errors

## Key Implementation Details

### Newsletter Processing Logic
- Emails fetched based on KST date ranges from Gmail API
- Content extracted from multipart MIME structures
- AI analysis segments newsletters into individual articles with enhanced metadata
- Articles categorized by importance (fatal/high/medium/low) and topic categories
- URLs and images extracted and preserved for reference
- Source email metadata preserved for traceability

### Slack Integration Features
- **Threaded delivery**: Main channel gets summary, details in thread replies
- **Chunked messages**: Large reports split to respect Slack's 3000-character limit
- **Emoji-based categorization**: 🚨 fatal, 🔥 high, ⚠️ medium, 📄 low importance

### Report Generation
- Aggregates all processed articles for date range into market intelligence format
- Generates AI-powered executive summary with strategic insights
- Structures findings by category and importance level
- Creates comprehensive markdown reports with:
  - Market overview with total articles and risk assessment
  - Category-based article grouping
  - Priority alerts for high/fatal importance items
  - Key findings with linked article summaries
  - Strategic insights section with actionable intelligence

## Testing & Development

### Manual Testing Workflow
```bash
# Test with specific date to avoid processing today's data
npm run fetch -- --date=2025-07-09
npm run process -- --date=2025-07-09 --force
npm run generate-report -- --date=2025-07-09
```

### Data Validation
- Check `data/raw/` for successful fetching
- Verify `data/processed/` contains structured articles
- Validate report generation in `data/reports/`
- Test Slack delivery with actual report files