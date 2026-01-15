import { db } from '../firebaseConfig';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, limit, startAfter, orderBy } from 'firebase/firestore';
import { Advisor } from '../types';
import { ADVISORS } from '../constants';

const ADVISORS_COLLECTION = 'advisors';

export const advisorService = {
    // Fetch advisors with pagination
    getAdvisors: async (limitCount: number = 10, lastDocStr: any = null, category: string = 'Tất cả') => {
        try {
            const constraints: any[] = [orderBy('createdAt', 'desc')]; // Assuming createdAt exists, or use another field like 'rating' or 'id'
            // Actually, existing getAdvisors sorted by what? It didn't sort.
            // Let's sort by 'rating' or just arbitrary. 'createdAt' is good if exists.
            // checking Advisor type... it has 'approvalStatus'.

            // We should filter by approved status usually
            constraints.push(where('approvalStatus', '==', 'approved'));

            if (category && category !== 'Tất cả') {
                constraints.push(where('specialty', '==', category));
            }

            // Sort keys must match where filters order or be compatible.
            // If filtering by specialty, we might need composite index if sorting by something else.
            // Let's just limit and basic sort.
            // For simple implementation without ensuring composite indexes exist, 
            // generic list just pagination.

            let q = query(
                collection(db, ADVISORS_COLLECTION),
                where('approvalStatus', '==', 'approved'),
                limit(limitCount)
            );

            if (category && category !== 'Tất cả') {
                q = query(
                    collection(db, ADVISORS_COLLECTION),
                    where('approvalStatus', '==', 'approved'),
                    where('specialty', '==', category),
                    limit(limitCount)
                );
            }

            if (lastDocStr) {
                // We need to re-construct query with startAfter.
                // Note: startAfter requires sorting. Default sort is doc ID? No, definition is undefined.
                // Let's add orderBy('id') or similar to be safe?
                // Or just rely on default order if valid.
                // Safer to add orderBy.
                if (category && category !== 'Tất cả') {
                    q = query(
                        collection(db, ADVISORS_COLLECTION),
                        where('approvalStatus', '==', 'approved'),
                        where('specialty', '==', category),
                        startAfter(lastDocStr),
                        limit(limitCount)
                    );
                } else {
                    q = query(
                        collection(db, ADVISORS_COLLECTION),
                        where('approvalStatus', '==', 'approved'),
                        startAfter(lastDocStr),
                        limit(limitCount)
                    );
                }
            }

            const snapshot = await getDocs(q);
            const advisors: Advisor[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data() as any;
                advisors.push({
                    ...data,
                    price: data.price !== undefined ? data.price : (data.pricePerMinute || 0)
                });
            });

            return {
                advisors,
                lastDoc: snapshot.docs[snapshot.docs.length - 1]
            };
        } catch (error) {
            console.error("Error getting paginated advisors: ", error);
            return { advisors: [], lastDoc: null };
        }
    },

    // Fetch all advisors (Legacy / Search)
    getAllAdvisors: async (): Promise<Advisor[]> => {
        try {
            const querySnapshot = await getDocs(collection(db, ADVISORS_COLLECTION));
            const advisors: Advisor[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as any;
                const advisor: Advisor = {
                    ...data,
                    price: data.price !== undefined ? data.price : (data.pricePerMinute || 0)
                };
                advisors.push(advisor);
            });
            return advisors;
        } catch (error) {
            console.error("Error getting advisors: ", error);
            return [];
        }
    },

    getAdvisorById: async (id: string): Promise<Advisor | null> => {
        try {
            const docRef = doc(db, ADVISORS_COLLECTION, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as any;
                return {
                    ...data,
                    price: data.price !== undefined ? data.price : (data.pricePerMinute || 0)
                } as Advisor;
            }
            return null;
        } catch (error) {
            console.error("Error getting advisor by ID: ", error);
            return null;
        }
    },

    // Seed data from constants to Firestore
    seedAdvisors: async (): Promise<void> => {
        try {
            for (const advisor of ADVISORS) {
                const advisorRef = doc(db, ADVISORS_COLLECTION, advisor.id);
                const docSnap = await getDoc(advisorRef);

                if (!docSnap.exists()) {
                    await setDoc(advisorRef, advisor);
                    console.log(`Advisor ${advisor.name} migrated.`);
                } else {
                    console.log(`Advisor ${advisor.name} already exists. Skipping.`);
                }
            }
            console.log("Seeding completed.");
        } catch (error) {
            console.error("Error seeding advisors: ", error);
        }
    },

    addAdvisor: async (advisor: Advisor) => {
        try {
            await setDoc(doc(db, ADVISORS_COLLECTION, advisor.id), advisor);
        } catch (error) {
            console.error("Error adding advisor: ", error);
            throw error;
        }
    },

    updateAdvisor: async (id: string, updates: Partial<Advisor>) => {
        try {
            const advisorRef = doc(db, ADVISORS_COLLECTION, id);
            await updateDoc(advisorRef, updates);
        } catch (error) {
            console.error("Error updating advisor: ", error);
            throw error;
        }
    },

    deleteAdvisor: async (id: string) => {
        try {
            await deleteDoc(doc(db, ADVISORS_COLLECTION, id));
        } catch (error) {
            console.error("Error deleting advisor: ", error);
            throw error;
        }
    },

    approveAdvisor: async (id: string) => {
        try {
            const advisorRef = doc(db, ADVISORS_COLLECTION, id);
            await updateDoc(advisorRef, { approvalStatus: 'approved' });
        } catch (error) {
            console.error("Error approving advisor: ", error);
            throw error;
        }
    },

    rejectAdvisor: async (id: string) => {
        try {
            const advisorRef = doc(db, ADVISORS_COLLECTION, id);
            await updateDoc(advisorRef, { approvalStatus: 'rejected' });
        } catch (error) {
            console.error("Error rejecting advisor: ", error);
            throw error;
        }
    },

    addReview: async (advisorId: string, review: any) => {
        try {
            const advisorRef = doc(db, ADVISORS_COLLECTION, advisorId);
            const advisorSnap = await getDoc(advisorRef);

            if (advisorSnap.exists()) {
                const advisorData = advisorSnap.data() as Advisor;
                const reviews = advisorData.reviews || [];
                reviews.push(review);

                const newReviewCount = reviews.length;
                const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
                const newRating = totalRating / newReviewCount;

                await updateDoc(advisorRef, {
                    reviews: reviews,
                    rating: newRating,
                    reviewCount: newReviewCount
                });
            }
        } catch (error) {
            console.error("Error adding review: ", error);
            throw error;
        }
    }
};
