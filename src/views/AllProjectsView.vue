<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import ContentCard from "@/components/ContentCard.vue";
import { byKind, useContent } from "@/composables/useContent";
import { usePageEffects } from "@/composables/usePageEffects";
import type { Kind } from "@/types";

const props = withDefaults(defineProps<{ kind?: Kind }>(), { kind: "project" });

const COPY = {
  project: {
    title: ["All", "Projects"],
    side: "Project Archive",
    lead: [
      "This page gathers my projects in one clean overview. Each card shows the idea, role, tools and type of work behind the project.",
      "The focus is not only finished design, but also process, problem solving, technical choices and what I learned while building.",
    ],
    empty: "No projects here yet.",
  },
  article: {
    title: ["All", "Articles"],
    side: "Article Archive",
    lead: [
      "Articles, reflections and documentation from school, my internship and personal projects.",
      "They focus on development, design, workflow and what I learned along the way.",
    ],
    empty: "No articles here yet.",
  },
  mockup: {
    title: ["All", "Mockups"],
    side: "Mockup Archive",
    lead: [
      "How I present finished projects through clean mockups.",
      "The focus is clarity, spacing and consistency.",
    ],
    empty: "No mockups here yet.",
  },
} as const;
const copy = computed(() => COPY[props.kind]);

const router = useRouter();
const { published, publishedLoaded, subscribePublished } = useContent();
subscribePublished();

const projects = computed(() => byKind(published.value, props.kind));
const tags = computed(() => [...new Set(projects.value.flatMap((p) => p.tags))].sort());
const filter = ref("all");
const visible = computed(() =>
  filter.value === "all" ? projects.value : projects.value.filter((p) => p.tags.includes(filter.value))
);

function close() {
  if (window.history.state?.back) router.back();
  else router.push("/");
}

const root = ref<HTMLElement | null>(null);
usePageEffects(root, visible);
</script>

<template>
  <div ref="root">
    <button class="close-btn" aria-label="Close page" @click="close"><span></span><span></span></button>

    <div class="wrapper">
      <header class="ap-hero">
        <h1>{{ copy.title[0] }}<br />{{ copy.title[1] }}</h1>
      </header>

      <main class="d-grid">
        <aside class="d-side">
          <h1>{{ copy.side }}</h1>
          <p class="d-caption">Portfolio / 2025–2026</p>
        </aside>

        <section class="d-content">
          <div class="ap-intro">
            <p v-for="(text, i) in copy.lead" :key="i" class="d-lead">{{ text }}</p>
          </div>

          <div v-if="tags.length" class="ap-filters">
            <button class="ap-filter" :class="{ active: filter === 'all' }" @click="filter = 'all'">All</button>
            <button
              v-for="tag in tags"
              :key="tag"
              class="ap-filter"
              :class="{ active: filter === tag }"
              @click="filter = tag"
            >
              {{ tag }}
            </button>
          </div>

          <div class="projects">
            <ContentCard v-for="item in visible" :key="item.id" :item="item" />
          </div>
          <p v-if="publishedLoaded && !visible.length" class="ap-empty">{{ copy.empty }}</p>
        </section>
      </main>
    </div>
  </div>
</template>
