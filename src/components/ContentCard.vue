<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import type { Item } from "@/types";

const props = defineProps<{ item: Item }>();

// Items with a link go there with a full page load (legacy static pages, external articles).
// Items without one open their detail page in the app.
const tag = computed(() => (props.item.link ? "a" : RouterLink));
const attrs = computed(() =>
  props.item.link
    ? { href: props.item.link }
    : { to: { name: "item", params: { slug: props.item.slug } } }
);
</script>

<template>
  <component :is="tag" v-bind="attrs" class="project" data-aos="fade-up">
    <div v-if="item.thumb?.url" class="thumb">
      <video v-if="item.thumb.type === 'video'" autoplay loop muted playsinline :aria-label="item.thumb.alt">
        <source :src="item.thumb.url" />
      </video>
      <img v-else :src="item.thumb.url" :alt="item.thumb.alt" loading="lazy" />
    </div>

    <div class="project-info">
      <div class="project-top">
        <h3>{{ item.title }}</h3>
        <span class="arrow">›</span>
      </div>

      <p>{{ item.summary }}</p>

      <div v-if="item.meta.length" class="meta">
        <div v-for="(row, i) in item.meta" :key="i">
          <span class="caption">{{ row.label }}</span>
          <strong>{{ row.value }}</strong>
        </div>
      </div>
    </div>
  </component>
</template>
