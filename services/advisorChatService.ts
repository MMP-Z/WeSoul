import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, getDocs, or, setDoc, deleteDoc, collectionGroup, increment } from 'firebase/firestore';
import { ChatMessage } from '../types';
import { notificationService } from './notificationService';

const MESSAGES_COLLECTION = 'advisor_messages';

export const advisorChatService = {
    // Helper to generate consistent conversation ID
    getConversationId: (userId1: string, userId2: string) => {
        return [userId1, userId2].sort().join('_');
    },

    // Get all messages (for Admin) - Using collectionGroup to query all subcollections named 'messages'
    getAllMessages: async () => {
        try {
            const q = query(
                collectionGroup(db, 'messages'),
                orderBy('timestamp', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatMessage));
        } catch (error) {
            console.error("Error fetching all messages:", error);
            return [];
        }
    },

    // Get all conversations (for Admin)
    getAllConversations: async () => {
        try {
            const q = query(
                collection(db, MESSAGES_COLLECTION),
                orderBy('lastUpdated', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching all conversations:", error);
            return [];
        }
    },

    // Get messages for a specific conversation (Admin Drill-down)
    getMessagesForConversation: async (conversationId: string) => {
        try {
            const q = query(
                collection(db, MESSAGES_COLLECTION, conversationId, 'messages'),
                orderBy('timestamp', 'asc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching conversation messages:", error);
            return [];
        }
    },

    // Send a message (Subcollection Structure)
    sendMessage: async (message: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead'>) => {
        try {
            const conversationId = [message.senderId, message.receiverId].sort().join('_');
            const conversationRef = doc(db, MESSAGES_COLLECTION, conversationId);

            // Ensure conversation document exists and update metadata
            // Increment unread count for the RECEIVER
            await setDoc(conversationRef, {
                participants: [message.senderId, message.receiverId],
                lastMessage: message.message,
                lastSenderId: message.senderId,
                lastUpdated: serverTimestamp(),
                unreadCounts: {
                    [message.receiverId]: increment(1)
                }
            }, { merge: true });

            // Add message to subcollection
            await addDoc(collection(conversationRef, 'messages'), {
                ...message,
                timestamp: serverTimestamp(),
                isRead: false
            });

            // Create Notification
            await notificationService.createNotification({
                userId: message.receiverId,
                title: message.senderName || 'Tin nhắn mới',
                content: message.message.length > 50 ? message.message.substring(0, 50) + '...' : message.message,
                type: 'message',
                link: '/messages',
                senderId: message.senderId,
                senderName: message.senderName || 'Unknown',
                senderAvatar: '/favicon.png' // Default to logo as we don't have sender avatar in message payload
            });
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    },

    // Subscribe to messages (Subcollection Structure)
    subscribeToMessages: (conversationId: string, bookingId: string | null, callback: (messages: ChatMessage[]) => void) => {
        // Query specific subcollection
        // Ignores bookingId as legacy parameter, relies on conversationId path
        // (Migration should handle moving old messages to this path)
        const q = query(
            collection(db, MESSAGES_COLLECTION, conversationId, 'messages'),
            orderBy('timestamp', 'asc')
        );

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatMessage));
            callback(messages);
        }, (error) => {
            console.error("Snapshot error:", error);
        });
    },

    // Mark a message as read (Requires conversationId)
    markAsRead: async (conversationId: string, messageId: string) => {
        try {
            const messageRef = doc(db, MESSAGES_COLLECTION, conversationId, 'messages', messageId);
            await updateDoc(messageRef, { isRead: true });
        } catch (error) {
            console.error("Error marking message as read:", error);
        }
    },

    // Mark all messages in a conversation as read
    markConversationAsRead: async (conversationId: string, userId: string) => {
        try {
            // 1. Mark individual messages as read (visually important for checkmarks)
            // Note: userId is the one who is reading, so we look for messages where receiverId == userId
            const q = query(
                collection(db, MESSAGES_COLLECTION, conversationId, 'messages'),
                where('receiverId', '==', userId),
                where('isRead', '==', false)
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const batchPromises = snapshot.docs.map(doc =>
                    updateDoc(doc.ref, { isRead: true })
                );
                await Promise.all(batchPromises);
            }

            // 2. Reset unread count for this user in parent doc
            const conversationRef = doc(db, MESSAGES_COLLECTION, conversationId);
            await updateDoc(conversationRef, {
                [`unreadCounts.${userId}`]: 0
            });

        } catch (error) {
            console.error("Error marking conversation as read:", error);
        }
    },

    // Subscribe to conversations list with live metadata (unread counts, last message)
    subscribeToConversations: (userId: string, callback: (conversations: any[]) => void) => {
        const q = query(
            collection(db, MESSAGES_COLLECTION),
            where('participants', 'array-contains', userId),
            orderBy('lastUpdated', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const conversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(conversations);
        }, (error) => {
            console.error("Conversations snapshot error:", error);
        });
    },

    // Mark all messages in a booking as read (Legacy)
    markAllAsRead: async (bookingId: string, receiverId: string) => {
        console.warn("markAllAsRead by bookingId is deprecated. Use markConversationAsRead.");
    },

    // Subscribe to unread count across all conversations
    subscribeToUnreadCount: (userId: string, callback: (count: number) => void) => {
        const q = query(
            collectionGroup(db, 'messages'),
            where('receiverId', '==', userId),
            where('isRead', '==', false)
        );

        return onSnapshot(q, (snapshot) => {
            callback(snapshot.size);
        }, (error) => {
            console.error("Unread count snapshot error:", error);
        });
    },

    // MIGRATION UTILITY
    migrateLegacyMessages: async () => {
        console.log("Starting migration of legacy messages...");
        try {
            // Get all documents from root collection
            const rootSnapshot = await getDocs(collection(db, MESSAGES_COLLECTION));

            let migratedCount = 0;
            const promises = rootSnapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();

                // Identify if it's a legacy message (has 'message', 'senderId' and is in root)
                // We check if it DOES NOT have 'participants' (which implies it's a conversation doc)
                if (data.message && data.senderId && data.receiverId && !data.participants) {
                    const conversationId = data.conversationId || [data.senderId, data.receiverId].sort().join('_');

                    // 1. Move to subcollection
                    const subRef = doc(db, MESSAGES_COLLECTION, conversationId, 'messages', docSnap.id);
                    await setDoc(subRef, data);

                    // 2. Create/Update conversation parent doc
                    await setDoc(doc(db, MESSAGES_COLLECTION, conversationId), {
                        participants: [data.senderId, data.receiverId],
                        lastUpdated: data.timestamp || serverTimestamp()
                    }, { merge: true });

                    // 3. Delete from root
                    await deleteDoc(docSnap.ref);
                    migratedCount++;
                }
            });

            await Promise.all(promises);
            if (migratedCount > 0) {
                console.log(`Successfully migrated ${migratedCount} messages to subcollections.`);
            } else {
                console.log("No legacy messages found to migrate.");
            }
        } catch (error) {
            console.error("Migration failed:", error);
        }
    }
};
