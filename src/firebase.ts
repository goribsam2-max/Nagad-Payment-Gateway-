import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, update, remove, get } from 'firebase/database';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, deleteDoc } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAvFIvPzx5U3Vg0YdVWJ6RzDbUb9rP2SRs",
  authDomain: "nagad-official-payment.firebaseapp.com",
  projectId: "nagad-official-payment",
  storageBucket: "nagad-official-payment.firebasestorage.app",
  messagingSenderId: "912705057298",
  appId: "1:912705057298:web:fc651ad49d8507c1759ecb",
  databaseURL: "https://nagad-official-payment-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export { ref, set, push, onValue, update, remove, get, doc, setDoc, onSnapshot, collection, updateDoc, deleteDoc };
