import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, serverTimestamp, updateDoc, increment, getDoc, setDoc, limit, startAfter, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { AdvisorPost, AdvisorComment } from '../types';
import { notificationService } from './notificationService';

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
            const postId = docRef.id;

            // Notify Followers
            try {
                // Determine who to notify. Users following this advisor.
                // Assuming 'users' collection has 'following' array.
                const followersQuery = query(
                    collection(db, 'users'),
                    where('following', 'array-contains', postData.advisorId)
                );
                const followersSnap = await getDocs(followersQuery);

                // Batch create notifications (limit to reasonable number, e.g. 50 most recent active)
                // For now, just map all.
                const notifPromises = followersSnap.docs.map(userDoc => {
                    return notificationService.createNotification({
                        userId: userDoc.id,
                        title: `Bài viết mới từ ${postData.advisorName}`,
                        content: postData.content.length > 50 ? postData.content.substring(0, 50) + '...' : postData.content,
                        type: 'post',
                        link: `/post/${postId}`,
                        senderId: postData.advisorId,
                        senderName: postData.advisorName,
                        senderAvatar: postData.advisorAvatar || '/favicon.png'
                    });
                });
                await Promise.all(notifPromises);
            } catch (err) {
                console.error("Error notifying followers:", err);
            }

            return postId;
        } catch (error) {
            console.error("Error creating post:", error);
            throw error;
        }
    },

    // Subscribe to post updates (Realtime)
    subscribeToPost: (postId: string, callback: (post: AdvisorPost) => void) => {
        const docRef = doc(db, POSTS_COLLECTION, postId);
        return onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                callback({ id: doc.id, ...doc.data() } as AdvisorPost);
            }
        });
    },

    // Subscribe to comments (Realtime)
    subscribeToComments: (postId: string, callback: (comments: AdvisorComment[]) => void) => {
        const commentsRef = collection(db, POSTS_COLLECTION, postId, 'comments');
        const q = query(commentsRef, orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const comments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AdvisorComment));
            callback(comments);
        });
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

    // Get single post by ID
    getPostById: async (postId: string) => {
        try {
            const docRef = doc(db, POSTS_COLLECTION, postId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                } as AdvisorPost;
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error fetching post:", error);
            throw error;
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

                // Notify Post Owner
                const postSnap = await getDoc(postRef);
                if (postSnap.exists()) {
                    const post = postSnap.data() as AdvisorPost;
                    if (post.advisorId && post.advisorId !== userId) {
                        // Fetch liker details? Or just generic.
                        // Ideally we pass likerName but signature is limited. 
                        // We'll leave senderName undefined or generic.
                        await notificationService.createNotification({
                            userId: post.advisorId,
                            title: 'Lượt thích mới',
                            content: 'Ai đó đã thích bài viết của bạn.',
                            type: 'like',
                            link: `/post/${postId}`,
                            senderId: userId,
                            senderAvatar: '/favicon.png'
                        });
                    }
                }

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
    addComment: async (postId: string, userId: string, userName: string, userAvatar: string, content: string, replyToId?: string) => {
        try {
            // Add comment to subcollection
            const commentsRef = collection(db, POSTS_COLLECTION, postId, 'comments');
            const commentData = {
                postId,
                userId,
                userName,
                userAvatar,
                content,
                likes: 0,
                likedBy: [],
                replyToId: replyToId || null,
                timestamp: serverTimestamp()
            };

            const docRef = await addDoc(commentsRef, commentData);

            // Update comment count on post
            const postRef = doc(db, POSTS_COLLECTION, postId);
            await updateDoc(postRef, {
                comments: increment(1)
            });



            // Notify Post Owner & Reply Target
            try {
                // 1. Get Post Owner
                const postRef = doc(db, POSTS_COLLECTION, postId);
                const postSnap = await getDoc(postRef);

                if (postSnap.exists()) {
                    const post = postSnap.data() as AdvisorPost;

                    // Notify Post Owner
                    if (post.advisorId !== userId) {
                        await notificationService.createNotification({
                            userId: post.advisorId,
                            title: `${userName} đã bình luận`,
                            content: content,
                            type: 'comment',
                            link: `/post/${postId}`,
                            senderId: userId,
                            senderName: userName,
                            senderAvatar: userAvatar || '/favicon.png'
                        });
                    }

                    // 2. If Reply, Notify Parent Comment Author
                    if (replyToId) {
                        const parentCommentRef = doc(db, POSTS_COLLECTION, postId, 'comments', replyToId);
                        const parentSnap = await getDoc(parentCommentRef);
                        if (parentSnap.exists()) {
                            const parentData = parentSnap.data();
                            // Notify if parent author is different from replier AND different from post owner (to avoid double notif if post owner = comment author)
                            // But usually we notify regardless for clarity.
                            if (parentData.userId !== userId && parentData.userId !== post.advisorId) {
                                await notificationService.createNotification({
                                    userId: parentData.userId,
                                    title: `${userName} đã trả lời bình luận của bạn`,
                                    content: content,
                                    type: 'comment',
                                    link: `/post/${postId}`,
                                    senderId: userId,
                                    senderName: userName,
                                    senderAvatar: userAvatar || '/favicon.png'
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error sending comment notification:", err);
            }

            return {
                id: docRef.id,
                ...commentData,
                timestamp: { seconds: Date.now() / 1000 }
            } as AdvisorComment;
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

    // Delete a comment
    deleteComment: async (postId: string, commentId: string) => {
        try {
            const commentRef = doc(db, POSTS_COLLECTION, postId, 'comments', commentId);
            await deleteDoc(commentRef);

            // Decrement comment count
            const postRef = doc(db, POSTS_COLLECTION, postId);
            await updateDoc(postRef, {
                comments: increment(-1)
            });

            return true;
        } catch (error) {
            console.error("Error deleting comment:", error);
            throw error;
        }
    },

    // Update a comment
    updateComment: async (postId: string, commentId: string, newContent: string) => {
        try {
            const commentRef = doc(db, POSTS_COLLECTION, postId, 'comments', commentId);
            await updateDoc(commentRef, {
                content: newContent,
                isEdited: true
            });

            return true;
        } catch (error) {
            console.error("Error updating comment:", error);
            throw error;
        }
    },

    // Toggle Comment Like
    toggleCommentLike: async (postId: string, commentId: string, userId: string) => {
        try {
            const commentRef = doc(db, POSTS_COLLECTION, postId, 'comments', commentId);
            const commentSnap = await getDoc(commentRef);

            if (commentSnap.exists()) {
                const data = commentSnap.data();
                const likedBy = data.likedBy || [];
                const isLiked = likedBy.includes(userId);

                if (isLiked) {
                    await updateDoc(commentRef, {
                        likes: increment(-1),
                        likedBy: arrayRemove(userId)
                    });
                    return false; // unliked
                } else {
                    await updateDoc(commentRef, {
                        likes: increment(1),
                        likedBy: arrayUnion(userId)
                    });
                    return true; // liked
                }
            }
            return false;
        } catch (error) {
            console.error("Error toggling comment like:", error);
            throw error;
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
