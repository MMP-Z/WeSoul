import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, serverTimestamp, updateDoc, increment, getDoc, setDoc, limit, startAfter } from 'firebase/firestore';
import { AdvisorPost, AdvisorComment } from '../types';

const POSTS_COLLECTION = 'advisor_posts';

export const advisorPostService = {
    // Create a new post
    createPost: async (postData: Omit<AdvisorPost, 'id' | 'timestamp' | 'likes' | 'comments' | 'relevancyScore'>) => {
        try {
            const docRef = await addDoc(collection(db, POSTS_COLLECTION), {
                ...postData,
                likes: 0,
                comments: 0,
                timestamp: serverTimestamp(),
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating post:", error);
            throw error;
        }
    },

    // Get posts with pagination
    getPosts: async (limitCount: number = 10, lastDocStr: any = null) => {
        try {
            let q = query(
                collection(db, POSTS_COLLECTION),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );

            if (lastDocStr) {
                q = query(
                    collection(db, POSTS_COLLECTION),
                    orderBy('timestamp', 'desc'),
                    startAfter(lastDocStr),
                    limit(limitCount)
                );
            }

            const snapshot = await getDocs(q);
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AdvisorPost));

            return {
                posts,
                lastDoc: snapshot.docs[snapshot.docs.length - 1]
            };
        } catch (error) {
            console.error("Error fetching posts:", error);
            return { posts: [], lastDoc: null };
        }
    },

    // Legacy support or fetching all (if needed, but discouraged for performance)
    getAllPosts: async () => {
        // ... keeping old implementation or redirecting to getPosts with high limit?
        // Let's keep it but ideally unused or implementation similar to above without limit.
        // Actually, let's just make getAllPosts use getPosts logic or deprecated.
        // For now, I'll replace it with the new distinct function to avoid breaking changes if I miss a usage, 
        // BUT I should check usages. Feed.tsx uses it.
        // I'll add `getPostsPaginated` and switch Feed to use it.
        return advisorPostService.getPosts(100).then(res => res.posts);
    },

    // Get posts by advisor ID
    getPostsByAdvisor: async (advisorId: string) => {
        try {
            const q = query(
                collection(db, POSTS_COLLECTION),
                where('advisorId', '==', advisorId),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AdvisorPost));
        } catch (error) {
            console.error("Error fetching advisor posts:", error);
            // Fallback for missing index
            const qFallback = query(
                collection(db, POSTS_COLLECTION),
                where('advisorId', '==', advisorId)
            );
            const snapshot = await getDocs(qFallback);
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AdvisorPost));
            return posts.sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds * 1000 || Date.now());
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds * 1000 || Date.now());
                return timeB - timeA;
            });
        }
    },

    // Delete a post
    deletePost: async (postId: string) => {
        try {
            await deleteDoc(doc(db, POSTS_COLLECTION, postId));
        } catch (error) {
            console.error("Error deleting post:", error);
            throw error;
        }
    },

    // Toggle Like
    toggleLike: async (postId: string, userId: string) => {
        try {
            const likeRef = doc(db, POSTS_COLLECTION, postId, 'likes', userId);
            const likeDoc = await getDoc(likeRef);
            const postRef = doc(db, POSTS_COLLECTION, postId);

            if (likeDoc.exists()) {
                // Unlike
                await deleteDoc(likeRef);
                await updateDoc(postRef, {
                    likes: increment(-1)
                });
                return false; // Not liked anymore
            } else {
                // Like
                await setDoc(likeRef, {
                    userId,
                    timestamp: serverTimestamp()
                });
                await updateDoc(postRef, {
                    likes: increment(1)
                });
                return true; // Liked
            }
        } catch (error) {
            console.error("Error toggling like:", error);
            throw error;
        }
    },

    // Check if user liked a post
    checkUserLike: async (postId: string, userId: string) => {
        try {
            const likeRef = doc(db, POSTS_COLLECTION, postId, 'likes', userId);
            const likeDoc = await getDoc(likeRef);
            return likeDoc.exists();
        } catch (error) {
            console.error("Error checking user like:", error);
            return false;
        }
    },

    // Add a comment
    addComment: async (postId: string, userId: string, userName: string, userAvatar: string, content: string) => {
        try {
            // Add comment to subcollection
            const commentsRef = collection(db, POSTS_COLLECTION, postId, 'comments');
            await addDoc(commentsRef, {
                postId,
                userId,
                userName,
                userAvatar,
                content,
                timestamp: serverTimestamp()
            });

            // Update comment count on post
            const postRef = doc(db, POSTS_COLLECTION, postId);
            await updateDoc(postRef, {
                comments: increment(1)
            });

            return true;
        } catch (error) {
            console.error("Error adding comment:", error);
            throw error;
        }
    },

    // Get comments for a post
    getComments: async (postId: string) => {
        try {
            const commentsRef = collection(db, POSTS_COLLECTION, postId, 'comments');
            const q = query(commentsRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AdvisorComment));
        } catch (error) {
            console.error("Error fetching comments:", error);
            return [];
        }
    },

    // Update advisor info in all their posts
    updateAdvisorInfo: async (advisorId: string, name: string, avatar: string) => {
        try {
            const q = query(
                collection(db, POSTS_COLLECTION),
                where('advisorId', '==', advisorId)
            );
            const snapshot = await getDocs(q);

            // Update all posts using Promise.all (adequate for typical volume)
            const updatePromises = snapshot.docs.map(doc =>
                updateDoc(doc.ref, {
                    advisorName: name,
                    advisorAvatar: avatar
                })
            );

            await Promise.all(updatePromises);
            console.log(`Updated ${updatePromises.length} posts for advisor ${advisorId}`);
        } catch (error) {
            console.error("Error updating advisor info in posts:", error);
        }
    }
};
