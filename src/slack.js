import { WebClient } from "@slack/web-api";
import "dotenv/config";

const MAX_BLOCK_SIZE = 2900; // Slack's limit is 3000, this provides a safe buffer.

/**
 * Clean markdown formatting for Slack display
 * @param {string} text Text with markdown formatting
 * @returns {string} Cleaned text suitable for Slack
 */
function cleanMarkdownForSlack(text) {
  if (!text) return text;

  // Remove ** bold formatting
  return text.replace(/\*\*(.*?)\*\*/g, "*$1*");
}

/**
 * Category to emoji mapping for better visual presentation
 */
const categoryEmojis = {
  regulation: "🏛️",
  funding: "💰",
  defi: "⚡",
  meme: "🎭",
  trading: "📈",
  security: "🛡️",
  wallet: "👛",
  general: "🏷️",
  market: "📊",
  institutional: "🏢",
};

/**
 * Convert [CATEGORY] tags to emoji representations
 * @param {string} text Text containing category tags
 * @returns {string} Text with category tags replaced by emojis
 */
function convertCategoryTagsToEmojis(text) {
  if (!text) return text;

  return text.replace(/\[([^\]]+)\]/g, (match, category) => {
    const emoji = categoryEmojis[category.toLowerCase()];
    return emoji || match; // Fallback to original if no emoji found
  });
}

/**
 * Extracts enhanced report sections including category findings.
 * @param {string} reportContent The full report content
 * @returns {object} Parsed report sections
 */
function parseEnhancedReport(reportContent) {
  const sections = {};

  // Extract Market Overview
  const overviewMatch = reportContent.match(/## 📊 Market Overview\n([\s\S]*?)\n\n## /);
  sections.overview = overviewMatch ? overviewMatch[1].trim() : "";

  // Extract Executive Summary
  const summaryMatch = reportContent.match(/## 🎯 Executive Summary\n([\s\S]*?)\n\n## /);
  sections.summary = summaryMatch ? summaryMatch[1].trim() : "";

  // Extract Priority Alerts
  const alertsMatch = reportContent.match(/## 🚨 Priority Alerts\n([\s\S]*?)\n\n## /);
  sections.alerts = alertsMatch ? splitFindings(alertsMatch[1]) : [];

  // Extract Key Findings (updated to match new article-first format)
  const findingsMatch = reportContent.match(/## 📈 Key Findings\n([\s\S]*?)(\n\n## |$)/);
  sections.findings = findingsMatch ? splitFindings(findingsMatch[1]) : [];

  // Extract Strategic Insights
  const insightsMatch = reportContent.match(/## 💡 Strategic Insights\n([\s\S]*?)$/);
  sections.insights = insightsMatch ? insightsMatch[1].trim() : "";

  return sections;
}

/**
 * Splits findings into individual items, supporting both old and new formats.
 */
function splitFindings(findingsText) {
  if (!findingsText) {
    return [];
  }

  const lines = findingsText.trim().split("\n");
  return lines.filter((line) => {
    const trimmed = line.trim();
    // Match both old format (• emoji) and new format (emoji [CATEGORY] tags)
    return (
      trimmed !== "" && (trimmed.match(/^\s*•\s*(🚨|🔥|⚠️|📄)/) || trimmed.match(/^(🚨|🔥|⚠️|📄)\s*(\[[\w\s]+\])+/))
    );
  });
}

export async function sendSlackReport(reportContent) {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
    console.log("Slack credentials not found. Skipping sending report to Slack.");
    return;
  }

  const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

  // Parse the enhanced report structure
  const sections = parseEnhancedReport(reportContent);

  // Extract title
  const titleMatch = reportContent.match(/^#\s*(.*)/);
  const title = titleMatch ? titleMatch[1] : "Blockchain Market Intelligence Report";

  // 1. Send enhanced initial message with overview
  const initialBlocks = [
    {
      type: "header",
      text: { type: "plain_text", text: title, emoji: true },
    },
  ];

  // Add market overview if available
  if (sections.overview) {
    initialBlocks.push({ type: "divider" });
    initialBlocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*📊 Market Overview*\n${cleanMarkdownForSlack(sections.overview)}` },
    });
  }

  // Add executive summary
  if (sections.summary) {
    initialBlocks.push({ type: "divider" });
    initialBlocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*🎯 Executive Summary*\n${sections.summary}` },
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

    // 2. Send Priority Alerts if any
    if (sections.alerts && sections.alerts.length > 0) {
      await slackClient.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_ID,
        thread_ts: threadTs,
        text: "Priority Alerts",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*🚨 Priority Alerts*\n${sections.alerts.length} high-priority items detected:`,
            },
          },
        ],
      });

      for (const [index, alert] of sections.alerts.entries()) {
        await slackClient.chat.postMessage({
          channel: process.env.SLACK_CHANNEL_ID,
          thread_ts: threadTs,
          text: `Alert ${index + 1}`,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: convertCategoryTagsToEmojis(alert) },
            },
          ],
        });
        console.log(`  -> Sent alert ${index + 1} of ${sections.alerts.length}`);
      }
    }

    // 3. Send Key Findings
    if (sections.findings && sections.findings.length > 0) {
      await slackClient.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_ID,
        thread_ts: threadTs,
        text: "Key Findings",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*📈 Key Findings*\n${sections.findings.length} articles with category tags:`,
            },
          },
        ],
      });

      for (const [index, finding] of sections.findings.entries()) {
        await slackClient.chat.postMessage({
          channel: process.env.SLACK_CHANNEL_ID,
          thread_ts: threadTs,
          text: `Finding ${index + 1}`,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: convertCategoryTagsToEmojis(finding) },
            },
          ],
        });
        console.log(`  -> Sent finding ${index + 1} of ${sections.findings.length}`);
      }
    }

    // 4. Send Strategic Insights
    if (sections.insights) {
      await slackClient.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_ID,
        thread_ts: threadTs,
        text: "Strategic Insights",
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: `*💡 Strategic Insights*\n${sections.insights}` },
          },
        ],
      });
      console.log("  -> Sent strategic insights");
    }

    console.log("Enhanced report successfully sent to Slack thread!");
  } catch (error) {
    console.error("Error sending enhanced report to Slack:", error);
  }
}
