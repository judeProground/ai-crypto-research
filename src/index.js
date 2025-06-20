import { fetchLatestNewsletters } from "./crawler.js";
import { processNewsletter } from "./llm.js";
import fs from "fs/promises";
import path from "path";

export async function runCrawlingAndProcessing() {
  console.log("Fetching latest newsletters from today...");

  // The crawler returns { subject, from, date, body, id }
  const newsletters = await fetchLatestNewsletters();

  if (newsletters.length === 0) {
    console.log("No new newsletters found.");
    return;
  }

  console.log(`Found ${newsletters.length} new newsletters to process.`);

  for (const newsletter of newsletters) {
    console.log(`\nProcessing email: "${newsletter.subject}"`);
    const analyzedArticles = await processNewsletter(newsletter.body);

    if (analyzedArticles.length > 0) {
      const articlesWithExtras = analyzedArticles.map((article) => {
        return {
          ...article,
          source: newsletter.from,
          emailDate: newsletter.date,
        };
      });

      const emailDateObj = new Date(newsletter.date);
      const year = emailDateObj.getFullYear();
      const month = String(emailDateObj.getMonth() + 1).padStart(2, "0");
      const day = String(emailDateObj.getDate()).padStart(2, "0");
      const dateSubfolder = `${year}-${month}-${day}`;

      const outputDir = path.join(process.cwd(), "data/processed", dateSubfolder);
      await fs.mkdir(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, `${newsletter.id}.json`);
      await fs.writeFile(outputPath, JSON.stringify(articlesWithExtras, null, 2));
      console.log(`-> Successfully analyzed and saved ${articlesWithExtras.length} articles to ${outputPath}`);
    } else {
      console.log(`-> No articles found or error during processing for this email.`);
    }
  }

  console.log("\nProcessing complete.");
  console.log("Next, run the reporting script to generate the final report.");
}
