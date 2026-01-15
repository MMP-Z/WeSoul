import React, { useState, useRef, useEffect } from 'react';
import { AdvisorPost, AdvisorComment } from '../types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, Loader2, Trash2, EyeOff, Flag, BadgeCheck } from 'lucide-react';
import { advisorPostService } from '../services/advisorPostService';
import { userService } from '../services/userService';
import { useNavigate } from 'react-router-dom';

interface PostProps {
    post: AdvisorPost;
    currentUser?: any; // Firebase User object
}

export const Post: React.FC<PostProps> = ({ post, currentUser }) => {
    const navigate = useNavigate();
    const [likes, setLikes] = useState(post.likes);
    const [commentsCount, setCommentsCount] = useState(post.comments);
    const [isLiked, setIsLiked] = useState(false);
    const [isVerified, setIsVerified] = useState(post.isVerified);

    useEffect(() => {
        setIsVerified(post.isVerified);
    }, [post.isVerified]);

    // Lazy verification for legacy posts
    useEffect(() => {
        const checkVerification = async () => {
            if (isVerified === undefined) {
                try {
                    const profile = await userService.getUserProfile(post.advisorId);
                    if (profile?.role === 'advisor') {
                        setIsVerified(true);
                    } else {
                        setIsVerified(false);
                    }
                } catch (error) {
                    console.error("Error checking verification:", error);
                }
            }
        };
        checkVerification();
    }, [post.advisorId, isVerified]);

    // Comment State
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<AdvisorComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    // Menu State
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    React.useEffect(() => {
        const checkLikeStatus = async () => {
            if (currentUser) {
                const liked = await advisorPostService.checkUserLike(post.id, currentUser.uid);
                setIsLiked(liked);
            }
        };
        checkLikeStatus();
    }, [post.id, currentUser]);

    const handleLike = async () => {
        if (!currentUser) {
            alert("Vui lòng đăng nhập để thích bài viết");
            return;
        }

        // Optimistic update
        const isNowLiked = !isLiked;
        setIsLiked(isNowLiked);
        setLikes(prev => isNowLiked ? prev + 1 : prev - 1);

        try {
            const actualLikedState = await advisorPostService.toggleLike(post.id, currentUser.uid);
            // Verify state if needed, but optimistic usually fine
            if (actualLikedState !== isNowLiked) {
                // Revert if error or mismatch (rare)
                setIsLiked(actualLikedState);
                setLikes(prev => actualLikedState ? prev + 1 : prev - 1);
            }
        } catch (error) {
            // Revert on error
            setIsLiked(!isNowLiked);
            setLikes(prev => !isNowLiked ? prev + 1 : prev - 1);
        }
    };

    const toggleComments = async () => {
        const newShowState = !showComments;
        setShowComments(newShowState);

        if (newShowState && comments.length === 0) {
            setLoadingComments(true);
            try {
                const fetchedComments = await advisorPostService.getComments(post.id);
                setComments(fetchedComments);
            } catch (error) {
                console.error("Failed to load comments", error);
            } finally {
                setLoadingComments(false);
            }
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUser) return;

        setSubmittingComment(true);
        try {
            await advisorPostService.addComment(
                post.id,
                currentUser.uid,
                currentUser.displayName || 'Người dùng',
                currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`,
                newComment
            );

            // Optimistic update
            const comment: AdvisorComment = {
                id: Date.now().toString(),
                postId: post.id,
                userId: currentUser.uid,
                userName: currentUser.displayName || 'Người dùng',
                userAvatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`,
                content: newComment,
                timestamp: { seconds: Date.now() / 1000 }
            };

            setComments(prev => [comment, ...prev]);
            setCommentsCount(prev => prev + 1);
            setNewComment('');
        } catch (error) {
            console.error("Failed to post comment", error);
            alert("Không thể gửi bình luận");
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleShare = () => {
        const link = `${window.location.origin}/post/${post.id}`; // Hypothetical link
        navigator.clipboard.writeText(link);
        alert('Đã sao chép liên kết bài viết!');
    };

    const handleDelete = async () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) {
            try {
                await advisorPostService.deletePost(post.id);
                setIsDeleted(true);
            } catch (error) {
                console.error("Error deleting post:", error);
                alert("Có lỗi xảy ra khi xóa bài viết.");
            }
        }
    };

    const handleHide = () => {
        setIsHidden(true);
    };

    const handleReport = () => {
        alert("Đã gửi báo cáo vi phạm.");
        setShowMenu(false);
    };

    const formattedDate = post.timestamp?.seconds
        ? new Date(post.timestamp.seconds * 1000).toLocaleString('vi-VN', { dateStyle: 'long', timeStyle: 'short' })
        : 'Vừa xong';

    if (isDeleted || isHidden) return null;

    const isOwner = currentUser?.uid === post.advisorId;

    return (
        <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="p-4 flex gap-3 items-center">
                <img
                    src={post.advisorAvatar}
                    alt={post.advisorName}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 cursor-pointer"
                    onClick={() => navigate(`/profile/${post.advisorId}`)}
                />
                <div className="flex-1">
                    <div className="flex items-center gap-1">
                        <h3
                            className="font-bold text-gray-900 text-sm hover:underline cursor-pointer"
                            onClick={() => navigate(`/profile/${post.advisorId}`)}
                        >
                            {post.advisorName}
                        </h3>
                        {isVerified && <BadgeCheck className="w-4 h-4 text-white fill-blue-500" />}
                    </div>
                    <span className="text-xs text-gray-500">{formattedDate}</span>
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full transition-colors"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
                            {isOwner ? (
                                <button
                                    onClick={handleDelete}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Xóa bài viết
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleHide}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <EyeOff className="w-4 h-4" /> Ẩn bài viết
                                    </button>
                                    <button
                                        onClick={handleReport}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Flag className="w-4 h-4" /> Báo cáo
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 pb-3 text-gray-800 whitespace-pre-wrap leading-relaxed">
                {post.content}
            </div>

            {/* Images */}
            {post.images && post.images.length > 0 && (
                <div className={`grid gap-1 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {post.images.map((img, idx) => (
                        <img
                            key={idx}
                            src={img}
                            alt="Post content"
                            className={`w-full object-cover cursor-pointer hover:opacity-95 transition-opacity ${post.images && post.images.length === 1 ? 'max-h-[500px]' : 'h-64'}`}
                        />
                    ))}
                </div>
            )}

            {/* Stats */}
            <div className="px-4 py-2 flex justify-between text-xs text-gray-500 border-b border-gray-100">
                <span>{likes} lượt thích</span>
                <span>{commentsCount} bình luận</span>
            </div>

            {/* Actions */}
            <div className="px-2 py-1 flex justify-between">
                <button
                    onClick={handleLike}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${isLiked ? 'text-pink-500 bg-pink-50' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    <span className="font-medium text-sm">Thích</span>
                </button>
                <button
                    onClick={toggleComments}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${showComments ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">Bình luận</span>
                </button>
                <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
                >
                    <Share2 className="w-5 h-5" />
                    <span className="font-medium text-sm">Chia sẻ</span>
                </button>
            </div>

            {/* Comment Section */}
            {showComments && (
                <div className="px-4 py-4 bg-gray-50 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                    {/* Input */}
                    {currentUser ? (
                        <div className="flex gap-3 mb-4">
                            <img src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`} alt="Me" className="w-8 h-8 rounded-full border border-gray-200" />
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="Viết bình luận..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                    className="w-full bg-white border border-gray-200 rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                    disabled={submittingComment}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim() || submittingComment}
                                    className="absolute right-2 top-1.5 text-indigo-600 hover:text-indigo-700 disabled:opacity-50 p-1"
                                >
                                    {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-2 text-sm text-gray-500 mb-4">
                            Vui lòng đăng nhập để bình luận.
                        </div>
                    )}

                    {/* Comment List */}
                    {loadingComments ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comments.map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                    <img src={comment.userAvatar} alt={comment.userName} className="w-8 h-8 rounded-full border border-gray-200" />
                                    <div className="flex-1">
                                        <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm inline-block min-w-[200px]">
                                            <p className="font-semibold text-xs text-gray-900 mb-0.5">{comment.userName}</p>
                                            <p className="text-sm text-gray-700">{comment.content}</p>
                                        </div>
                                        <div className="mt-1 ml-2 text-xs text-gray-400">
                                            {comment.timestamp?.seconds
                                                ? new Date(comment.timestamp.seconds * 1000).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                                                : 'Vừa xong'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <p className="text-center text-gray-400 text-sm italic">Chưa có bình luận nào.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
