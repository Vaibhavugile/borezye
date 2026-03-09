// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


const firebaseConfig = {
  apiKey: "AIzaSyB83cFIm8LxMuPtHIHGY9jZl4YvAs1UX18",
  authDomain: "renting-wala-27d06.firebaseapp.com",
  projectId: "renting-wala-27d06",
  storageBucket: "renting-wala-27d06.appspot.com",
  messagingSenderId: "914352196749",
  appId: "1:914352196749:web:e85203ae04179e31f866c4",
  measurementId: "G-6LM56R8KKQ"
  
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);