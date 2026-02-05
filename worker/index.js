import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update } from "firebase/database";
import { ethers } from "ethers";

const firebaseConfig = {
  apiKey: "AIzaSyAKvLoz1RxFHlPWab7kr_Yl87kyKfZUhXQ",
  authDomain: "newwave-6fe2d.firebaseapp.com",
  databaseURL: "https://newwave-6fe2d-default-rtdb.firebaseio.com",
  projectId: "newwave-6fe2d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const RPC = "https://testnet-rpc.monad.xyz";
const PK = process.env.PRIVATE_KEY;
const PROFILE = "0xb23b80DDe8DefDceAc6A9C147215Ec315b210348";
const ABI = ["function registerAgent(bytes32 apiKeyHash, string name) returns (uint256)"];

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PK, provider);
const contract = new ethers.Contract(PROFILE, ABI, wallet);

console.log("🦞 MoltEthos Worker started");

const registrationsRef = ref(db, 'registrations');
onValue(registrationsRef, async (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  for (const [id, reg] of Object.entries(data)) {
    if (reg.status !== 'pending') continue;

    console.log(`Processing: ${id}`);
    try {
      // Get agent name from Moltbook
      const res = await fetch('https://www.moltbook.com/api/v1/agents/me', {
        headers: { 'Authorization': `Bearer ${reg.apiKey}` }
      });
      const moltData = await res.json();
      if (!moltData.success) throw new Error('Invalid API key');

      const name = moltData.agent.name;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(reg.apiKey));

      // Register on-chain
      const tx = await contract.registerAgent(hash, name);
      await tx.wait();

      await update(ref(db, `registrations/${id}`), {
        status: 'registered',
        agentName: name,
        txHash: tx.hash
      });
      console.log(`✓ Registered ${name}`);
    } catch (e) {
      await update(ref(db, `registrations/${id}`), {
        status: 'error',
        error: e.message
      });
      console.log(`✗ Error: ${e.message}`);
    }
  }
});

// Keep alive
setInterval(() => console.log('💓'), 60000);
