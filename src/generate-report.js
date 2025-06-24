import { runReportGeneration } from "./reporting.js";

async function main() {
  try {
    console.log("Starting report generation...");
    await runReportGeneration();
    console.log("\nReport generation completed successfully.");
  } catch (error) {
    console.error("\nAn error occurred during report generation:", error);
    process.exit(1);
  }
}

main();
