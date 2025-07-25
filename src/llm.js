import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Batch processing configuration
const BATCH_CONFIG = {
  MAX_BATCH_SIZE: 5, // Start conservative
  MAX_TOKENS_PER_BATCH: 15000, // Leave room for response
  ENABLE_BATCHING: true, // Toggle for easy disable/enable
};

/**
 * Processes a full newsletter body, segmenting it into articles and analyzing each one.
 * @param {string} newsletterContent - The full text content of the newsletter.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of analyzed article objects.
 */
export async function processNewsletter(newsletterContent) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set in the .env file.");
  }

  const prompt = `You are an expert blockchain researcher and investor. Your analysis is sharp, detailed, and trusted by experts for identifying critical information and investment opportunities.
The following is the full content of a crypto newsletter. Your task is to meticulously analyze it from the perspective of a security-conscious investor.

First, identify each distinct article or topic.
Then, for each identified article, create a structured analysis in a JSON object with the following keys: "title", "summary", "categories", "importance", "primary_link", "additional_links", "images".

Follow these rules exactly:
- "title": Create a concise, descriptive title for the specific article.
- "summary": Provide an expert-level summary, including specific details and context. The summary must be 2-3 lines long.
- "categories": An array of strings. Choose from: [defi, security, regulation, wallet, funding, meme, general, market, institutional]. Suggest a new lowercase category if needed.
- "importance": Assign importance based on these criteria. Pay close attention to monetary values, scale of impact, and direct investment opportunities.
    - "fatal": Critical, widespread vulnerability; major hack (> $50M); major exchange insolvency or shutdown.
    - "high": Significant new vulnerability; notable hack ($5M - $50M); major regulatory action by a large governing body; new widespread scam affecting many users.
    - "medium": New research paper with significant findings; major project launch or funding round (> $10M); notable legal development or lawsuit.
    - "low": General news; market analysis; opinion pieces; minor project updates or partnerships.
- "primary_link": A single string. Extract the most important, primary hyperlink *directly from the article's text*. This should be the main source link or call-to-action. If no clear primary link exists, return null.
- "additional_links": An array of strings. Extract all other secondary hyperlinks *directly from the article's text*. If no other links are present, return an empty array "[]".
- "images": An array of strings. Extract all relevant image URLs *directly from the article's text*. If no images are available, return an empty array "[]".

Return a single JSON array of all the analysis objects. You must return ONLY the raw JSON array and nothing else.

Here is the newsletter content to analyze:
---
${newsletterContent}
---`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = msg.content[0].text;

    // The model sometimes returns conversational text before/after the JSON.
    // We need to reliably extract the JSON array from the response.
    const startIndex = responseText.indexOf("[");
    const endIndex = responseText.lastIndexOf("]");

    if (startIndex !== -1 && endIndex !== -1) {
      const jsonString = responseText.substring(startIndex, endIndex + 1);
      return JSON.parse(jsonString);
    } else {
      console.error("Could not find a valid JSON array in the LLM response:", responseText);
      throw new Error("Invalid response format from LLM.");
    }
  } catch (error) {
    console.error("Error processing newsletter with Anthropic API:", error);
    return []; // Return an empty array on failure
  }
}

/**
 * Batch processes multiple newsletters in a single API call for cost efficiency.
 * @param {Array<object>} newsletters - Array of newsletter objects with id, body, from, subject
 * @returns {Promise<object>} Object mapping newsletter IDs to their analyzed articles
 */
