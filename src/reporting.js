import fs from "fs/promises";
import path from "path";
import { sendSlackReport } from "./slack.js";
import { generateReport } from "./llm.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const PROCESSED_DIR = path.join(process.cwd(), "data/processed");
const REPORTS_DIR = path.join(process.cwd(), "data/reports");
const TIME_ZONE = "Asia/Seoul";

async function getArticlesForDate(dateString) {
  const folderPath = path.join(PROCESSED_DIR, dateString);
  const articles = [];
  try {
    const stats = await fs.stat(folderPath);
    if (stats.isDirectory()) {
      const files = await fs.readdir(folderPath);
      for (const file of files) {
        if (path.extname(file) === ".json") {
          const content = await fs.readFile(path.join(folderPath, file), "utf-8");
          articles.push(...JSON.parse(content));
        }
      }
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`No processed data found for ${dateString}.`);
    } else {
      console.error(`Error reading articles for ${dateString}:`, error);
    }
  }
  return articles;
}

export async function generateReportForDate(dateString, { force = false } = {}) {
  const articles = await getArticlesForDate(dateString);
  if (articles.length === 0) {
    console.log(`No processed articles found for ${dateString}. Skipping report generation.`);
    return null;
  }

  const reportPath = path.join(REPORTS_DIR, `report-${dateString}.md`);

  // --- Regeneration Check ---
  if (!force) {
    try {
      await fs.access(reportPath);
      console.log(`Report for ${dateString} already exists. Use --force to regenerate.`);
      return reportPath; // Return existing path
    } catch (error) {
      // File doesn't exist, proceed with generation.
    }
  }
  // --- End Regeneration Check ---

  console.log(`Found ${articles.length} articles for ${dateString}. Generating report...`);
  const reportContent = await generateReport(articles, dateString);

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(reportPath, reportContent);

  console.log(`Report for ${dateString} saved to ${reportPath}`);
  return reportPath;
}

export async function runReportGeneration({ date = null, days = 1, force = false } = {}) {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const generatedReportPaths = [];

  if (date) {
    console.log(`Generating report for specified date: ${date}`);
    const reportPath = await generateReportForDate(date, { force });
    if (reportPath) {
      generatedReportPaths.push(reportPath);
    }
  } else {
    console.log(`Generating reports for the last ${days} day(s) based on KST.`);
    const nowInKST = dayjs().tz(TIME_ZONE);
    for (let i = 0; i < days; i++) {
      const dateToGenerate = nowInKST.subtract(i, "day").format("YYYY-MM-DD");
      console.log(` -> Checking for data for ${dateToGenerate}...`);
      const reportPath = await generateReportForDate(dateToGenerate, { force });
      if (reportPath) {
        generatedReportPaths.push(reportPath);
      }
    }
  }

  if (generatedReportPaths.length > 0) {
    console.log("\nGenerated reports:");
    generatedReportPaths.forEach((p) => console.log(`- ${p}`));
  } else {
    console.log("No new reports were generated.");
  }

  return generatedReportPaths;
}

export async function runSlackSending(reportPath) {
  if (!reportPath) {
    console.error("No report path provided to send.");
    return;
  }
  try {
    const reportContent = await fs.readFile(reportPath, "utf-8");
    await sendSlackReport(reportContent);
    console.log(`Report from ${reportPath} sent to Slack successfully.`);
  } catch (error) {
    console.error(`Failed to read or send report from ${reportPath}:`, error);
  }
}
