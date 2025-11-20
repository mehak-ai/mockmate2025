// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB-pTzGTQiAHxUIMyQEKUaVo-vUNrPNrQs",
  authDomain: "mockmate2025.firebaseapp.com",
  projectId: "mockmate2025",
  storageBucket: "mockmate2025.firebasestorage.app",
  messagingSenderId: "209584550802",
  appId: "1:209584550802:web:efb0bd849e8bc8a13dc74b",
  measurementId: "G-HBMZ6G6MMP"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig): getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);