export async function batchProcessNewsletters(newsletters) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set in the .env file.");
  }

  if (!BATCH_CONFIG.ENABLE_BATCHING) {
    console.log("Using individual processing (batching disabled)");
    const results = {};
    for (const newsletter of newsletters) {
      try {
        const articles = await processNewsletter(newsletter.body);
        results[newsletter.id] = articles;
      } catch (error) {
        console.error(`Failed to process newsletter ${newsletter.id}:`, error);
        results[newsletter.id] = [];
      }
    }
    return results;
  }

  console.log(`Batch processing ${newsletters.length} newsletters...`);

  // Create intelligent batches
  const batches = createOptimalBatches(newsletters);
  const allResults = {};

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} newsletters)`);

    try {
      const batchResults = await processBatch(batch);
      Object.assign(allResults, batchResults);
    } catch (error) {
      console.error(`Batch ${i + 1} failed, falling back to individual processing:`, error);

      // Fallback to individual processing for this batch
      for (const newsletter of batch) {
        try {
          const articles = await processNewsletter(newsletter.body);
          allResults[newsletter.id] = articles;
        } catch (individualError) {
          console.error(`Failed to process newsletter ${newsletter.id}:`, individualError);
          allResults[newsletter.id] = [];
        }
      }
    }
  }

  return allResults;
}

/**
 * Creates optimal batches based on content size and batch limits.
 */
function createOptimalBatches(newsletters) {
  const batches = [];
  let currentBatch = [];
  let currentTokenCount = 0;

  for (const newsletter of newsletters) {
    const estimatedTokens = estimateTokenCount(newsletter.body);

    // Check if adding this newsletter would exceed limits
    if (
      currentBatch.length >= BATCH_CONFIG.MAX_BATCH_SIZE ||
      currentTokenCount + estimatedTokens > BATCH_CONFIG.MAX_TOKENS_PER_BATCH
    ) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentTokenCount = 0;
      }
    }

    currentBatch.push(newsletter);
    currentTokenCount += estimatedTokens;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Estimates token count for content (rough approximation).
 */
function estimateTokenCount(content) {
  // Rough estimate: ~4 characters per token
  return Math.ceil(content.length / 4);
}

/**
 * Processes a batch of newsletters in a single API call.
 */
async function processBatch(newsletters) {
  const prompt = `You are an expert blockchain researcher and investor. Your analysis is sharp, detailed, and trusted by experts for identifying critical information and investment opportunities.

You will receive ${
    newsletters.length
  } newsletters to analyze. For each newsletter, identify distinct articles and analyze them from the perspective of a security-conscious investor.

For each newsletter, return a JSON object with the newsletter ID as the key and an array of analyzed articles as the value.

For each article, create a structured analysis with these keys: "title", "summary", "categories", "importance", "primary_link", "additional_links", "images".

Follow these rules exactly:
- "title": Create a concise, descriptive title for the specific article.
- "summary": Provide an expert-level summary, including specific details and context. The summary must be 2-3 lines long.
- "categories": An array of strings. Choose from: [defi, security, regulation, wallet, funding, meme, general, market, institutional]. Suggest a new lowercase category if needed.
- "importance": Assign importance based on these criteria. Pay close attention to monetary values, scale of impact, and direct investment opportunities.
    - "fatal": Critical, widespread vulnerability; major hack (> $50M); major exchange insolvency or shutdown.
    - "high": Significant new vulnerability; notable hack ($5M - $50M); major regulatory action by a large governing body; new widespread scam affecting many users.
    - "medium": New research paper with significant findings; major project launch or funding round (> $10M); notable legal development or lawsuit.
    - "low": General news; market analysis; opinion pieces; minor project updates or partnerships.
- "primary_link": Extract the most important hyperlink directly from the article's text. Return null if none exists.
- "additional_links": Array of other hyperlinks from the article's text. Return empty array if none.
- "images": Array of image URLs from the article's text. Return empty array if none.

Return ONLY a JSON object in this format:
{
  "newsletter_id_1": [array of article objects],
  "newsletter_id_2": [array of article objects],
  ...
}

Here are the newsletters to analyze:

