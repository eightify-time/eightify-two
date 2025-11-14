import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCVXoePE_K0BxmKuYUh4gDCFenxV6tF7kg",
  authDomain: "eightify-ea45f.firebaseapp.com",
  projectId: "eightify-ea45f",
  storageBucket: "eightify-ea45f.firebasestorage.app",
  messagingSenderId: "827591118188",
  appId: "1:827591118188:web:de855d05c512af745ef749",
  measurementId: "G-N48L4C268V"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc, serverTimestamp };
