import { generateMarkdownReport } from "./src/reporting.js";
import fs from "fs/promises";
import path from "path";

async function buildReport() {
  const processedDir = path.join(process.cwd(), "data/processed");
  let allArticles = [];

  try {
    const files = await fs.readdir(processedDir);

    for (const file of files) {
      if (path.extname(file) === ".json") {
        const filePath = path.join(processedDir, file);
        const content = await fs.readFile(filePath, "utf8");
        const articles = JSON.parse(content);
        allArticles = allArticles.concat(articles);
      }
    }

    if (allArticles.length === 0) {
      console.log("No processed articles found to build a report.");
      return;
    }

    console.log(`Aggregated ${allArticles.length} articles from ${files.length} files.`);
    console.log("Generating final Markdown report...");

    const markdownReport = generateMarkdownReport(allArticles);
    const reportPath = path.join(process.cwd(), "final_report.md");
    await fs.writeFile(reportPath, markdownReport);

    console.log(`\nSuccessfully generated report at: ${reportPath}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error('Error: The "data/processed" directory does not exist. Please run the main script first.');
    } else {
      console.error("An error occurred while building the report:", error);
    }
  }
}

buildReport();
