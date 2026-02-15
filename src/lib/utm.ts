import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export function generateShortCode(): string {
  return nanoid();
}

export function buildUtmUrl(
  originalUrl: string,
  params: {
    utm_source: string;
    utm_medium: string;
    utm_campaign?: string;
    utm_content?: string;
  }
): string {
  const url = new URL(originalUrl);
  url.searchParams.set("utm_source", params.utm_source);
  url.searchParams.set("utm_medium", params.utm_medium);
  if (params.utm_campaign) {
    url.searchParams.set("utm_campaign", params.utm_campaign);
  }
  if (params.utm_content) {
    url.searchParams.set("utm_content", params.utm_content);
  }
  return url.toString();
}
