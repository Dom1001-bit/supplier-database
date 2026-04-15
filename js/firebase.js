/* ============================================================
   js/firebase.js — Firebase init + collection references
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyDHhEnfIz2evfEH-Vfpujqnu_MrE57p7v4",
  authDomain: "supplier-database-45001.firebaseapp.com",
  projectId: "supplier-database-45001",
  storageBucket: "supplier-database-45001.appspot.com",
  messagingSenderId: "977359606390",
  appId: "1:977359606390:web:03be683a1e7c7d71bc4557"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

// Collections
const Collections = {
  products: db.collection('products'),
  invitedUsers: db.collection('invitedUsers'),
  apiKeys: db.collection('apiKeys'),
  apiLogs: db.collection('apiLogs'),
  quotes: db.collection('quotes'),
  userProfiles: db.collection('userProfiles'),
  adminUsers: db.collection('adminUsers'),
};
