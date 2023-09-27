// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAJTQL3XN_46kDdACbC4qQ7RXcR48NyS_I",
  authDomain: "semantle-6ee78.firebaseapp.com",
  projectId: "semantle-6ee78",
  storageBucket: "semantle-6ee78.appspot.com",
  messagingSenderId: "291546507240",
  appId: "1:291546507240:web:0c4206ab6bcd2bd23f665d",
  measurementId: "G-GNR4BF4X4X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);