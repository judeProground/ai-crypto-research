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

The application is controlled via a modular command-line interface. You can run these commands using `npm run <script_name>` or `node cli/index.js <command>`.

### All-in-One Command

- **`npm start`**
  - Runs the entire pipeline in sequence.
  - By default (with no flags), it fetches newsletters for today (KST), processes them, generates a report, and sends it to Slack.
  - Use `--days=<number>` to process the last number of days.
  - Use `--date=<YYYY-MM-DD>` to process and report on a specific past date (fetching is skipped).
  - Alias for `node cli/index.js full-run`.

### Independent Commands

These commands allow you to run each step of the pipeline separately.

- **Fetch Newsletters**

  - `npm run fetch -- --days=<number>`
  - Fetches unread newsletters from the last `<number>` of days (default is 1). `--days=1` fetches from today (KST).
  - _Example_: `npm run fetch -- --days=7`

- **Process Newsletters**

  - `npm run process -- --days=<number>`
  - Analyzes raw newsletters that have been fetched within the last `<number>` of days (default is 1). Saves the structured data to `data/processed/`.
  - _Example_: `npm run process`
  - _Note_: Add `--force` to re-process newsletters that already exist in the `data/processed` directory.

- **Generate Reports**

  - `npm run generate-report -- --days=<number>`
  - `npm run generate-report -- --date=<YYYY-MM-DD>`
  - Generates daily markdown reports for the specified time window (default is the last 1 day) and saves them to `data/reports/`. Does not send to Slack.
  - _Example_: `npm run generate-report -- --days=2`
  - _Example_: `npm run generate-report -- --date=2025-07-07`
  - _Note_: Add `--force` to re-generate a report that already exists.

- **Send a Report**
  - `npm run send-report -- <path/to/report.md>`
  - Sends a specific, already-generated report file to Slack.
  - _Example_: `npm run send-report -- data/reports/report-2025-07-07.md`

### Notes

- The double dash (`--`) after the script name is required when passing arguments via `npm run`.
- All date-based filtering and folder creation uses **KST (Korean Standard Time)** to ensure consistency.
- The `process` command is now idempotent. It will automatically skip newsletters that have already been analyzed and saved to the `data/processed` directory, preventing redundant API costs. Use `--force` to override this behavior.
