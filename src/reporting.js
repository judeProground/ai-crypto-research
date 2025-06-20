import fs from "fs/promises";
import path from "path";
import { generateReport } from "./llm.js";
import { WebClient } from "@slack/web-api";
import "dotenv/config";

const PROCESSED_DIR = path.join(process.cwd(), "data/processed");

async function getAllAnalyzedArticles() {
  const allArticles = [];
  try {
    const dateFolders = await fs.readdir(PROCESSED_DIR);

    for (const folder of dateFolders) {
      const folderPath = path.join(PROCESSED_DIR, folder);
      const stats = await fs.stat(folderPath);
      if (stats.isDirectory()) {
        const files = await fs.readdir(folderPath);
        for (const file of files) {
          if (path.extname(file) === ".json") {
            const content = await fs.readFile(path.join(folderPath, file), "utf-8");
            allArticles.push(...JSON.parse(content));
          }
        }
      }
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("Processed data directory not found. Skipping report generation.");
      return [];
    }
    throw error;
  }
  return allArticles;
}

async function sendReportToSlack(reportContent, reportPath) {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
    console.log("Slack credentials not found. Skipping sending report to Slack.");
    return;
  }

  const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
  const today = new Date().toISOString().split("T")[0];

  try {
    await slackClient.files.uploadV2({
      channel_id: process.env.SLACK_CHANNEL_ID,
      initial_comment: `Crypto Security Report for ${today}`,
      filename: path.basename(reportPath),
      file: reportPath,
    });
    console.log("Successfully sent report to Slack.");
  } catch (error) {
    console.error("Error sending report to Slack:", error);
  }
}

export async function runReporting() {
  console.log("\nStarting report generation...");
  const articles = await getAllAnalyzedArticles();

  if (articles.length === 0) {
    console.log("No analyzed articles found to report on.");
    return;
  }

  console.log(`Found ${articles.length} articles. Generating summary...`);
  const report = await generateReport(articles);

  const reportDir = path.join(process.cwd(), "data/reports");
  await fs.mkdir(reportDir, { recursive: true });
  const today = new Date().toISOString().split("T")[0];
  const reportPath = path.join(reportDir, `report-${today}.md`);
  await fs.writeFile(reportPath, report);

  console.log(`Report successfully generated and saved to ${reportPath}`);

  await sendReportToSlack(report, reportPath);
}
