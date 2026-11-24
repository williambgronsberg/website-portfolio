import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import HomeView from "@/views/HomeView.vue";

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/projects", name: "projects", component: () => import("@/views/AllProjectsView.vue") },
    {
      path: "/articles",
      name: "articles",
      component: () => import("@/views/AllProjectsView.vue"),
      props: { kind: "article" },
    },
    { path: "/p/:slug", name: "item", component: () => import("@/views/ItemView.vue"), props: true },
    { path: "/login", name: "login", component: () => import("@/views/LoginView.vue") },
    {
      path: "/admin",
      name: "admin",
      component: () => import("@/views/AdminView.vue"),
      meta: { requiresAdmin: true },
    },
    { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("@/views/NotFoundView.vue") },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAdmin) return true;
  const { whenReady, isAdmin } = useAuth();
  await whenReady();
  return isAdmin.value ? true : { name: "login", query: { redirect: to.fullPath } };
});
