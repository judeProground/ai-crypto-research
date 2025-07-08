import { fetchLatestNewsletters } from "./crawler.js";
import { processNewsletter } from "./llm.js";
import fs from "fs/promises";
import path from "path";
import "dotenv/config";

const PROCESSED_DIR = path.join(process.cwd(), "data/processed");

export async function fetchAndSaveNewsletters() {
  console.log("Fetching latest newsletters from today...");
  const newsletters = await fetchLatestNewsletters();

  if (newsletters.length === 0) {
    console.log("No new newsletters found.");
    return;
  }

  console.log(`Found ${newsletters.length} new newsletters to save.`);

  for (const newsletter of newsletters) {
    // Standardize on UTC for folder naming
    const emailDateObj = new Date(newsletter.date);
    const utcDateString = emailDateObj.toISOString().split("T")[0]; // YYYY-MM-DD in UTC

    const outputDir = path.join(process.cwd(), "data/raw", utcDateString);
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${newsletter.id}.json`);
    await fs.writeFile(outputPath, JSON.stringify(newsletter, null, 2));
    console.log(`-> Saved raw newsletter to ${outputPath}`);
  }
  console.log("\nFetching complete. Next, run the processing script to analyze newsletters.");
}

export async function processSavedNewsletters({ days = 3 } = {}) {
  const rawDir = path.join(process.cwd(), "data/raw");
  let totalProcessed = 0;
  try {
    const dateFolders = await fs.readdir(rawDir);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);
    targetDate.setHours(0, 0, 0, 0); // Set to the beginning of the day

    for (const folder of dateFolders) {
      const folderDate = new Date(folder);
      if (isNaN(folderDate.getTime()) || folderDate < targetDate) {
        console.log(`Skipping old or invalid folder: ${folder}`);
        continue;
      }

      const folderPath = path.join(rawDir, folder);
      const stats = await fs.stat(folderPath);
      if (stats.isDirectory()) {
        const files = await fs.readdir(folderPath);
        for (const file of files) {
          if (path.extname(file) === ".json") {
            const newsletter = JSON.parse(await fs.readFile(path.join(folderPath, file), "utf-8"));
            console.log(`\nProcessing email: "${newsletter.subject}"`);
            const analyzedArticles = await processNewsletter(newsletter.body);
            if (analyzedArticles.length > 0) {
              const articlesWithExtras = analyzedArticles.map((article) => ({
                ...article,
                source: newsletter.from,
                emailDate: newsletter.date,
              }));

              // Standardize on UTC for folder naming, using the email's date
              const emailDateObj = new Date(newsletter.date);
              const utcDateString = emailDateObj.toISOString().split("T")[0]; // YYYY-MM-DD in UTC

              const outputDir = path.join(process.cwd(), "data/processed", utcDateString);
              await fs.mkdir(outputDir, { recursive: true });
              const outputPath = path.join(outputDir, `${newsletter.id}.json`);
              await fs.writeFile(outputPath, JSON.stringify(articlesWithExtras, null, 2));
              console.log(`-> Successfully analyzed and saved ${articlesWithExtras.length} articles to ${outputPath}`);
              totalProcessed++;
            } else {
              console.log(`-> No articles found or error during processing for this email.`);
            }
          }
        }
      }
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("Raw data directory not found. Please run the fetch step first.");
      return;
    }
    throw error;
  }
  console.log(`\nProcessing complete. Total newsletters processed: ${totalProcessed}`);
}

export async function runCrawlingAndProcessing() {
  await fetchAndSaveNewsletters();
  await processSavedNewsletters();
}

async function saveAnalyzedArticles(articles) {
  if (articles.length === 0) {
    return;
  }
  // Standardize on UTC for folder naming
  const today = new Date();
  const utcDateString = today.toISOString().split("T")[0]; // YYYY-MM-DD in UTC
  const dailyProcessedDir = path.join(PROCESSED_DIR, utcDateString);

  await fs.mkdir(dailyProcessedDir, { recursive: true });
  const filePath = path.join(dailyProcessedDir, `${generateId()}.json`);

  // ... existing code ...
}
