import fs from "fs/promises";
import path from "path";
import { generateReport } from "./llm.js";
import { sendSlackReport } from "./slack.js";
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

export async function runReportGeneration() {
  console.log("\nStarting report generation...");
  const articles = await getAllAnalyzedArticles();

  if (articles.length === 0) {
    console.log("No analyzed articles found to report on.");
    return null;
  }

  console.log(`Found ${articles.length} articles. Generating summary...`);
  const report = await generateReport(articles);

  const reportDir = path.join(process.cwd(), "data/reports");
  await fs.mkdir(reportDir, { recursive: true });
  const today = new Date().toISOString().split("T")[0];
  const reportPath = path.join(reportDir, `report-${today}.md`);
  await fs.writeFile(reportPath, report);

  console.log(`Report successfully generated and saved to ${reportPath}`);
  return reportPath;
}

export async function runSlackSending(reportPath = null) {
  console.log("\nStarting Slack report sending...");

  let reportContent;
  if (reportPath) {
    // Use provided report path
    try {
      reportContent = await fs.readFile(reportPath, "utf-8");
      console.log(`Reading report from: ${reportPath}`);
    } catch (error) {
      console.error(`Failed to read report from ${reportPath}:`, error);
      return;
    }
  } else {
    // Use today's report
    const today = new Date().toISOString().split("T")[0];
    const defaultReportPath = path.join(process.cwd(), "data/reports", `report-${today}.md`);

    try {
      reportContent = await fs.readFile(defaultReportPath, "utf-8");
      console.log(`Reading today's report from: ${defaultReportPath}`);
    } catch (error) {
      console.error(`Failed to read today's report from ${defaultReportPath}:`, error);
      console.error("Please ensure a report has been generated first or provide a specific report path.");
      return;
    }
  }

  await sendSlackReport(reportContent);
  console.log("Report successfully sent to Slack!");
}

export async function runReporting() {
  console.log("\nStarting full reporting pipeline...");
  const reportPath = await runReportGeneration();

  if (reportPath) {
    await runSlackSending(reportPath);
  }
}
