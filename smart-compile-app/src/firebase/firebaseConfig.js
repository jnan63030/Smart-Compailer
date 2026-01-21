import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDEH6i9gKiNB153L66Jyxj8jmAcWMhojPE",
  authDomain: "maximal-relic-480806-h4.firebaseapp.com",
  projectId: "maximal-relic-480806-h4",
  storageBucket: "maximal-relic-480806-h4.firebasestorage.app",
  messagingSenderId: "294101797542",
  appId: "1:294101797542:web:59b1dea353fe6b0ffc8267",
  measurementId: "G-MLHRGZQLZV" // Optional measurement ID included for completeness
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and EXPORT the services required by App.js
export const auth = getAuth(app);
export const db = getFirestore(app);