<script setup lang="ts">
import { provide, ref } from "vue";
import type { ToastType } from "@/types";

const toast = ref<{ message: string; type: ToastType } | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

function showToast(message: string, type: ToastType = "info") {
  toast.value = { message, type };
  clearTimeout(timer);
  timer = setTimeout(() => (toast.value = null), type === "error" ? 4000 : 1600);
}

provide("showToast", showToast);
</script>

<template>
  <RouterView />
  <div class="toast" :class="[toast?.type, { show: toast }]" role="status" aria-live="polite">
    {{ toast?.message }}
  </div>
</template>
