import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Post } from '../components/Post';
import { advisorPostService } from '../services/advisorPostService';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { imageUploadService } from '../services/imageUploadService';
import { AdvisorPost, UserProfile, UserRole } from '../types';
import { Loader2, Newspaper, Search, X, Image as ImageIcon, Calendar, Send } from 'lucide-react';
import toast from 'react-hot-toast';

// Ranking Algorithm Helper
const calculateRelevancyScore = (post: AdvisorPost, following: string[]) => {
    let score = 0;

    // 1. Relationship (The most important signal)
    if (following.includes(post.advisorId)) {
        score += 50; // Huge boost for followed advisors
    }

    // 2. Engagement (Social Proof)
    score += (post.likes || 0) * 0.5;
    score += (post.comments || 0) * 1.5;

    // 3. Recency (Freshness)
    // Timestamp handling: Firestore Timestamp or ISO string?
    // Accessing seconds is safer if it's Firestore object
    let postTime = Date.now();
    if (post.timestamp?.toMillis) {
        postTime = post.timestamp.toMillis();
    } else if (post.timestamp?.seconds) {
        postTime = post.timestamp.seconds * 1000;
    } else if (post.createdAt) {
        postTime = new Date(post.createdAt).getTime();
    }

    const hoursAgo = (Date.now() - postTime) / (1000 * 60 * 60);
    // Decay: New posts get high score. 100 points for immediate, 10 points for 9 hours ago.
    const recencyScore = 100 / (Math.max(hoursAgo, 0.5) + 0.5);
    score += recencyScore;

    return score;
};

