#!/usr/bin/env node

const fs = require("fs");

const authorName = process.argv.slice(2).join(" ").trim();
if (!authorName) {
  console.error('Usage: node dblp_publications_year_coauthors.js "Your Name"');
  process.exit(1);
}

const OUTPUT_FILE = "publications_year_coauthors.json";

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

function normalizeWhitespace(s) {
  return s.replace(/\s+/g, " ").trim();
}

// ---------- main ----------
(async () => {
  // 1) Resolve your DBLP profile (top hit)
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

  // 2) Fetch your author publication list as XML
  const xml = await getText(xmlUrl);
  const records = xml.match(/<r>[\s\S]*?<\/r>/gi) || [];

  // 3) Extract publications: year + coauthors (+ optional title)
  const publications = [];

  for (const r of records) {
    const yearRaw = textOfFirstTag(r, "year");
    if (!yearRaw) continue;
    const year = Number(yearRaw);
    if (Number.isNaN(year)) continue;

    const authors = allTagTexts(r, "author").map(normalizeWhitespace).filter(Boolean);
    if (!authors.length) continue;

    // coauthors = everyone except you (case-insensitive match)
    const coauthors = authors.filter(
      (a) => a.toLowerCase() !== resolvedName.toLowerCase()
    );

    // Optional but useful: title (keeps you sane when looking at the JSON)
    const titleRaw = textOfFirstTag(r, "title");
    const title = titleRaw ? normalizeWhitespace(titleRaw.replace(/\s*\.$/, "")) : null;

    // Optional: DBLP key if present (lets you uniquely identify the record)
    // Often appears as an attribute on the entry element, but inside <r> it’s inconsistent.
    // We'll try to grab the first "key=" occurrence in this record.
    const keyMatch = r.match(/\bkey="([^"]+)"/i);
    const dblpKey = keyMatch ? keyMatch[1] : null;

    publications.push({
      year,
      coauthors,
      ...(title ? { title } : {}),
      ...(dblpKey ? { dblpKey } : {}),
    });
  }

  const result = {
    meta: {
      queriedAuthor: authorName,
      dblpResolvedName: resolvedName,
      dblpProfileUrl: profileUrl,
      publicationsParsed: records.length,
      publicationsEmitted: publications.length,
    },
    publications,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf8");
  console.log(`Wrote ${publications.length} publications to ${OUTPUT_FILE}`);
})().catch((err) => {
  console.error("Error:", err.stack || err);
  process.exit(99);
});
