import minimist from "minimist";
import { fetchAndSaveNewsletters, processSavedNewsletters } from "../src/processing.js";
import { runReportGeneration, runSlackSending } from "../src/reporting.js";

async function main() {
  const argv = minimist(process.argv.slice(2));
  const command = argv._[0];

  switch (command) {
    case "fetch":
      console.log("Executing command: fetch");
      await fetchAndSaveNewsletters({ days: argv.days ? parseInt(argv.days, 10) : 1 });
      break;

    case "process":
      console.log("Executing command: process");
      await processSavedNewsletters({ days: argv.days ? parseInt(argv.days, 10) : 3 });
      break;

    case "generate-report":
      console.log("Executing command: generate-report");
      const reportDays = argv.days ? parseInt(argv.days, 10) : 3;
      const reportDate = argv.date;
      try {
        await runReportGeneration({ date: reportDate, days: reportDays });
        console.log('\nCommand "generate-report" completed successfully.');
      } catch (error) {
        console.error(`Error during generate-report command:`, error);
      }
      break;

    case "send-report":
      console.log("Executing command: send-report");
      const reportPath = argv._[1];
      if (!reportPath) {
        console.error("Error: Please provide the path to the report file you want to send.");
        console.log("Usage: node cli/index.js send-report <path/to/report.md>");
        break;
      }
      try {
        await runSlackSending(reportPath);
        console.log('\nCommand "send-report" completed successfully.');
      } catch (error) {
        console.error(`Error during send-report command:`, error);
      }
      break;

    case "full-run":
      console.log("Executing command: full-run");
      await fetchAndSaveNewsletters({ days: argv.days ? parseInt(argv.days, 10) : 1 });
      await processSavedNewsletters({ days: argv.days ? parseInt(argv.days, 10) : 3 });
      const reportPaths = await runReportGeneration({ date: argv.date, days: argv.days ? parseInt(argv.days, 10) : 3 });
      if (reportPaths.length > 0) {
        for (const path of reportPaths) {
          await runSlackSending(path);
        }
      }
      break;

    default:
      console.log("Unknown or missing command.");
      console.log("Usage: node cli/index.js <command> [--options]");
      console.log("Available commands: fetch, process, generate-report, send-report, full-run");
      break;
  }
}

main().catch((error) => {
  console.error("An unexpected error occurred:", error);
  process.exit(1);
});
