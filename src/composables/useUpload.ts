import { ref } from "vue";
import type { MediaType } from "@/types";

/**
 * Optional uploads through Cloudinary's free tier (no card needed).
 * Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET (an *unsigned* preset)
 * to enable the Upload button in /admin. Without them, media is added by URL or repo path.
 */
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const uploadsEnabled = Boolean(cloudName && uploadPreset);

const MAX_BYTES = 50 * 1024 * 1024;

export interface UploadResult {
  url: string;
  type: MediaType;
}

export function useUpload() {
  const progress = ref(0);
  const uploading = ref(false);

  function upload(file: File): Promise<UploadResult> {
    if (!uploadsEnabled) return Promise.reject(new Error("Uploads are not configured"));
    if (!/^(image|video)\//.test(file.type)) return Promise.reject(new Error("Only images and videos can be uploaded"));
    if (file.size > MAX_BYTES) return Promise.reject(new Error("The file is larger than 50 MB"));

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", uploadPreset!);
    form.append("folder", "portfolio");

    uploading.value = true;
    progress.value = 0;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) progress.value = Math.round((e.loaded / e.total) * 100);
      };
      xhr.onload = () => {
        uploading.value = false;
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) {
            resolve({ url: res.secure_url, type: res.resource_type === "video" ? "video" : "image" });
          } else {
            reject(new Error(res.error?.message ?? `Upload failed (${xhr.status})`));
          }
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => {
        uploading.value = false;
        reject(new Error("Network error during upload"));
      };
      xhr.send(form);
    });
  }

  return { upload, progress, uploading };
}
