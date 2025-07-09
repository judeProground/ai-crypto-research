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

### All-in-One Command

- **`node cli/index.js full-run`** (or `npm start`)
  - Runs the entire pipeline in sequence.
  - **Default Behavior**: Fetches newsletters for today (KST), processes them, generates a report, and sends it to Slack.
  - **With `--days`**: Processes the last N days.
  - **With `--date`**: Processes a specific past date (skips fetching).
  - **With `--force`**: Re-processes or re-generates existing data.

### Independent Commands

- **Fetch Newsletters**

  - `node cli/index.js fetch --days=<number>`
  - Fetches unread newsletters from the last N days (default: 1).

- **Process Newsletters**

  - `node cli/index.js process --days=<number> | --date=<YYYY-MM-DD>`
  - Analyzes raw newsletters for the specified timeframe. Use `--force` to re-process.

- **Generate Reports**

  - `node cli/index.js generate-report --days=<number> | --date=<YYYY-MM-DD>`
  - Creates daily markdown reports. Use `--force` to re-generate.

- **Send a Report**
  - `node cli/index.js send-report <path/to/report.md>`
  - Sends a specific, pre-generated report file to Slack.

## Examples

```bash
# Run the full pipeline for today
npm start

# Run the full pipeline for the last 3 days, forcing reprocessing
npm start -- --days=3 --force

# Run the full pipeline for a specific past date
npm start -- --date=2025-07-08

# Fetch newsletters from the last 7 days
npm run fetch -- --days=7

# Process newsletters from a specific date
npm run process -- --date=2025-07-08

# Generate a report for today, forcing regeneration if it exists
npm run generate-report -- --force

# Send a specific report to Slack
npm run send-report -- data/reports/report-2025-07-08.md
```

### Notes

- The double dash (`--`) after the script name is required when passing arguments via `npm run`.
- All date-based filtering and folder creation uses **KST (Korean Standard Time)** to ensure consistency.
- The `process` command is now idempotent. It will automatically skip newsletters that have already been analyzed and saved to the `data/processed` directory, preventing redundant API costs. Use `--force` to override this behavior.
