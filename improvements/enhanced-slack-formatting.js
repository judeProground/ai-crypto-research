// Enhanced Slack Integration with Rich Formatting and Category Organization

import { WebClient } from "@slack/web-api";

export class EnhancedSlackReporter {
  constructor(botToken, channelId) {
    this.client = new WebClient(botToken);
    this.channelId = channelId;
    this.categoryColors = {
      security: "#FF4444", // Red
      defi: "#4CAF50", // Green
      regulation: "#FF9800", // Orange
      funding: "#2196F3", // Blue
      meme: "#9C27B0", // Purple
      wallet: "#795548", // Brown
    };
    this.importanceEmojis = {
      fatal: "🚨",
      high: "🔥",
      medium: "⚠️",
      low: "📄",
    };
    this.categoryEmojis = {
      regulation: "🏛️",
      funding: "💰",
      defi: "⚡",
      meme: "🎭",
      trading: "📈",
      security: "🛡️",
      wallet: "👛",
    };
  }

  /**
   * Convert [CATEGORY] tags to emoji representations
   * @param {string} text Text containing category tags
   * @returns {string} Text with category tags replaced by emojis
   */
  convertCategoryTagsToEmojis(text) {
    if (!text) return text;

    return text.replace(/\[([^\]]+)\]/g, (match, category) => {
      const emoji = this.categoryEmojis[category.toLowerCase()];
      return emoji || match; // Fallback to original if no emoji found
    });
  }

  async sendReport(reportData) {
    try {
      // 1. Send main overview message
      const overviewMessage = await this.sendOverview(reportData);
      const mainThreadTs = overviewMessage.ts;

      // 2. Send article findings in thread (article-first approach)
      await this.sendArticleFindings(reportData, mainThreadTs);

      // 3. Send priority alerts as pinned message if any critical items
      await this.sendPriorityAlerts(reportData);

      console.log("✅ Enhanced Slack report sent successfully!");
      return { success: true, threadTs: mainThreadTs };
    } catch (error) {
      console.error("❌ Failed to send enhanced Slack report:", error);
      return { success: false, error: error.message };
    }
  }

  async sendOverview(reportData) {
    const { articles, date, categoryStats, riskLevel } = reportData;

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🔗 Blockchain Intelligence Report - ${date}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*📊 Total Articles:* ${articles.length}` },
          { type: "mrkdwn", text: `*🏷️ Categories:* ${categoryStats.count}` },
          { type: "mrkdwn", text: `*⚡ Risk Level:* ${riskLevel}` },
          { type: "mrkdwn", text: `*🕐 Generated:* ${new Date().toLocaleTimeString()}` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*📈 Executive Summary*\n${reportData.executiveSummary}`,
        },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*📂 Category Breakdown:*\n" + this.formatCategoryBreakdown(categoryStats.breakdown),
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "🔥 View Priority Items" },
            style: "danger",
            action_id: "view_priority",
          },
          {
            type: "button",
            text: { type: "plain_text", text: "📊 Full Report" },
            action_id: "view_full_report",
          },
        ],
      },
    ];

    return await this.client.chat.postMessage({
      channel: this.channelId,
      text: `Blockchain Intelligence Report - ${date}`,
      blocks: blocks,
    });
  }

  async sendArticleFindings(reportData, mainThreadTs) {
    const { articles } = reportData;

    // Send findings header
    await this.client.chat.postMessage({
      channel: this.channelId,
      thread_ts: mainThreadTs,
      text: "Key Findings",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📈 Key Findings* (${articles.length} articles with category tags)`,
          },
        },
        { type: "divider" },
      ],
    });

    // Sort articles by importance and send each once with category tags
    const sortedArticles = articles.sort(
      (a, b) => this.getImportanceWeight(b.importance) - this.getImportanceWeight(a.importance)
    );

    for (const article of sortedArticles) {
      await this.sendArticleCard(article, mainThreadTs);
    }
  }

  async sendArticleCard(article, threadTs) {
    const emoji = this.importanceEmojis[article.importance];
    const categoryEmojis = article.categories
      .map((cat) => this.categoryEmojis[cat.toLowerCase()] || `[${cat.toUpperCase()}]`)
      .join(" ");

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} ${categoryEmojis} *${article.title}*\n${article.summary}`,
        },
        accessory: article.primary_link
          ? {
              type: "button",
              text: { type: "plain_text", text: "Read More" },
              url: article.primary_link,
              action_id: "read_article",
            }
          : undefined,
      },
    ];

    // Add source and metadata
    if (article.source || article.additional_links?.length > 0) {
      const contextElements = [];
      if (article.source) {
        contextElements.push(`*Source:* ${this.extractSourceName(article.source)}`);
      }
      if (article.additional_links?.length > 0) {
        contextElements.push(`*Links:* ${article.additional_links.length}`);
      }

      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: contextElements.join(" • "),
          },
        ],
      });
    }

    return await this.client.chat.postMessage({
      channel: this.channelId,
      thread_ts: threadTs,
      text: `${emoji} ${article.title}`,
      blocks: blocks,
    });
  }

  async sendPriorityAlerts(reportData) {
    const criticalArticles = reportData.articles.filter(
      (article) => article.importance === "fatal" || article.importance === "high"
    );

    if (criticalArticles.length === 0) return;

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚨 Priority Alerts",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${criticalArticles.length} high-priority items detected that require immediate attention:*`,
        },
      },
    ];

    criticalArticles.forEach((article) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${this.importanceEmojis[article.importance]} *${article.title}*\n${article.summary}`,
        },
        accessory: article.primary_link
          ? {
              type: "button",
              text: { type: "plain_text", text: "Investigate" },
              url: article.primary_link,
              style: article.importance === "fatal" ? "danger" : "primary",
              action_id: "investigate_alert",
            }
          : undefined,
      });
    });

    return await this.client.chat.postMessage({
      channel: this.channelId,
      text: `🚨 ${criticalArticles.length} Priority Alerts`,
      blocks: blocks,
    });
  }

  formatCategoryBreakdown(breakdown) {
    return Object.entries(breakdown)
      .map(([category, count]) => `• *${category.toUpperCase()}:* ${count} articles`)
      .join("\n");
  }

  getImportanceWeight(importance) {
    const weights = { fatal: 4, high: 3, medium: 2, low: 1 };
    return weights[importance] || 0;
  }

  extractSourceName(source) {
    // Extract human-readable name from email format
    const match = source.match(/^([^<]+)/);
    return match ? match[1].trim() : source;
  }
}

// Usage example:
export async function sendEnhancedReport(articles, reportDate) {
  const reporter = new EnhancedSlackReporter(process.env.SLACK_BOT_TOKEN, process.env.SLACK_CHANNEL_ID);

  const reportData = {
    articles,
    date: reportDate,
    categoryStats: generateCategoryStats(articles),
    riskLevel: calculateRiskLevel(articles),
    executiveSummary: await generateExecutiveSummary(articles),
  };

  return await reporter.sendReport(reportData);
}

function groupArticlesByCategory(articles) {
  const groups = {};
  articles.forEach((article) => {
    article.categories.forEach((category) => {
      if (!groups[category]) groups[category] = [];
      groups[category].push(article);
    });
  });
  return groups;
}

function generateCategoryStats(articles) {
  const breakdown = {};
  articles.forEach((article) => {
    article.categories.forEach((category) => {
      breakdown[category] = (breakdown[category] || 0) + 1;
    });
  });

  return {
    count: Object.keys(breakdown).length,
    breakdown,
  };
}

function calculateRiskLevel(articles) {
  const fatalCount = articles.filter((a) => a.importance === "fatal").length;
  const highCount = articles.filter((a) => a.importance === "high").length;

  if (fatalCount > 0) return "🚨 Critical";
  if (highCount >= 3) return "🔥 High";
  if (highCount >= 1) return "⚠️ Medium";
  return "✅ Low";
}
