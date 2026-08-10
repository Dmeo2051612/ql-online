import { initializeApp }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import { getAuth }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import { getFirestore }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


export const firebaseConfig = {
  apiKey: "AIzaSyAnIgEAwo5DTfawaz5qcEwqlyqoDK1YdJw",
  authDomain: "qly-online.firebaseapp.com",
  projectId: "qly-online",
  storageBucket: "qly-online.firebasestorage.app",
  messagingSenderId: "486065236377",
  appId: "1:486065236377:web:1131c9b7593e8c4ca4cb08"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


const secondaryApp = initializeApp(
    firebaseConfig,
    "secondary"
);

const secondaryAuth = getAuth(secondaryApp);


export { auth, db, secondaryAuth };