<script setup lang="ts">
import type { Item } from "@/types";
import ContentCard from "@/components/ContentCard.vue";

defineProps<{
  id: string;
  title: string;
  label: string;
  intro: [string, string];
  items: Item[];
  loaded: boolean;
  seeAll?: { label: string; href?: string; to?: string };
}>();
</script>

<template>
  <section :id="id" class="editorial-section">
    <aside class="sticky-label">
      <h2>{{ title }}</h2>
      <p>{{ label }}</p>
    </aside>

    <div class="section-content reveal">
      <div class="intro-grid">
        <p>{{ intro[0] }}</p>
        <p>{{ intro[1] }}</p>
      </div>

      <div class="projects">
        <ContentCard v-for="item in items" :key="item.id" :item="item" />
      </div>

      <div v-if="seeAll" class="see-all-wrap" data-aos="fade-up">
        <RouterLink v-if="seeAll.to" :to="seeAll.to" class="see-all-btn">
          <span>{{ seeAll.label }}</span>
          <span>›</span>
        </RouterLink>
        <a v-else :href="seeAll.href" class="see-all-btn">
          <span>{{ seeAll.label }}</span>
          <span>›</span>
        </a>
      </div>
    </div>
  </section>
</template>
