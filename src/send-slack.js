import { runSlackSending } from "./reporting.js";

async function main() {
  try {
    console.log("Starting Slack report sending...");

    // Get report path from command line arguments if provided
    const reportPath = process.argv[2]; // Optional: node src/send-slack.js path/to/report.md

    await runSlackSending(reportPath);
    console.log("\nSlack report sending completed successfully.");
  } catch (error) {
    console.error("\nAn error occurred during Slack sending:", error);
    process.exit(1);
  }
}

main();
