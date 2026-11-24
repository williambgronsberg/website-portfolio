import { nextTick, onBeforeUnmount, onMounted, watch, type Ref, type WatchSource } from "vue";
import AOS from "aos";

let aosStarted = false;

/**
 * The scroll effects from the old index.html: AOS fade-ups and the `.reveal` fade-in.
 * `refreshOn` re-scans for AOS elements after content arrives from Firestore.
 */
export function usePageEffects(root: Ref<HTMLElement | null>, refreshOn?: WatchSource) {
  let observer: IntersectionObserver | null = null;

  function observeReveal() {
    if (!root.value) return;
    observer ??= new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("show");
        });
      },
      { threshold: 0.12 }
    );
    root.value.querySelectorAll(".reveal:not(.show)").forEach((el) => observer!.observe(el));
  }

  onMounted(() => {
    if (!aosStarted) {
      AOS.init({ duration: 900, easing: "ease-out-cubic", once: true, offset: 120 });
      aosStarted = true;
    } else {
      AOS.refreshHard();
    }
    observeReveal();
  });

  if (refreshOn) {
    watch(refreshOn, async () => {
      await nextTick();
      AOS.refreshHard();
      observeReveal();
    });
  }

  onBeforeUnmount(() => observer?.disconnect());
}
