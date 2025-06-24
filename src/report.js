import { runReporting } from "./reporting.js";

async function main() {
  try {
    console.log("Starting report generation...");
    await runReporting();
    console.log("\nReport generation completed successfully.");
  } catch (error) {
    console.error("\nAn error occurred during report generation:", error);
    process.exit(1);
  }
}

main();
