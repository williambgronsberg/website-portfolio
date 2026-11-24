<script setup lang="ts">
import { ref } from "vue";

const open = ref(false);
</script>

<template>
  <input id="menu-icon" v-model="open" class="menu-icon" type="checkbox" name="menu-icon" />
  <label for="menu-icon" class="nav-btn" aria-label="Open menu">
    <span></span>
    <span></span>
  </label>

  <nav class="nav">
    <ul>
      <li><a href="#articles" @click="open = false">Articles</a></li>
      <li><a href="#projects" @click="open = false">Projects</a></li>
      <li><a href="/project-side-edge/service/" @click="open = false">Hire me</a></li>
    </ul>
  </nav>
</template>
