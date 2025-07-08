import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
- "categories": An array of strings. Choose from: [defi, security, regulation, wallet, funding, meme]. Suggest a new lowercase category if needed.
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
      model: "claude-opus-4-20250514",
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

export async function generateReport(analyzedArticles, reportDate) {
  const prompt = `You are an expert blockchain researcher and investor. You have analyzed several articles and now need to create a high-level summary report for your executive team.

The following is a JSON array of analyzed articles. Your task is to generate a concise, insightful report for ${reportDate}.

The report must have the following sections:
1.  **Title**: The main title should be "🔗 Blockchain Market Intelligence Report for ${reportDate}".
2.  **Executive Summary**: A brief, high-level overview (3-4 sentences) of the most critical news and trends. To identify trends, pay close attention to recurring themes, categories, or specific entities mentioned across multiple articles. Synthesize these recurring topics into a cohesive narrative about the current state of the market.
3.  **Key Findings**: A bulleted list detailing the most important articles. The list must be sorted by importance ('fatal' first, then 'high', 'medium', 'low'). For each article, format the output *exactly* as follows: "[ICON] *<primary_link|Title>* (Source: [Source Name]): [One-sentence summary]".
    - For the link, use the format *<primary_link|Title>*. If 'primary_link' is null, just bold the title: *Title*.
    - Use a relevant emoji icon for the importance level: fatal: '🚨', high: '🔥', medium: '⚠️', low: '📄'.
    - For '[Source Name]', extract the human-readable name from the 'source' field (e.g., get "10x Research" from "10x Research <hi@update.10xresearch.com>").

Here is the data to summarize:
---
${JSON.stringify(analyzedArticles, null, 2)}
---

Return the report as a single block of Markdown text.`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    return msg.content[0].text;
  } catch (error) {
    console.error("Error generating report with Anthropic API:", error);
    return "Error: Could not generate the report.";
  }
}
