<script setup lang="ts">
import { computed, inject, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { byKind, useContent } from "@/composables/useContent";
import { uploadsEnabled } from "@/composables/useUpload";
import BaseSheet from "@/components/BaseSheet.vue";
import ConfirmSheet from "@/components/ConfirmSheet.vue";
import ItemForm from "@/components/admin/ItemForm.vue";
import { emptyItem, KIND_LABELS, type Item, type ItemInput, type ItemStatus, type Kind, type ToastType } from "@/types";
import "@/admin.css";

const router = useRouter();
const showToast = inject<(msg: string, type?: ToastType) => void>("showToast")!;
const { currentUser, logout } = useAuth();
const { allItems, allLoaded, subscribeAll, unsubscribeAll, saveItem, deleteItem, updateFields, move, nextOrder, importSeed } =
  useContent();

subscribeAll();
onUnmounted(unsubscribeAll);

const kinds = Object.keys(KIND_LABELS) as Kind[];
const activeKind = ref<Kind>("project");
const list = computed(() => byKind(allItems.value, activeKind.value));
const counts = computed(() =>
  Object.fromEntries(kinds.map((k) => [k, allItems.value.filter((i) => i.kind === k).length])) as Record<Kind, number>
);

// ===== EDIT SHEET =====
const editing = ref<{ initial: ItemInput; previousSlug?: string } | null>(null);
const saving = ref(false);

function toInput(item: Item): ItemInput {
  const { id, createdAt, updatedAt, ...rest } = item;
  return rest;
}

function openNew() {
  editing.value = { initial: { ...emptyItem(activeKind.value), order: nextOrder(activeKind.value) } };
}

function openEdit(item: Item) {
  editing.value = { initial: toInput(item), previousSlug: item.slug };
}

async function handleSave(input: ItemInput, status: ItemStatus) {
  if (!editing.value) return;
  saving.value = true;
  try {
    // Moving an item to another section puts it at the end of that section.
    const kindChanged = editing.value.initial.kind !== input.kind;
    const item = { ...input, status, order: kindChanged ? nextOrder(input.kind) : input.order };
    await saveItem(item, editing.value.previousSlug);
    showToast(status === "published" ? "Published" : "Saved as draft", "success");
    activeKind.value = input.kind;
    editing.value = null;
  } catch (err: any) {
    showToast(err.message ?? "Could not save", "error");
  } finally {
    saving.value = false;
  }
}

// ===== QUICK ACTIONS =====
async function run(action: () => Promise<unknown>, success: string) {
  try {
    await action();
    showToast(success, "success");
  } catch (err: any) {
    showToast(err.message ?? "Something went wrong", "error");
  }
}

const toggleStatus = (item: Item) =>
  run(
    () => updateFields(item.id, { status: item.status === "published" ? "draft" : "published" }),
    item.status === "published" ? "Unpublished" : "Published"
  );

const toggleFeatured = (item: Item) =>
  run(() => updateFields(item.id, { featured: !item.featured }), item.featured ? "Hidden from home" : "Shown on home");

// ===== CONFIRM =====
const confirmState = ref<{ title: string; message: string; confirmLabel: string; onConfirm: () => void } | null>(null);

function askDelete(item: Item) {
  confirmState.value = {
    title: `Delete ${item.title}?`,
    message: "This removes it from the site. It cannot be undone.",
    confirmLabel: "Delete",
    onConfirm: () => run(() => deleteItem(item.id), "Deleted"),
  };
}

function askImport() {
  confirmState.value = {
    title: "Import existing content?",
    message: "Adds the 11 cards from the old site. Items that already exist are skipped.",
    confirmLabel: "Import",
    onConfirm: async () => {
      try {
        const n = await importSeed();
        showToast(n ? `Imported ${n} items` : "Nothing new to import", "success");
      } catch (err: any) {
        showToast(err.message ?? "Import failed", "error");
      }
    },
  };
}

function confirm() {
  const action = confirmState.value?.onConfirm;
  confirmState.value = null;
  action?.();
}

async function handleLogout() {
  await logout();
  router.push("/");
}
</script>

<template>
  <div class="adm">
    <aside class="adm-side">
      <div>
        <p class="d-caption" style="margin-bottom: 10px">Publish</p>
        <h1>Admin</h1>
      </div>

      <nav class="adm-tabs">
        <button
          v-for="k in kinds"
          :key="k"
          class="adm-tab"
          :class="{ active: activeKind === k }"
          @click="activeKind = k"
        >
          {{ KIND_LABELS[k] }} <span class="adm-count">{{ counts[k] }}</span>
        </button>
      </nav>

      <div class="adm-side-footer">
        <RouterLink to="/" class="btn" target="_blank">View site ›</RouterLink>
        <button class="btn" @click="handleLogout">Log out</button>
        <span>{{ currentUser?.email }}</span>
      </div>
    </aside>

    <main class="adm-main">
      <div class="adm-head">
        <h2>{{ KIND_LABELS[activeKind] }}</h2>
        <div class="adm-head-actions">
          <button class="btn btn-primary" @click="openNew">+ New</button>
        </div>
      </div>

      <p v-if="!uploadsEnabled" class="adm-notice">
        Media is added by URL: put files in <code>public/assets/</code> and use <code>/assets/…</code>, or paste any
        image link. Add free Cloudinary keys to <code>.env</code> to upload from here instead.
      </p>

      <div v-if="allLoaded && !allItems.length" class="adm-empty">
        <p>No content yet.</p>
        <button class="btn btn-primary" @click="askImport">Import existing content</button>
      </div>

      <div v-else-if="!allLoaded" class="adm-empty"><p>Loading…</p></div>

      <div v-else-if="!list.length" class="adm-empty">
        <p>No {{ KIND_LABELS[activeKind].toLowerCase() }} yet.</p>
      </div>

      <div v-else class="adm-list">
        <div v-for="(item, index) in list" :key="item.id" class="adm-row">
          <div class="adm-row-thumb">
            <template v-if="item.thumb?.url">
              <video v-if="item.thumb.type === 'video'" :src="item.thumb.url" muted></video>
              <img v-else :src="item.thumb.url" :alt="item.thumb.alt" loading="lazy" />
            </template>
          </div>

          <div style="min-width: 0">
            <div class="adm-row-title">
              {{ item.title }}
              <span class="adm-badge" :class="item.status">{{ item.status }}</span>
              <span v-if="!item.featured" class="adm-badge">not on home</span>
            </div>
            <div class="adm-row-sub">{{ item.link || `/p/${item.slug}` }}</div>
          </div>

          <div class="adm-row-actions">
            <button class="btn btn-icon" :disabled="index === 0" aria-label="Move up" @click="run(() => move(item, -1), 'Moved')">↑</button>
            <button
              class="btn btn-icon"
              :disabled="index === list.length - 1"
              aria-label="Move down"
              @click="run(() => move(item, 1), 'Moved')"
            >
              ↓
            </button>
            <button class="btn" @click="toggleFeatured(item)">{{ item.featured ? "Hide from home" : "Show on home" }}</button>
            <button class="btn" @click="toggleStatus(item)">{{ item.status === "published" ? "Unpublish" : "Publish" }}</button>
            <RouterLink class="btn" :to="{ name: 'item', params: { slug: item.slug } }" target="_blank">Preview</RouterLink>
            <button class="btn" @click="openEdit(item)">Edit</button>
            <button class="btn btn-icon btn-danger" aria-label="Delete" @click="askDelete(item)">×</button>
          </div>
        </div>
      </div>

      <div v-if="allLoaded && allItems.length" style="margin-top: 32px">
        <button class="btn" @click="askImport">Import missing old cards</button>
      </div>
    </main>

    <BaseSheet :show="editing !== null" wide @close="editing = null">
      <ItemForm
        v-if="editing"
        :key="editing.previousSlug ?? 'new'"
        :initial="editing.initial"
        :is-new="editing.previousSlug === undefined"
        :saving="saving"
        @save="handleSave"
        @cancel="editing = null"
      />
    </BaseSheet>

    <ConfirmSheet
      :show="confirmState !== null"
      :title="confirmState?.title ?? ''"
      :message="confirmState?.message"
      :confirm-label="confirmState?.confirmLabel ?? ''"
      danger
      @confirm="confirm"
      @close="confirmState = null"
    />
  </div>
</template>
