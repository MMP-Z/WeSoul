import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { UserProfile } from '../types';
import { Loader2, ArrowLeft, Users, UserCheck, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { bookingService } from '../services/bookingService';

export const Connections: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const activeTab = searchParams.get('tab') === 'following' ? 'following' : 'followers';

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(user => {
            if (user) {
                setCurrentUser(user);
            } else {
                navigate('/login');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) return;
            setLoading(true);
            try {
                let data: UserProfile[] = [];
                if (activeTab === 'followers') {
                    data = await userService.getFollowers(currentUser.uid);
                } else {
                    data = await userService.getFollowing(currentUser.uid);
                }
                setUsers(data);
            } catch (error) {
                console.error(error);
                toast.error("Không thể tải danh sách");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser, activeTab]);

    const handleTabChange = (tab: 'followers' | 'following') => {
        setSearchParams({ tab });
    };

    const handleMessage = async (targetUser: UserProfile) => {
        if (!currentUser) return;
        try {
            const bookingId = await bookingService.getOrCreateChatBooking(
                currentUser.uid,
                targetUser.uid,
                targetUser.displayName,
                targetUser.photoURL || '',
                currentUser.displayName || 'User',
                currentUser.photoURL || ''
            );
            navigate(`/messages?bookingId=${bookingId}`);
        } catch (error) {
            console.error(error);
            toast.error("Không thể mở cuộc trò chuyện");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-40">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => handleTabChange('followers')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'followers'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Người theo dõi
                    </button>
                    <button
                        onClick={() => handleTabChange('following')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'following'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Đang theo dõi
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="max-w-2xl mx-auto px-4 py-4">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            {activeTab === 'followers' ? <Users className="w-8 h-8 text-gray-400" /> : <UserCheck className="w-8 h-8 text-gray-400" />}
                        </div>
                        <p>{activeTab === 'followers' ? 'Chưa có người theo dõi nào' : 'Bạn chưa theo dõi ai'}</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {users.map(user => (
                            <div key={user.uid} className="p-4 flex items-center justify-between border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                <Link to={`/profile/${user.uid}`} className="flex items-center gap-3 flex-1">
                                    <img
                                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                                        alt={user.displayName}
                                        className="w-12 h-12 rounded-full object-cover border border-gray-200"
                                    />
                                    <div>
                                        <h3 className="font-bold text-gray-900">{user.displayName}</h3>
                                        <p className="text-xs text-gray-500">{user.role === 'advisor' ? 'Cố vấn' : 'Thành viên'}</p>
                                    </div>
                                </Link>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleMessage(user)}
                                        className="p-2 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
