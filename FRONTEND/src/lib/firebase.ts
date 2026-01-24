import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyAWERUe4MEjxmRHJuioah2SwUd0WlCK3hI",
    authDomain: "groovia-e9de7.firebaseapp.com",
    projectId: "groovia-e9de7",
    storageBucket: "groovia-e9de7.firebasestorage.app",
    messagingSenderId: "1077243066593",
    appId: "1:1077243066593:web:4a95f8991bb03a2d3d9fa0",
    measurementId: "G-4CW3LDJTBM"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Analytics only on client side and if supported
let analytics;
if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
        }
    });
}

export { auth, googleProvider, app };
