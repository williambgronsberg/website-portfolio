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
const { login, loginWithGoogle, logout, sendPasswordReset } = useAuth();

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

async function handleGoogle() {
  errorMsg.value = "";
  loading.value = true;
  try {
    const admin = await loginWithGoogle();
    if (!admin) {
      await logout();
      errorMsg.value = "This Google account is not an admin.";
      return;
    }
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/admin";
    router.replace(redirect);
  } catch (err: any) {
    const code = err.code;
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
    if (code === "app/not-configured") errorMsg.value = "Firebase is not configured yet. See README.md.";
    else if (code === "auth/popup-blocked") errorMsg.value = "The browser blocked the Google popup. Allow popups and try again.";
    else if (code === "auth/operation-not-allowed") errorMsg.value = "Google login is not enabled in Firebase yet.";
    else if (code === "auth/unauthorized-domain") errorMsg.value = "This domain is not authorized for login in Firebase.";
    else errorMsg.value = "Google login failed";
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
      <button type="button" class="btn btn-full google-btn" :disabled="loading" @click="handleGoogle">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
        Continue with Google
      </button>

      <div class="login-divider"><span>or</span></div>

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
