<script setup lang="ts">
import { computed, ref } from "vue";
import SiteNav from "@/components/SiteNav.vue";
import SiteFooter from "@/components/SiteFooter.vue";
import EditorialSection from "@/components/EditorialSection.vue";
import { byKind, useContent } from "@/composables/useContent";
import { usePageEffects } from "@/composables/usePageEffects";

const { published, publishedLoaded, subscribePublished } = useContent();
subscribePublished();

const featured = computed(() => published.value.filter((i) => i.featured));
const projects = computed(() => byKind(featured.value, "project"));
const mockups = computed(() => byKind(featured.value, "mockup"));
const articles = computed(() => byKind(featured.value, "article"));

const root = ref<HTMLElement | null>(null);
usePageEffects(root, published);
</script>

<template>
  <div ref="root">
    <SiteNav />

    <div class="wrapper">
      <header class="hero">
        <div class="hero-title">
          <p class="caption">Portfolio · Web design · Development</p>

          <div class="breathe-animation">
            <h1>
              <!-- explicit space: Vue strips the newline between the spans -->
              <span>William B.</span>{{ " " }}<span>Groensberg</span>
            </h1>
          </div>
        </div>

        <div class="hero-info">
          <p class="caption">About</p>
          <p>
            I build clean, minimal and functional digital projects. My portfolio contains web design, frontend
            experiments, PHP systems, photography and school projects from VG1 and VG2.
          </p>
        </div>
      </header>

      <main>
        <EditorialSection
          id="projects"
          title="Selected work"
          label="Projects from school, internship work and personal experiments. The focus is clean interfaces, structure and practical development."
          :intro="[
            'This portfolio shows the work I have done with websites, systems, visual design and digital presentation.',
            'Each project has helped me understand design, code, structure and how to build something that works for real users.',
          ]"
          :items="projects"
          :loaded="publishedLoaded"
          :see-all="{ label: 'See all projects', to: '/projects' }"
        />

        <EditorialSection
          id="mockups"
          title="Mockup work"
          label="A visual part of my portfolio showing how I present finished projects through clean mockups."
          :intro="[
            'I use mockups to present projects in a realistic and structured way. This makes the work easier to understand and more professional.',
            'The focus is clarity, spacing and consistency — the same principles I use in my web design work.',
          ]"
          :items="mockups"
          :loaded="publishedLoaded"
        />

        <EditorialSection
          id="articles"
          title="Articles"
          label="Selected articles, reflections and written work from school and personal projects."
          :intro="[
            'A small collection of selected articles and documentation work.',
            'These articles focus on development, design, workflow and school projects.',
          ]"
          :items="articles"
          :loaded="publishedLoaded"
          :see-all="{ label: 'See all articles', to: '/articles' }"
        />
      </main>

      <SiteFooter />
    </div>
  </div>
</template>
