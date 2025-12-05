import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "examenappweb2.firebaseapp.com",
  projectId: "examenappweb2",
  storageBucket: "examenappweb2.firebasestorage.app",
  messagingSenderId: "1051493944203",
  appId: "1:1051493944203:web:42524b66b0ef94964afd8e",
  measurementId: "G-LB3B1HX0C9",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);


export const functions = getFunctions(app, "us-central1");

const provider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, provider);

export const loginWithEmailPassword = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmailPassword = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);