${newsletters
  .map(
    (newsletter) => `
=== NEWSLETTER ${newsletter.id} ===
FROM: ${newsletter.from}
SUBJECT: ${newsletter.subject}
CONTENT:
${newsletter.body}
===========================
`
  )
  .join("\n")}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192, // Increased for batch processing
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = msg.content[0].text;

    // Extract JSON from response
    const startIndex = responseText.indexOf("{");
    const endIndex = responseText.lastIndexOf("}");

    if (startIndex !== -1 && endIndex !== -1) {
      const jsonString = responseText.substring(startIndex, endIndex + 1);
      const batchResults = JSON.parse(jsonString);

      // Validate that all newsletters were processed
      const processedIds = Object.keys(batchResults);
      const expectedIds = newsletters.map((n) => n.id);

      for (const id of expectedIds) {
        if (!processedIds.includes(id)) {
          console.warn(`Newsletter ${id} missing from batch results, setting empty array`);
          batchResults[id] = [];
        }
      }

      return batchResults;
    } else {
      throw new Error("Could not find valid JSON in batch response");
    }
  } catch (error) {
    console.error("Error in batch processing:", error);
    throw error; // Re-throw to trigger fallback
  }
}

export async function generateReport(analyzedArticles, reportDate) {
  // Calculate category statistics and risk level
  const categoryStats = calculateCategoryStats(analyzedArticles);
  const riskLevel = calculateRiskLevel(analyzedArticles);
  const totalArticles = analyzedArticles.length;

  const prompt = `You are an expert blockchain researcher and product manager. Generate a comprehensive market intelligence report with enhanced structure and article-focused organization.

You have analyzed ${totalArticles} articles across ${
    categoryStats.categories.length
  } categories. Generate a structured report for ${reportDate}.

ARTICLE DATA:
${JSON.stringify(analyzedArticles, null, 2)}

CATEGORY BREAKDOWN:
${categoryStats.breakdown}

RISK ASSESSMENT: ${riskLevel}

The report must follow this EXACT structure:

# 🔗 Blockchain Market Intelligence Report for ${reportDate}

## 📊 Market Overview
- **Total Articles Analyzed**: ${totalArticles}
- **Key Categories**: ${categoryStats.summary}
- **Risk Level**: ${riskLevel}

## 🎯 Executive Summary
[Provide a strategic 3-4 sentence overview focusing on market trends, key themes, and actionable insights based on category patterns and risk assessment]

## 🏷️ Category Summary
${generateCategoryBreakdownPrompt(categoryStats)}

## 🚨 Priority Alerts
[List ONLY fatal and high importance items with full details - format as: ICON *<link|title>* (Source: name): summary]

## 📈 Key Findings
[List ALL articles sorted by importance (fatal → high → medium → low), showing category tags for each article. Each article should appear ONLY ONCE with all its categories as tags. Format each as: ICON [CATEGORY1] [CATEGORY2] *<link|title>* (Source: name): summary]

For category tags, use square brackets: [DEFI], [SECURITY], [REGULATION], [FUNDING], [MEME], [WALLET], etc.
For importance icons: fatal: 🚨, high: 🔥, medium: ⚠️, low: 📄
For links: *<primary_link|Title>* or just *Title* if no link
IMPORTANT: Each article must appear only once, even if it has multiple categories. Show all categories as tags on the single entry.

## 💡 Strategic Insights
[Provide 2-3 actionable insights for investors/researchers based on patterns across categories]

Return the complete report as markdown following this structure exactly.`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3072, // Increased for enhanced report
      messages: [{ role: "user", content: prompt }],
    });
    return msg.content[0].text;
  } catch (error) {
    console.error("Error generating report with Anthropic API:", error);
    return "Error: Could not generate the report.";
  }
}

function calculateCategoryStats(articles) {
  const categoryCount = {};
  const allCategories = new Set();

  articles.forEach((article) => {
    article.categories.forEach((category) => {
      categoryCount[category] = (categoryCount[category] || 0) + 1;
      allCategories.add(category);
    });
  });

  const categories = Array.from(allCategories);
  const summary = categories.map((cat) => `${cat.toUpperCase()} (${categoryCount[cat]})`).join(", ");

  const breakdown = categories.map((cat) => `• **${cat.toUpperCase()}**: ${categoryCount[cat]} articles`).join("\n");

  return {
    categories,
    count: categoryCount,
    summary,
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

function generateCategoryBreakdownPrompt(categoryStats) {
  return categoryStats.categories
    .map((category) => `### 🏷️ ${category.toUpperCase()} (${categoryStats.count[category]} articles)`)
    .join("\n");
}
