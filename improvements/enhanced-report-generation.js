// Enhanced Report Generation with Category Organization and Improved Slack Formatting

export async function generateEnhancedReport(analyzedArticles, reportDate) {
  // Group articles by category
  const categoryGroups = groupArticlesByCategory(analyzedArticles);
  const totalArticles = analyzedArticles.length;
  const categoryStats = generateCategoryStats(categoryGroups);
  const riskLevel = calculateRiskLevel(analyzedArticles);

  const prompt = `You are an expert blockchain researcher and product manager. Generate a comprehensive market intelligence report with enhanced structure and organization.

The report must follow this EXACT structure:

# 🔗 Blockchain Market Intelligence Report for ${reportDate}

## 📊 Market Overview
- **Total Articles Analyzed**: ${totalArticles}
- **Key Categories**: ${categoryStats.summary}
- **Risk Level**: ${riskLevel}

## 🎯 Executive Summary
[Provide a strategic 3-4 sentence overview focusing on market trends, key themes, and actionable insights]

## 🏷️ Category Breakdown
${generateCategoryBreakdown(categoryGroups)}

## 🚨 Priority Alerts
${generatePriorityAlerts(analyzedArticles)}

## 📈 Key Findings by Category
${generateCategoryFindings(categoryGroups)}

## 💡 Strategic Insights
[Provide 2-3 actionable insights for investors/researchers based on patterns across categories]

Data to analyze:
${JSON.stringify(analyzedArticles, null, 2)}

Return the complete report as markdown.`;

  // [Implementation continues...]
}

function groupArticlesByCategory(articles) {
  const groups = {};
  articles.forEach(article => {
    article.categories.forEach(category => {
      if (!groups[category]) groups[category] = [];
      groups[category].push(article);
    });
  });
  return groups;
}

function generateCategoryStats(categoryGroups) {
  const stats = Object.entries(categoryGroups)
    .map(([category, articles]) => `${category.toUpperCase()} (${articles.length})`)
    .join(', ');
  return { summary: stats };
}

function calculateRiskLevel(articles) {
  const fatalCount = articles.filter(a => a.importance === 'fatal').length;
  const highCount = articles.filter(a => a.importance === 'high').length;
  
  if (fatalCount > 0) return "🚨 Critical";
  if (highCount >= 3) return "🔥 High";
  if (highCount >= 1) return "⚠️ Medium";
  return "✅ Low";
}

// Enhanced Slack formatting with rich blocks and category organization
export async function sendEnhancedSlackReport(reportContent, categoryGroups) {
  const categoryColors = {
    security: "#FF4444",
    defi: "#4CAF50", 
    regulation: "#FF9800",
    funding: "#2196F3",
    meme: "#9C27B0",
    wallet: "#795548"
  };

  // Create main message with overview
  const overviewBlocks = [
    {
      type: "header",
      text: { type: "plain_text", text: "🔗 Blockchain Market Intelligence Report", emoji: true }
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Date:* ${new Date().toLocaleDateString()}` },
        { type: "mrkdwn", text: `*Articles:* ${Object.values(categoryGroups).flat().length}` },
        { type: "mrkdwn", text: `*Categories:* ${Object.keys(categoryGroups).length}` },
        { type: "mrkdwn", text: `*Risk Level:* ${calculateRiskLevel(Object.values(categoryGroups).flat())}` }
      ]
    },
    {
      type: "actions",
      elements: Object.keys(categoryGroups).map(category => ({
        type: "button",
        text: { type: "plain_text", text: `${category.toUpperCase()} (${categoryGroups[category].length})` },
        style: category === 'security' ? 'danger' : category === 'defi' ? 'primary' : undefined,
        action_id: `filter_${category}`
      }))
    }
  ];

  // Send category-organized threads
  for (const [category, articles] of Object.entries(categoryGroups)) {
    const categoryBlocks = articles.map(article => ({
      type: "section",
      text: {
        type: "mrkdwn",
        text: formatArticleForSlack(article, category)
      },
      accessory: article.primary_link ? {
        type: "button",
        text: { type: "plain_text", text: "Read More" },
        url: article.primary_link,
        action_id: "read_more"
      } : undefined
    }));

    // Send as separate thread per category
    await sendCategoryThread(category, categoryBlocks, categoryColors[category]);
  }
}

function formatArticleForSlack(article, category) {
  const importanceEmoji = {
    fatal: "🚨",
    high: "🔥", 
    medium: "⚠️",
    low: "📄"
  };

  const categoryBadge = `\`${category.toUpperCase()}\``;
  const title = article.primary_link ? 
    `*<${article.primary_link}|${article.title}>*` : 
    `*${article.title}*`;
  
  return `${importanceEmoji[article.importance]} ${categoryBadge} ${title}\n${article.summary}`;
}