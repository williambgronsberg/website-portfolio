import type { Timestamp } from "firebase/firestore";

export type Kind = "project" | "mockup" | "article";
export type MediaType = "image" | "video";
export type ItemStatus = "draft" | "published";
export type ToastType = "info" | "success" | "error";

export interface Media {
  type: MediaType;
  url: string;
  alt: string;
}

export interface MetaRow {
  label: string;
  value: string;
}

export interface LinkRow {
  label: string;
  url: string;
}

export interface GalleryImage {
  url: string;
  alt: string;
  size: "wide" | "split";
}

export interface Section {
  heading: string;
  body: string;
}

/** One card on the site. The Firestore doc id is the slug. */
export interface Item {
  id: string;
  kind: Kind;
  slug: string;
  title: string;
  summary: string;
  meta: MetaRow[];
  thumb: Media | null;
  /** External or legacy URL. When empty, the card opens /p/:slug. */
  link: string | null;
  tags: string[];

  // Detail page (/p/:slug), same layout as the Edge report page
  hero: string;
  caption: string;
  lead: string[];
  links: LinkRow[];
  gallery: GalleryImage[];
  palette: string[];
  sections: Section[];
  /** Long-form text (articles). Blank line = new paragraph, "## " = heading, "### " = subheading. */
  body: string;

  status: ItemStatus;
  order: number;
  /** Shown on the home page. */
  featured: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type ItemInput = Omit<Item, "id" | "createdAt" | "updatedAt">;

export const KIND_LABELS: Record<Kind, string> = {
  project: "Projects",
  mockup: "Mockups",
  article: "Articles",
};

export function emptyItem(kind: Kind = "project"): ItemInput {
  return {
    kind,
    slug: "",
    title: "",
    summary: "",
    meta: [
      { label: "Type", value: "" },
      { label: "Tools", value: "" },
    ],
    thumb: null,
    link: null,
    tags: [],
    hero: "",
    caption: "",
    lead: [],
    links: [],
    gallery: [],
    palette: [],
    sections: [],
    body: "",
    status: "draft",
    order: 0,
    featured: true,
  };
}

/** Fills missing fields so older/partial docs never crash the views. */
export function normalizeItem(id: string, data: Partial<Item>): Item {
  return { ...emptyItem(data.kind ?? "project"), ...data, id, slug: data.slug || id } as Item;
}

export function slugify(text: string): string {
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

export function isExternal(url: string): boolean {
  return /^(https?:)?\/\//.test(url) || url.startsWith("mailto:");
}

export function mediaTypeFromUrl(url: string): MediaType {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.includes("/video/upload/") ? "video" : "image";
}

export type BodyBlock = { type: "h2" | "h3" | "p" | "quote"; text: string };

/** Splits article text into headings and paragraphs. Plain text only, never HTML. */
export function parseBody(body: string): BodyBlock[] {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("### ")) return { type: "h3", text: block.slice(4).trim() };
      if (block.startsWith("## ")) return { type: "h2", text: block.slice(3).trim() };
      if (block.startsWith("> ")) return { type: "quote", text: block.replace(/^> ?/gm, "").trim() };
      return { type: "p", text: block };
    });
}
