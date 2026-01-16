import React, { useState, useRef, useEffect } from 'react';
import { AdvisorPost, AdvisorComment } from '../types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, Loader2, Trash2, EyeOff, Flag, BadgeCheck, Edit2, X, Check } from 'lucide-react';
import { advisorPostService } from '../services/advisorPostService';
import { userService } from '../services/userService';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/dateFormatter';

interface PostProps {
    post: AdvisorPost;
    currentUser?: any; // Firebase User object
    isDetailedView?: boolean;
}

export const Post: React.FC<PostProps> = ({ post, currentUser, isDetailedView = false }) => {
    const navigate = useNavigate();
    const [likes, setLikes] = useState(post.likes);
    const [commentsCount, setCommentsCount] = useState(post.comments);
    const [isLiked, setIsLiked] = useState(false);
    const [isVerified, setIsVerified] = useState(post.isVerified);
    const [viewImage, setViewImage] = useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0); // For carousel

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
    const [showComments, setShowComments] = useState(isDetailedView);
    const [comments, setComments] = useState<AdvisorComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
    const [replyToId, setReplyToId] = useState<string | null>(null);

    // Menu State
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null); // Added this ref for the carousel

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
            // Close comment menu if clicking outside
            if (!event.target && activeCommentMenuId) {
                setActiveCommentMenuId(null);
            } else {
                // Simple global click listener is enough usually, but let's be safe
                const target = event.target as HTMLElement;
                if (!target.closest('.comment-menu-trigger') && !target.closest('.comment-menu-dropdown')) {
                    setActiveCommentMenuId(null);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeCommentMenuId]);

    // Auto load comments for detailed view
    // Realtime Post Updates (Likes, Comment Count)
    useEffect(() => {
        const unsubscribe = advisorPostService.subscribeToPost(post.id, (updatedPost) => {
            setLikes(updatedPost.likes || 0);
            setCommentsCount(updatedPost.comments || 0);
        });
        return () => unsubscribe();
    }, [post.id]);

    // Realtime Comments
    useEffect(() => {
        if (showComments) {
            if (comments.length === 0) setLoadingComments(true);
            const unsubscribe = advisorPostService.subscribeToComments(post.id, (realtimeComments) => {
                setComments(realtimeComments);
                setLoadingComments(false);
            });
            return () => unsubscribe();
        }
    }, [showComments, post.id]);

    const handlePostClick = () => {
        if (!isDetailedView) {
            navigate(`/post/${post.id}`);
        }
    };

    React.useEffect(() => {
        const checkLikeStatus = async () => {
            if (currentUser) {
                const liked = await advisorPostService.checkUserLike(post.id, currentUser.uid);
                setIsLiked(liked);
            }
        };
        checkLikeStatus();
    }, [post.id, currentUser]);

    const handleLike = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
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

    const toggleComments = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const newShowState = !showComments;
        setShowComments(newShowState);

        if (newShowState && comments.length === 0) {
            setLoadingComments(true);
            try {
                const fetchedComments = await advisorPostService.getComments(post.id);
                setComments(fetchedComments);
                setCommentsCount(fetchedComments.length);
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
            const newCommentDoc = await advisorPostService.addComment(
                post.id,
                currentUser.uid,
                currentUser.displayName || 'Người dùng',
                currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`,
                newComment,
                replyToId || undefined
            );

            if (newCommentDoc) {
                setComments(prev => [newCommentDoc, ...prev]);
                setCommentsCount(prev => prev + 1);
                setNewComment('');
                setReplyToId(null);
            }
        } catch (error) {
            console.error("Failed to post comment", error);
            alert("Không thể gửi bình luận");
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;

        try {
            await advisorPostService.deleteComment(post.id, commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
            setCommentsCount(prev => prev - 1);
        } catch (error) {
            console.error("Failed to delete comment", error);
            alert("Không thể xóa bình luận");
        }
    };

    const handleLikeComment = async (comment: AdvisorComment) => {
        if (!currentUser) {
            alert("Vui lòng đăng nhập");
            return;
        }

        const isLiked = (comment.likedBy || []).includes(currentUser.uid);
        const newLikes = (comment.likes || 0) + (isLiked ? -1 : 1);
        const newLikedBy = isLiked
            ? (comment.likedBy || []).filter(id => id !== currentUser.uid)
            : [...(comment.likedBy || []), currentUser.uid];

        // Optimistic
        setComments(prev => prev.map(c =>
            c.id === comment.id ? { ...c, likes: newLikes, likedBy: newLikedBy } : c
        ));

        try {
            await advisorPostService.toggleCommentLike(post.id, comment.id, currentUser.uid);
        } catch (error) {
            console.error("Failed to toggle like", error);
            // Revert
            setComments(prev => prev.map(c =>
                c.id === comment.id ? { ...c, likes: comment.likes, likedBy: comment.likedBy } : c
            ));
        }
    };

    const handleReplyComment = (comment: AdvisorComment) => {
        setNewComment(`@${comment.userName} `);
        // Reply to the thread starter (if this comment is already a reply, use its parent)
        const threadId = comment.replyToId || comment.id;
        setReplyToId(threadId);

        // Ideally focus input here
        const input = document.getElementById(`comment-input-${post.id}`);
        if (input) input.focus();
    };

    const handleStartEdit = (comment: AdvisorComment) => {
        setEditingCommentId(comment.id);
        setEditContent(comment.content);
    };

    const handleSaveEdit = async (commentId: string) => {
        if (!editContent.trim()) return;

        try {
            await advisorPostService.updateComment(post.id, commentId, editContent);
            setComments(prev => prev.map(c =>
                c.id === commentId ? { ...c, content: editContent, isEdited: true } : c
            ));
            setEditingCommentId(null);
            setEditContent('');
        } catch (error) {
            console.error("Failed to update comment", error);
            alert("Không thể cập nhật bình luận");
        }
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditContent('');
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
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

    const formattedDate = post.timestamp ? formatDate(post.timestamp) : 'Vừa xong';

    if (isDeleted || isHidden) return null;

    const isOwner = currentUser?.uid === post.advisorId;

    return (
        <div
            className={`bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${!isDetailedView ? 'cursor-pointer' : ''}`}
            onClick={handlePostClick}
        >
            {/* Header */}
            <div className="p-4 flex gap-3 items-center">
                <img
                    src={post.advisorAvatar}
                    alt={post.advisorName}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.advisorId}`); }}
                />
                <div className="flex-1">
                    <div className="flex items-center gap-1">
                        <h3
                            className="font-bold text-gray-900 text-sm hover:underline cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.advisorId}`); }}
                        >
                            {post.advisorName}
                        </h3>
                        {isVerified && <BadgeCheck className="w-4 h-4 text-white fill-blue-500" />}
                    </div>
                    <span className="text-xs text-gray-500">{formattedDate}</span>
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full transition-colors"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
                            {isOwner ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Xóa bài viết
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleHide(); }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <EyeOff className="w-4 h-4" /> Ẩn bài viết
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleReport(); }}
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
            {/* Images - Carousel (Threads Style) */}
            {post.images && post.images.length > 0 && (
                <div className="mt-2 relative group">
                    <div
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-0.5 rounded-lg overflow-hidden"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        onScroll={(e) => {
                            const container = e.currentTarget;
                            const index = Math.round(container.scrollLeft / container.clientWidth);
                            if (index !== currentImageIndex) {
                                setCurrentImageIndex(index);
                            }
                        }}
                    >
                        {post.images.map((img, idx) => (
                            <div key={idx} className="w-full flex-shrink-0 snap-center relative bg-gray-100 flex items-center justify-center">
                                <img
                                    src={img}
                                    onClick={(e) => { e.stopPropagation(); setViewImage(img); }}
                                    alt={`Post image ${idx + 1}`}
                                    className="w-full h-auto max-h-[500px] object-cover cursor-pointer"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Image Counter Indicator */}
                    {post.images.length > 1 && (
                        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm pointer-events-none">
                            {currentImageIndex + 1}/{post.images.length}
                        </div>
                    )}

                    {/* Hint for scrolling (optional) */}
                    {post.images.length > 1 && (
                        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
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
                                    id={`comment-input-${post.id}`}
                                    type="text"
                                    placeholder="Viết bình luận..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                    className="w-full bg-white border border-gray-200 rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                    disabled={submittingComment}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAddComment(); }}
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
                            {comments.filter(c => !c.replyToId).map(comment => (
                                <React.Fragment key={comment.id}>
                                    <div className="flex gap-3 group">
                                        <img
                                            src={comment.userAvatar}
                                            alt={comment.userName}
                                            className="w-9 h-9 rounded-full border border-gray-200 shrink-0 object-cover mt-1"
                                        />
                                        <div className="flex-1 max-w-[90%]">
                                            <div className={`px-4 py-3 rounded-2xl relative ${currentUser?.uid === comment.userId ? 'bg-blue-50 text-blue-900' : 'bg-gray-100 text-gray-900'}`}>
                                                {/* Comment Header: Name & Menu */}
                                                <div className="flex justify-between items-start gap-2 mb-1">
                                                    <span className={`font-bold text-sm leading-none mt-1 ${currentUser?.uid === comment.userId ? 'text-blue-900' : 'text-gray-900'}`}>
                                                        {comment.userName}
                                                    </span>

                                                    {/* Menu Trigger */}
                                                    {currentUser?.uid === comment.userId && !editingCommentId && (
                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveCommentMenuId(activeCommentMenuId === comment.id ? null : comment.id);
                                                                }}
                                                                className={`p-1 rounded-full hover:bg-black/5 text-current/50 hover:text-current transition-all comment-menu-trigger ${activeCommentMenuId === comment.id ? 'bg-black/5 text-current' : 'text-gray-400'}`}
                                                            >
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </button>

                                                            {activeCommentMenuId === comment.id && (
                                                                <div className="absolute right-0 top-6 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 origin-top-right comment-menu-dropdown">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleStartEdit(comment);
                                                                            setActiveCommentMenuId(null);
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 font-medium cursor-pointer"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteComment(comment.id);
                                                                            setActiveCommentMenuId(null);
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-medium cursor-pointer"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Comment Content / Edit Mode */}
                                                {editingCommentId === comment.id ? (
                                                    <div className="mt-2 animate-in fade-in duration-200">
                                                        <textarea
                                                            value={editContent}
                                                            onChange={(e) => setEditContent(e.target.value)}
                                                            className="w-full text-sm p-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white min-h-[80px] resize-none"
                                                            placeholder="Nhập nội dung..."
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <div className="flex justify-end gap-2 mt-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                                                                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                                            >
                                                                Hủy
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleSaveEdit(comment.id); }}
                                                                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                                                            >
                                                                Lưu
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                                                        {comment.content}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Footer Meta */}
                                            <div className="mt-1 ml-1 md:ml-3 flex flex-wrap items-center gap-2 md:gap-4 text-xs text-gray-500 font-medium">
                                                <span>
                                                    {comment.timestamp ? formatDate(comment.timestamp) : 'Vừa xong'}
                                                </span>

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleLikeComment(comment); }}
                                                    className={`hover:text-red-500 transition-colors flex items-center gap-1 ${(comment.likedBy || []).includes(currentUser?.uid) ? 'text-red-500' : ''}`}
                                                >
                                                    {(comment.likedBy || []).includes(currentUser?.uid) ? 'Đã thích' : 'Thích'}
                                                    {(comment.likes || 0) > 0 && <span>({comment.likes})</span>}
                                                </button>

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReplyComment(comment); }}
                                                    className="hover:text-blue-600 transition-colors"
                                                >
                                                    Trả lời
                                                </button>

                                                {(comment as any).isEdited && (
                                                    <span className="text-gray-400 font-normal italic">Đã chỉnh sửa</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Replies */}
                                    {comments.filter(r => r.replyToId === comment.id).length > 0 && (
                                        <div className="ml-5 md:ml-12 pl-3 md:pl-4 border-l-2 border-gray-100 space-y-4 pt-2">
                                            {comments.filter(r => r.replyToId === comment.id).map(reply => (
                                                <div key={reply.id} className="flex gap-3 group">
                                                    <img
                                                        src={reply.userAvatar}
                                                        alt={reply.userName}
                                                        className="w-8 h-8 rounded-full border border-gray-200 shrink-0 object-cover mt-1"
                                                    />
                                                    <div className="flex-1 max-w-[90%]">
                                                        <div className={`px-4 py-3 rounded-2xl relative ${currentUser?.uid === reply.userId ? 'bg-blue-50 text-blue-900' : 'bg-gray-100 text-gray-900'}`}>
                                                            {/* Reply Header */}
                                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                                <span className={`font-bold text-sm leading-none mt-1 ${currentUser?.uid === reply.userId ? 'text-blue-900' : 'text-gray-900'}`}>
                                                                    {reply.userName}
                                                                </span>

                                                                {/* Menu Trigger */}
                                                                {currentUser?.uid === reply.userId && !editingCommentId && (
                                                                    <div className="relative">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveCommentMenuId(activeCommentMenuId === reply.id ? null : reply.id);
                                                                            }}
                                                                            className={`p-1 rounded-full hover:bg-black/5 text-current/50 hover:text-current transition-all comment-menu-trigger ${activeCommentMenuId === reply.id ? 'bg-black/5 text-current' : 'text-gray-400'}`}
                                                                        >
                                                                            <MoreHorizontal className="w-4 h-4" />
                                                                        </button>

                                                                        {activeCommentMenuId === reply.id && (
                                                                            <div className="absolute right-0 top-6 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 origin-top-right comment-menu-dropdown">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleStartEdit(reply);
                                                                                        setActiveCommentMenuId(null);
                                                                                    }}
                                                                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 font-medium cursor-pointer"
                                                                                >
                                                                                    <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDeleteComment(reply.id);
                                                                                        setActiveCommentMenuId(null);
                                                                                    }}
                                                                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-medium cursor-pointer"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" /> Xóa
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Reply Content / Edit Mode */}
                                                            {editingCommentId === reply.id ? (
                                                                <div className="mt-2 animate-in fade-in duration-200">
                                                                    <textarea
                                                                        value={editContent}
                                                                        onChange={(e) => setEditContent(e.target.value)}
                                                                        className="w-full text-sm p-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white min-h-[80px] resize-none"
                                                                        placeholder="Nhập nội dung..."
                                                                        autoFocus
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                    <div className="flex justify-end gap-2 mt-2">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                                                                            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                                                        >
                                                                            Hủy
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleSaveEdit(reply.id); }}
                                                                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                                                                        >
                                                                            Lưu
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                                                                    {reply.content}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Footer Meta */}
                                                        <div className="mt-1 ml-1 md:ml-3 flex flex-wrap items-center gap-2 md:gap-4 text-xs text-gray-500 font-medium">
                                                            <span>
                                                                {reply.timestamp ? formatDate(reply.timestamp) : 'Vừa xong'}
                                                            </span>

                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleLikeComment(reply); }}
                                                                className={`hover:text-red-500 transition-colors flex items-center gap-1 ${(reply.likedBy || []).includes(currentUser?.uid) ? 'text-red-500' : ''}`}
                                                            >
                                                                {(reply.likedBy || []).includes(currentUser?.uid) ? 'Đã thích' : 'Thích'}
                                                                {(reply.likes || 0) > 0 && <span>({reply.likes})</span>}
                                                            </button>

                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleReplyComment(reply); }}
                                                                className="hover:text-blue-600 transition-colors"
                                                            >
                                                                Trả lời
                                                            </button>

                                                            {(reply as any).isEdited && (
                                                                <span className="text-gray-400 font-normal italic">Đã chỉnh sửa</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                            {comments.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <MessageCircle className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <p className="text-gray-400 text-sm">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {/* Image Viewer Modal */}
            {viewImage && (
                <div
                    className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={(e) => { e.stopPropagation(); setViewImage(null); }}
                >
                    <button
                        className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-50 pointer-events-auto"
                        onClick={(e) => { e.stopPropagation(); setViewImage(null); }}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={viewImage}
                        alt="Full view"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};
