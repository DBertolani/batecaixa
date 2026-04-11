import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, getDocs, where, orderBy, deleteDoc, updateDoc, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// Módulo de Fotos (Storage)
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDfrF4v2V8x3J9CkDHfUEVKtwMinCuH6TE",
    authDomain: "caixa-mei.firebaseapp.com",
    projectId: "caixa-mei",
    storageBucket: "caixa-mei.firebasestorage.app", // Nome do seu balde
    messagingSenderId: "750339852793",
    appId: "1:750339852793:web:15c2b05e557b81629e5528"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Inicia o Storage
export const provider = new GoogleAuthProvider();

// Controle para disparar evento apenas uma vez
let eventoDisparado = false;

// Debug: Verificar estado inicial
console.log("🔥 Firebase Config inicializando...");
console.log("📊 Estado inicial - auth.currentUser:", auth.currentUser);
console.log("📊 Estado inicial - localStorage.user_uid:", localStorage.getItem("user_uid"));
console.log("📊 Estado inicial - localStorage.firebase_user_backup:", localStorage.getItem("firebase_user_backup") ? "Existe" : "Não existe");

// Configurar persistência e listener
async function inicializarAutenticacao() {
  try {
    console.log("Configurando persistência local...");
    await setPersistence(auth, browserLocalPersistence);
    console.log("✅ Persistência local configurada");
  } catch (error) {
    console.error("❌ Erro na persistência:", error);
  }
  
  // Configurar listener de autenticação
  onAuthStateChanged(auth, async (user) => {
    console.log("🔄 onAuthStateChanged chamado - user:", user ? user.email : "null");
    console.log("🔄 eventoDisparado:", eventoDisparado);
    if (user && !eventoDisparado) {
      eventoDisparado = true;
      
      // Salvar dados básicos
      localStorage.setItem("user_uid", user.uid);
      localStorage.setItem("user_email", user.email);
      
      // Salvar backup completo
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        timestamp: Date.now()
      };
      localStorage.setItem("firebase_user_backup", JSON.stringify(userData));
      
      console.log("Usuário autenticado:", user.email);
      
      // Disparar evento apenas uma vez com todos os dados
      window.dispatchEvent(new CustomEvent('usuarioAutenticado', { 
        detail: { 
          uid: user.uid, 
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        } 
      }));
      
    } else if (!user) {
      // Resetar controle quando usuário deslogar
      eventoDisparado = false;
      
      // Limpar dados básicos
      localStorage.removeItem("user_uid");
      localStorage.removeItem("user_email");
      localStorage.removeItem("user_name");
      localStorage.removeItem("nomeOperador");
      
      // Manter backup por 5 segundos (caso seja apenas reload)
      setTimeout(() => {
        if (!auth.currentUser) {
          localStorage.removeItem("firebase_user_backup");
          console.log("Backup removido - logout confirmado");
        }
      }, 5000);
      
      console.log("Usuário deslogado");
      window.dispatchEvent(new CustomEvent('usuarioDeslogado'));
    }
  });
}

// Verificação de backup se Firebase não recuperar sessão automaticamente
console.log("⏰ Agendando verificação de backup em 2 segundos...");

setTimeout(() => {
  console.log("⏰ Verificação de backup executando...");
  console.log("⏰ eventoDisparado:", eventoDisparado);
  console.log("⏰ auth.currentUser:", auth.currentUser ? auth.currentUser.email : "null");
  if (!eventoDisparado && !auth.currentUser) {
    const backupStr = localStorage.getItem("firebase_user_backup");
    if (backupStr) {
      try {
        const backup = JSON.parse(backupStr);
        const age = Date.now() - backup.timestamp;
        
        // Backup válido por 24 horas
        if (age < 24 * 60 * 60 * 1000) {
          console.log("Recuperando sessão do backup...");
          
          // Restaurar dados
          localStorage.setItem("user_uid", backup.uid);
          localStorage.setItem("user_email", backup.email);
          
          // Disparar evento (apenas uma vez)
          if (!eventoDisparado) {
            eventoDisparado = true;
            window.dispatchEvent(new CustomEvent('usuarioAutenticado', { 
              detail: { 
                uid: backup.uid, 
                email: backup.email,
                displayName: backup.displayName,
                photoURL: backup.photoURL
              } 
            }));
          }
        } else {
          localStorage.removeItem("firebase_user_backup");
        }
      } catch (error) {
        localStorage.removeItem("firebase_user_backup");
      }
    }
  }
}, 2000);

// Inicializar sistema de autenticação
inicializarAutenticacao();

window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseStorage = storage;
window.firebaseProvider = provider;
window.firebaseSignIn = signInWithPopup;
window.firebaseGetDoc = getDoc;
window.firebaseGetDocs = getDocs;
window.firebaseSetDoc = setDoc;
window.firebaseAddDoc = addDoc;
window.firebaseDoc = doc;
window.firebaseCollection = collection;
window.firebaseQuery = query;
window.firebaseWhere = where;
window.firebaseOrderBy = orderBy;
window.firebaseLimit = limit;
window.firebaseDeleteDoc = deleteDoc;
window.firebaseUpdateDoc = updateDoc;

// Comandos para fotos
window.firebaseRef = ref;
window.firebaseUpload = uploadBytes;
window.firebaseGetUrl = getDownloadURL;