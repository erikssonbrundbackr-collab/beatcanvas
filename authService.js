// src/authService.js
import { auth } from "./firebaseClient";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

// 🔄 Hjälpfunktion – gör om Firebase user till vårt AppUser-objekt
function mapFirebaseUser(user) {
  if (!user) return null;
  return {
    id: user.uid,
    email: user.email,
    name: user.displayName || null,
  };
}

// 🔐 Registrera användare med e-post + lösenord
export async function registerUser(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return mapFirebaseUser(cred.user);
}

// 🔐 Logga in med e-post + lösenord
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return mapFirebaseUser(cred.user);
}

// 🔐 Logga in med Google
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return mapFirebaseUser(cred.user);
}

// 🚪 Logga ut
export async function logoutUser() {
  await signOut(auth);
}

// 👤 Hämta aktuell användare (synkron, men vi gör den async för enkelhet)
export async function getCurrentUser() {
  return mapFirebaseUser(auth.currentUser);
}

// ✏️ Uppdatera aktuell användare (just nu bara namn)
export async function updateCurrentUser({ name }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Ingen inloggad användare.");

  await updateProfile(user, { displayName: name || "" });
  return mapFirebaseUser(auth.currentUser);
}

// 🧠 Glömt lösenord – skickar mail med reset-länk
export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}
