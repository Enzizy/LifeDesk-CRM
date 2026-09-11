// Last-resort social lookup: ask Gemini, grounded in Google Search, for the
// official profiles of a business. Runs only when neither the provider data
// nor the website produced them. Results are marked as found-via-search so
// the UI can say "verify" — a grounded model is good at this, not infallible.

import type { GoogleGenAI } from "@google/genai";
import { classifySocialUrl } from "./geoapify.ts";
import type { SocialNetwork, Socials } from "./geoapify.ts";

export type SocialSearchResult = {
  socials: Socials;
  /** Web sources the model cited, for the timeline / debugging. */
  sources: string[];
  queries: string[];
};

// Profile roots only. Posts, reels, share links and generic pages are noise.
const PROFILE_PATH = /^\/(?!(?:p|reel|reels|watch|video|photo|photos|sharer|share|share\.php|hashtag|explore|events|groups|login|policies|privacy|help)(?:\/|$))[A-Za-z0-9._-]{2,}\/?$/;

function profileUrl(candidate: string): { network: SocialNetwork; url: string } | null {
  const network = classifySocialUrl(candidate);
  if (!network) return null;
  try {
    const parsed = new URL(candidate);
    // Facebook's "profile.php?id=…" is a valid profile shape.
    const isFbId = /facebook\.com$/i.test(parsed.hostname) && parsed.pathname === "/profile.php" && parsed.searchParams.has("id");
    if (!isFbId && !PROFILE_PATH.test(parsed.pathname)) return null;
    parsed.hash = "";
    if (!isFbId) parsed.search = "";
    return { network, url: parsed.toString().replace(/\/$/, "") };
  } catch {
    return null;
  }
}

export async function searchSocials(
  ai: GoogleGenAI,
  model: string,
  business: { name: string; location: string; category: string },
): Promise<SocialSearchResult> {
  const response = await ai.models.generateContent({
    model,
    contents: [
      `Find the official social media profiles for this business:`,
      `Name: ${business.name}`,
      business.location ? `Location: ${business.location}` : "",
      business.category ? `Type: ${business.category}` : "",
      ``,
      `Return only URLs of the official Facebook page, Instagram account, and TikTok account that clearly belong to this exact business at this location. One URL per line. If you cannot find one with confidence, write NONE for that network. Do not guess.`,
    ].filter(Boolean).join("\n"),
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0,
    },
  });

  const text = response.text ?? "";
  const candidate = response.candidates?.[0];
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
  const queries = candidate?.groundingMetadata?.webSearchQueries ?? [];

  const socials: Socials = {};
  const sources: string[] = [];

  // Model-stated URLs first (it has read the results), then cited sources.
  const stated = text.match(/https?:\/\/[^\s"'<>)\]]+/g) ?? [];
  for (const raw of stated) {
    const hit = profileUrl(raw);
    if (hit && !socials[hit.network]) socials[hit.network] = hit.url;
  }
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    if (!uri) continue;
    sources.push(uri);
    const hit = profileUrl(uri);
    if (hit && !socials[hit.network]) socials[hit.network] = hit.url;
  }

  return { socials, sources: sources.slice(0, 8), queries };
}
