import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, writeBatch, doc, collectionGroup } from 'firebase/firestore';
import { advisorPostService } from './advisorPostService';

export const profileSyncService = {
    /**
     * Syncs user/advisor profile updates across all denormalized data in Firestore.
     * @param userId The ID of the user/advisor updating their profile
     * @param role The role of the user ('user' | 'advisor' | 'admin')
     * @param newName The new display name
     * @param newAvatar The new avatar URL
     */
    syncUserProfile: async (userId: string, role: string, newName: string, newAvatar: string) => {
        console.log(`Starting global profile sync for ${userId} (${role})...`);

        const batchSize = 450; // Firestore batch limit is 500
        let updatedCount = 0;

        try {
            // 1. Sync Bookings (Both User and Advisor roles)
            // If Advisor: update advisorName, advisorAvatar
            // If User: update userName, userAvatar

            const bookingsRef = collection(db, 'bookings');
            let qBookings;

            if (role === 'advisor') {
                qBookings = query(bookingsRef, where('advisorId', '==', userId));
            } else {
                qBookings = query(bookingsRef, where('userId', '==', userId));
            }

            const bookingsSnap = await getDocs(qBookings);
            if (!bookingsSnap.empty) {
                const batch = writeBatch(db);
                bookingsSnap.docs.forEach(doc => {
                    if (role === 'advisor') {
                        batch.update(doc.ref, {
                            advisorName: newName,
                            advisorAvatar: newAvatar
                        });
                    } else {
                        batch.update(doc.ref, {
                            userName: newName,
                            userAvatar: newAvatar
                        });
                    }
                });
                await batch.commit();
                console.log(`Synced ${bookingsSnap.size} bookings.`);
                updatedCount += bookingsSnap.size;
            }

            // 2. Sync Comments (User role usually, but Advisors can also comment)
            // Comments have userName, userAvatar
            const commentsQ = query(collectionGroup(db, 'comments'), where('userId', '==', userId));
            const commentsSnap = await getDocs(commentsQ);

            if (!commentsSnap.empty) {
                // Determine existing batches or iterate
                // For simplicity, we process in chunks if large, but likely small for now.
                // If > 500, we need loop.
                const chunks = [];
                for (let i = 0; i < commentsSnap.docs.length; i += batchSize) {
                    chunks.push(commentsSnap.docs.slice(i, i + batchSize));
                }

                for (const chunk of chunks) {
                    const batch = writeBatch(db);
                    chunk.forEach(doc => {
                        batch.update(doc.ref, {
                            userName: newName,
                            userAvatar: newAvatar
                        });
                    });
                    await batch.commit();
                }
                console.log(`Synced ${commentsSnap.size} comments.`);
                updatedCount += commentsSnap.size;
            }

            // 3. Sync Messages (Sender Name)
            // Messages subcollections
            // ChatMessage has senderId, senderName. (Avatar is not stored in ChatMessage type, but Name is)
            const messagesQ = query(collectionGroup(db, 'messages'), where('senderId', '==', userId));
            const messagesSnap = await getDocs(messagesQ);

            if (!messagesSnap.empty) {
                const chunks = [];
                for (let i = 0; i < messagesSnap.docs.length; i += batchSize) {
                    chunks.push(messagesSnap.docs.slice(i, i + batchSize));
                }

                for (const chunk of chunks) {
                    const batch = writeBatch(db);
                    chunk.forEach(doc => {
                        batch.update(doc.ref, {
                            senderName: newName
                        });
                    });
                    await batch.commit();
                }
                console.log(`Synced ${messagesSnap.size} messages.`);
                updatedCount += messagesSnap.size;
            }

            // 4. If Advisor, sync Posts (Advisor Name/Avatar)
            if (role === 'advisor') {
                await advisorPostService.updateAdvisorInfo(userId, newName, newAvatar);
                console.log("Synced advisor posts.");
            }

            console.log(`Global profile sync completed. Updated ~${updatedCount} documents.`);
            return true;

        } catch (error) {
            console.error("Error running global profile sync:", error);
            // We don't throw, just log, so purely sync failure doesn't block the main UI update
            return false;
        }
    }
};
