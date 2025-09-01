// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDelEWoP1WnGcqjNBGI0KvyFVyk2UJeUe4",
  authDomain: "ai-interview-4da25.firebaseapp.com",
  projectId: "ai-interview-4da25",
  storageBucket: "ai-interview-4da25.firebasestorage.app",
  messagingSenderId: "880628023076",
  appId: "1:880628023076:web:219ca3b5a2a73547517db1",
  measurementId: "G-WP5TBNFX1D"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { analytics };