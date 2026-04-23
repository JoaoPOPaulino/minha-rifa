import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAVoEtcfdD8FZLjbtkvWxccF-GMuJSJaWg",
  authDomain: "minha-rifa-3773a.firebaseapp.com",
  projectId: "minha-rifa-3773a",
  storageBucket: "minha-rifa-3773a.firebasestorage.app",
  messagingSenderId: "801697832898",
  appId: "1:801697832898:web:e73c05ca2cf7f15944405b"
}

// Inicializando os serviços
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const functions = getFunctions(app);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);