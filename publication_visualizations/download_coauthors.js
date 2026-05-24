#!/usr/bin/env node

const fs = require("fs");

const authorName = process.argv.slice(2).join(" ").trim();
if (!authorName) {
  console.error('Usage: node dblp_coauthors_years.js "Your Name"');
  process.exit(1);
}

const OUTPUT_FILE = "coauthors_years.json";

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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function textOfFirstTag(xmlChunk, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xmlChunk.match(re);
  return m ? decodeHtmlEntities(m[1].trim()) : null;
}

function allTagTexts(xmlChunk, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  const out = [];
  let m;
  while ((m = re.exec(xmlChunk)) !== null) out.push(decodeHtmlEntities(m[1].trim()));
  return out;
}

// ---------- main ----------
(async () => {
  // 1) Resolve main author to DBLP profile
  const searchUrl =
    "https://dblp.org/search/author/api?" +
    new URLSearchParams({ q: authorName, format: "json", h: "5" });

  const search = await getJson(searchUrl);
  const hit = search?.result?.hits?.hit?.[0]?.info;

  if (!hit?.url) {
    console.error(`No DBLP author found for "${authorName}"`);
    process.exit(2);
  }

  const resolvedName = hit.author;
  const profileUrl = hit.url;
  const xmlUrl = profileUrl.endsWith(".xml") ? profileUrl : profileUrl + ".xml";

  // 2) Fetch author XML (publication list)
  const xml = await getText(xmlUrl);
  const records = xml.match(/<r>[\s\S]*?<\/r>/gi) || [];

  // 3) Build coauthor -> [{year}, ...]
  const coauthorYears = {}; // { "Name": [ {year: 2020}, ... ] }

  for (const r of records) {
    const yearRaw = textOfFirstTag(r, "year");
    if (!yearRaw) continue;

    const year = Number(yearRaw);
    if (Number.isNaN(year)) continue;

    const authors = allTagTexts(r, "author");
    if (!authors.length) continue;

    for (const a of authors) {
      if (a.toLowerCase() === resolvedName.toLowerCase()) continue;

      if (!coauthorYears[a]) coauthorYears[a] = [];
      coauthorYears[a].push({ year });
    }
  }

  // 4) Write output
  const result = {
    meta: {
      queriedAuthor: authorName,
      dblpResolvedName: resolvedName,
      dblpProfileUrl: profileUrl,
      publicationsParsed: records.length,
      coauthorCount: Object.keys(coauthorYears).length,
      note: "Each {year} entry corresponds to one shared publication (duplicates mean multiple papers in the same year).",
    },
    coauthors: coauthorYears,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf8");
  console.log(`Wrote coauthor-year mapping for ${result.meta.coauthorCount} coauthors to ${OUTPUT_FILE}`);
})().catch((err) => {
  console.error("Error:", err.stack || err);
  process.exit(99);
});
