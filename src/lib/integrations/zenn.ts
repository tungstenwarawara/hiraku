/**
 * Zenn Public API Integration
 *
 * Fetches article data from Zenn's public API.
 * Available metrics: liked_count, bookmarked_count, comments_count
 * Note: PV data is NOT available via public API.
 */

export interface ZennArticle {
  id: number;
  slug: string;
  title: string;
  emoji: string;
  article_type: string;
  liked_count: number;
  bookmarked_count: number;
  comments_count: number;
  body_letters_count: number;
  published_at: string;
  path: string;
  user: {
    username: string;
  };
}

interface ZennApiResponse {
  articles: ZennArticle[];
  next_page: number | null;
}

/**
 * Fetch all articles for a Zenn user
 */
export async function fetchZennArticles(
  username: string,
  maxPages = 5
): Promise<ZennArticle[]> {
  // Guard: empty username causes Zenn API to return ALL users' articles
  if (!username || !username.trim()) {
    console.warn("fetchZennArticles: username is empty, skipping API call");
    return [];
  }

  const articles: ZennArticle[] = [];
  let page = 1;

  while (page <= maxPages) {
    const url = `https://zenn.dev/api/articles?username=${encodeURIComponent(username)}&order=latest&page=${page}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "ContentPilot/0.1" },
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Zenn user "${username}" not found`);
      }
      throw new Error(`Zenn API error: ${res.status} ${res.statusText}`);
    }

    const data: ZennApiResponse = await res.json();
    articles.push(...data.articles);

    if (!data.next_page) break;
    page = data.next_page;

    // Rate limiting: 1 second between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return articles;
}

/**
 * Convert Zenn articles to metrics format for Supabase upsert
 */
export function zennArticlesToMetrics(
  userId: string,
  articles: ZennArticle[]
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
    const contentUrl = `https://zenn.dev${article.path}`;
    const contentId = article.slug;

    // Metrics for each article
    const metricTypes = [
      { type: "likes", value: article.liked_count },
      { type: "bookmarks", value: article.bookmarked_count },
      { type: "comments", value: article.comments_count },
    ];

    for (const m of metricTypes) {
      metrics.push({
        user_id: userId,
        platform: "zenn",
        content_id: contentId,
        content_url: contentUrl,
        content_title: article.title,
        metric_type: m.type,
        metric_value: m.value,
        collected_date: today,
      });
    }

    // Content record
    contents.push({
      user_id: userId,
      platform: "zenn",
      external_id: contentId,
      title: article.title,
      url: contentUrl,
      published_at: article.published_at,
      status: "published",
    });
  }

  return { metrics, contents };
}
