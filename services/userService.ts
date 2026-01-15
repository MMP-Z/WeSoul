import { db } from '../firebaseConfig';
import {
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    arrayUnion,
    arrayRemove,
    query,
    where
} from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

const USERS_COLLECTION = 'users';

export const userService = {
    // Create or Update user profile in Firestore
    syncUser: async (user: any) => {
        const userRef = doc(db, USERS_COLLECTION, user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // New user: Create profile
            // Auto-promote specific email to admin
            const role = user.email === 'hoangviet4526@gmail.com' ? 'admin' : 'user';

            const newUser: UserProfile = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Người dùng mới',
                photoURL: user.photoURL,
                role: role,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };
            await setDoc(userRef, newUser);
            return newUser;
        } else {
            // Existing user: Update lastLogin and check for admin promotion, and sync profile logic
            const currentData = userSnap.data() as UserProfile;
            const updates: any = {
                lastLogin: new Date().toISOString()
            };

            // Check if profile info changed
            let profileChanged = false;
            if (user.displayName && user.displayName !== currentData.displayName) {
                updates.displayName = user.displayName;
                profileChanged = true;
            }
            if (user.photoURL && user.photoURL !== currentData.photoURL) {
                updates.photoURL = user.photoURL;
                profileChanged = true;
            }

            // Force admin role for specific email if not already set
            if (user.email === 'hoangviet4526@gmail.com' && currentData.role !== 'admin') {
                updates.role = 'admin';
            }

            if (Object.keys(updates).length > 1) { // lastLogin is always there, check if others added
                await updateDoc(userRef, updates);

                // If advisor profile changed, propagate to posts
                if (profileChanged && currentData.role === 'advisor') {
                    // Lazy import to avoid circular dependency if any (though services usually OK)
                    // or just import at top. Let's try direct call assuming import.
                    // importing advisorPostService at top of file.
                    import('./advisorPostService').then(({ advisorPostService }) => {
                        advisorPostService.updateAdvisorInfo(
                            user.uid,
                            updates.displayName || currentData.displayName,
                            updates.photoURL || currentData.photoURL || ''
                        );
                    });
                }
            }
            return { ...currentData, ...updates } as UserProfile;
        }
    },

    updateLastActive: async (uid: string) => {
        const userRef = doc(db, USERS_COLLECTION, uid);
        const advisorRef = doc(db, 'advisors', uid);
        const timestamp = new Date().toISOString();

        try {
            await updateDoc(userRef, { lastActive: timestamp });
            // Try updating advisor doc too, ignore if it fails (not an advisor)
            await updateDoc(advisorRef, { lastActive: timestamp }).catch(() => { });
        } catch (e) {
            console.error("Error updating last active:", e);
        }
    },

    getUserProfile: async (uid: string): Promise<UserProfile | null> => {
        try {
            const userRef = doc(db, USERS_COLLECTION, uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                return userSnap.data() as UserProfile;
            }
            return null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    },

    getAllUsers: async (): Promise<UserProfile[]> => {
        try {
            const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const users: UserProfile[] = [];
            querySnapshot.forEach((doc) => {
                users.push(doc.data() as UserProfile);
            });
            return users;
        } catch (error) {
            console.error("Error fetching users:", error);
            return [];
        }
    },

    updateUserRole: async (uid: string, role: UserRole) => {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, { role });
    },

    updateUserStatus: async (uid: string, isBlocked: boolean) => {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, { isBlocked });
    },

    deleteUser: async (uid: string) => {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await deleteDoc(userRef);
    },

    followAdvisor: async (uid: string, advisorId: string) => {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            following: arrayUnion(advisorId)
        });
    },

    unfollowAdvisor: async (uid: string, advisorId: string) => {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            following: arrayRemove(advisorId)
        });
    },

    getFollowers: async (uid: string): Promise<UserProfile[]> => {
        try {
            const q = query(
                collection(db, USERS_COLLECTION),
                where("following", "array-contains", uid)
            );
            const snapshot = await getDocs(q);
            const followers: UserProfile[] = [];
            snapshot.forEach(doc => {
                followers.push(doc.data() as UserProfile);
            });
            return followers;
        } catch (error) {
            console.error("Error fetching followers:", error);
            return [];
        }
    },

    getFollowing: async (uid: string): Promise<UserProfile[]> => {
        try {
            const userRef = doc(db, USERS_COLLECTION, uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) return [];

            const userData = userSnap.data() as UserProfile;
            const followingIds = userData.following || [];

            if (followingIds.length === 0) return [];

            const promises = followingIds.map(id => getDoc(doc(db, USERS_COLLECTION, id)));
            const snapshots = await Promise.all(promises);

            const following: UserProfile[] = [];
            snapshots.forEach(snap => {
                if (snap.exists()) {
                    following.push(snap.data() as UserProfile);
                }
            });

            return following;
        } catch (error) {
            console.error("Error fetching following:", error);
            return [];
        }
    }
};
