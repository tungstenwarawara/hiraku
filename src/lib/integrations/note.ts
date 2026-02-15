/**
 * note RSS Integration
 *
 * Fetches article list from note's official RSS feed.
 * Only article metadata is available (title, URL, published date).
 * Metrics (likes, comments) are NOT available via RSS.
 */

export interface NoteArticle {
  title: string;
  url: string;
  publishedAt: string;
  externalId: string;
}

/**
 * Fetch articles from a note user's RSS feed
 */
export async function fetchNoteArticles(
  username: string
): Promise<NoteArticle[]> {
  const rssUrl = `https://note.com/${encodeURIComponent(username)}/rss`;

  const res = await fetch(rssUrl, {
    headers: { "User-Agent": "ContentPilot/0.1" },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`note user "${username}" not found`);
    }
    throw new Error(`note RSS error: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  return parseNoteRss(xml);
}

/**
 * Parse note RSS XML into article objects
 * Simple XML parsing without external dependencies
 */
function parseNoteRss(xml: string): NoteArticle[] {
  const articles: NoteArticle[] = [];

  // Match each <item> block
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");

    if (!title || !link) continue;

    // Extract external ID from URL: https://note.com/username/n/nXXXXX
    const idMatch = link.match(/\/n\/([a-zA-Z0-9]+)/);
    const externalId = idMatch ? idMatch[1] : link;

    articles.push({
      title: decodeHtmlEntities(title),
      url: link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      externalId,
    });
  }

  return articles;
}

/**
 * Extract text content from an XML tag
 */
function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`);
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular text content
  const textRegex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const textMatch = xml.match(textRegex);
  if (textMatch) return textMatch[1].trim();

  return null;
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

/**
 * Convert note articles to contents format for Supabase upsert
 */
export function noteArticlesToContents(
  userId: string,
  articles: NoteArticle[]
): Array<{
  user_id: string;
  platform: string;
  external_id: string;
  title: string;
  url: string;
  published_at: string;
  status: string;
}> {
  return articles.map((article) => ({
    user_id: userId,
    platform: "note",
    external_id: article.externalId,
    title: article.title,
    url: article.url,
    published_at: article.publishedAt,
    status: "published",
  }));
}
