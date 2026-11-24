<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import MediaPicker from "@/components/admin/MediaPicker.vue";
import {
  KIND_LABELS,
  mediaTypeFromUrl,
  slugify,
  type ItemInput,
  type ItemStatus,
  type Kind,
  type MediaType,
} from "@/types";

const props = defineProps<{ initial: ItemInput; isNew: boolean; saving: boolean }>();
const emit = defineEmits<{ save: [item: ItemInput, status: ItemStatus]; cancel: [] }>();

// Work on a deep copy so Cancel leaves the original untouched.
const draft = reactive<ItemInput>(JSON.parse(JSON.stringify(props.initial)));

// Flat text versions of the list fields, easier to type into.
const thumbUrl = ref(draft.thumb?.url ?? "");
const thumbAlt = ref(draft.thumb?.alt ?? "");
const thumbType = ref<MediaType>(draft.thumb?.type ?? "image");
const leadText = ref(draft.lead.join("\n\n"));
const tagsText = ref(draft.tags.join(", "));
const paletteText = ref(draft.palette.join(", "));
const linkText = ref(draft.link ?? "");
const error = ref("");

// Auto-fill the slug from the title until the slug is edited by hand.
const slugTouched = ref(!props.isNew);
watch(
  () => draft.title,
  (title) => {
    if (!slugTouched.value) draft.slug = slugify(title);
  }
);

watch(thumbUrl, (url) => {
  if (url) thumbType.value = mediaTypeFromUrl(url);
});

const kinds = Object.keys(KIND_LABELS) as Kind[];
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const splitList = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const paletteInvalid = computed(() => splitList(paletteText.value).filter((h) => !HEX.test(h)));

function build(): ItemInput | null {
  error.value = "";
  const slug = slugify(draft.slug);
  if (!draft.title.trim()) return fail("Add a title");
  if (!slug) return fail("Add a slug");
  if (paletteInvalid.value.length) return fail(`Not a hex color: ${paletteInvalid.value.join(", ")}`);

  return {
    ...draft,
    slug,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    body: draft.body.trim(),
    link: linkText.value.trim() || null,
    thumb: thumbUrl.value
      ? { url: thumbUrl.value, alt: thumbAlt.value.trim() || draft.title.trim(), type: thumbType.value }
      : null,
    lead: leadText.value
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
    tags: splitList(tagsText.value).map((t) => t.toLowerCase()),
    palette: splitList(paletteText.value),
    meta: draft.meta.filter((m) => m.label.trim() || m.value.trim()),
    links: draft.links.filter((l) => l.url.trim()),
    gallery: draft.gallery.filter((g) => g.url.trim()),
    sections: draft.sections.filter((s) => s.heading.trim() || s.body.trim()),
  };
}

function fail(msg: string) {
  error.value = msg;
  return null;
}

function submit(status: ItemStatus) {
  const item = build();
  if (item) emit("save", item, status);
}

function onThumbUploaded(type: MediaType) {
  thumbType.value = type;
}
</script>

<template>
  <form class="item-form" @submit.prevent="submit(draft.status)">
    <h3 style="font-size: 20px; margin-bottom: 22px">{{ isNew ? "New item" : `Edit ${initial.title}` }}</h3>

    <!-- ===== CARD ===== -->
    <div class="form-row">
      <div class="form-group">
        <label for="f-kind">Section</label>
        <select id="f-kind" v-model="draft.kind" class="input">
          <option v-for="k in kinds" :key="k" :value="k">{{ KIND_LABELS[k] }}</option>
        </select>
      </div>
      <div class="form-group">
        <label for="f-title">Title</label>
        <input id="f-title" v-model="draft.title" class="input" required />
      </div>
    </div>

    <div class="form-group">
      <label for="f-slug">Slug</label>
      <input id="f-slug" v-model="draft.slug" class="input" @input="slugTouched = true" />
      <span class="form-hint">Page address: /p/{{ slugify(draft.slug) || "…" }}</span>
    </div>

    <div class="form-group">
      <label for="f-summary">Card text</label>
      <textarea id="f-summary" v-model="draft.summary" class="input" rows="3"></textarea>
    </div>

    <div class="form-group">
      <span class="form-label">Thumbnail (image or video)</span>
      <MediaPicker v-model="thumbUrl" @uploaded="onThumbUploaded" />
      <input v-model="thumbAlt" class="input" placeholder="Alt text (describes the image)" />
    </div>

    <fieldset class="form-fieldset">
      <legend>Card details</legend>
      <div v-for="(row, i) in draft.meta" :key="i" class="repeat-row">
        <input v-model="row.label" class="input" placeholder="Label (Type, Tools, Year…)" />
        <input v-model="row.value" class="input" placeholder="Value" />
        <button type="button" class="btn btn-icon btn-danger" aria-label="Remove" @click="draft.meta.splice(i, 1)">×</button>
      </div>
      <button type="button" class="btn" @click="draft.meta.push({ label: '', value: '' })">+ Add detail</button>
    </fieldset>

    <div class="form-group">
      <label for="f-link">Link (optional)</label>
      <input id="f-link" v-model="linkText" class="input" placeholder="https://… or /project-side-edge/…" />
      <span class="form-hint">
        If set, the card opens this link instead of its own page. Leave empty to open the page on your site.
        (Images go in Thumbnail above, not here.)
      </span>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="f-tags">Tags (filters on /projects)</label>
        <input id="f-tags" v-model="tagsText" class="input" placeholder="web, code, school" />
      </div>
      <div class="form-group">
        <span class="form-label">Visibility</span>
        <label class="form-check"><input v-model="draft.featured" type="checkbox" /> Show on the home page</label>
      </div>
    </div>

    <!-- ===== ARTICLE TEXT ===== -->
    <div class="form-group">
      <label for="f-body">{{ draft.kind === "article" ? "Article text" : "Main text (optional)" }}</label>
      <textarea
        id="f-body"
        v-model="draft.body"
        class="input"
        :rows="draft.kind === 'article' ? 18 : 6"
        placeholder="Write or paste the text here.

