import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAMe8fe9JMcfLxywwghY-rq-KCFaipMgew',
  authDomain: 'nirog-5b804.firebaseapp.com',
  projectId: 'nirog-5b804',
  storageBucket: 'nirog-5b804.firebasestorage.app',
  messagingSenderId: '1019560657161',
  appId: '1:1019560657161:web:e7c2a3edeba72fb7eb53d8',
  measurementId: 'G-4LELHJZYTG',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account',
});

if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics is optional for the app experience.
    });
}

export { app, auth, db, googleProvider };
