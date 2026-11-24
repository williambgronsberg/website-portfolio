import { emptyItem, type ItemInput, type Kind } from "@/types";

/**
 * The cards that were hard-coded in the old index.html.
 * Imported once from /admin ("Import existing content"), and shown as a fallback
 * when Firebase is not configured yet.
 */
function item(kind: Kind, order: number, fields: Partial<ItemInput>): ItemInput {
  return { ...emptyItem(kind), status: "published", featured: true, order, ...fields };
}

export const seedItems: ItemInput[] = [
  // ===== PROJECTS =====
  item("project", 10, {
    slug: "praksisrapport",
    title: "Praksisrapport",
    summary:
      "A report documenting my internship period at Edge Branding, frontend work, technologies and AI-assisted workflow.",
    meta: [
      { label: "Type", value: "Internship" },
      { label: "Tools", value: "CSS / AI / Frontend" },
    ],
    thumb: { type: "image", url: "/project-side-edge/edgerapport.jpg", alt: "Praksisrapport preview" },
    link: "/project-side-edge/",
    tags: ["internship", "web"],
  }),
  item("project", 20, {
    slug: "synapse",
    title: "Synapse",
    summary:
      "A clean concept project focused on visual style, layout and presenting an idea through a polished interface.",
    meta: [
      { label: "Type", value: "Concept" },
      { label: "Tools", value: "HTML / CSS" },
    ],
    thumb: { type: "image", url: "/project-side-edge/iPhone 15 Pro.jpg", alt: "Synapse project preview" },
    tags: ["web"],
  }),
  item("project", 30, {
    slug: "nerdy-cmd",
    title: "Nerdy-cmd",
    summary: "A terminal-inspired portfolio experience where users can explore projects with simple commands.",
    meta: [
      { label: "Type", value: "Web Experience" },
      { label: "Tools", value: "HTML / CSS / JS" },
    ],
    thumb: { type: "video", url: "/assets/img/one.mp4", alt: "Nerdy-cmd preview" },
    tags: ["web", "code"],
  }),
  item("project", 40, {
    slug: "frisk-as",
    title: "Frisk AS",
    summary: "A group project made with design, structure and functionality in mind.",
    meta: [
      { label: "Type", value: "Web App" },
      { label: "Tools", value: "PHP / CSS / JS" },
    ],
    thumb: { type: "image", url: "/project-side-edge/frisk_as_project/MacBook.png", alt: "Frisk AS project preview" },
    link: "/project-side-edge/frisk_as_project/",
    tags: ["web", "code", "school"],
  }),

  // ===== MOCKUPS =====
  item("mockup", 10, {
    slug: "desktop-view",
    title: "Desktop View",
    summary: "A clean desktop presentation showing layout, spacing and structure of the system.",
    meta: [
      { label: "Type", value: "Mockup" },
      { label: "Focus", value: "Desktop" },
    ],
    thumb: { type: "image", url: "/assets/img/webdesign.jpg", alt: "Desktop mockup" },
  }),
  item("mockup", 20, {
    slug: "mobile-view",
    title: "Mobile View",
    summary: "Mobile interface focusing on usability and responsive layout.",
    meta: [
      { label: "Type", value: "Mockup" },
      { label: "Focus", value: "Mobile" },
    ],
    thumb: { type: "image", url: "/project-side-edge/frisk_as_project/iphone_crm.png", alt: "Mobile mockup" },
  }),
  item("mockup", 30, {
    slug: "detail-view",
    title: "Detail View",
    summary: "Close-up presentation used to highlight smaller UI details and interactions.",
    meta: [
      { label: "Type", value: "Mockup" },
      { label: "Focus", value: "Details" },
    ],
    thumb: { type: "image", url: "/project-side-edge/iphone.jpg", alt: "Detail mockup" },
  }),
  item("mockup", 40, {
    slug: "report-layout",
    title: "Report Layout",
    summary: "A structured report layout showing typography, hierarchy and clean composition.",
    meta: [
      { label: "Type", value: "Mockup" },
      { label: "Focus", value: "Layout" },
    ],
    thumb: { type: "image", url: "/project-side-edge/edgerapport.jpg", alt: "Report mockup" },
  }),

  // ===== ARTICLES =====
  // These open as pages on the site (/p/<slug>). The old school site (imporsgrunn.no) is offline.
  item("article", 10, {
    slug: "edge-internship-report",
    title: "Edge Internship Report",
    summary:
      "A reflection and documentation article about internship work, frontend development and AI-assisted workflow.",
    meta: [
      { label: "Category", value: "Internship" },
      { label: "Year", value: "2026" },
    ],
    caption: "Internship Report",
    hero: "/project-side-edge/edge_seo.webp",
    body: [
      "This report documents my internship project at Edge Branding, where I worked with visual updates on an existing website. The focus of the report is not only the final result, but also the process, decisions, challenges and learning behind the work.",
      "The report explains how I approached the task, how I collaborated with designers, how I used AI as a support tool, and what I learned from working inside a real production environment.",
      "## Process",
      "In the report, I describe how I first analyzed the existing Statamic structure before making changes. I tested the visual updates manually on selected files so I could understand the pattern, then used AI tools to help apply similar changes more efficiently across the website.",
      "## Reflection",
      "A key part of the report is reflecting on how I worked. I learned that AI can be useful for repetitive tasks, but that I still need to understand the code myself to check quality, avoid mistakes and make sure the result matches the design.",
      "## Outcome",
      "The report shows how the project gave me experience with real-world frontend work, communication with designers and maintaining consistency in a larger codebase. The most important outcome was not just the visual update, but the understanding I gained from the process.",
    ].join("\n\n"),
  }),
  item("article", 20, {
    slug: "the-brain-that-builds-itself",
    title: "The Brain That Builds Itself",
    summary:
      "An article about the brain, how synapses work, my work builing an ai produkt with the human brain in the design",
    meta: [
      { label: "Category", value: "Ai Reserch" },
      { label: "Year", value: "2026" },
    ],
  }),
  item("article", 30, {
    slug: "ai-and-sustainability",
    title: "Artificial Intelligence and Sustainability",
    summary:
      "an article about how ai works, how it uses so much power, and my sulutions to how we can make the models run on less water to make it Sustainable",
    meta: [
      { label: "Category", value: "Ai" },
      { label: "Year", value: "2025" },
    ],
  }),
];
