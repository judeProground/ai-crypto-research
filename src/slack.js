import { WebClient } from "@slack/web-api";
import "dotenv/config";

function markdownToBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split("\n");

  let currentBlock = null;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      blocks.push({
        type: "header",
        text: {
          type: "plain_text",
          text: line.substring(2),
          emoji: true,
        },
      });
      currentBlock = null;
    } else if (line.startsWith("## ")) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      blocks.push({
        type: "header",
        text: {
          type: "plain_text",
          text: line.substring(3),
          emoji: true,
        },
      });
      currentBlock = null;
    } else if (line.startsWith("• ")) {
      const formattedLine = line.substring(2).replace(/\[(low|medium|high)\]/g, (match, level) => {
        if (level === "high") return "🔴";
        if (level === "medium") return "🟡";
        if (level === "low") return "🟢";
        return "";
      });

      if (!currentBlock || currentBlock.type !== "section") {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `• ${formattedLine}`,
          },
        };
      } else {
        currentBlock.text.text += `\n• ${formattedLine}`;
      }
    } else if (line.trim() !== "") {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: line,
        },
      });
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

export async function sendSlackReport(reportContent) {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
    console.log("Slack credentials not found. Skipping sending report to Slack.");
    return;
  }

  const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
  const today = new Date().toISOString().split("T")[0];
  const blocks = markdownToBlocks(reportContent);

  try {
    await slackClient.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: `Blockchain Market Intelligence Report for ${today}`, // Fallback text
      blocks: blocks,
    });
    console.log("Successfully sent report to Slack.");
  } catch (error) {
    console.error("Error sending report to Slack:", error);
  }
}