export const Feed: React.FC = () => {
    // Initialize posts from local cache if available
    const [posts, setPosts] = useState<AdvisorPost[]>(() => {
        try {
            const saved = localStorage.getItem('feed_cache');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error("Cache parse error", error);
            return [];
        }
    });

    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(authService.auth.currentUser);
    const [userFollowing, setUserFollowing] = useState<string[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const observerTarget = React.useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const searchTerm = queryParams.get('search') || '';

    // Post Creation State
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            const newUrls = newFiles.map(file => URL.createObjectURL(file));

            setSelectedImages(prev => [...prev, ...newFiles]);
            setPreviewUrls(prev => [...prev, ...newUrls]);
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => {
            const newUrls = [...prev];
            URL.revokeObjectURL(newUrls[index]); // Cleanup memory
            return newUrls.filter((_, i) => i !== index);
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCreatePost = async () => {
        if ((!newPostContent.trim() && selectedImages.length === 0) || !currentUser) return;

        setIsPosting(true);
        try {
            let imageUrls: string[] = [];

            // Upload all images in parallel
            if (selectedImages.length > 0) {
                const uploadPromises = selectedImages.map(file => imageUploadService.uploadImage(file));
                const results = await Promise.all(uploadPromises);
                imageUrls = results.filter((url): url is string => url !== null);
            }

            // Create Post
            const isVerified = userProfile?.role === 'advisor';
            const newPostId = await advisorPostService.createPost({
                advisorId: currentUser.uid,
                advisorName: currentUser.displayName || 'Người dùng',
                advisorAvatar: currentUser.photoURL || '',
                isVerified: isVerified,
                content: newPostContent,
                images: imageUrls,
                createdAt: new Date().toISOString()
            });

            // Optimistically add to feed
            const newPost: AdvisorPost = {
                id: newPostId,
                advisorId: currentUser.uid,
                advisorName: currentUser.displayName || 'Người dùng',
                advisorAvatar: currentUser.photoURL || '',
                isVerified: isVerified,
                content: newPostContent,
                images: imageUrls,
                likes: 0,
                comments: 0,
                timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
                createdAt: new Date().toISOString()
            };

            setPosts(prev => [newPost, ...prev]);

            setNewPostContent('');
            setSelectedImages([]);
            setPreviewUrls([]);
            toast.success("Đăng bài thành công!");

        } catch (error) {
            console.error("Error creating post:", error);
            toast.error("Không thể đăng bài");
        } finally {
            setIsPosting(false);
        }
    };

    // Fetch User Following List & Profile
    useEffect(() => {
        const fetchProfileData = async () => {
            if (currentUser) {
                try {
                    const profile = await userService.getUserProfile(currentUser.uid);
                    setUserProfile(profile);
                    setUserFollowing(profile?.following || []);
                } catch (e) { console.error(e); }
            } else {
                setUserProfile(null);
                setUserFollowing([]);
            }
        };
        fetchProfileData();
    }, [currentUser]);

    const fetchPosts = async (isInitial = false) => {
        try {
            if (isInitial) {
                if (posts.length === 0) setLoading(true);
            } else {
                setIsFetchingMore(true);
            }

            // Algorithm Step 1: Inventory (Fetch larger batch for ranking pool)
            const BATCH_SIZE = 20;
            const result = await advisorPostService.getPosts(BATCH_SIZE, isInitial ? null : lastDoc);

            // Algorithm Step 2 & 3: Signals & Scoring & Sorting
            const rankedBatch = result.posts.map(post => ({
                ...post,
                // We calculate score dynamically based on current user's following list
                relevancyScore: calculateRelevancyScore(post, userFollowing)
            })).sort((a: any, b: any) => b.relevancyScore - a.relevancyScore);

            if (isInitial) {
                setPosts(rankedBatch);
                // Update cache with fresh data
                localStorage.setItem('feed_cache', JSON.stringify(rankedBatch));
            } else {
                setPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newUniquePosts = rankedBatch.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newUniquePosts];
                });
            }

            setLastDoc(result.lastDoc);
            setHasMore(result.posts.length === BATCH_SIZE);

        } catch (error) {
            console.error("Failed to load feed:", error);
            if (isInitial) {
                if (posts.length > 0) {
                    toast.error("Không có kết nối mạng. Đang hiển thị dữ liệu offline.", { id: 'offline-mode' });
                } else {
                    toast.error("Không thể tải bảng tin. Vui lòng kiểm tra kết nối.");
                }
            }
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    };

    const filteredPosts = posts.filter(post => {
        if (!searchTerm) return true;
        const lowerTerm = searchTerm.toLowerCase();
        return (post.content?.toLowerCase().includes(lowerTerm) || false);
    });

    useEffect(() => {
        fetchPosts(true);

        const unsubscribe = authService.onAuthStateChanged((user) => {
            setCurrentUser(user);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                // Pre-load when user is close to bottom (100px away)
                if (entries[0].isIntersecting && hasMore && !loading && !isFetchingMore) {
                    fetchPosts();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, loading, isFetchingMore, lastDoc]);

    return (
        <div className="min-h-screen bg-slate-50">


            {/* Search Header for Feed */}
            {searchTerm && (
                <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-bold text-gray-900">
                            Kết quả tìm kiếm: "{searchTerm}"
                        </h2>
                        <button
                            onClick={() => {
                                // Clear search from Feed
                                navigate('/');
                            }}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                        Tìm thấy {filteredPosts.length} bài viết khớp với từ khóa.
                    </p>
                    <button
                        onClick={() => navigate(`/market?search=${encodeURIComponent(searchTerm)}`)}
                        className="w-full py-2 bg-indigo-50 text-indigo-600 font-medium rounded-lg text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <Search className="w-4 h-4" />
                        Tìm "{searchTerm}" bên Cố Vấn
                    </button>
                </div>
            )}

            <div className="pb-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full">

                {/* Create Post Box */}
                {currentUser && (
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-6 mt-[5px] animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex gap-3 mb-3">
                            {currentUser.photoURL ? (
                                <img
                                    src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}&background=random`}
                                    alt="Me"
                                    className="w-10 h-10 rounded-full border border-gray-200 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => navigate(`/profile/${currentUser.uid}`)}
                                />
                            ) : (
                                <div
                                    className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => navigate(`/profile/${currentUser.uid}`)}
                                >
                                    {currentUser.displayName?.charAt(0) || 'U'}
                                </div>
                            )}
                            <div className="flex-1 bg-gray-50 rounded-full px-4 py-2 hover:bg-gray-100 transition-colors cursor-text border border-transparent hover:border-gray-200 flex items-center">
                                <input
                                    type="text"
                                    placeholder="Bạn đang nghĩ gì?"
                                    className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-500"
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreatePost()}
                                    disabled={isPosting}
                                />
                            </div>
                        </div>

                        {previewUrls.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
                                {previewUrls.map((url, index) => (
                                    <div key={index} className="relative shrink-0 rounded-lg overflow-hidden h-32 w-32 group">
                                        <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover border border-gray-100" />
                                        <button
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {/* Add more button placeholder if needed */}
                            </div>
                        )}

                        <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    onChange={handleImageSelect}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors"
                                >
                                    <ImageIcon className="w-5 h-5 text-green-500" /> <span className="hidden sm:inline">Ảnh</span>
                                </button>
                                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors">
                                    <Calendar className="w-5 h-5 text-amber-500" /> <span className="hidden sm:inline">Sự kiện</span>
                                </button>
                            </div>
                            <button
                                onClick={handleCreatePost}
                                disabled={(!newPostContent.trim() && selectedImages.length === 0) || isPosting}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 shadow-indigo-200"
                            >
                                {isPosting ? 'Đang gửi...' : 'Đăng'} <Send className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                )}
                {loading && posts.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed shadow-sm">
                        <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">{searchTerm ? 'Không tìm thấy bài viết nào.' : 'Chưa có bài viết nào trên bảng tin.'}</p>
                        {searchTerm && (
                            <button
                                onClick={() => navigate(`/market?search=${encodeURIComponent(searchTerm)}`)}
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm"
                            >
                                Thử tìm bên Cố Vấn
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredPosts.map(post => (
                            <Post key={post.id} post={post} currentUser={currentUser} />
                        ))}

                        {/* Loading trigger / indicator */}
                        <div ref={observerTarget} className="h-10 flex justify-center items-center mt-4">
                            {isFetchingMore && <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />}
                            {!hasMore && posts.length > 0 && (
                                <p className="text-gray-400 text-sm">Bạn đã xem hết bài viết.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};
