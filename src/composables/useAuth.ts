import { ref } from "vue";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "@/firebase";

// Module-level state shared by every caller (same pattern as pc_loaner).
const currentUser = ref<User | null>(null);
const isAdmin = ref(false);
const ready = ref(!firebaseConfigured);

let started = false;
let resolveReady: () => void = () => {};
const readyPromise = new Promise<void>((r) => (resolveReady = r));
if (!firebaseConfigured) resolveReady();

async function checkAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  try {
    const snap = await getDoc(doc(db, "admins", user.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

function start() {
  if (started || !firebaseConfigured) return;
  started = true;
  onAuthStateChanged(auth, async (user) => {
    currentUser.value = user;
    isAdmin.value = await checkAdmin(user);
    ready.value = true;
    resolveReady();
  });
}

export function useAuth() {
  start();

  async function login(email: string, password: string) {
    if (!firebaseConfigured) throw Object.assign(new Error("Firebase is not configured"), { code: "app/not-configured" });
    const cred = await signInWithEmailAndPassword(auth, email, password);
    currentUser.value = cred.user;
    isAdmin.value = await checkAdmin(cred.user);
    return isAdmin.value;
  }

  /** Google sign-in in a popup. Returns whether the account is an admin. */
  async function loginWithGoogle() {
    if (!firebaseConfigured) throw Object.assign(new Error("Firebase is not configured"), { code: "app/not-configured" });
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    currentUser.value = cred.user;
    isAdmin.value = await checkAdmin(cred.user);
    return isAdmin.value;
  }

  async function logout() {
    if (firebaseConfigured) await signOut(auth);
    currentUser.value = null;
    isAdmin.value = false;
  }

  /** Resolves once the first auth state is known (used by the router guard). */
  function whenReady() {
    start();
    return readyPromise;
  }

  return {
    currentUser,
    isAdmin,
    ready,
    login,
    loginWithGoogle,
    logout,
    whenReady,
    sendPasswordReset: (email: string) => sendPasswordResetEmail(auth, email),
  };
}
