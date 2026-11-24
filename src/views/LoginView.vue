<script setup lang="ts">
import { inject, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { firebaseConfigured } from "@/firebase";
import type { ToastType } from "@/types";
import "@/admin.css";

const router = useRouter();
const route = useRoute();
const showToast = inject<(msg: string, type?: ToastType) => void>("showToast")!;
const { login, logout, sendPasswordReset } = useAuth();

const email = ref("");
const password = ref("");
const errorMsg = ref("");
const loading = ref(false);

async function handleLogin() {
  errorMsg.value = "";
  loading.value = true;
  try {
    const admin = await login(email.value, password.value);
    if (!admin) {
      await logout();
      errorMsg.value = "This account is not an admin. Add its UID to the admins collection in Firestore.";
      return;
    }
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/admin";
    router.replace(redirect);
  } catch (err: any) {
    const code = err.code;
    if (code === "app/not-configured") errorMsg.value = "Firebase is not configured yet. See README.md.";
    else if (code === "auth/invalid-email") errorMsg.value = "Invalid email";
    else if (code === "auth/too-many-requests") errorMsg.value = "Too many attempts. Try again later.";
    else errorMsg.value = "Wrong email or password";
  } finally {
    loading.value = false;
  }
}

async function handleReset() {
  if (!email.value) {
    errorMsg.value = "Type your email first";
    return;
  }
  try {
    await sendPasswordReset(email.value);
    showToast("Reset email sent", "success");
  } catch {
    showToast("Could not send reset email", "error");
  }
}
</script>

<template>
  <div class="login">
    <section class="login-card">
      <h1>Admin</h1>
      <p v-if="!firebaseConfigured" class="adm-notice">
        Firebase is not configured. Copy <code>.env.example</code> to <code>.env</code> and fill in your config.
      </p>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="login-email">Email</label>
          <input id="login-email" v-model="email" class="input" type="email" autocomplete="email" required />
        </div>
        <div class="form-group">
          <label for="login-password">Password</label>
          <input
            id="login-password"
            v-model="password"
            class="input"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? "Logging in…" : "Log in" }}
        </button>
        <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>
      </form>
      <button type="button" class="login-back" style="background: none; border: 0; cursor: pointer" @click="handleReset">
        Forgot password
      </button>
      <br />
      <RouterLink to="/" class="login-back">‹ Back to portfolio</RouterLink>
    </section>
  </div>
</template>
