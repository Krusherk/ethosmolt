import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue, update, get, query, orderByChild, equalTo } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAKvLoz1RxFHlPWab7kr_Yl87kyKfZUhXQ",
  authDomain: "newwave-6fe2d.firebaseapp.com",
  databaseURL: "https://newwave-6fe2d-default-rtdb.firebaseio.com",
  projectId: "newwave-6fe2d",
  storageBucket: "newwave-6fe2d.firebasestorage.app",
  messagingSenderId: "710390847911",
  appId: "1:710390847911:web:4db0ff17658590bfedfe82",
  measurementId: "G-WK2M3CL2TB"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Registration queue functions
export const submitRegistration = async (moltbookApiKey) => {
  const registrationsRef = ref(db, 'registrations');
  const entry = await push(registrationsRef, {
    apiKey: moltbookApiKey,
    status: 'pending',
    timestamp: Date.now(),
    agentId: null,
    txHash: null,
    agentName: null,
    error: null
  });
  return entry.key;
};

export const getRegistrationStatus = async (registrationId) => {
  const registrationRef = ref(db, `registrations/${registrationId}`);
  const snapshot = await get(registrationRef);
  return snapshot.val();
};

export const watchRegistration = (registrationId, callback) => {
  const registrationRef = ref(db, `registrations/${registrationId}`);
  return onValue(registrationRef, (snapshot) => {
    callback(snapshot.val());
  });
};

export const getAllPendingRegistrations = async () => {
  const registrationsRef = ref(db, 'registrations');
  const pendingQuery = query(registrationsRef, orderByChild('status'), equalTo('pending'));
  const snapshot = await get(pendingQuery);
  return snapshot.val() || {};
};

export const updateRegistration = async (registrationId, data) => {
  const registrationRef = ref(db, `registrations/${registrationId}`);
  await update(registrationRef, data);
};

export { db, ref, push, onValue, update, get };
