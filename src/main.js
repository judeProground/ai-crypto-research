import { runCrawlingAndProcessing } from "./index.js";
import { runReporting } from "./reporting.js";

async function main() {
  try {
    console.log("Starting the newsletter processing and reporting pipeline...");
    await runCrawlingAndProcessing();
    await runReporting();
    console.log("\nPipeline finished successfully.");
  } catch (error) {
    console.error("\nAn error occurred during the pipeline execution:", error);
    process.exit(1);
  }
}

main();
