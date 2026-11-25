// Runs after `vite build`. Writes a real HTML file for every page so that:
//  1. GitHub Pages answers 200 instead of 404 for /projects, /articles, /p/<slug> …
//     (link-preview bots such as Microsoft Teams ignore pages that return 404), and
//  2. every project/article gets its own title, description and image in link previews.
//
// GitHub Pages serves dist/p/<slug>.html at /p/<slug> with no redirect.
// Items published after the last build still open fine (through 404.html); the
// scheduled workflow rebuilds regularly so they get their own preview too.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadEnv } from "vite";

const SITE = "https://williambgronsberg.no";
const DIST = "dist";
const DEFAULT_IMAGE = `${SITE}/assets/og-image.png`;

const template = readFileSync(join(DIST, "index.html"), "utf8");
const env = loadEnv("production", process.cwd(), "VITE_");

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function absoluteUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return encodeURI(decodeURI(url));
  if (url.startsWith("/")) return SITE + encodeURI(decodeURI(url));
  return null;
}

/** Replaces the content="" of a meta tag (by property= or name=) in the template. */
function setMeta(html, key, value) {
  const re = new RegExp(`(<meta (?:property|name)="${key}" content=")[^"]*(")`);
  return html.replace(re, `$1${escapeHtml(value)}$2`);
}

function render({ path, title, description, image, imageIsDefault }) {
  const url = SITE + path;
  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  html = setMeta(html, "description", description);
  for (const key of ["og:title", "twitter:title"]) html = setMeta(html, key, title);
  for (const key of ["og:description", "twitter:description"]) html = setMeta(html, key, description);
  for (const key of ["og:image", "twitter:image"]) html = setMeta(html, key, image);
  html = setMeta(html, "og:url", url);
  html = setMeta(html, "og:image:alt", title);
  if (path.startsWith("/p/")) html = setMeta(html, "og:type", "article");
  // Width/height only describe the default 1200×630 card.
  if (!imageIsDefault) html = html.replace(/\s*<meta property="og:image:(width|height)" content="\d+">/g, "");
  return html;
}

function write(path, html) {
  const file = join(DIST, `${path.replace(/^\//, "")}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  return file;
}

// ===== Fixed pages =====
const NAME = "William Berge Grønsberg";
const pages = [
  { path: "/projects", title: `All projects · ${NAME}`, description: "Every project: web design, frontend, school and internship work." },
  { path: "/articles", title: `Articles · ${NAME}`, description: "Articles, reflections and documentation from school, internship and personal projects." },
  { path: "/login", title: `Admin · ${NAME}`, description: "Admin login." },
  { path: "/admin", title: `Admin · ${NAME}`, description: "Admin." },
];
for (const page of pages) write(page.path, render({ ...page, image: DEFAULT_IMAGE, imageIsDefault: true }));

// ===== One page per published item (from Firestore) =====
const fromValue = (v) =>
  v == null ? null
  : "stringValue" in v ? v.stringValue
  : "booleanValue" in v ? v.booleanValue
  : "integerValue" in v ? Number(v.integerValue)
  : "doubleValue" in v ? v.doubleValue
  : "nullValue" in v ? null
  : "mapValue" in v ? Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, fromValue(x)]))
  : "arrayValue" in v ? (v.arrayValue.values ?? []).map(fromValue)
  : null;

async function publishedItems() {
  const project = env.VITE_FIREBASE_PROJECT_ID;
  const key = env.VITE_FIREBASE_API_KEY;
  if (!project || !key) throw new Error("No Firebase config in .env.production");
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "items" }],
          where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "published" } } },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  return rows
    .filter((r) => r.document)
    .map((r) => ({
      slug: r.document.name.split("/").pop(),
      ...Object.fromEntries(Object.entries(r.document.fields).map(([k, v]) => [k, fromValue(v)])),
    }));
}

try {
  const items = await publishedItems();
  for (const item of items) {
    // Items that link elsewhere never open /p/<slug>, but a page is harmless and keeps old links working.
    const thumb = item.thumb?.type === "image" ? item.thumb.url : null;
    const hero = item.hero && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(item.hero) ? item.hero : null;
    const image = absoluteUrl(hero) ?? absoluteUrl(thumb) ?? DEFAULT_IMAGE;
    const description = (item.summary || "").trim() || `${item.title} by ${NAME}.`;
    write(`/p/${item.slug}`, render({
      path: `/p/${item.slug}`,
      title: `${item.title} · ${NAME}`,
      description,
      image,
      imageIsDefault: image === DEFAULT_IMAGE,
    }));
  }
  console.log(`prerender: ${pages.length} pages + ${items.length} items`);
} catch (err) {
  // Never fail the deploy over this: those pages still open through 404.html.
  console.warn(`prerender: skipped items (${err.message})`);
}
