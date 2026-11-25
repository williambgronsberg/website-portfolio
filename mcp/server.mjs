#!/usr/bin/env node
// MCP server for williambgronsberg.no: lets an AI assistant write article DRAFTS.
//
// Draft-only by design: it can list, read, create and edit draft articles, but it
// cannot publish, unpublish or delete. Review and publish drafts at /admin.
//
// It signs in as a dedicated bot admin (PORTFOLIO_MCP_EMAIL / PORTFOLIO_MCP_PASSWORD),
// so Firestore security rules still apply. Revoke access by deleting the bot's
// admins/<uid> document in Firestore.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const SITE = "https://williambgronsberg.no";
const here = dirname(fileURLToPath(import.meta.url));

// ===== Firebase config: the same public web config the site uses =====
function readEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const env = readEnvFile(join(here, "..", ".env.production"));
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

let signedIn = null;
function ensureSignedIn() {
  const email = process.env.PORTFOLIO_MCP_EMAIL;
  const password = process.env.PORTFOLIO_MCP_PASSWORD;
  if (!email || !password) {
    throw new Error("Missing PORTFOLIO_MCP_EMAIL / PORTFOLIO_MCP_PASSWORD in the MCP server's environment.");
  }
  signedIn ??= signInWithEmailAndPassword(auth, email, password).catch((err) => {
    signedIn = null;
    throw new Error(`Sign-in failed: ${err.code ?? err.message}`);
  });
  return signedIn;
}

// ===== Helpers (same conventions as src/types.ts) =====
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const isVideo = (url) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.includes("/video/upload/");

function buildMeta(category, year) {
  const meta = [];
  if (category) meta.push({ label: "Category", value: category });
  if (year) meta.push({ label: "Year", value: String(year) });
  return meta;
}

function links(slug) {
  return {
    preview: `${SITE}/p/${slug}`,
    admin: `${SITE}/admin`,
    note: "Drafts are only visible when logged in at /admin. Publish from the admin panel.",
  };
}

const text = (value) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] });
const fail = (message) => ({ isError: true, content: [{ type: "text", text: message }] });

async function run(fn) {
  try {
    await ensureSignedIn();
    return await fn();
  } catch (err) {
    return fail(err.message ?? String(err));
  }
}

// ===== Server =====
const server = new McpServer({ name: "wbg-portfolio", version: "1.0.0" });

const articleFields = {
  summary: z.string().max(400).describe("Short text shown on the article card (1–2 sentences)."),
  body: z
    .string()
    .describe(
      'The article text. Plain text, NOT HTML or full Markdown. Blank line = new paragraph, "## " = heading, "### " = subheading, "> " = quote.'
    ),
  category: z.string().max(60).describe('Shown on the card, e.g. "AI", "Internship", "Web design".'),
  year: z.union([z.string(), z.number()]).describe("Shown on the card, e.g. 2026."),
  caption: z.string().max(80).describe("Small caption under the title on the article page."),
  thumbnail_url: z
    .string()
    .describe("Card image or video: a site path like /assets/img/photo.jpg or a full https:// URL."),
  thumbnail_alt: z.string().describe("Alt text for the thumbnail."),
  hero_url: z.string().describe("Big image at the top of the article page (defaults to the thumbnail)."),
  featured: z.boolean().describe("Show on the home page once published (default true)."),
};

server.registerTool(
  "list_articles",
  {
    title: "List articles",
    description: "List the portfolio's articles with their slug, title and status (draft or published).",
    inputSchema: { status: z.enum(["draft", "published", "all"]).default("all").optional() },
    annotations: { readOnlyHint: true },
  },
  ({ status = "all" }) =>
    run(async () => {
      const snap = await getDocs(query(collection(db, "items"), where("kind", "==", "article")));
      const list = snap.docs
        .map((d) => ({ slug: d.id, title: d.data().title, status: d.data().status, order: d.data().order ?? 0 }))
        .filter((a) => status === "all" || a.status === status)
        .sort((a, b) => a.order - b.order);
      return text(list.length ? list : "No articles.");
    })
);

server.registerTool(
  "get_article",
  {
    title: "Get article",
    description: "Read one article (draft or published) by slug, including its full text.",
    inputSchema: { slug: z.string() },
    annotations: { readOnlyHint: true },
  },
  ({ slug }) =>
    run(async () => {
      const snap = await getDoc(doc(db, "items", slug));
      if (!snap.exists() || snap.data().kind !== "article") return fail(`No article with slug "${slug}".`);
      const { createdAt, updatedAt, ...data } = snap.data();
      return text({ slug, ...data, updatedAt: updatedAt?.toDate?.().toISOString(), ...links(slug) });
    })
);

