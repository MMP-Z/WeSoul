import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCtP8G4HclYtmgYDmLk3pLNDsRY81hL-7A",
    authDomain: "fate-chotamlinh.firebaseapp.com",
    projectId: "fate-chotamlinh",
    storageBucket: "fate-chotamlinh.firebasestorage.app",
    messagingSenderId: "665327785930",
    appId: "1:665327785930:web:a8f782798ef83db6e96133",
    measurementId: "G-SPZN3X8SS6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };
