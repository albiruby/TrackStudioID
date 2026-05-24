import { adminDb } from "./lib/firebase/admin";
async function run() {
  try {
    const snap = await adminDb.collection('users').doc('12345').get();
    console.log("Exists:", snap.exists);
  } catch (err) {
    console.error("TEST FAILED:", err);
  }
}
run();
