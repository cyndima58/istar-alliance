import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAr_FH3cyWmcHFW4icnhzUd1TaPC9gERaI",
  authDomain: "istar-alliance.firebaseapp.com",
  projectId: "istar-alliance",
  storageBucket: "istar-alliance.firebasestorage.app",
  messagingSenderId: "538197880233",
  appId: "1:538197880233:web:fad87b5466cc04d6eea8b8"
};

const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
export const auth = getAuth(app);
export default app;