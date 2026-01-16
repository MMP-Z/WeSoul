import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    updateDoc,
    getDocs,
    writeBatch,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from "../firebaseConfig";

export interface Notification {
    id: string;
    userId: string;
    title: string;
    content: string;
    type: 'booking' | 'promo' | 'system' | 'message' | 'post' | 'comment' | 'like' | 'follow';
    isRead: boolean;
    createdAt: any;
    link?: string;
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
}

const NOTIFICATIONS_COLLECTION = 'notifications';

export const notificationService = {
    // Subscribe to notifications for a specific user
    subscribeToNotifications: (userId: string, callback: (notifications: Notification[]) => void) => {
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Notification[];
            callback(notifications);
        });
    },

    // Mark a single notification as read
    markAsRead: async (notificationId: string) => {
        try {
            const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
            await updateDoc(notifRef, { isRead: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    },

    // Mark all notifications as read for a user
    markAllAsRead: async (userId: string) => {
        try {
            const q = query(
                collection(db, NOTIFICATIONS_COLLECTION),
                where('userId', '==', userId),
                where('isRead', '==', false)
            );

            const snapshot = await getDocs(q);
            const batch = writeBatch(db);

            snapshot.docs.forEach((doc) => {
                batch.update(doc.ref, { isRead: true });
            });

            await batch.commit();
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    },

    // Create a notification (Utility for backend/admin or other services)
    createNotification: async (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
        try {
            await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
                ...notification,
                isRead: false,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error creating notification:", error);
        }
    }
};
