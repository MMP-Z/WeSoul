import { db } from './firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

const debugData = async () => {
    console.log("--- Fetching Users ---");
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach(doc => {
        const data = doc.data();
        console.log(`User [${doc.id}]: ${data.displayName} (${data.email}) - Role: ${data.role}`);
    });

    console.log("\n--- Fetching Advisors ---");
    const advisorsSnap = await getDocs(collection(db, 'advisors'));
    advisorsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`Advisor [${doc.id}]: ${data.name} - Type: ${data.type} - Status: ${data.approvalStatus}`);
    });
}

debugData().catch(console.error);
