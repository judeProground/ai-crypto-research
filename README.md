# Newsletter AI Analyzer

This project is a sophisticated pipeline designed to fetch, analyze, and report on blockchain and crypto newsletters. It uses the Anthropic API to analyze content and sends structured, daily reports to a Slack channel.

## Features

- **Automated Newsletter Fetching**: Connects to a Gmail account to fetch the latest unread newsletters from specified senders.
- **AI-Powered Content Analysis**: Leverages Large Language Models to read newsletters, identify distinct articles, and extract structured data (title, summary, category, importance, links, images).
- **Daily Report Generation**: Creates daily markdown reports summarizing the key findings from all newsletters for a given day.
- **Threaded Slack Integration**: Delivers reports to Slack in a clean, user-friendly format. It posts a high-level summary to the main channel and then adds each detailed finding as a reply in a thread, reducing channel noise.
- **Flexible Date Control**: All commands use **Korean Standard Time (KST)** for date calculations. They support `--days=<number>` and `--date=<YYYY-MM-DD>` flags for precise control over the time window.
- **Modular, Independent Commands**: The pipeline is broken down into distinct, independent commands for granular control over each step.

## Setup

### 1. Prerequisites

- Node.js (v18 or higher)
- An active Gmail account
- A Slack workspace with permissions to add apps
- An Anthropic API key

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone <repository_url>
cd newsletter-ai
npm install
```

### 3. Configuration

Create a `.env` file in the root of the project and add the following environment variables:

```
# .env
ANTHROPIC_API_KEY=your_anthropic_api_key
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=your_slack_channel_id
```

### 4. Google Authentication

The first time you run a command that accesses Gmail (`fetch` or `start`), the application will attempt to open a browser window for you to authenticate with Google and grant permission.

A `token.json` file will be created in the project root. This file stores your authentication token. **If you encounter an `invalid_grant` error, delete `token.json` and re-authenticate.**

## Usage

The application is controlled via a modular command-line interface.

### npm Scripts

Use npm scripts with the standard `--` separator to pass arguments:

```bash
# Fetch newsletters for a specific date
npm run fetch -- --date=2025-07-09

# Fetch newsletters for multiple days
npm run fetch -- --days=3

# Process newsletters for a specific date
npm run process -- --date=2025-07-09

# Generate report for a specific date
npm run generate-report -- --date=2025-07-09

# Run the full pipeline for a specific date
npm run start -- --date=2025-07-09
```

### All-in-One Command

- **`npm run start`**
  - Runs the entire pipeline in sequence.
  - **Default Behavior**: Fetches newsletters for today (KST), processes them, generates a report, and sends it to Slack.
  - **With Date**: `npm run start -- --date=2025-07-09` - Skips fetching, processes existing data for the specified date, generates report, and sends to Slack.
  - **With Days**: `npm run start -- --days=3` - Fetches newsletters for the last 3 days, processes them, generates report, and sends to Slack.

### Individual Commands

- **`npm run fetch`**

  - Downloads newsletters from Gmail and saves them to the `data/` directory.
  - Use `-- --date=2025-07-09` to fetch for a specific date.
  - Use `-- --days=3` to fetch for the last 3 days.

- **`npm run process`**

  - Processes saved newsletters and generates summary data.
  - Use `-- --date=2025-07-09` to process for a specific date.
  - Use `-- --days=3` to process for the last 3 days.
  - Use `-- --force` to reprocess existing data.

- **`npm run generate-report`**

  - Generates a markdown report from processed data.
  - Use `-- --date=2025-07-09` to generate for a specific date.
  - Use `-- --days=3` to generate for the last 3 days.

- **`npm run send-report`**
  - Sends a report to Slack.
  - **Usage**: `npm run send-report -- <path/to/report.md>`
  - **Example**: `npm run send-report -- reports/2025-07-09.md`

## Notes

- All date-based filtering and folder creation uses **KST (Korean Standard Time)** to ensure consistency.
- The `process` command is idempotent. It will automatically skip newsletters that have already been analyzed and saved to the `data/processed` directory, preventing redundant API costs. Use `--force` to override this behavior.

### Available Parameters

- `--date=YYYY-MM-DD`: Process/fetch for a specific date
- `--days=N`: Process/fetch for N days (default: 1)
- `--force`: Force regeneration of existing files
