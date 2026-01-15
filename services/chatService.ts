import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { ChatLog } from '../types';

const CHATS_COLLECTION = 'chat_logs';

export const chatService = {
    saveLog: async (log: Omit<ChatLog, 'id'>) => {
        try {
            await addDoc(collection(db, CHATS_COLLECTION), log);
        } catch (error) {
            console.error("Error saving chat log:", error);
        }
    },

    getAllLogs: async (): Promise<ChatLog[]> => {
        try {
            const q = query(collection(db, CHATS_COLLECTION), orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);
            const logs: ChatLog[] = [];
            querySnapshot.forEach((doc) => {
                logs.push({ id: doc.id, ...doc.data() } as ChatLog);
            });
            return logs;
        } catch (error) {
            console.error("Error fetching chat logs:", error);
            return [];
        }
    }
};
