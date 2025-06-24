import { runCrawlingAndProcessing } from "./index.js";

async function main() {
  try {
    console.log("Starting newsletter processing...");
    await runCrawlingAndProcessing();
    console.log("\nProcessing completed successfully.");
  } catch (error) {
    console.error("\nAn error occurred during processing:", error);
    process.exit(1);
  }
}

main();
