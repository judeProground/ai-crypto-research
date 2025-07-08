import { WebClient } from "@slack/web-api";
import "dotenv/config";

const MAX_BLOCK_SIZE = 2900; // Slack's limit is 3000, this provides a safe buffer.

/**
 * Splits the Key Findings section into individual findings.
 * Each finding is expected to be a single line starting with an emoji.
 * @param {string} findingsText The full text of the "Key Findings" section.
 * @returns {Array<string>} An array of individual finding strings.
 */
function splitFindings(findingsText) {
  if (!findingsText) {
    return [];
  }
  // Split by newline and filter out any empty lines or lines that don't start with an emoji marker.
  // This makes the parsing robust to extra whitespace.
  const lines = findingsText.trim().split("\n");
  return lines.filter((line) => line.trim() !== "" && /^\s*•\s*(🚨|🔥|⚠️|📄)/.test(line));
}

export async function sendSlackReport(reportContent) {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
    console.log("Slack credentials not found. Skipping sending report to Slack.");
    return;
  }

  const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

  // 1. Construct and send the initial message (Title + Summary)
  const initialBlocks = [];
  const titleMatch = reportContent.match(/^#\s*(.*)/);
  const title = titleMatch ? titleMatch[1] : "Blockchain Market Intelligence Report";
  initialBlocks.push({
    type: "header",
    text: { type: "plain_text", text: title, emoji: true },
  });

  const summaryMatch = reportContent.match(/\n\n## Executive Summary\n\n([\s\S]*?)\n\n## Key Findings/);
  if (summaryMatch) {
    initialBlocks.push({ type: "divider" });
    initialBlocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Executive Summary*\n${summaryMatch[1]}` },
    });
  }

  try {
    const initialMessage = await slackClient.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: title, // Fallback text
      blocks: initialBlocks,
    });

    const threadTs = initialMessage.ts;
    if (!threadTs) {
      console.error("Failed to get thread_ts from initial Slack message.");
      return;
    }

    console.log(`Successfully sent initial report. Replying in thread ${threadTs}...`);

    // 2. Extract, parse, and send Key Findings as individual replies
    const findingsMatch = reportContent.match(/\n\n## Key Findings\n\n([\s\S]*)/);
    if (findingsMatch) {
      const findingsText = findingsMatch[1];
      const individualFindings = splitFindings(findingsText);

      for (const [index, finding] of individualFindings.entries()) {
        // We no longer need to check for size, as each finding is a short, single message.
        await slackClient.chat.postMessage({
          channel: process.env.SLACK_CHANNEL_ID,
          thread_ts: threadTs,
          text: `Finding ${index + 1}`, // Fallback text for replies
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: finding },
            },
          ],
        });
        console.log(`  -> Sent finding ${index + 1} of ${individualFindings.length}`);
      }
    }

    console.log("Report successfully sent to Slack thread!");
  } catch (error) {
    console.error("Error sending report to Slack:", error);
  }
}
