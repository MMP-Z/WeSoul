import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Post } from '../components/Post';
import { advisorPostService } from '../services/advisorPostService';
import { authService } from '../services/authService';
import { AdvisorPost } from '../types';

export const PostDetail: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<AdvisorPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(authService.auth.currentUser);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged((u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchPost = async () => {
            if (!postId) return;
            try {
                const fetchedPost = await advisorPostService.getPostById(postId);
                setPost(fetchedPost);
            } catch (error) {
                console.error("Failed to fetch post", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [postId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <p className="text-gray-500 mb-4">Bài viết không tồn tại hoặc đã bị xóa.</p>
                <button
                    onClick={() => navigate('/')}
                    className="text-indigo-600 font-medium hover:underline"
                >
                    Quay lại trang chủ
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-[104px] md:top-16 z-30 transition-all">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="font-bold text-lg text-gray-900">Bài viết</h1>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-2 pb-6">
                <Post post={post} currentUser={user} isDetailedView={true} />
            </div>
        </div>
    );
};
