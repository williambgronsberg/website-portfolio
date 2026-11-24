<script setup lang="ts">
import { inject, ref } from "vue";
import { uploadsEnabled, useUpload } from "@/composables/useUpload";
import { mediaTypeFromUrl, type MediaType, type ToastType } from "@/types";

/** A media URL field: paste a repo path (/assets/img/x.jpg) or a link, or upload to Cloudinary if configured. */
const url = defineModel<string>({ required: true });
const props = defineProps<{ accept?: string; placeholder?: string }>();
const emit = defineEmits<{ uploaded: [type: MediaType] }>();

const showToast = inject<(msg: string, type?: ToastType) => void>("showToast")!;
const { upload, progress, uploading } = useUpload();
const fileInput = ref<HTMLInputElement | null>(null);

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const result = await upload(file);
    url.value = result.url;
    emit("uploaded", result.type);
    showToast("Uploaded", "success");
  } catch (err: any) {
    showToast(err.message ?? "Upload failed", "error");
  } finally {
    if (fileInput.value) fileInput.value.value = "";
  }
}
</script>

<template>
  <div class="media-picker">
    <div class="media-picker-row">
      <input
        v-model.trim="url"
        class="input"
        type="text"
        :placeholder="props.placeholder ?? '/assets/img/photo.jpg or https://…'"
      />
      <template v-if="uploadsEnabled">
        <input ref="fileInput" type="file" hidden :accept="accept ?? 'image/*,video/*'" @change="onFile" />
        <button type="button" class="btn" :disabled="uploading" @click="fileInput?.click()">
          {{ uploading ? `${progress}%` : "Upload" }}
        </button>
      </template>
    </div>
    <div v-if="uploading" class="media-progress"><span :style="{ width: `${progress}%` }"></span></div>
    <div v-if="url" class="media-preview">
      <video v-if="mediaTypeFromUrl(url) === 'video'" :src="url" muted autoplay loop playsinline></video>
      <img v-else :src="url" alt="" />
    </div>
  </div>
</template>
