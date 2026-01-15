import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { advisorService } from '../services/advisorService';
import { bookingService } from '../services/bookingService';
import { advisorChatService } from '../services/advisorChatService';
import { chatService } from '../services/chatService';
import { UserProfile, Advisor, Booking, ChatLog, AdvisorCategory, AdvisorStatus, AdvisorServiceItem } from '../types';
import { Navbar } from '../components/Navbar';

import { Shield, Users, Search, Edit2, Store, CreditCard, MessageSquare, Trash2, Ban, Plus, X, Check, XCircle, ShoppingBag, UserPlus, ArrowLeft } from 'lucide-react';

type AdminTab = 'users' | 'advisors' | 'payments' | 'chats';
type ApprovalTab = 'list' | 'pending';

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('users');
    const [advisorSubTab, setAdvisorSubTab] = useState<ApprovalTab>('list');

    const [loading, setLoading] = useState(true);

    // Data states
    // Data states
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [advisors, setAdvisors] = useState<Advisor[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [conversations, setConversations] = useState<any[]>([]);

    // Edit states
    const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState(false);
    const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
    const [targetUserId, setTargetUserId] = useState<string | null>(null);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [selectedMessages, setSelectedMessages] = useState<any[]>([]);

    // Additional Edit States
    const [services, setServices] = useState<AdvisorServiceItem[]>([]);
    const [workHoursType, setWorkHoursType] = useState('Cả ngày');

    const handleAddService = () => {
        setServices([...services, { id: Date.now().toString(), name: '', price: 0 }]);
    };

    const handleRemoveService = (id: string) => {
        setServices(services.filter(s => s.id !== id));
    };

    const handleServiceChange = (id: string, field: keyof AdvisorServiceItem, value: any) => {
        setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const navigate = useNavigate();

    const handleSelectConversation = async (convId: string) => {
        setSelectedConversationId(convId);
        setSelectedMessages([]);
        const msgs = await advisorChatService.getMessagesForConversation(convId);
        setSelectedMessages(msgs);
    };

    // Fetch Data
    const refreshData = async () => {
        setLoading(true);
        try {
            // Removed getAllMessages() as we now fetch on demand
            const [fetchedUsers, fetchedAdvisors, fetchedBookings, fetchedConversations] = await Promise.all([
                userService.getAllUsers(),
                advisorService.getAllAdvisors(),
                bookingService.getAllBookings(),
                advisorChatService.getAllConversations()
            ]);
            setUsers(fetchedUsers);
            setAdvisors(fetchedAdvisors);
            setBookings(fetchedBookings);
            // setMessages(fetchedMessages); // No longer needed global fetch
            setConversations(fetchedConversations);
        } catch (error) {
            console.error("Error refreshing data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get name from ID
    const getName = (uid: string) => {
        const user = users.find(u => u.uid === uid);
        if (user) return user.displayName;
        const advisor = advisors.find(a => a.id === uid);
        if (advisor) return advisor.name;
        return uid.slice(0, 8) + '...';
    };

    useEffect(() => {
        const checkAdmin = async () => {
            const user = authService.auth.currentUser;
            if (!user) {
                navigate('/login');
                return;
            }

            const profile = await userService.getUserProfile(user.uid);
            if (profile?.role !== 'admin') {
                navigate('/');
                return;
            }

            await refreshData();
        };

        checkAdmin();
    }, [navigate]);

    // User Actions
    const handleToggleBlockUser = async (user: UserProfile) => {
        if (user.role === 'admin') return;
        const newStatus = !user.isBlocked;
        if (window.confirm(`Bạn có chắc muốn ${newStatus ? 'chặn' : 'bỏ chặn'} người dùng này?`)) {
            await userService.updateUserStatus(user.uid, newStatus);
            await refreshData();
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (window.confirm("Cảnh báo: Hành động này không thể hoàn tác. Bạn có chắc muốn xóa người dùng này?")) {
            await userService.deleteUser(uid);
            await refreshData();
        }
    };

    const handleCreateProfile = (user: UserProfile) => {
        setTargetUserId(user.uid);
        setEditingAdvisor({
            id: user.uid,
            name: user.displayName,
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`,
            specialty: AdvisorCategory.TAROT,
            price: 0,
            bio: '',
            experienceYears: 0,
            status: AdvisorStatus.ONLINE,
            reviewCount: 0,
            rating: 5,
            tags: [],
            reviews: [],
            type: 'advisor',
            approvalStatus: 'approved'
        });
        setServices([]);
        setWorkHoursType('Cả ngày');
        setIsAdvisorModalOpen(true);
    };

    // Advisor/Store Actions
    const handleSaveAdvisor = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const type = 'advisor';

        // Use targetUserId if available (creating from user list), otherwise existing ID or random
        const id = targetUserId || editingAdvisor?.id || crypto.randomUUID();

        const advisorData: any = {
            id: id,
            name: formData.get('name') as string,
            specialty: formData.get('specialty') as AdvisorCategory,
            price: Number(formData.get('price')),
            bio: formData.get('bio') as string,
            experienceYears: Number(formData.get('experienceYears')),
            status: AdvisorStatus.ONLINE,
            avatar: editingAdvisor?.avatar || `https://ui-avatars.com/api/?name=${formData.get('name')}&background=random`,
            rating: editingAdvisor?.rating || 5,
            reviewCount: editingAdvisor?.reviewCount || 0,
            tags: [],
            reviews: editingAdvisor?.reviews || [],
            type: type,
            approvalStatus: editingAdvisor?.approvalStatus || 'approved',
            city: formData.get('city') as string,
            workHours: workHoursType === 'custom' ? formData.get('workHoursCustom') as string : workHoursType,
            services: services
        };

        try {
            // Check if we are updating or adding (setDoc handles both if we use merge, or we can use specific methods)
            // advisorService.addAdvisor uses setDoc which overwrites/creates
            // advisorService.updateAdvisor uses updateDoc

            // If it's a new profile (targetUserId set) or new manual add -> addAdvisor
            // If editing existing -> updateAdvisor

            if (editingAdvisor && !targetUserId) {
                await advisorService.updateAdvisor(advisorData.id, advisorData);
            } else {
                await advisorService.addAdvisor(advisorData);
            }

            setIsAdvisorModalOpen(false);
            setEditingAdvisor(null);
            setTargetUserId(null); // Reset
            await refreshData();
        } catch (error) {
            alert('Lỗi khi lưu dữ liệu');
        }
    };

    const handleDeleteAdvisor = async (id: string) => {
        if (window.confirm("Bạn có chắc muốn xóa mục này?")) {
            await advisorService.deleteAdvisor(id);
            // Revert user role to 'user' if this advisor is linked to a user account
            try {
                await userService.updateUserRole(id, 'user');
            } catch (error) {
                // Ignore if user not found (manually added advisor)
                console.log("Advisor not linked to a user or user not found.");
            }
            await refreshData();
        }
    };

    const handleApprove = async (id: string) => {
        if (window.confirm("Duyệt hồ sơ này?")) {
            await advisorService.approveAdvisor(id);
            // Also promote the user to 'advisor' role
            await userService.updateUserRole(id, 'advisor');
            await refreshData();
        }
    };

    const handleReject = async (id: string) => {
        if (window.confirm("Từ chối hồ sơ này?")) {
            await advisorService.rejectAdvisor(id);
            await refreshData();
        }
    };

    // Prepare lists
    const advisorList = advisors; // Show all advisors

    const [searchTerm, setSearchTerm] = useState('');

    const renderApprovalList = (list: Advisor[]) => {
        const approved = list.filter(a => !a.approvalStatus || a.approvalStatus === 'approved');
        const pending = list.filter(a => a.approvalStatus === 'pending');

        const currentList = advisorSubTab;
        let displayList = currentList === 'list' ? approved : pending;

        // Filter by search term
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            displayList = displayList.filter(a =>
                a.name.toLowerCase().includes(lowerTerm) ||
                a.specialty.toLowerCase().includes(lowerTerm) ||
                (a.bio && a.bio.toLowerCase().includes(lowerTerm))
            );
        }

        return (
            <div className="p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6 border-b border-gray-100 pb-4 justify-between items-center">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setAdvisorSubTab('list')}
                            className={`text-sm font-medium transition-colors ${currentList === 'list' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Danh sách ({approved.length})
                        </button>
                        <button
                            onClick={() => setAdvisorSubTab('pending')}
                            className={`text-sm font-medium transition-colors ${currentList === 'pending' ? 'text-amber-600' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Cần duyệt ({pending.length})
                        </button>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm cố vấn..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        {currentList === 'list' && (
                            <button
                                onClick={() => {
                                    setEditingAdvisor(null);
                                    setTargetUserId(null);
                                    setServices([]);
                                    setWorkHoursType('Cả ngày');
                                    setIsAdvisorModalOpen(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm shadow-sm whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm mới
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200">
                                <th className="p-4">Cố vấn</th>
                                <th className="p-4">Lĩnh vực</th>
                                <th className="p-4">Kinh nghiệm</th>
                                <th className="p-4">Giá tham vấn</th>
                                <th className="p-4">Đánh giá</th>
                                <th className="p-4">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayList.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                            <div>
                                                <div className="font-bold text-gray-900">{item.name}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.bio}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            {item.specialty}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        {item.experienceYears} năm
                                    </td>
                                    <td className="p-4 text-amber-600 font-medium">
                                        {item.price.toLocaleString()} đ
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1 text-sm text-gray-600">
                                            <span className="text-amber-500">★</span> {item.rating} ({item.reviewCount})
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            {currentList === 'list' ? (
                                                <>
                                                    <button onClick={() => {
                                                        setEditingAdvisor(item);
                                                        setServices(item.services || []);
                                                        if (item.workHours && !['Cả ngày', 'Theo lịch hẹn'].includes(item.workHours)) {
                                                            setWorkHoursType('custom');
                                                        } else {
                                                            setWorkHoursType(item.workHours || 'Cả ngày');
                                                        }
                                                        setIsAdvisorModalOpen(true);
                                                    }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors" title="Chỉnh sửa">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteAdvisor(item.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Xóa">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleApprove(item.id)} className="p-2 hover:bg-green-50 rounded-lg text-green-500 hover:text-green-600 transition-colors" title="Duyệt">
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleReject(item.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-500 transition-colors" title="Từ chối">
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {displayList.length === 0 && (
                        <div className="p-8 flex items-center justify-center text-gray-400 italic">
                            {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu'}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading && users.length === 0) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-gray-900 font-sans selection:bg-indigo-100 flex flex-col">
            {/* Navbar removed as it is provided globally in App.tsx */}

            <main className="flex-1 pb-12 px-4 max-w-7xl mx-auto w-full">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-serif font-bold text-gray-900 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-indigo-600" />
                        Quản trị hệ thống
                    </h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                    <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all ${activeTab === 'users' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <Users className="w-5 h-5" /> Người dùng
                    </button>
                    <button onClick={() => setActiveTab('advisors')} className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all ${activeTab === 'advisors' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <Users className="w-5 h-5" /> Cố vấn
                    </button>
                    <button onClick={() => setActiveTab('payments')} className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all ${activeTab === 'payments' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <CreditCard className="w-5 h-5" /> Thanh toán
                    </button>
                    <button onClick={() => setActiveTab('chats')} className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all ${activeTab === 'chats' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <MessageSquare className="w-5 h-5" /> Lịch sử Chat
                    </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden min-h-[500px] shadow-sm">
                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200">
                                        <th className="p-4">Người dùng</th>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Vai trò</th>
                                        <th className="p-4">Trạng thái</th>
                                        <th className="p-4">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map((user) => {
                                        const isAdvisorRole = user.role === 'advisor';
                                        const hasAdvisorProfile = advisors.some(a => a.id === user.uid);
                                        const showCreateProfile = isAdvisorRole && !hasAdvisorProfile;

                                        return (
                                            <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">{user.displayName}</div>
                                                            <div className="text-xs text-gray-500 font-mono">{user.uid.slice(0, 8)}...</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-600">{user.email}</td>
                                                <td className="p-4">
                                                    <select
                                                        value={user.role}
                                                        onChange={async (e) => {
                                                            if (window.confirm(`Bạn có chắc muốn đổi vai trò của ${user.displayName} thành ${e.target.value}?`)) {
                                                                await userService.updateUserRole(user.uid, e.target.value as any);
                                                                await refreshData();
                                                            }
                                                        }}
                                                        className={`px-3 py-1 rounded-full text-xs font-medium border outline-none cursor-pointer ${user.role === 'admin' ? 'text-purple-700 bg-purple-100 border-purple-200' :
                                                            user.role === 'advisor' ? 'text-amber-700 bg-amber-100 border-amber-200' :
                                                                'text-blue-700 bg-blue-100 border-blue-200'
                                                            }`}
                                                    >
                                                        <option value="user" className="bg-white text-gray-900">User</option>
                                                        <option value="advisor" className="bg-white text-gray-900">Advisor</option>
                                                        <option value="admin" className="bg-white text-gray-900">Admin</option>
                                                    </select>

                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isBlocked
                                                        ? 'text-red-700 bg-red-100'
                                                        : 'text-green-700 bg-green-100'}`}>
                                                        {user.isBlocked ? 'Đã chặn' : 'Hoạt động'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex gap-2 items-center">
                                                        {showCreateProfile && (
                                                            <button
                                                                onClick={() => handleCreateProfile(user)}
                                                                className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                                title="Tạo hồ sơ Cố vấn/Gian hàng"
                                                            >
                                                                <UserPlus className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {user.role !== 'admin' && (
                                                            <button
                                                                onClick={() => handleToggleBlockUser(user)}
                                                                className={`p-2 rounded-lg transition-colors ${user.isBlocked ? 'text-green-600 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'}`}
                                                                title={user.isBlocked ? "Bỏ chặn" : "Chặn"}
                                                            >
                                                                <Ban className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteUser(user.uid)}
                                                            className="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Advisors Tab */}
                    {activeTab === 'advisors' && renderApprovalList(advisorList)}



                    {/* Payments Tab */}
                    {activeTab === 'payments' && (
                        <div className="overflow-x-auto">
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-xl p-6">
                                    <h3 className="text-gray-500 text-sm uppercase tracking-wider mb-2">Tổng doanh thu</h3>
                                    <p className="text-2xl font-bold text-green-700">
                                        {bookings.reduce((acc, b) => acc + b.totalPrice, 0).toLocaleString('vi-VN')} đ
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-xl p-6">
                                    <h3 className="text-gray-500 text-sm uppercase tracking-wider mb-2">Tổng lượt đặt</h3>
                                    <p className="text-2xl font-bold text-blue-700">{bookings.length}</p>
                                </div>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200">
                                        <th className="p-4">Mã đơn</th>
                                        <th className="p-4">Người dùng (ID)</th>
                                        <th className="p-4">Cố vấn</th>
                                        <th className="p-4">Số tiền</th>
                                        <th className="p-4">Ngày</th>
                                        <th className="p-4">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {bookings.map((booking) => (
                                        <tr key={booking.id} className="hover:bg-gray-50 transition-colors text-sm">
                                            <td className="p-4 font-mono text-gray-500">#{booking.id.slice(0, 8)}</td>
                                            <td className="p-4 text-gray-900">{booking.userId.slice(0, 8)}...</td>
                                            <td className="p-4 text-gray-900">{booking.advisorName}</td>
                                            <td className="p-4 text-indigo-600 font-medium">{booking.totalPrice.toLocaleString()} đ</td>
                                            <td className="p-4 text-gray-500">{new Date(booking.date).toLocaleDateString()}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                    {booking.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Chats Tab */}
                    {activeTab === 'chats' && (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-[700px] flex">
                            {/* Conversation List */}
                            <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/50">
                                <div className="p-4 border-b border-gray-100 font-bold text-gray-700 bg-gray-50 flex justify-between items-center sticky top-0">
                                    <span>Đoạn chat ({conversations.length})</span>
                                    <button onClick={refreshData} className="p-1 hover:bg-gray-200 rounded transition-colors"><span className="text-xs">Làm mới</span></button>
                                </div>
                                <div className="overflow-y-auto flex-1 h-full">
                                    {conversations.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 italic text-sm">Chưa có dữ liệu</div>
                                    ) : (
                                        conversations.map(conv => {
                                            const participants = conv.participants || [];
                                            const names = participants.map((uid: string) => getName(uid)).join(' & ');
                                            return (
                                                <div
                                                    key={conv.id}
                                                    onClick={() => handleSelectConversation(conv.id)}
                                                    className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-indigo-50/30 transition-colors ${selectedConversationId === conv.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
                                                >
                                                    <div className="font-semibold text-gray-900 text-sm truncate" title={names}>{names}</div>
                                                    <div className="text-xs text-gray-500 truncate mt-1">{conv.lastMessage || 'Hình ảnh'}</div>
                                                    <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                                                        <span>{conv.lastUpdated?.seconds ? new Date(conv.lastUpdated.seconds * 1000).toLocaleString() : 'N/A'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Chat Content */}
                            <div className="flex-1 flex flex-col bg-slate-50">
                                {selectedConversationId ? (() => {
                                    const activeConv = conversations.find(c => c.id === selectedConversationId);

                                    return (
                                        <>
                                            <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm">
                                                <div>
                                                    <h3 className="font-bold text-gray-800 break-words text-sm">ID: {selectedConversationId}</h3>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {activeConv?.participants?.map((uid: string) => getName(uid)).join(' - ')}
                                                    </div>
                                                </div>
                                                <div className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">
                                                    {selectedMessages.length} tin nhắn
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                                {selectedMessages.length === 0 ? (
                                                    <div className="flex justify-center items-center h-full text-gray-400 italic">
                                                        {selectedMessages.length === 0 ? 'Đang tải hoặc không có tin nhắn...' : ''}
                                                    </div>
                                                ) : (
                                                    selectedMessages.map((msg: any) => {
                                                        const senderName = getName(msg.senderId);
                                                        const isAdvisor = advisors.some(a => a.id === msg.senderId);
                                                        const timeStr = msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleString() : '...';

                                                        return (
                                                            <div key={msg.id} className={`flex flex-col gap-1 ${isAdvisor ? 'items-end' : 'items-start'}`}>
                                                                <div className="flex items-baseline gap-2">
                                                                    {isAdvisor ? (
                                                                        <>
                                                                            <span className="text-[10px] text-gray-400">{timeStr}</span>
                                                                            <span className="text-xs font-bold text-indigo-600">{senderName}</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className="text-xs font-bold text-amber-600">{senderName}</span>
                                                                            <span className="text-[10px] text-gray-400">{timeStr}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className={`p-3 rounded-lg border text-sm shadow-sm max-w-[80%] ${isAdvisor ? 'bg-indigo-50 border-indigo-100 text-gray-800' : 'bg-white border-gray-200 text-gray-800'}`}>
                                                                    {msg.image ? (
                                                                        <img src={msg.image} className="max-w-xs rounded" onClick={() => window.open(msg.image, '_blank')} />
                                                                    ) : msg.message}
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </>
                                    );
                                })() : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                                        <div className="p-4 bg-gray-100 rounded-full">
                                            <MessageSquare className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <div>Chọn một cuộc trò chuyện để xem nội dung chi tiết</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Advisor Modal */}
            {isAdvisorModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAdvisorModalOpen(false)}></div>
                    <div className="relative bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            {editingAdvisor && !targetUserId ? 'Chỉnh sửa' : 'Thêm mới'}
                        </h2>
                        <button onClick={() => setIsAdvisorModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>

                        <form onSubmit={handleSaveAdvisor} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị</label>
                                <input name="name" defaultValue={editingAdvisor?.name} required className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:border-indigo-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lĩnh vực</label>
                                    <select name="specialty" defaultValue={editingAdvisor?.specialty || AdvisorCategory.TAROT} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none">
                                        {Object.values(AdvisorCategory).map(c => (
                                            <option key={c} value={c} className="bg-white">{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực (Thành phố)</label>
                                    <select name="city" defaultValue={editingAdvisor?.city || 'Hà Nội'} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none">
                                        <option value="Hà Nội">Hà Nội</option>
                                        <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                                        <option value="Đà Nẵng">Đà Nẵng</option>
                                        <option value="Hải Phòng">Hải Phòng</option>
                                        <option value="Cần Thơ">Cần Thơ</option>
                                        <option value="Thừa Thiên Huế">Thừa Thiên Huế</option>
                                        <option value="Quảng Ninh">Quảng Ninh</option>
                                        <option value="Nghệ An">Nghệ An</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Số năm kinh nghiệm</label>
                                    <input name="experienceYears" type="number" defaultValue={editingAdvisor?.experienceYears} required className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:border-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian làm việc</label>
                                    <select
                                        value={workHoursType}
                                        onChange={(e) => setWorkHoursType(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none focus:border-indigo-500 transition-colors mb-2"
                                    >
                                        <option value="Cả ngày">Cả ngày</option>
                                        <option value="Theo lịch hẹn">Theo lịch hẹn</option>
                                        <option value="custom">Khung giờ tùy chỉnh (Nhập tay)</option>
                                    </select>
                                    {workHoursType === 'custom' && (
                                        <input
                                            name="workHoursCustom"
                                            type="text"
                                            placeholder="VD: 8h00 - 11h30, 13h30 - 17h00"
                                            defaultValue={editingAdvisor?.workHours && !['Cả ngày', 'Theo lịch hẹn'].includes(editingAdvisor.workHours) ? editingAdvisor.workHours : ''}
                                            required
                                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:border-indigo-500 outline-none"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Services / Reference Prices */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bảng giá tham khảo</label>
                                <div className="space-y-3">
                                    {services.map((service) => (
                                        <div key={service.id} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                placeholder="Tên dịch vụ"
                                                value={service.name}
                                                onChange={(e) => handleServiceChange(service.id, 'name', e.target.value)}
                                                className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 outline-none"
                                                required
                                            />
                                            <input
                                                type="number"
                                                placeholder="Giá (VNĐ)"
                                                value={service.price || ''}
                                                onChange={(e) => handleServiceChange(service.id, 'price', Number(e.target.value))}
                                                className="w-28 flex-shrink-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 outline-none"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveService(service.id)}
                                                className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddService}
                                    className="mt-3 text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" /> Thêm dịch vụ
                                </button>
                                {/* Keep hidden price input for logic compatibility if needed, but we rely on services now */}
                                <input type="hidden" name="price" value={services.length > 0 ? services[0].price : 0} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu ngắn</label>
                                <textarea name="bio" defaultValue={editingAdvisor?.bio} rows={3} required className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:border-indigo-500 outline-none" />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAdvisorModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100">Hủy</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


        </div>
    );
};
