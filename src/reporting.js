import fs from "fs/promises";
import path from "path";
import { generateReport } from "./llm.js";
import { sendSlackReport } from "./slack.js";
import "dotenv/config";

const PROCESSED_DIR = path.join(process.cwd(), "data/processed");

async function getAllAnalyzedArticles({ date, days = 3 } = {}) {
  const allArticles = [];
  const foldersToRead = [];

  try {
    if (date) {
      // If a specific date is provided, use it
      console.log(`Reading processed data for specific date: ${date}`);
      foldersToRead.push(date);
    } else {
      // Otherwise, use the days window
      console.log(`Reading processed data from the last ${days} days.`);
      const allFolders = await fs.readdir(PROCESSED_DIR);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - days);
      targetDate.setHours(0, 0, 0, 0);

      for (const folder of allFolders) {
        const folderDate = new Date(folder);
        if (!isNaN(folderDate.getTime()) && folderDate >= targetDate) {
          foldersToRead.push(folder);
        }
      }
    }

    if (foldersToRead.length === 0) {
      console.log("No relevant date folders found to process.");
      return [];
    }

    console.log(`Found folders to read: ${foldersToRead.join(", ")}`);

    for (const folder of foldersToRead) {
      const folderPath = path.join(PROCESSED_DIR, folder);
      try {
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
      } catch (e) {
        if (e.code === "ENOENT") {
          console.log(`Directory not found for date: ${folder}. Skipping.`);
          continue;
        }
        throw e;
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

export async function runReportGeneration({ date, days = 3 } = {}) {
  console.log(`\nStarting report generation...`);
  const generatedReportPaths = [];

  const datesToProcess = [];
  if (date) {
    // If a specific date is provided, only process that one.
    datesToProcess.push(date);
  } else {
    // Otherwise, build a list of dates for the N-day window.
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      datesToProcess.push(targetDate.toISOString().split("T")[0]);
    }
  }

  console.log(`Attempting to generate reports for: ${datesToProcess.join(", ")}`);

  for (const dateString of datesToProcess) {
    console.log(`\n--- Processing date: ${dateString} ---`);
    const articles = await getAllAnalyzedArticles({ date: dateString });

    if (articles.length === 0) {
      console.log(`No articles found for ${dateString}. Skipping report generation.`);
      continue;
    }

    console.log(`Found ${articles.length} articles. Generating summary for ${dateString}...`);
    const report = await generateReport(articles, dateString);

    const reportDir = path.join(process.cwd(), "data/reports");
    await fs.mkdir(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, `report-${dateString}.md`);
    await fs.writeFile(reportPath, report);

    console.log(`Report for ${dateString} successfully generated and saved to ${reportPath}`);
    generatedReportPaths.push(reportPath);
  }

  return generatedReportPaths;
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
  const reportPaths = await runReportGeneration();

  if (reportPaths.length > 0) {
    for (const reportPath of reportPaths) {
      await runSlackSending(reportPath);
    }
  }
}
