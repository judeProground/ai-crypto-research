/**
 * Defines the schema for a processed newsletter article.
 */
export const articleSchema = {
  source: "", // The origin of the article (e.g., sender's email)
  title: "", // The title of the article
  summary: "", // A generated summary of the article content (2-3 lines)
  categories: [], // An array of relevant categories (e.g., ['defi', 'security'])
  importance: "", // The assessed importance ('high', 'medium', 'low', 'fatal')
  timestamp: "", // ISO 8601 string of when the article was processed
  originalContent: "", // The full, original body of the newsletter
};

/**
 * Creates a new article object based on the schema.
 * @param {object} data - The data to populate the article with.
 * @returns {object} A new article object.
 */
export function createArticle(data) {
  const newArticle = { ...articleSchema, ...data };
  newArticle.timestamp = new Date().toISOString();
  return newArticle;
}
