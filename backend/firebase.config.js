const firebaseConfig = {
    apiKey: "AIzaSyDVaWcD5aH4dhuSb5BC7wuzRp2oNzYM6cw",
    authDomain: "almacen-productos-jfm.firebaseapp.com",
    projectId: "almacen-productos-jfm",
    storageBucket: "almacen-productos-jfm.firebasestorage.app",
    messagingSenderId: "763674306358",
    appId: "1:763674306358:web:3797562ecb9c711d96b597"
  };

  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)
  const auth = getAuth(app)
  
  export {auth, db}