Leave a blank line between paragraphs.

## A heading

### A smaller heading

> A quote"
      ></textarea>
      <span class="form-hint">Blank line = new paragraph · "## " heading · "### " subheading · "> " quote</span>
    </div>

    <!-- ===== DETAIL PAGE ===== -->
    <fieldset class="form-fieldset">
      <legend>Detail page</legend>

      <div class="form-group">
        <span class="form-label">Hero image (defaults to the thumbnail)</span>
        <MediaPicker v-model="draft.hero" />
      </div>

      <div class="form-group">
        <label for="f-caption">Caption under the title</label>
        <input id="f-caption" v-model="draft.caption" class="input" placeholder="Internship Report" />
      </div>

      <div class="form-group">
        <label for="f-lead">Intro (blank line between paragraphs)</label>
        <textarea id="f-lead" v-model="leadText" class="input" rows="5"></textarea>
      </div>

      <span class="form-label">Links</span>
      <div v-for="(link, i) in draft.links" :key="`l${i}`" class="repeat-row">
        <input v-model="link.label" class="input" placeholder="Label (Website, Full report)" />
        <input v-model="link.url" class="input" placeholder="https://…" />
        <button type="button" class="btn btn-icon btn-danger" aria-label="Remove" @click="draft.links.splice(i, 1)">×</button>
      </div>
      <button type="button" class="btn" @click="draft.links.push({ label: '', url: '' })">+ Add link</button>

      <span class="form-label">Gallery</span>
      <div v-for="(img, i) in draft.gallery" :key="`g${i}`" class="repeat-block">
        <MediaPicker v-model="img.url" />
        <div class="repeat-row">
          <input v-model="img.alt" class="input" placeholder="Alt text" />
          <select v-model="img.size" class="input">
            <option value="wide">Full width</option>
            <option value="split">Half width</option>
          </select>
          <button type="button" class="btn btn-icon btn-danger" aria-label="Remove" @click="draft.gallery.splice(i, 1)">×</button>
        </div>
      </div>
      <button type="button" class="btn" @click="draft.gallery.push({ url: '', alt: '', size: 'split' })">+ Add image</button>

      <div class="form-group" style="margin-top: 8px">
        <label for="f-palette">Color palette (hex, comma separated)</label>
        <input id="f-palette" v-model="paletteText" class="input" placeholder="#42413D, #000000, #F0FE71" />
        <span v-if="paletteInvalid.length" class="form-hint" style="color: var(--accent-error)">
          Not valid: {{ paletteInvalid.join(", ") }}
        </span>
      </div>

      <span class="form-label">Text sections</span>
      <div v-for="(section, i) in draft.sections" :key="`s${i}`" class="repeat-block">
        <div class="repeat-row single">
          <input v-model="section.heading" class="input" placeholder="Heading (Process, Outcome…)" />
          <button type="button" class="btn btn-icon btn-danger" aria-label="Remove" @click="draft.sections.splice(i, 1)">×</button>
        </div>
        <textarea v-model="section.body" class="input" rows="4" placeholder="Text"></textarea>
      </div>
      <button type="button" class="btn" @click="draft.sections.push({ heading: '', body: '' })">+ Add section</button>
    </fieldset>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="form-actions">
      <button type="button" class="btn" :disabled="saving" @click="emit('cancel')">Cancel</button>
      <button type="button" class="btn" :disabled="saving" @click="submit('draft')">Save as draft</button>
      <button type="button" class="btn btn-primary" :disabled="saving" @click="submit('published')">
        {{ saving ? "Saving…" : "Publish" }}
      </button>
    </div>
  </form>
</template>
