import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC7jbWFLH4r8ipoGTsNoYuiKecWHRJxwLU",
  authDomain: "et-al-asst.firebaseapp.com",
  projectId: "et-al-asst",
  storageBucket: "et-al-asst.firebasestorage.app",
  messagingSenderId: "80260706822",
  appId: "1:80260706822:web:92a69155cfe871f8858987",
  measurementId: "G-9MJ486Z8VF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);