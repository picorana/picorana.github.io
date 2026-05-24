#!/usr/bin/env node
/**
 * Usage:
 *   node dblp_venues_years_to_json.mjs "Your Name"
 *
 * Example:
 *   node dblp_venues_years_to_json.mjs "Sara Di Bartolomeo"
 */

import fs from "fs";

const authorName = process.argv.slice(2).join(" ").trim();
if (!authorName) {
  console.error('Usage: node dblp_venues_years_to_json.mjs "Your Name"');
  process.exit(1);
}

const OUTPUT_FILE = "dblp_venues_years.json";

// ---------- helpers ----------
async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, { headers: { Accept: "application/xml,text/xml" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function decodeHtmlEntities(s) {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function textOfFirstTag(xmlChunk, tag) {
  const m = xmlChunk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decodeHtmlEntities(m[1].trim()) : null;
}

// ---------- DBLP parsing ----------
function extractVenueYears(authorXml) {
  const records = authorXml.match(/<r>[\s\S]*?<\/r>/gi) ?? [];
  const venueMap = {};

  for (const r of records) {
    const yearRaw = textOfFirstTag(r, "year");
    if (!yearRaw) continue;

    const year = Number(yearRaw);
    if (Number.isNaN(year)) continue;

    const journal = textOfFirstTag(r, "journal");
    const booktitle = textOfFirstTag(r, "booktitle");
    const venue = journal || booktitle;

    if (!venue) continue;

    if (!venueMap[venue]) venueMap[venue] = [];
    venueMap[venue].push({ year });
  }

  return venueMap;
}

// ---------- main ----------
(async () => {
  // 1) Find author via DBLP search
  const searchUrl =
    "https://dblp.org/search/author/api?" +
    new URLSearchParams({
      q: authorName,
      format: "json",
      h: "5",
    });

  const searchResult = await getJson(searchUrl);
  const hits = searchResult?.result?.hits?.hit ?? [];

  if (!hits.length) {
    console.error(`No DBLP author found for "${authorName}"`);
    process.exit(2);
  }

  // Take top hit (same caveat as before: name ambiguity is a human problem)
  const authorInfo = hits[0].info;
  const profileUrl = authorInfo?.url;

  if (!profileUrl) {
    console.error("Author hit has no DBLP profile URL");
    process.exit(3);
  }

  // 2) Fetch author XML
  const xmlUrl = profileUrl.endsWith(".xml") ? profileUrl : `${profileUrl}.xml`;
  const authorXml = await getText(xmlUrl);

  // 3) Extract venue → [{year}, …]
  const venueYears = extractVenueYears(authorXml);

  // 4) Write JSON file
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(venueYears, null, 2),
    "utf8"
  );

  console.log(`Wrote ${Object.keys(venueYears).length} venues to ${OUTPUT_FILE}`);
})().catch((err) => {
  console.error("Error:", err?.stack || err);
  process.exit(99);
});
