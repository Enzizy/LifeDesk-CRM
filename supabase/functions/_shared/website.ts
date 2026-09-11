// Website evidence: visit a prospect's site and record what is actually there.
//
// Discovery providers tell us a business *has* a website; only fetching it
// tells us whether it works, whether the domain still belongs to them, and
// which social profiles it links to. Findings feed the qualification step so
// gaps are observed, not assumed.

import { SOCIAL_NETWORKS, classifySocialUrl } from "./geoapify.ts";
import type { SocialNetwork, Socials } from "./geoapify.ts";

export type WebsiteCheck = {
  url: string;
  reachable: boolean;
  status: number | null;
  finalUrl: string | null;
  /** Landed on a different registrable domain than requested. */
  offDomain: boolean;
  /** Off-domain redirect, or a title that reads as parked / gambling / for sale. */
  suspicious: boolean;
  title: string | null;
  https: boolean;
  hasViewport: boolean;
  socials: Socials;
  checkedAt: string;
  error?: string;
};

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 600_000;
const SUSPICIOUS_TITLE =
  /\b(slot|casino|jackpot|judi|togel|poker|betting|bet365|domain (is )?for sale|parked|buy this domain|coming soon|under construction|website expired|account suspended)\b/i;

/** "www.example.com" and "example.com" are the same site; subdomains are not. */
const registrable = (host: string) => host.toLowerCase().replace(/^www\./, "");

const hostOf = (url: string) => {
  try {
    return registrable(new URL(url).hostname);
  } catch {
    return "";
  }
};

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Social profile links on a page, first one per network, junk paths skipped. */
export function extractSocialLinks(html: string): Socials {
  const found: Socials = {};
  const re = /https?:\/\/(?:www\.|m\.)?(?:facebook\.com|fb\.com|fb\.me|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|linkedin\.com)\/[^\s"'<>)\\]+/gi;
  const junk = /\/(sharer|share|intent|plugins|dialog|login|tr\?|hashtag|explore|policies|privacy|legal|help)\b|\/(p|reel|reels|watch|video|photo)\//i;
  for (const match of html.match(re) ?? []) {
    const url = match.replace(/[.,;:]+$/, "");
    if (junk.test(url)) continue;
    const network = classifySocialUrl(url);
    if (network && !found[network]) found[network] = url;
    if (Object.keys(found).length === SOCIAL_NETWORKS.length) break;
  }
  return found;
}

export async function checkWebsite(rawUrl: string): Promise<WebsiteCheck> {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const base: WebsiteCheck = {
    url,
    reachable: false,
    status: null,
    finalUrl: null,
    offDomain: false,
    suspicious: false,
    title: null,
    https: url.startsWith("https://"),
    hasViewport: false,
    socials: {},
    checkedAt: new Date().toISOString(),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LifeDeskBot/1.0; +https://lifedesk.app)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      },
    });
    base.status = response.status;
    base.finalUrl = response.url || url;
    base.reachable = response.ok;
    base.https = base.finalUrl.startsWith("https://");
    base.offDomain = hostOf(base.finalUrl) !== hostOf(url);

    // Read a bounded slice; the head and nav are what we need.
    const reader = response.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let received = 0;
      while (received < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        received += value.byteLength;
        html += decoder.decode(value, { stream: true });
      }
      await reader.cancel().catch(() => undefined);
    }

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    base.title = titleMatch ? decodeEntities(titleMatch[1]).slice(0, 200) || null : null;
    base.hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    base.socials = extractSocialLinks(html);
    base.suspicious = base.offDomain || (base.title !== null && SUSPICIOUS_TITLE.test(base.title));
  } catch (error) {
    base.error =
      error instanceof Error && error.name === "AbortError"
        ? "Timed out"
        : "Could not connect";
  } finally {
    clearTimeout(timer);
  }
  return base;
}

/** Human gap lines derived from a website check; empty when the site is fine. */
export function websiteGaps(check: WebsiteCheck | null, hadWebsite: boolean): string[] {
  if (!hadWebsite) return ["No website listed"];
  if (!check) return [];
  if (!check.reachable) {
    return [check.status ? `Website is down (HTTP ${check.status})` : `Website unreachable (${check.error ?? "no response"})`];
  }
  const gaps: string[] = [];
  if (check.offDomain) {
    gaps.push(`Website redirects to an unrelated site (${hostOf(check.finalUrl ?? "")})`);
  } else if (check.suspicious) {
    gaps.push("Website looks parked or taken over");
  }
  if (!check.https) gaps.push("Website not on HTTPS");
  if (!check.hasViewport && !check.offDomain) gaps.push("Website not mobile-friendly");
  return gaps;
}

export const socialsFrom = (check: WebsiteCheck | null): Socials =>
  check && !check.offDomain ? check.socials : {};

export type { SocialNetwork };
