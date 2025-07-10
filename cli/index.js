import minimist from "minimist";
import { fetchAndSaveNewsletters, processSavedNewsletters } from "../src/processing.js";
import { runReportGeneration, runSlackSending } from "../src/reporting.js";

async function main() {
  const argv = minimist(process.argv.slice(2));
  const command = argv._[0];

  switch (command) {
    case "fetch":
      console.log("Executing command: fetch");
      await fetchAndSaveNewsletters({
        days: argv.days ? parseInt(argv.days, 10) : 1,
        date: argv.date,
      });
      break;

    case "process":
      console.log("Executing command: process");
      await processSavedNewsletters({
        days: argv.days ? parseInt(argv.days, 10) : 1,
        date: argv.date,
        force: argv.force,
      });
      break;

    case "generate-report":
      console.log("Executing command: generate-report");
      await runReportGeneration({
        days: argv.days ? parseInt(argv.days, 10) : 1,
        date: argv.date,
      });
      break;

    case "send-report":
      console.log("Executing command: send-report");
      // For send-report, we need to handle the report path
      const reportPath = argv._[1];
      if (!reportPath) {
        console.error("Error: Please provide the path to the report file you want to send.");
        console.log("Usage: node cli/index.js send-report <path/to/report.md>");
        break;
      }
      await runSlackSending(reportPath);
      break;

    case "full-run":
      console.log("Executing command: full-run");
      if (argv.date) {
        console.log(`Running for a specific date: ${argv.date}. Fetching will be skipped.`);
        await processSavedNewsletters({
          days: argv.days ? parseInt(argv.days, 10) : 1,
          date: argv.date,
          force: argv.force,
        });
        await runReportGeneration({
          days: argv.days ? parseInt(argv.days, 10) : 1,
          date: argv.date,
        });
        // For full-run, we'll find the generated report and send it
        // This is a simplified approach - in a real scenario you'd want to track the report path
        console.log("Note: Manual report sending may be required after generation.");
      } else {
        await fetchAndSaveNewsletters({
          days: argv.days ? parseInt(argv.days, 10) : 1,
          date: argv.date,
        });
        await processSavedNewsletters({
          days: argv.days ? parseInt(argv.days, 10) : 1,
          date: argv.date,
          force: argv.force,
        });
        await runReportGeneration({
          days: argv.days ? parseInt(argv.days, 10) : 1,
          date: argv.date,
        });
        // For full-run, we'll find the generated report and send it
        // This is a simplified approach - in a real scenario you'd want to track the report path
        console.log("Note: Manual report sending may be required after generation.");
      }
      break;

    default:
      console.log("Unknown command. Available commands: fetch, process, generate-report, send-report, full-run");
      console.log("Options:");
      console.log("  --date=YYYY-MM-DD    Process/fetch for a specific date");
      console.log("  --days=N             Process/fetch for N days (default: 1)");
      console.log("  --force              Force regeneration of existing files");
      break;
  }
}

main().catch((error) => {
  console.error("An unexpected error occurred:", error);
  process.exit(1);
});
