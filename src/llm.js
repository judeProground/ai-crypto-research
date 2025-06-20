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
Then, for each identified article, create a structured analysis in a JSON object with the following keys: "title", "summary", "categories", "importance".

Follow these rules exactly:
- "title": Create a concise, descriptive title for the specific article.
- "summary": Provide an expert-level summary, including specific details and context. The summary must be 2-3 lines long.
- "categories": An array of strings. Choose from: [defi, security, regulation, wallet, funding, meme]. Suggest a new lowercase category if needed.
- "importance": Assign importance based on these criteria:
    - "fatal": Critical, widespread vulnerability; major hack (> $10M); major exchange insolvency.
    - "high": Significant new vulnerability; notable hack (< $10M); major regulatory action; new widespread scam.
    - "medium": New research paper; significant project launch/funding; notable legal development.
    - "low": General news; market analysis; opinion pieces; minor updates.

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

export async function generateReport(analyzedArticles) {
  const prompt = `You are an expert blockchain researcher and investor. You have analyzed several articles and now need to create a high-level summary report for your executive team.

The following is a JSON array of analyzed articles, each with a title, summary, categories, and importance level.

Your task is to generate a concise, insightful report that synthesizes the key findings. The report should have two sections:
1.  **Executive Summary**: A brief, high-level overview (3-4 sentences) of the most critical news and trends from the articles. Focus on what an investor or decision-maker needs to know.
2.  **Key Findings**: A bulleted list detailing the most important articles. Each bullet point should start with the article's importance level in brackets (e.g., [fatal], [high]) followed by its title and a one-sentence summary of the key takeaway. Prioritize the most important articles first.

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
