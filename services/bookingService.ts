import { db } from '../firebaseConfig';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
    updateDoc,
    doc
} from 'firebase/firestore';
import { Booking, BookingStatus } from '../types';

const BOOKINGS_COLLECTION = 'bookings';

export const bookingService = {
    createBooking: async (booking: Omit<Booking, 'id' | 'createdAt'>) => {
        try {
            const docRef = await addDoc(collection(db, BOOKINGS_COLLECTION), {
                ...booking,
                createdAt: new Date().toISOString()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating booking:", error);
            throw error;
        }
    },

    getUserBookings: async (userId: string): Promise<Booking[]> => {
        try {
            const q = query(
                collection(db, BOOKINGS_COLLECTION),
                where("userId", "==", userId)
            );

            const querySnapshot = await getDocs(q);
            const bookings: Booking[] = [];

            querySnapshot.forEach((doc) => {
                bookings.push({ id: doc.id, ...doc.data() } as Booking);
            });

            // Client-side sort by date desc since compound queries require index
            return bookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } catch (error) {
            console.error("Error fetching bookings:", error);
            return [];
        }
    },

    getAllBookings: async (): Promise<Booking[]> => {
        try {
            const querySnapshot = await getDocs(collection(db, BOOKINGS_COLLECTION));
            const bookings: Booking[] = [];
            querySnapshot.forEach((doc) => {
                bookings.push({ id: doc.id, ...doc.data() } as Booking);
            });
            // Sort by date desc
            return bookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } catch (error) {
            console.error("Error fetching all bookings:", error);
            return [];
        }
    },

    getAdvisorBookings: async (advisorId: string): Promise<Booking[]> => {
        try {
            const q = query(
                collection(db, BOOKINGS_COLLECTION),
                where("advisorId", "==", advisorId)
            );

            const querySnapshot = await getDocs(q);
            const bookings: Booking[] = [];

            querySnapshot.forEach((doc) => {
                bookings.push({ id: doc.id, ...doc.data() } as Booking);
            });

            // Client-side sort by date desc
            return bookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } catch (error) {
            console.error("Error fetching advisor bookings:", error);
            return [];
        }
    },

    updateBookingStatus: async (bookingId: string, status: BookingStatus) => {
        try {
            const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
            await updateDoc(bookingRef, { status });
        } catch (error) {
            console.error("Error updating booking status:", error);
            throw error;
        }
    },

    markAsReviewed: async (bookingId: string) => {
        try {
            const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
            await updateDoc(bookingRef, { isReviewed: true });
        } catch (error) {
            console.error("Error marking booking as reviewed:", error);
            throw error;
        }
    },

    updateBookingInfo: async (bookingId: string, updates: { userName?: string, userAvatar?: string, advisorName?: string, advisorAvatar?: string }) => {
        try {
            const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
            await updateDoc(bookingRef, updates);
        } catch (error) {
            console.error("Error updating booking info:", error);
        }
    },

    getOrCreateChatBooking: async (userId: string, advisorId: string, advisorName: string, advisorAvatar: string, userName: string, userAvatar: string) => {
        try {
            // 1. Check existing bookings
            // Optimization: Query simple by userId then filter
            const q = query(
                collection(db, BOOKINGS_COLLECTION),
                where("userId", "==", userId)
            );
            const snapshot = await getDocs(q);
            let existingId = null;

            snapshot.forEach(doc => {
                const data = doc.data() as Booking;
                if (data.advisorId === advisorId && (data.status === BookingStatus.CONFIRMED || data.status === BookingStatus.COMPLETED)) {
                    existingId = doc.id;
                }
            });

            if (existingId) return existingId;

            // 2. Create new if not exists
            const booking: Omit<Booking, 'id' | 'createdAt'> = {
                userId,
                advisorId,
                advisorName,
                advisorAvatar,
                userName,
                userAvatar,
                date: new Date().toISOString(),
                durationMinutes: 0,
                totalPrice: 0,
                status: BookingStatus.CONFIRMED,
                note: 'Bắt đầu trò chuyện'
            };

            const docRef = await addDoc(collection(db, BOOKINGS_COLLECTION), {
                ...booking,
                createdAt: new Date().toISOString()
            });

            return docRef.id;

        } catch (error) {
            console.error("Error getting/creating chat booking:", error);
            throw error;
        }
    }
};
