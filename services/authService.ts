
import { auth } from '../firebaseConfig';
import { userService } from './userService'; // Import userService
import {
    createUserWithEmailAndPassword, // Keep this as it's used by the register method
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    onAuthStateChanged,
    GoogleAuthProvider, // Added
    signInWithPopup,    // Added
    User
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider(); // Added

export const authService = {
    register: async (email: string, password: string, displayName: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName });
            // Sync to Firestore
            await userService.syncUser(userCredential.user);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    },

    login: async (email: string, password: string) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // Sync to Firestore
            await userService.syncUser(userCredential.user);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    },

    loginWithGoogle: async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            // Sync to Firestore
            await userService.syncUser(result.user);
            return result.user;
        } catch (error) {
            throw error;
        }
    },

    logout: async () => {
        try {
            await signOut(auth);
        } catch (error) {
            throw error;
        }
    },

    onAuthStateChanged: (callback: (user: User | null) => void) => {
        return onAuthStateChanged(auth, callback);
    },
    auth // Export auth object directly
};
