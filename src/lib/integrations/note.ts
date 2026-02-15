/**
 * note Integration
 *
 * Primary: RSS feed for article list (official, stable)
 * Supplementary: JSON API for engagement metrics (unofficial, with fallback)
 *
 * Strategy:
 * 1. RSS provides reliable article metadata (title, URL, published date)
 * 2. JSON API supplements with likeCount, commentCount per article
 * 3. Profile API provides followerCount
 * If JSON API fails, RSS results are still preserved.
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

// ─── Supplementary JSON API (unofficial, with fallback) ─────

export interface NoteApiArticle {
  id: number;
  key: string;
  name: string;
  noteUrl: string;
  likeCount: number;
  commentCount: number;
  publishAt: string;
}

export interface NoteProfile {
  followerCount: number;
  followingCount: number;
  noteCount: number;
}

/**
 * Fetch note user profile via JSON API (unofficial)
 * Returns null on failure (fallback-safe)
 */
export async function fetchNoteProfile(
  username: string
): Promise<NoteProfile | null> {
  if (!username || !username.trim()) return null;

  try {
    const url = `https://note.com/api/v2/creators/${encodeURIComponent(username.trim())}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ContentPilot/0.1" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data;
    return {
      followerCount: data?.followerCount ?? 0,
      followingCount: data?.followingCount ?? 0,
      noteCount: data?.noteCount ?? 0,
    };
  } catch {
    console.warn("fetchNoteProfile: API failed (non-critical, using fallback)");
    return null;
  }
}

/**
 * Fetch note articles with engagement metrics via JSON API (unofficial)
 * Returns empty array on failure (fallback-safe)
 */
export async function fetchNoteApiArticles(
  username: string,
  maxPages = 3
): Promise<NoteApiArticle[]> {
  if (!username || !username.trim()) return [];

  try {
    const articles: NoteApiArticle[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const url = `https://note.com/api/v2/creators/${encodeURIComponent(username.trim())}/contents?kind=note&page=${page}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "ContentPilot/0.1" },
      });
      if (!res.ok) break;

      const json = await res.json();
      const notes = json.data?.contents ?? [];
      if (notes.length === 0) break;

      for (const n of notes) {
        articles.push({
          id: n.id,
          key: n.key ?? String(n.id),
          name: n.name ?? "",
          noteUrl: n.noteUrl ?? `https://note.com/${username}/n/${n.key}`,
          likeCount: n.likeCount ?? 0,
          commentCount: n.commentCount ?? 0,
          publishAt: n.publishAt ?? new Date().toISOString(),
        });
      }

      if (json.data?.isLastPage) break;

      // Rate limiting: 1 second between requests
      await new Promise((r) => setTimeout(r, 1000));
    }
    return articles;
  } catch {
    console.warn("fetchNoteApiArticles: API failed (non-critical, using RSS fallback)");
    return [];
  }
}

/**
 * Convert note profile to metrics (content_id = "__profile__")
 */
export function noteProfileToMetrics(
  userId: string,
  username: string,
  profile: NoteProfile
): Array<{
  user_id: string;
  platform: string;
  content_id: string;
  content_url: string;
  content_title: string;
  metric_type: string;
  metric_value: number;
  collected_date: string;
}> {
  const today = new Date().toISOString().split("T")[0];
  return [
    { type: "followers", value: profile.followerCount },
    { type: "articles_count", value: profile.noteCount },
  ].map((m) => ({
    user_id: userId,
    platform: "note",
    content_id: "__profile__",
    content_url: `https://note.com/${username}`,
    content_title: `${username} profile`,
    metric_type: m.type,
    metric_value: m.value,
    collected_date: today,
  }));
}

/**
 * Convert note API articles to metrics format
 */
export function noteApiArticlesToMetrics(
  userId: string,
  articles: NoteApiArticle[]
): {
  metrics: Array<{
    user_id: string;
    platform: string;
    content_id: string;
    content_url: string;
    content_title: string;
    metric_type: string;
    metric_value: number;
    collected_date: string;
  }>;
  contents: Array<{
    user_id: string;
    platform: string;
    external_id: string;
    title: string;
    url: string;
    published_at: string;
    status: string;
  }>;
} {
  const today = new Date().toISOString().split("T")[0];
  const metrics: Array<{
    user_id: string;
    platform: string;
    content_id: string;
    content_url: string;
    content_title: string;
    metric_type: string;
    metric_value: number;
    collected_date: string;
  }> = [];
  const contents: Array<{
    user_id: string;
    platform: string;
    external_id: string;
    title: string;
    url: string;
    published_at: string;
    status: string;
  }> = [];

  for (const article of articles) {
    const externalId = article.key;

    for (const m of [
      { type: "likes", value: article.likeCount },
      { type: "comments", value: article.commentCount },
    ]) {
      metrics.push({
        user_id: userId,
        platform: "note",
        content_id: externalId,
        content_url: article.noteUrl,
        content_title: article.name,
        metric_type: m.type,
        metric_value: m.value,
        collected_date: today,
      });
    }

    contents.push({
      user_id: userId,
      platform: "note",
      external_id: externalId,
      title: article.name,
      url: article.noteUrl,
      published_at: article.publishAt,
      status: "published",
    });
  }

  return { metrics, contents };
}
