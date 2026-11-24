import { ref } from "vue";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db, firebaseConfigured } from "@/firebase";
import { normalizeItem, type Item, type ItemInput, type Kind } from "@/types";
import { seedItems } from "@/seed/seed";

const ITEMS = "items";

const seedAsItems = (): Item[] => seedItems.map((s) => normalizeItem(s.slug, s));

// Shared state: one live subscription for the public site, one for the admin panel.
const published = ref<Item[]>(firebaseConfigured ? [] : seedAsItems());
const publishedLoaded = ref(!firebaseConfigured);
const allItems = ref<Item[]>([]);
const allLoaded = ref(false);

let unsubPublished: (() => void) | null = null;
let unsubAll: (() => void) | null = null;

export function sortItems(list: Item[]): Item[] {
  return [...list].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "nb"));
}

export function byKind(list: Item[], kind: Kind): Item[] {
  return sortItems(list.filter((i) => i.kind === kind));
}

function toItems(snapshot: { forEach: (cb: (d: { id: string; data: () => unknown }) => void) => void }) {
  const list: Item[] = [];
  snapshot.forEach((d) => list.push(normalizeItem(d.id, d.data() as Partial<Item>)));
  return sortItems(list);
}

export function useContent() {
  /** Live list of published items (public site). Only published docs are readable by visitors. */
  function subscribePublished() {
    if (!firebaseConfigured || unsubPublished) return;
    unsubPublished = onSnapshot(
      query(collection(db, ITEMS), where("status", "==", "published")),
      (snap) => {
        published.value = toItems(snap);
        publishedLoaded.value = true;
      },
      (err) => {
        console.error("Published items error:", err);
        publishedLoaded.value = true;
      }
    );
  }

  /** Live list of every item, drafts included (admin only). */
  function subscribeAll() {
    if (!firebaseConfigured || unsubAll) return;
    unsubAll = onSnapshot(
      collection(db, ITEMS),
      (snap) => {
        allItems.value = toItems(snap);
        allLoaded.value = true;
      },
      (err) => {
        console.error("All items error:", err);
        allLoaded.value = true;
      }
    );
  }

  function unsubscribeAll() {
    unsubAll?.();
    unsubAll = null;
    allLoaded.value = false;
  }

  /** One item by slug. Returns null when missing, or when it is a draft and the viewer is not an admin. */
  async function getItem(slug: string): Promise<Item | null> {
    if (!firebaseConfigured) return seedAsItems().find((i) => i.slug === slug) ?? null;
    try {
      const snap = await getDoc(doc(db, ITEMS, slug));
      return snap.exists() ? normalizeItem(snap.id, snap.data() as Partial<Item>) : null;
    } catch (err: any) {
      if (err?.code === "permission-denied") return null;
      throw err;
    }
  }

  /**
   * Create or update an item. The doc id is the slug, so a changed slug moves the doc.
   * `previousSlug` is the slug the item had when the form opened (undefined for new items).
   */
  async function saveItem(input: ItemInput, previousSlug?: string) {
    const slug = input.slug;
    if (!slug) throw new Error("A slug is required");
    const ref = doc(db, ITEMS, slug);
    const isMove = previousSlug !== undefined && previousSlug !== slug;
    const isNew = previousSlug === undefined;

    if (isNew || isMove) {
      const existing = await getDoc(ref);
      if (existing.exists()) throw new Error(`The slug "${slug}" is already used`);
    }

    let createdAt: unknown = serverTimestamp();
    if (previousSlug) {
      const old = await getDoc(doc(db, ITEMS, previousSlug));
      if (old.exists() && old.data().createdAt) createdAt = old.data().createdAt;
    }

    const data = { ...input, createdAt, updatedAt: serverTimestamp() };

    if (isMove) {
      const batch = writeBatch(db);
      batch.set(ref, data);
      batch.delete(doc(db, ITEMS, previousSlug!));
      await batch.commit();
    } else {
      await setDoc(ref, data);
    }
  }

  async function deleteItem(slug: string) {
    await deleteDoc(doc(db, ITEMS, slug));
  }

  async function updateFields(slug: string, fields: Partial<ItemInput>) {
    await updateDoc(doc(db, ITEMS, slug), { ...fields, updatedAt: serverTimestamp() });
  }

  /** Move an item one step up (-1) or down (+1) within its kind. Renumbers the kind in steps of 10. */
  async function move(item: Item, direction: -1 | 1) {
    const list = byKind(allItems.value, item.kind);
    const index = list.findIndex((i) => i.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];

    const batch = writeBatch(db);
    list.forEach((i, n) => {
      const order = (n + 1) * 10;
      if (i.order !== order) batch.update(doc(db, ITEMS, i.id), { order });
    });
    await batch.commit();
  }

  /** Next order value so new items land at the end of their section. */
  function nextOrder(kind: Kind): number {
    const list = byKind(allItems.value, kind);
    return list.length ? list[list.length - 1].order + 10 : 10;
  }

  /** Writes the old hard-coded cards into Firestore. Skips slugs that already exist. */
  async function importSeed(): Promise<number> {
    let created = 0;
    for (const s of seedItems) {
      const ref = doc(db, ITEMS, s.slug);
      if ((await getDoc(ref)).exists()) continue;
      await setDoc(ref, { ...s, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      created++;
    }
    return created;
  }

  return {
    published,
    publishedLoaded,
    allItems,
    allLoaded,
    subscribePublished,
    subscribeAll,
    unsubscribeAll,
    getItem,
    saveItem,
    deleteItem,
    updateFields,
    move,
    nextOrder,
    importSeed,
  };
}
