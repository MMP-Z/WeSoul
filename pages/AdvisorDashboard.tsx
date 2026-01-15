
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { authService } from '../services/authService';
import { advisorService } from '../services/advisorService';
import { advisorPostService } from '../services/advisorPostService';
import { bookingService } from '../services/bookingService';
import { userService } from '../services/userService';
import { notificationService } from '../services/notificationService';
import { profileSyncService } from '../services/profileSyncService';
import { Advisor, Booking, BookingStatus, AdvisorStatus, AdvisorCategory, AdvisorServiceItem } from '../types';
import { Navbar } from '../components/Navbar'; // Add Navbar
import {
    Settings, LogOut, CheckCircle, XCircle, Clock, Edit3, Menu, X, MessageSquare, Plus, Trash2,
    LayoutDashboard, Calendar, Star, DollarSign, Users
} from 'lucide-react';

export const AdvisorDashboard: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [advisor, setAdvisor] = useState<Advisor | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'profile'>('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle
    const navigate = useNavigate();

    // Form state for profile editing
    const [isEditing, setIsEditing] = useState(false);
    const [workHoursType, setWorkHoursType] = useState('Cả ngày');
    const [services, setServices] = useState<AdvisorServiceItem[]>([]);

    const handleAddService = () => {
        setServices([...services, { id: Date.now().toString(), name: '', price: 0 }]);
    };

    const handleServiceChange = (id: string, field: keyof AdvisorServiceItem, value: any) => {
        setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleRemoveService = (id: string) => {
        setServices(services.filter(s => s.id !== id));
    };

    useEffect(() => {
        if (advisor?.workHours) {
            const standardOptions = ['Cả ngày', 'Theo lịch hẹn'];
            if (standardOptions.includes(advisor.workHours)) {
                setWorkHoursType(advisor.workHours);
            } else {
                setWorkHoursType('custom');
            }
        }
        if (advisor?.services) {
            setServices(advisor.services);
        } else {
            // Default service if none exists
            setServices([{ id: '1', name: 'Xem Tử Vi trọn đời', price: 500000 }]);
        }
    }, [advisor]);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const advisorData = await advisorService.getAdvisorById(currentUser.uid);
                if (advisorData) {
                    setAdvisor(advisorData);
                }
                const advisorBookings = await bookingService.getAdvisorBookings(currentUser.uid);
                setBookings(advisorBookings);
            } else {
                navigate('/login');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleStatusUpdate = async (newStatus: AdvisorStatus) => {
        if (!advisor) return;
        try {
            await advisorService.updateAdvisor(advisor.id, { status: newStatus });
            setAdvisor({ ...advisor, status: newStatus });
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const handleBookingStatus = async (bookingId: string, status: BookingStatus) => {
        try {
            await bookingService.updateBookingStatus(bookingId, status);
            const updatedBookings = bookings.map(b =>
                b.id === bookingId ? { ...b, status } : b
            );
            setBookings(updatedBookings);

            // Notify User
            const booking = bookings.find(b => b.id === bookingId);
            if (booking) {
                if (status === BookingStatus.CONFIRMED) {
                    await notificationService.createNotification({
                        userId: booking.userId,
                        title: 'Lịch hẹn được xác nhận',
                        content: `Cố vấn ${advisor?.name} đã chấp nhận lịch hẹn của bạn.`,
                        type: 'booking',
                        link: `/messages?bookingId=${bookingId}`
                    });
                } else if (status === BookingStatus.CANCELLED) {
                    await notificationService.createNotification({
                        userId: booking.userId,
                        title: 'Lịch hẹn bị từ chối',
                        content: `Cố vấn ${advisor?.name} đã từ chối lịch hẹn của bạn.`,
                        type: 'system',
                        link: '/history'
                    });
                }
            }
        } catch (error) {
            console.error("Failed to update booking status", error);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!advisor) return;
        const formData = new FormData(e.currentTarget);

        const updates: Partial<Advisor> = {
            name: formData.get('name') as string,
            specialty: formData.get('specialty') as AdvisorCategory,
            experienceYears: Number(formData.get('experienceYears')),
            bio: formData.get('bio') as string,
            city: formData.get('city') as string,
            workHours: workHoursType === 'custom' ? (formData.get('workHoursCustom') as string) : workHoursType,
            services: services
        };

        try {
            await advisorService.updateAdvisor(advisor.id, updates);
            setAdvisor({ ...advisor, ...updates });
            setIsEditing(false);

            // Sync updates to all posts
            // Sync updates (Global)
            if (updates.name && updates.name !== advisor.name) {
                // Denormalized Sync (Posts, Comments, Messages, Bookings)
                await profileSyncService.syncUserProfile(advisor.id, 'advisor', updates.name, advisor.avatar);

                // Update Firebase Auth Profile (for Navbar/Menu immediate update)
                if (authService.auth.currentUser) {
                    await updateProfile(authService.auth.currentUser, {
                        displayName: updates.name
                    });

                    // Sync to Users collection (for consistency)
                    await userService.syncUser({
                        uid: authService.auth.currentUser.uid,
                        email: authService.auth.currentUser.email,
                        displayName: updates.name,
                        photoURL: authService.auth.currentUser.photoURL
                    });
                }
            }
        } catch (error) {
            console.error("Failed to update profile", error);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div></div>;

    if (!advisor) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-900">Không tìm thấy hồ sơ Cố vấn. Vui lòng liên hệ Admin.</div>;

    const totalRevenue = bookings
        .filter(b => b.status === BookingStatus.COMPLETED)
        .reduce((sum, b) => sum + b.totalPrice, 0);

    const completedBookings = bookings.filter(b => b.status === BookingStatus.COMPLETED).length;

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

            {/* Sidebar */}
            <aside className={`w-64 bg-white border-r border-gray-200 fixed top-[6.5rem] md:top-16 h-[calc(100vh-6.5rem)] md:h-[calc(100vh-64px)] z-30 transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-1">Kênh Cố Vấn</h2>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Quản lý</div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500"><X className="w-6 h-6" /></button>
                </div>
                <nav className="px-4 space-y-2">
                    <button
                        onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Tổng quan
                    </button>
                    <button
                        onClick={() => { setActiveTab('bookings'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'bookings' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <Calendar className="w-5 h-5" />
                        Lịch hẹn
                    </button>
                    <button
                        onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <Settings className="w-5 h-5" />
                        Hồ sơ
                    </button>
                </nav>

                <div className="absolute bottom-6 left-0 w-full px-6">
                    <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors border border-gray-200">
                        <LogOut className="w-5 h-5" />
                        Về Trang chủ
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center gap-4 mb-6">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-700">
                        <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">Kênh Cố Vấn</h1>
                </div>

                {/* Desktop Header */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Xin chào, {advisor.name}</h1>
                        <p className="text-gray-500">Quản lý hoạt động tư vấn, lịch hẹn và doanh thu của bạn.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700 hidden sm:inline">Trạng thái hoạt động:</span>
                        <div className="flex items-center bg-white rounded-full p-1 border border-gray-200 shadow-sm">
                            {Object.values(AdvisorStatus).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleStatusUpdate(s)}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${advisor.status === s ?
                                        (s === AdvisorStatus.ONLINE ? 'bg-green-100 text-green-700 ring-1 ring-green-600/20' :
                                            s === AdvisorStatus.BUSY ? 'bg-red-100 text-red-700 ring-1 ring-red-600/20' :
                                                'bg-gray-200 text-gray-700') : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Overview Tab */}
                {
                    activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                                            <DollarSign className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-500">Doanh thu</div>
                                            <div className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} đ</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                            <Calendar className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-500">Lịch hẹn hoàn thành</div>
                                            <div className="text-2xl font-bold text-gray-900">{completedBookings}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                            <Star className="w-6 h-6 text-amber-500" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-500">Đánh giá</div>
                                            <div className="text-2xl font-bold text-gray-900">{advisor.rating.toFixed(1)} <span className="text-sm text-gray-400 font-normal">/ 5.0</span></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                                            <Users className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-500">Hoạt động</div>
                                            <div className="text-2xl font-bold text-gray-900">{advisor.reviewCount} <span className="text-sm text-gray-400 font-normal">lượt review</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Bookings Tab */}
                {
                    activeTab === 'bookings' && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-900">Danh sách lịch hẹn</h3>
                                <div className="text-sm text-gray-500">Hiển thị {bookings.length} kết quả</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thời gian</th>
                                            <th className="pl-4 pr-2 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                                            <th className="px-2 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Thời lượng</th>
                                            <th className="px-2 py-3 md:px-6 md:py-4 text-center md:text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Trạng thái</th>
                                            <th className="pl-2 pr-4 py-3 md:px-6 md:py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {bookings.map((booking) => (
                                            <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-900 font-medium">
                                                    {new Date(booking.date).toLocaleString('vi-VN')}
                                                </td>
                                                <td className="pl-4 pr-2 py-3 md:px-6 md:py-4 text-sm text-gray-600">
                                                    <div>
                                                        <span className="font-semibold text-gray-900 line-clamp-1">{booking.userName || 'Ẩn danh'}</span>
                                                        <div className="hidden md:block text-xs text-gray-400">ID: {booking.userId.substring(0, 6)}...</div>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 md:px-6 md:py-4 text-sm text-gray-600">
                                                    <span className="px-2 py-1 bg-gray-100 rounded text-gray-700 font-medium whitespace-nowrap">1 lần xem</span>
                                                </td>
                                                <td className="px-2 py-3 md:px-6 md:py-4 text-center md:text-left">
                                                    {/* Desktop Status Badge */}
                                                    <span className={`hidden md:inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${booking.status === BookingStatus.CONFIRMED ? 'bg-green-100 text-green-700' :
                                                        booking.status === BookingStatus.PENDING ? 'bg-amber-100 text-amber-700' :
                                                            booking.status === BookingStatus.CANCELLED ? 'bg-red-100 text-red-700' :
                                                                'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {booking.status}
                                                    </span>
                                                    {/* Mobile Status Icon */}
                                                    <div className="md:hidden flex justify-center">
                                                        {booking.status === BookingStatus.CONFIRMED ? (
                                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                                        ) : booking.status === BookingStatus.PENDING ? (
                                                            <Clock className="w-5 h-5 text-amber-600" />
                                                        ) : booking.status === BookingStatus.CANCELLED ? (
                                                            <XCircle className="w-5 h-5 text-red-600" />
                                                        ) : (
                                                            <CheckCircle className="w-5 h-5 text-blue-600" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="pl-2 pr-4 py-3 md:px-6 md:py-4 text-right space-x-1 md:space-x-2 whitespace-nowrap">
                                                    {booking.status === BookingStatus.PENDING && (
                                                        <button
                                                            onClick={() => handleBookingStatus(booking.id, BookingStatus.CONFIRMED)}
                                                            className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                                            title="Xác nhận"
                                                        >
                                                            <CheckCircle className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                    {(booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.COMPLETED) && (
                                                        <button
                                                            onClick={() => navigate(`/messages?bookingId=${booking.id}`)}
                                                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                            title="Nhắn tin"
                                                        >
                                                            <MessageSquare className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                    {booking.status === BookingStatus.CONFIRMED && (
                                                        <button
                                                            onClick={() => handleBookingStatus(booking.id, BookingStatus.COMPLETED)}
                                                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                            title="Hoàn thành"
                                                        >
                                                            <CheckCircle className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                    {(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) && (
                                                        <button
                                                            onClick={() => handleBookingStatus(booking.id, BookingStatus.CANCELLED)}
                                                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                            title="Hủy"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {bookings.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                                            <Calendar className="w-6 h-6 text-gray-400" />
                                                        </div>
                                                        <p>Chưa có lịch hẹn nào sắp tới.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }

                {/* Profile Tab */}
                {
                    activeTab === 'profile' && (
                        <div className="max-w-4xl">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Thông tin cá nhân</h3>
                                        <p className="text-sm text-gray-500 mt-1">Thông tin này sẽ hiển thị công khai trên hồ sơ của bạn.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsEditing(!isEditing)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isEditing
                                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
                                            }`}
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        {isEditing ? 'Cancel' : 'Edit'}
                                    </button>
                                </div>

                                <form onSubmit={handleProfileUpdate} className="space-y-6">
                                    <div className="flex gap-8 flex-col md:flex-row">
                                        {/* Avatar Column */}
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-32 h-32 rounded-full border-4 border-gray-100 shadow-md overflow-hidden bg-gray-50">
                                                <img src={advisor.avatar} alt={advisor.name} className="w-full h-full object-cover" />
                                            </div>
                                            {/* Avatar upload placeholder */}
                                        </div>

                                        {/* Form Column */}
                                        <div className="flex-1 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tên hiển thị</label>
                                                    <input
                                                        name="name"
                                                        defaultValue={advisor.name}
                                                        disabled={!isEditing}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-60 disabled:bg-gray-100 transition-all font-medium"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Lĩnh vực chuyên môn</label>
                                                    <select
                                                        name="specialty"
                                                        defaultValue={advisor.specialty}
                                                        disabled={!isEditing}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-60 disabled:bg-gray-100 transition-all font-medium"
                                                    >
                                                        {Object.values(AdvisorCategory).map(c => (
                                                            <option key={c} value={c} className="bg-white">{c}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Kinh nghiệm (năm)</label>
                                                    <input
                                                        name="experienceYears"
                                                        type="number"
                                                        defaultValue={advisor.experienceYears}
                                                        disabled={!isEditing}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-60 disabled:bg-gray-100 transition-all font-medium"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Khu vực (Thành phố)</label>
                                                    <select
                                                        name="city"
                                                        defaultValue={advisor.city}
                                                        disabled={!isEditing}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-60 disabled:bg-gray-100 transition-all font-medium"
                                                    >
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

                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian làm việc</label>
                                                    <select
                                                        value={workHoursType}
                                                        onChange={(e) => setWorkHoursType(e.target.value)}
                                                        disabled={!isEditing}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors mb-2 disabled:opacity-60 disabled:bg-gray-100"
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
                                                            defaultValue={advisor.workHours && !['Cả ngày', 'Theo lịch hẹn'].includes(advisor.workHours) ? advisor.workHours : ''}
                                                            disabled={!isEditing}
                                                            required
                                                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors animate-in slide-in-from-top-2 disabled:opacity-60 disabled:bg-gray-100"
                                                        />
                                                    )}
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Bảng giá tham khảo (Các dịch vụ)</label>
                                                    <div className="space-y-3">
                                                        {services.map((service) => (
                                                            <div key={service.id} className="flex gap-2 items-center animate-in slide-in-from-left-2 fade-in duration-300">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Tên dịch vụ"
                                                                    value={service.name}
                                                                    onChange={(e) => handleServiceChange(service.id, 'name', e.target.value)}
                                                                    className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors disabled:opacity-60 disabled:bg-gray-100"
                                                                    disabled={!isEditing}
                                                                    required
                                                                />
                                                                <input
                                                                    type="number"
                                                                    placeholder="Giá (VNĐ)"
                                                                    value={service.price || ''}
                                                                    onChange={(e) => handleServiceChange(service.id, 'price', Number(e.target.value))}
                                                                    className="w-28 flex-shrink-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors disabled:opacity-60 disabled:bg-gray-100"
                                                                    disabled={!isEditing}
                                                                    required
                                                                />
                                                                {isEditing && services.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveService(service.id)}
                                                                        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {isEditing && (
                                                        <button
                                                            type="button"
                                                            onClick={handleAddService}
                                                            className="mt-3 text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
                                                        >
                                                            <Plus className="w-4 h-4" /> Thêm dịch vụ
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Giới thiệu bản thân</label>
                                                    <textarea
                                                        name="bio"
                                                        rows={5}
                                                        defaultValue={advisor.bio}
                                                        disabled={!isEditing}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-60 disabled:bg-gray-100 transition-all font-medium resize-none"
                                                    />
                                                </div>
                                            </div>

                                            {isEditing && (
                                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditing(false)}
                                                        className="px-6 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                                                    >
                                                        Hủy bỏ
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-indigo-200"
                                                    >
                                                        Lưu thay đổi
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    );
};
