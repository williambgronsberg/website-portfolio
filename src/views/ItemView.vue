<script setup lang="ts">
import { computed, inject, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useContent } from "@/composables/useContent";
import { useAuth } from "@/composables/useAuth";
import { isExternal, mediaTypeFromUrl, parseBody, type Item, type ToastType } from "@/types";

const props = defineProps<{ slug: string }>();

const router = useRouter();
const showToast = inject<(msg: string, type?: ToastType) => void>("showToast")!;
const { getItem } = useContent();
const { whenReady } = useAuth();

const item = ref<Item | null>(null);
const loading = ref(true);

async function load(slug: string) {
  loading.value = true;
  await whenReady(); // so an admin can preview drafts
  try {
    item.value = await getItem(slug);
  } catch (err) {
    console.error(err);
    item.value = null;
  }
  loading.value = false;
  if (item.value) document.title = `${item.value.title} · William Berge Grønsberg`;
}

watch(() => props.slug, load, { immediate: true });

// The detail page falls back to the card's content, so every item has a decent page.
const heroUrl = computed(() => item.value?.hero || item.value?.thumb?.url || "");
const heroIsVideo = computed(() => !!heroUrl.value && mediaTypeFromUrl(heroUrl.value) === "video");
const lead = computed(() => {
  const l = item.value?.lead.filter(Boolean) ?? [];
  return l.length ? l : item.value?.summary ? [item.value.summary] : [];
});
const body = computed(() => parseBody(item.value?.body ?? ""));
const leadColumns = computed(() => {
  const half = Math.ceil(lead.value.length / 2);
  return [lead.value.slice(0, half), lead.value.slice(half)].filter((c) => c.length);
});

function close() {
  if (window.history.state?.back) router.back();
  else router.push("/");
}

async function copyHex(hex: string) {
  try {
    await navigator.clipboard.writeText(hex);
  } catch {
    const input = document.createElement("input");
    input.value = hex;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  showToast(`${hex} copied`);
}
</script>

<template>
  <button class="close-btn" aria-label="Close project" @click="close"><span></span><span></span></button>

  <div v-if="loading" class="wrapper d-empty"><p class="d-caption">Loading…</p></div>

  <div v-else-if="!item" class="wrapper d-empty">
    <h1>Not found</h1>
    <RouterLink to="/">Back to portfolio ›</RouterLink>
  </div>

  <div v-else class="wrapper">
    <div v-if="heroUrl" class="d-hero">
      <video v-if="heroIsVideo" :src="heroUrl" autoplay loop muted playsinline></video>
      <img v-else :src="heroUrl" :alt="item.thumb?.alt || item.title" />
    </div>

    <main class="d-grid">
      <aside class="d-side">
        <h1>{{ item.title }}</h1>
        <p v-if="item.caption" class="d-caption">{{ item.caption }}</p>
        <span v-if="item.status === 'draft'" class="d-draft-badge">Draft · only visible to you</span>
      </aside>

      <section class="d-content">
        <div v-if="leadColumns.length" class="d-top">
          <div v-for="(column, c) in leadColumns" :key="c">
            <p v-for="(text, i) in column" :key="i" class="d-lead">{{ text }}</p>
          </div>
        </div>

        <div v-if="item.meta.length" class="d-meta">
          <div v-for="(row, i) in item.meta" :key="i">
            <p class="d-caption">{{ row.label }}</p>
            <p>{{ row.value.split(" / ").join("\n") }}</p>
          </div>
        </div>

        <div v-if="item.links.length || item.link" class="d-links">
          <a
            v-if="item.link"
            :href="item.link"
            class="d-link"
            :target="isExternal(item.link) ? '_blank' : undefined"
            rel="noopener"
          >
            <span class="d-caption">Open project</span><span>›</span>
          </a>
          <a
            v-for="(link, i) in item.links"
            :key="i"
            :href="link.url"
            class="d-link"
            :target="isExternal(link.url) ? '_blank' : undefined"
            rel="noopener"
          >
            <span class="d-caption">{{ link.label }}</span><span>›</span>
          </a>
        </div>

        <article v-if="body.length" class="d-article">
          <template v-for="(block, i) in body" :key="i">
            <h2 v-if="block.type === 'h2'">{{ block.text }}</h2>
            <h3 v-else-if="block.type === 'h3'">{{ block.text }}</h3>
            <blockquote v-else-if="block.type === 'quote'">{{ block.text }}</blockquote>
            <p v-else>{{ block.text }}</p>
          </template>
        </article>

        <div v-if="item.gallery.length || item.palette.length" class="d-gallery">
          <div v-for="(img, i) in item.gallery" :key="i" class="d-img" :class="img.size">
            <video v-if="mediaTypeFromUrl(img.url) === 'video'" :src="img.url" autoplay loop muted playsinline></video>
            <img v-else :src="img.url" :alt="img.alt" loading="lazy" />
          </div>
          <div v-if="item.palette.length" class="d-img split">
            <div class="d-color-card" aria-label="Project color palette">
              <button
                v-for="hex in item.palette"
                :key="hex"
                class="d-color-stripe"
                :style="{ background: hex }"
                :data-hex="hex"
                :aria-label="`Copy ${hex}`"
                @click="copyHex(hex)"
              ></button>
            </div>
          </div>
        </div>

        <section v-for="(section, i) in item.sections" :key="i" class="d-section">
          <h2>{{ section.heading }}</h2>
          <p>{{ section.body }}</p>
        </section>
      </section>
    </main>
  </div>
</template>
