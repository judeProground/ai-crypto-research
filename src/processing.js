import { fetchLatestNewsletters } from "./crawler.js";
import { processNewsletter } from "./llm.js";
import fs from "fs/promises";
import path from "path";
import "dotenv/config";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const PROCESSED_DIR = path.join(process.cwd(), "data/processed");
const TIME_ZONE = "Asia/Seoul";

export async function fetchAndSaveNewsletters({ days = 1, date = null } = {}) {
  if (date) {
    console.log(`Fetching newsletters for the specific date: ${date}...`);
  } else {
    console.log(`Fetching latest newsletters for the last ${days} day(s)...`);
  }

  const newsletters = await fetchLatestNewsletters({ days, date });

  if (newsletters.length === 0) {
    console.log("No new newsletters found.");
    return;
  }

  console.log(`Found ${newsletters.length} new newsletters to save.`);
  for (const newsletter of newsletters) {
    // --- KST Timezone Logic for Folder Naming ---
    const emailDateObj = new Date(newsletter.date);
    const kstDateString = dayjs(emailDateObj).tz(TIME_ZONE).format("YYYY-MM-DD");
    // --- End KST Timezone Logic ---

    const outputDir = path.join(process.cwd(), "data/raw", kstDateString);
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${newsletter.id}.json`);
    await fs.writeFile(outputPath, JSON.stringify(newsletter, null, 2));
    console.log(`-> Saved raw newsletter to ${outputPath}`);
  }

  console.log("\nFetching complete. Next, run the processing script to analyze newsletters.");
}

export async function processSavedNewsletters({ days = 1, date = null, force = false } = {}) {
  const rawDir = path.join(process.cwd(), "data/raw");
  let totalProcessed = 0;
  try {
    let foldersToProcess = await fs.readdir(rawDir);

    if (date) {
      // If a specific date is provided, only process that folder.
      foldersToProcess = foldersToProcess.includes(date) ? [date] : [];
      if (foldersToProcess.length === 0) {
        console.log(`No raw data folder found for the specified date: ${date}`);
      }
    } else {
      // Otherwise, filter by the number of days.
      const nowInKST = dayjs().tz(TIME_ZONE);
      const targetDateKST = nowInKST.subtract(days - 1, "day").startOf("day");

      foldersToProcess = foldersToProcess.filter((folder) => {
        const folderDate = dayjs(folder, "YYYY-MM-DD");
        if (!folderDate.isValid() || folderDate.isBefore(targetDateKST)) {
          console.log(`Skipping old or invalid folder: ${folder}`);
          return false;
        }
        return true;
      });
    }

    for (const folder of foldersToProcess) {
      const folderPath = path.join(rawDir, folder);
      const files = await fs.readdir(folderPath);

      for (const file of files) {
        if (path.extname(file) !== ".json") continue;

        const rawFilePath = path.join(folderPath, file);
        const processedFilePath = path.join(PROCESSED_DIR, folder, path.basename(file));

        // --- Cost-Saving Check ---
        if (!force) {
          try {
            await fs.access(processedFilePath);
            console.log(`Skipping already processed file: ${path.basename(file)}`);
            continue;
          } catch (error) {
            // File doesn't exist, so we process it.
          }
        }
        // --- End Cost-Saving Check ---

        const content = await fs.readFile(rawFilePath, "utf-8");
        const newsletter = JSON.parse(content);

        console.log(`\nProcessing email: "${newsletter.subject}"`);
        const analyzedArticles = await processNewsletter(newsletter.body);

        if (analyzedArticles.length > 0) {
          const articlesWithExtras = analyzedArticles.map((article) => ({
            ...article,
            source: newsletter.from,
            emailDate: newsletter.date,
          }));

          const outputDir = path.join(PROCESSED_DIR, folder);
          await fs.mkdir(outputDir, { recursive: true });
          await fs.writeFile(processedFilePath, JSON.stringify(articlesWithExtras, null, 2));
          console.log(
            `-> Successfully analyzed and saved ${articlesWithExtras.length} articles to ${processedFilePath}`
          );
          totalProcessed++;
        } else {
          console.log(`-> No articles found or error during processing for this email.`);
        }
      }
    }
  } catch (error) {
    console.error("Error processing newsletters:", error);
  }
  console.log(`\nProcessing complete. Total newsletters processed: ${totalProcessed}`);
}