server.registerTool(
  "create_article_draft",
  {
    title: "Create article draft",
    description:
      "Create a new article on williambgronsberg.no as a DRAFT. It is not visible to visitors until it is published from /admin.",
    inputSchema: {
      title: z.string().min(1).max(140),
      slug: z.string().optional().describe("URL name (/p/<slug>). Generated from the title if left out."),
      summary: articleFields.summary,
      body: articleFields.body,
      category: articleFields.category.optional(),
      year: articleFields.year.optional(),
      caption: articleFields.caption.optional(),
      thumbnail_url: articleFields.thumbnail_url.optional(),
      thumbnail_alt: articleFields.thumbnail_alt.optional(),
      hero_url: articleFields.hero_url.optional(),
      featured: articleFields.featured.optional(),
    },
  },
  (args) =>
    run(async () => {
      const slug = slugify(args.slug || args.title);
      if (!slug) return fail("Could not make a slug from that title. Pass a slug.");
      const ref = doc(db, "items", slug);
      if ((await getDoc(ref)).exists()) return fail(`The slug "${slug}" is already used. Pick another slug.`);

      const articles = await getDocs(query(collection(db, "items"), where("kind", "==", "article")));
      const order = Math.max(0, ...articles.docs.map((d) => d.data().order ?? 0)) + 10;

      await setDoc(ref, {
        kind: "article",
        slug,
        title: args.title.trim(),
        summary: args.summary.trim(),
        body: args.body.trim(),
        meta: buildMeta(args.category, args.year ?? new Date().getFullYear()),
        thumb: args.thumbnail_url
          ? { type: isVideo(args.thumbnail_url) ? "video" : "image", url: args.thumbnail_url, alt: args.thumbnail_alt ?? args.title }
          : null,
        link: null,
        tags: [],
        hero: args.hero_url ?? "",
        caption: args.caption ?? "",
        lead: [],
        links: [],
        gallery: [],
        palette: [],
        sections: [],
        status: "draft",
        order,
        featured: args.featured ?? true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return text({ created: slug, status: "draft", ...links(slug) });
    })
);

server.registerTool(
  "update_article_draft",
  {
    title: "Update article draft",
    description:
      "Edit an existing DRAFT article. Only the fields you pass are changed. Published articles cannot be edited here (unpublish them in /admin first).",
    inputSchema: {
      slug: z.string(),
      title: z.string().min(1).max(140).optional(),
      summary: articleFields.summary.optional(),
      body: articleFields.body.optional(),
      category: articleFields.category.optional(),
      year: articleFields.year.optional(),
      caption: articleFields.caption.optional(),
      thumbnail_url: articleFields.thumbnail_url.optional(),
      thumbnail_alt: articleFields.thumbnail_alt.optional(),
      hero_url: articleFields.hero_url.optional(),
      featured: articleFields.featured.optional(),
    },
  },
  ({ slug, ...args }) =>
    run(async () => {
      const ref = doc(db, "items", slug);
      const snap = await getDoc(ref);
      if (!snap.exists() || snap.data().kind !== "article") return fail(`No article with slug "${slug}".`);
      const current = snap.data();
      if (current.status !== "draft") {
        return fail(`"${slug}" is published. This tool only edits drafts. Unpublish it in /admin first.`);
      }

      const fields = { updatedAt: serverTimestamp() };
      if (args.title !== undefined) fields.title = args.title.trim();
      if (args.summary !== undefined) fields.summary = args.summary.trim();
      if (args.body !== undefined) fields.body = args.body.trim();
      if (args.caption !== undefined) fields.caption = args.caption;
      if (args.hero_url !== undefined) fields.hero = args.hero_url;
      if (args.featured !== undefined) fields.featured = args.featured;
      if (args.category !== undefined || args.year !== undefined) {
        const old = Object.fromEntries((current.meta ?? []).map((m) => [m.label, m.value]));
        fields.meta = buildMeta(args.category ?? old.Category, args.year ?? old.Year);
      }
      if (args.thumbnail_url !== undefined) {
        fields.thumb = args.thumbnail_url
          ? {
              type: isVideo(args.thumbnail_url) ? "video" : "image",
              url: args.thumbnail_url,
              alt: args.thumbnail_alt ?? current.thumb?.alt ?? current.title,
            }
          : null;
      } else if (args.thumbnail_alt !== undefined && current.thumb) {
        fields.thumb = { ...current.thumb, alt: args.thumbnail_alt };
      }

      await updateDoc(ref, fields);
      const changed = Object.keys(fields).filter((k) => k !== "updatedAt");
      return text({ updated: slug, changed, status: "draft", ...links(slug) });
    })
);

await server.connect(new StdioServerTransport());
