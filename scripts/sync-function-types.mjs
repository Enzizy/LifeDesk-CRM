// Mirrors the generated database types into supabase/functions/_shared so the
// Edge Functions can import them. `supabase functions deploy` only bundles
// files under supabase/, so the functions cannot reach into src/lib directly.
//
// Run automatically by `npm run supabase:types`.

import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "src/lib/database.types.ts";
const TARGET = "supabase/functions/_shared/database.types.ts";

const HEADER = [
  "// Generated from the linked Supabase project. Kept alongside the Edge Functions",
  "// so `supabase functions deploy` can bundle it without reaching outside",
  "// supabase/. Regenerate both copies with `npm run supabase:types`.",
  "",
  "",
].join("\n");

let source;
try {
  source = readFileSync(SOURCE, "utf8");
} catch {
  console.error(`sync-function-types: ${SOURCE} is missing. Generate it first.`);
  process.exit(1);
}

// Strip a UTF-8 BOM: the Supabase CLI emits one on Windows and Deno treats a
// BOM after the header comment as a syntax error.
writeFileSync(TARGET, HEADER + source.replace(/^﻿/, ""), "utf8");
console.log(`sync-function-types: wrote ${TARGET}`);
