import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { advisorService } from '../services/advisorService';
import { advisorPostService } from '../services/advisorPostService';
import { bookingService } from '../services/bookingService';
import { authService } from '../services/authService';
import { profileSyncService } from '../services/profileSyncService';
import { imageUploadService } from '../services/imageUploadService';
import { userService } from '../services/userService';
import { Navbar } from '../components/Navbar';

import { Post } from '../components/Post';
import { AdvisorModal } from '../components/AdvisorModal';
import {
    MessageCircle, Calendar, Star, MapPin, Image as ImageIcon, X, ChevronLeft, ChevronRight, Globe, Award, Copy, Check, Send, BadgeCheck, Plus, Trash2, DollarSign, Sparkles, UserPlus, UserCheck
} from 'lucide-react';
import { Advisor, AdvisorPost, AdvisorCategory, AdvisorStatus, AdvisorServiceItem, UserProfile } from '../types';
import { formatDate } from '../utils/dateFormatter';

export const AdvisorProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [advisor, setAdvisor] = useState<Advisor | null>(null);
    const [posts, setPosts] = useState<AdvisorPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(authService.auth.currentUser);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [workHoursType, setWorkHoursType] = useState('Cả ngày');
    const [copied, setCopied] = useState(false);
    const [services, setServices] = useState<AdvisorServiceItem[]>([
        { id: '1', name: 'Xem Tử Vi trọn đời', price: 500000 }
    ]);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

    const handleAddService = () => {
        setServices([...services, { id: Date.now().toString(), name: '', price: 0 }]);
    };

    const handleServiceChange = (id: string, field: keyof AdvisorServiceItem, value: any) => {
        setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleRemoveService = (id: string) => {
        setServices(services.filter(s => s.id !== id));
    };

    // Derived state for images
    const allPostsImages = React.useMemo(() => posts.flatMap(p => p.images || []), [posts]);

    // Create Post State (Only for advisor owner, simulated)
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit Profile Avatar State
    const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
    const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<string | null>(null); // New state for field-level editing
    const profileFileInputRef = useRef<HTMLInputElement>(null);

    const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setEditAvatarFile(file);
            setEditAvatarPreview(URL.createObjectURL(file));
        }
    };

    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(async (user) => {
            setCurrentUser(user);
            if (user) {
                try {
                    const profile = await userService.getUserProfile(user.uid);
                    setUserProfile(profile);
                } catch (e) { console.error(e); }
            } else {
                setUserProfile(null);
            }
        });
        const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => {
            unsubscribe();
            clearInterval(timer);
        };
    }, []);

    const displayStatus = React.useMemo(() => {
        if (!advisor) return 'Online';

        if (advisor.status === AdvisorStatus.BUSY) return 'Bận';
        if (advisor.status === AdvisorStatus.OFFLINE) return 'Offline';

        if (!advisor.lastActive) return 'Offline';

        const diff = currentTime - new Date(advisor.lastActive).getTime();
        const mins = Math.floor(diff / 60000);

        if (mins < 5) return 'Online';

        if (mins < 60) return `Hoạt động ${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `Hoạt động ${hours} giờ trước`;
        return `Hoạt động ${Math.floor(hours / 24)} ngày trước`;
    }, [advisor, currentTime]);

    useEffect(() => {
        if (!id) {
            navigate('/market');
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // First checks if it's an advisor
                const allAdvisors = await advisorService.getAllAdvisors();
                const foundAdvisor = allAdvisors.find(a => a.id === id);

                if (foundAdvisor) {
                    setAdvisor(foundAdvisor);
                    // Fetch posts only for advisors for now, or if we enable user posts later
                    const advisorPosts = await advisorPostService.getPostsByAdvisor(id);
                    setPosts(advisorPosts);
                } else {
                    // If not an advisor, check if it's a regular user
                    const userProfile = await userService.getUserProfile(id!);
                    if (userProfile) {
                        // Map UserProfile to a partial Advisor-like structure for display
                        // We use the existing Advisor type but we'll conditionally hide fields
                        const tempUser: Advisor = {
                            id: userProfile.uid,
                            name: userProfile.displayName,
                            avatar: userProfile.photoURL || `https://ui-avatars.com/api/?name=${userProfile.displayName}&background=random`,
                            specialty: '' as any, // Hide for regular user
                            price: 0,
                            bio: 'Chưa có giới thiệu.', // More neutral default
                            experienceYears: 0,
                            status: 'Online' as any,
                            rating: 0,
                            reviewCount: 0,
                            tags: [],
                            reviews: [],
                            type: 'advisor', // Fallback type to satisfy interface
                            approvalStatus: 'approved',
                            phone: '',
                            zaloLink: '',
                            city: '',
                            workHours: 'Cả ngày'
                        };
                        setAdvisor(tempUser);
                        // Fetch posts for this user (same logic as advisors since they share the collection)
                        const userPosts = await advisorPostService.getPostsByAdvisor(userProfile.uid);
                        setPosts(userPosts);
                    } else {
                        // navigate('/market');
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, navigate]);

    const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!advisor || !currentUser) return;

        const formData = new FormData(e.currentTarget);
        const newName = formData.get('name') as string;
        const newBio = formData.get('bio') as string;
        const newCity = formData.get('city') as string;

        try {
            let finalAvatar = advisor.avatar;

            // 0. Upload Avatar if changed
            if (editAvatarFile) {
                const url = await imageUploadService.uploadImage(editAvatarFile);
                if (url) {
                    finalAvatar = url;
                }
            }

            // 1. Update Firestore User Doc
            await userService.syncUser({
                uid: advisor.id,
                email: currentUser.email,
                displayName: newName,
                photoURL: finalAvatar
            });

            // 2. Update Auth Profile
            await import('firebase/auth').then(async ({ updateProfile }) => {
                if (authService.auth.currentUser) {
                    await updateProfile(authService.auth.currentUser, {
                        displayName: newName,
                        photoURL: finalAvatar
                    });
                }
            });

            // 3. Update Advisor Doc (if advisor)
            if (advisor.type === 'advisor') {
                try {
                    await advisorService.updateAdvisor(advisor.id, {
                        name: newName,
                        bio: newBio,
                        city: newCity,
                        avatar: finalAvatar
                    });
                } catch (error: any) {
                    // Ignore "No document to update" error for regular users
                    if (error?.message?.includes('No document to update') || error?.code === 'not-found') {
                        console.log("Skipping advisor doc update for regular user");
                    } else {
                        throw error;
                    }
                }
            }

            // 4. Global Sync (Posts, Comments, Messages, Bookings)
            if (newName !== advisor.name || finalAvatar !== advisor.avatar) {
                // Determine role correctly. Regular users have empty specialty in this view.
                const isRegularUser = !advisor.specialty;
                const role = isRegularUser ? 'user' : 'advisor';
                await profileSyncService.syncUserProfile(advisor.id, role, newName, finalAvatar || '');
            }

            // Update local state
            setAdvisor(prev => prev ? ({ ...prev, name: newName, bio: newBio, city: newCity, avatar: finalAvatar }) : null);
            setIsEditProfileOpen(false);
            setEditAvatarFile(null);
            setEditAvatarPreview(null);
            toast.success("Cập nhật hồ sơ thành công!");

        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Có lỗi xảy ra khi cập nhật hồ sơ");
        }
    };

    const handleFollow = async () => {
        if (!currentUser || !advisor) {
            toast.error("Vui lòng đăng nhập để theo dõi");
            return;
        }

        const isFollowing = userProfile?.following?.includes(advisor.id);

        // Optimistic update
        const newFollowing = isFollowing
            ? (userProfile?.following || []).filter(id => id !== advisor.id)
            : [...(userProfile?.following || []), advisor.id];

        setUserProfile(prev => prev ? ({ ...prev, following: newFollowing }) : null);

        try {
            if (isFollowing) {
                await userService.unfollowAdvisor(currentUser.uid, advisor.id);
                toast.success(`Đã hủy theo dõi ${advisor.name}`);
            } else {
                await userService.followAdvisor(currentUser.uid, advisor.id);
                toast.success(`Đã theo dõi ${advisor.name}`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi cập nhật theo dõi");
        }
    };

    const handleCreatePost = async () => {
        if ((!newPostContent.trim() && selectedImages.length === 0) || !advisor) return;

        setIsPosting(true);
        try {
            let imageUrls: string[] = [];

            if (selectedImages.length > 0) {
                const uploadPromises = selectedImages.map(file => imageUploadService.uploadImage(file));
                const results = await Promise.all(uploadPromises);
                imageUrls = results.filter((url): url is string => url !== null);
            }

            await advisorPostService.createPost({
                advisorId: advisor.id,
                advisorName: advisor.name,
                advisorAvatar: advisor.avatar,
                content: newPostContent,
                images: imageUrls,
                createdAt: new Date().toISOString()
            });

            setNewPostContent('');
            setSelectedImages([]);
            setPreviewUrls([]);

            // Refresh posts
            if (advisor) {
                const updatedPosts = await advisorPostService.getPostsByAdvisor(advisor.id);
                setPosts(updatedPosts);
            }
        } catch (error) {
            console.error("Error creating post:", error);
            alert('Không thể đăng bài');
        } finally {
            setIsPosting(false);
        }
    };

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
            URL.revokeObjectURL(newUrls[index]);
            return newUrls.filter((_, i) => i !== index);
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };


    const handleMessage = async () => {
        if (!currentUser || !advisor) {
            toast.error("Vui lòng đăng nhập để nhắn tin");
            return;
        }

        try {
            const bookingId = await bookingService.getOrCreateChatBooking(
                currentUser.uid,
                advisor.id,
                advisor.name,
                advisor.avatar,
                currentUser.displayName || 'User',
                currentUser.photoURL || ''
            );

            navigate(`/messages?bookingId=${bookingId}`);
        } catch (error) {
            console.error(error);
            toast.error("Không thể mở cuộc trò chuyện");
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        const newAdvisor: Advisor = {
            id: currentUser.uid,
            name: formData.get('name') as string,
            avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`,
            specialty: formData.get('specialty') as AdvisorCategory,
            price: 0, // No price
            experienceYears: Number(formData.get('experienceYears')),
            bio: formData.get('bio') as string,
            status: AdvisorStatus.ONLINE,
            rating: 5, // Default for new
            reviewCount: 0,
            tags: [],
            reviews: [],
            type: 'advisor',
            approvalStatus: 'pending', // Pending approval
            city: formData.get('city') as string,
            workHours: workHoursType === 'custom' ? (formData.get('workHoursCustom') as string) : workHoursType,
            services: services
        };

        try {
            await advisorService.addAdvisor(newAdvisor);

            // Auto update local advisor state to show changes immediately
            setAdvisor(newAdvisor);
            setIsRegisterModalOpen(false);
            alert('Đăng ký thành công! Hồ sơ của bạn đang chờ duyệt.');

            // Optionally update user role if needed, but for now we rely on advisor collection check
        } catch (error) {
            console.error(error);
            alert('Lỗi đăng ký. Vui lòng thử lại.');
        }
    };

    // Check if current user is the owner (Simple check)
    const isOwner = currentUser?.uid === id;

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
    );

    if (!advisor) return null;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-gray-900">


            {/* Cover Photo Area - Facebook style */}
            <div className="relative h-[350px] bg-gradient-to-b from-indigo-100 via-purple-100 to-slate-50">
                <div className="absolute inset-0 bg-white/10"></div> {/* Overlay */}

                {/* Simulated Cover Image */}
                <img
                    src={`https://picsum.photos/seed/${advisor.id}-cover/1600/400`}
                    alt="Cover"
                    className="w-full h-full object-cover opacity-90"
                />

                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent"></div>
            </div>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 relative -mt-32 pb-20">

                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 pb-8 border-b border-gray-200">
                    <div className="relative group">
                        <div className="w-40 h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white relative z-10">
                            <img src={advisor.avatar} alt={advisor.name} className="w-full h-full object-cover" />
                        </div>
                        {isOwner && (
                            <button className="absolute bottom-2 right-2 z-20 bg-gray-100 p-2 rounded-full text-gray-700 hover:bg-gray-200 shadow-md border border-gray-200">
                                <ImageIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 mb-2 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2 mb-1">
                            {advisor.name}
                            {advisor.specialty && <BadgeCheck className="w-6 h-6 text-white fill-blue-500" />}
                        </h1>
                        {advisor.specialty ? (
                            <>
                                <p className="text-gray-600 text-lg mb-2">{advisor.specialty} • {advisor.experienceYears} năm kinh nghiệm</p>
                                <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500 fill-current" /> {advisor.rating} ({advisor.reviewCount} đánh giá)</span>
                                    <span className={`flex items-center gap-1 font-medium ${displayStatus === 'Online' ? 'text-green-600' :
                                        displayStatus === 'Bận' ? 'text-red-500' :
                                            'text-gray-500'
                                        }`}>
                                        ● {displayStatus}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <p className="text-gray-500 text-lg mb-2">Thành viên FATE</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                        {isOwner ? (
                            <>
                                <button className={`${advisor.price === 0 ? 'col-span-1' : 'col-span-2'} md:col-span-1 flex-1 md:flex-none px-4 md:px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm`}
                                    onClick={() => setIsEditProfileOpen(true)}
                                >
                                    <ImageIcon className="w-5 h-5" />
                                    <span>Chỉnh sửa <span className="hidden md:inline">hồ sơ</span></span>
                                </button>
                                {advisor.price === 0 && ( /* Only show for regular users */
                                    <button
                                        onClick={() => setIsRegisterModalOpen(true)}
                                        className="col-span-1 md:col-span-1 flex-1 md:flex-none px-4 md:px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-white shadow-md shadow-indigo-200"
                                    >
                                        <Award className="w-5 h-5" />
                                        <span>Đăng ký <span className="hidden md:inline">Cố vấn</span></span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleFollow}
                                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border shadow-sm ${userProfile?.following?.includes(advisor.id)
                                        ? 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                        }`}
                                >
                                    {userProfile?.following?.includes(advisor.id) ? (
                                        <>
                                            <UserCheck className="w-5 h-5" /> <span className="text-xs sm:text-sm">Đang theo dõi</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5" /> Theo dõi
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleMessage}
                                    className="flex-1 md:flex-none px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-gray-300 shadow-sm"
                                >
                                    <MessageCircle className="w-5 h-5" /> Nhắn tin
                                </button>
                                {advisor.specialty && (
                                    <button
                                        onClick={() => setIsBookingModalOpen(true)}
                                        className="col-span-2 md:w-auto flex-1 md:flex-none px-4 md:px-8 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg font-bold transition-transform shadow-lg shadow-amber-200 hover:scale-105 flex items-center justify-center gap-2"
                                    >
                                        <Calendar className="w-5 h-5" />
                                        <span>Đặt lịch <span className="hidden md:inline">ngay</span></span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Sidebar: Intro */}
                    <div className="flex flex-col gap-6 lg:sticky lg:top-24 h-fit">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-lg text-gray-900 mb-4">Giới thiệu</h3>
                            <div className="space-y-4 text-gray-600">
                                <p className="whitespace-pre-line">{advisor.bio}</p>

                                <div className="border-t border-gray-100 pt-4 space-y-3">
                                    {/* Show Advisor Details */}
                                    {advisor.specialty && (
                                        <>
                                            <div className="flex items-center gap-3 text-gray-500">
                                                <Award className="w-5 h-5 text-gray-400" />
                                                <span>Chuyên gia <strong>{advisor.specialty}</strong></span>
                                            </div>
                                            <div className="flex items-center gap-3 text-gray-500">
                                                <MapPin className="w-5 h-5 text-gray-400" />
                                                <span>Sống tại <strong>{advisor.city || 'Việt Nam'}</strong></span>
                                            </div>
                                            {(advisor.workHours) && (
                                                <div className="flex items-center gap-3 text-gray-500">
                                                    <Calendar className="w-5 h-5 text-gray-400" />
                                                    <span>Làm việc: <strong>{advisor.workHours}</strong></span>
                                                </div>
                                            )}



                                            {/* Services List Display */}
                                            {advisor.services && advisor.services.length > 0 && (
                                                <div className="pt-3 mt-3 border-t border-gray-100">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <DollarSign className="w-5 h-5 text-gray-400" />
                                                        <p className="text-xs text-gray-400 font-medium uppercase">Bảng giá tham khảo</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {advisor.services.map((service, index) => (
                                                            <div key={index} className="flex items-end justify-between text-sm group -mx-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-default">
                                                                <div className="flex items-center gap-3 pr-2">
                                                                    <div className="w-5 flex justify-center shrink-0">
                                                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                                    </div>
                                                                    <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">{service.name}</span>
                                                                </div>
                                                                <div className="flex-1 border-b border-gray-200 border-dotted mb-1.5 mx-1"></div>
                                                                <span className="text-indigo-600 font-bold pl-2">{service.price.toLocaleString()} đ</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                        </>
                                    )}

                                    {/* Copy Profile Link Button */}
                                    <button
                                        onClick={() => {
                                            const url = window.location.href; // Or build it: `${window.location.origin}/profile/${advisor.id}`
                                            navigator.clipboard.writeText(url);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 rounded-xl font-medium transition-all ${copied
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                            }`}
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Đã sao chép liên kết' : 'Sao chép liên kết hồ sơ'}
                                    </button>

                                    {/* Show Private Details for Owner - HIDDEN AS REQUESTED */}
                                    {/* {isOwner && (
                                        <>
                                            <div className="pt-2 mt-2 border-t border-gray-100">
                                                <p className="text-xs text-gray-400 font-medium mb-2 uppercase">Thông tin cá nhân (Chỉ bạn thấy)</p>
                                                <div className="flex flex-col gap-2">
                                                    <div className="bg-gray-50 p-2 rounded text-sm text-gray-600 border border-gray-200">
                                                        <span className="block text-xs text-gray-400">Email</span>
                                                        {currentUser?.email}
                                                    </div>
                                                    <div className="bg-gray-50 p-2 rounded text-sm text-gray-600 border border-gray-200 font-mono text-xs">
                                                        <span className="block text-xs text-gray-400 font-sans">UID</span>
                                                        {advisor.id}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )} */}
                                </div>
                            </div>
                        </div>

                        {/* Photos (Real from Posts) */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-gray-900">Ảnh</h3>
                                <button
                                    onClick={() => setIsGalleryOpen(true)}
                                    className="text-indigo-600 text-sm hover:underline font-medium hover:text-indigo-700"
                                >
                                    Xem tất cả
                                </button>
                            </div>
                            {allPostsImages.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2 rounded-lg overflow-hidden">
                                    {allPostsImages.slice(0, 9).map((img, idx) => (
                                        <div
                                            key={idx}
                                            className="aspect-square relative group cursor-pointer overflow-hidden"
                                            onClick={() => setLightboxIndex(idx)}
                                        >
                                            <img
                                                src={img}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                alt={`Advisor upload ${idx}`}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic text-center py-4">Chưa có ảnh nào.</p>
                            )}
                        </div>



                        {/* Reviews Section */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg text-gray-900">Đánh giá</h3>
                                <span className="text-gray-500 text-sm">({advisor.reviewCount} đánh giá)</span>
                            </div>
                            <div className={`space-y-4 ${showAllReviews ? 'max-h-[400px] overflow-y-auto custom-scrollbar pr-1' : ''}`}>
                                {advisor.reviews && advisor.reviews.length > 0 ? (
                                    (showAllReviews ? [...advisor.reviews].reverse() : [...advisor.reviews].reverse().slice(0, 3)).map((review) => (
                                        <div key={review.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-semibold text-sm text-gray-900">{review.user}</span>
                                                <div className="flex text-amber-400">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-gray-600 text-sm mb-1 line-clamp-3">{review.comment}</p>
                                            <p className="text-xs text-gray-400">
                                                {formatDate(review.date)}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-sm italic py-2">Chưa có đánh giá nào.</p>
                                )}
                            </div>
                            {!showAllReviews && advisor.reviews && advisor.reviews.length > 3 && (
                                <div className="mt-2 pt-2 text-center">
                                    <button
                                        onClick={() => setShowAllReviews(true)}
                                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium hover:underline"
                                    >
                                        Xem tất cả đánh giá
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Main Feed */}
                    <div className="lg:col-span-2">
                        {/* Create Post Box (Owner only - for demo making it visible to see logic, but usually owner only) */}
                        {isOwner && (
                            <div className="bg-white rounded-xl p-4 mb-6 border border-gray-200 shadow-sm">
                                <div className="flex gap-3 mb-3">
                                    <img src={currentUser?.photoURL || advisor.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                    <div className="flex-1 bg-gray-50 rounded-full px-4 py-2 hover:bg-gray-100 transition-colors cursor-text border border-transparent hover:border-gray-200">
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
                                    <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar max-w-full">
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
                                            <ImageIcon className="w-5 h-5 text-green-500" /> Ảnh
                                        </button>
                                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors">
                                            <Calendar className="w-5 h-5 text-amber-500" /> Sự kiện
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleCreatePost}
                                        disabled={(!newPostContent.trim() && selectedImages.length === 0) || isPosting}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
                                    >
                                        {isPosting ? 'Đang đăng...' : 'Đăng'}
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Feed */}
                        <div className="space-y-6">
                            {posts.length > 0 ? (
                                posts.map(post => (
                                    <Post key={post.id} post={post} currentUser={currentUser} />
                                ))
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                                    <p className="text-gray-500">Chưa có bài viết nào.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {isBookingModalOpen && (
                <AdvisorModal
                    advisor={advisor}
                    onClose={() => setIsBookingModalOpen(false)}
                />
            )}

            {/* Registration Modal */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsRegisterModalOpen(false)}></div>
                    <div className="relative bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Đăng ký đối tác</h2>
                            <button onClick={() => setIsRegisterModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị</label>
                                <input name="name" defaultValue={currentUser?.displayName || ''} required className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lĩnh vực chính</label>
                                    <select name="specialty" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors">
                                        {Object.values(AdvisorCategory).map(c => (
                                            <option key={c} value={c} className="bg-white">{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực (Thành phố)</label>
                                    <select name="city" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors">
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kinh nghiệm (năm)</label>
                                    <input name="experienceYears" type="number" defaultValue={1} min="0" required className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian làm việc</label>
                                    <select
                                        value={workHoursType}
                                        onChange={(e) => setWorkHoursType(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors mb-2"
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
                                            required
                                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors animate-in slide-in-from-top-2"
                                        />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bảng giá tham khảo (Các dịch vụ)</label>
                                <div className="space-y-3">
                                    {services.map((service) => (
                                        <div key={service.id} className="flex gap-2 items-center animate-in slide-in-from-left-2 fade-in duration-300">
                                            <input
                                                type="text"
                                                placeholder="Tên dịch vụ"
                                                value={service.name}
                                                onChange={(e) => handleServiceChange(service.id, 'name', e.target.value)}
                                                className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                                required
                                            />
                                            <input
                                                type="number"
                                                placeholder="Giá (VNĐ)"
                                                value={service.price || ''}
                                                onChange={(e) => handleServiceChange(service.id, 'price', Number(e.target.value))}
                                                className="w-28 flex-shrink-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                                required
                                            />
                                            {services.length > 1 && (
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
                                <button
                                    type="button"
                                    onClick={handleAddService}
                                    className="mt-3 text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" /> Thêm dịch vụ
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu bản thân</label>
                                <textarea
                                    name="bio"
                                    rows={4}
                                    placeholder="Hãy giới thiệu về kinh nghiệm và khả năng của bạn..."
                                    required
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                                <button type="button" onClick={() => setIsRegisterModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">Hủy</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-md shadow-indigo-200">
                                    Gửi đăng ký
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Gallery Modal */}
            {isGalleryOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsGalleryOpen(false)}></div>
                    <div className="relative w-full max-w-5xl h-full max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4 text-white z-10 px-4 pt-4">
                            <h2 className="text-xl font-bold">Thư viện ảnh ({allPostsImages.length})</h2>
                            <button onClick={() => setIsGalleryOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 custom-scrollbar px-4 pb-4">
                            {allPostsImages.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {allPostsImages.map((img, idx) => (
                                        <div
                                            key={idx}
                                            className="aspect-square relative group rounded-lg overflow-hidden bg-gray-800 cursor-pointer"
                                            onClick={() => setLightboxIndex(idx)}
                                        >
                                            <img
                                                src={img}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                alt={`Gallery item ${idx}`}
                                                loading="lazy"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    Không có ảnh nào.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Lightbox */}
            {lightboxIndex !== null && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
                    <button
                        onClick={() => setLightboxIndex(null)}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[90]"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightboxIndex(prev => prev !== null && prev > 0 ? prev - 1 : allPostsImages.length - 1);
                        }}
                        className="absolute left-4 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[90] hover:scale-110"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>

                    <div className="max-w-[90vw] max-h-[90vh] relative">
                        <img
                            src={allPostsImages[lightboxIndex]}
                            alt="Full screen"
                            className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl"
                        />
                        <div className="absolute bottom-[-3rem] left-0 right-0 text-center text-white/50 text-sm">
                            {(lightboxIndex + 1)} / {allPostsImages.length}
                        </div>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightboxIndex(prev => prev !== null && prev < allPostsImages.length - 1 ? prev + 1 : 0);
                        }}
                        className="absolute right-4 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[90] hover:scale-110"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>
                </div>
            )}




            {/* Edit Profile Modal */}
            {
                isEditProfileOpen && advisor && (
                    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 md:static">
                                <h3 className="text-xl font-bold text-gray-900 text-center flex-1">Chỉnh sửa trang cá nhân</h3>
                                <button onClick={() => setIsEditProfileOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="p-6 overflow-y-auto max-h-[80vh]">
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    ref={profileFileInputRef}
                                    onChange={handleProfileImageSelect}
                                />

                                <div className="space-y-6">
                                    {/* Avatar Edit Section */}
                                    <div className="flex flex-col items-center gap-3 mb-6">
                                        <div className="relative group cursor-pointer" onClick={() => profileFileInputRef.current?.click()}>
                                            <img
                                                src={editAvatarPreview || advisor.avatar}
                                                alt={advisor.name}
                                                className="w-28 h-28 rounded-full border-4 border-gray-100 object-cover"
                                            />
                                            <button type="button" className="absolute bottom-1 right-1 p-2 bg-gray-100 rounded-full hover:bg-gray-200 border-2 border-white shadow-sm font-bold text-xs">
                                                📷
                                            </button>
                                        </div>
                                        <span
                                            className="text-indigo-600 font-bold text-sm cursor-pointer hover:underline"
                                            onClick={() => profileFileInputRef.current?.click()}
                                        >
                                            Chỉnh sửa ảnh đại diện
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Name Field */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label htmlFor="edit-name" className="text-sm font-bold text-gray-900">Tên hiển thị</label>
                                                {editingField !== 'name' && (
                                                    <span
                                                        className="text-indigo-600 text-sm font-medium cursor-pointer hover:underline"
                                                        onClick={() => {
                                                            setEditingField('name');
                                                            setTimeout(() => document.getElementById('edit-name')?.focus(), 50);
                                                        }}
                                                    >
                                                        Chỉnh sửa
                                                    </span>
                                                )}
                                            </div>
                                            <input
                                                id="edit-name"
                                                name="name"
                                                defaultValue={advisor.name}
                                                readOnly={editingField !== 'name'}
                                                className={`w-full p-3 rounded-xl outline-none font-medium transition-all border border-transparent ${editingField === 'name'
                                                    ? 'bg-white ring-2 ring-indigo-500 shadow-sm'
                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}
                                                placeholder="Nhập tên hiển thị của bạn"
                                            />
                                        </div>

                                        {/* Bio Field */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label htmlFor="edit-bio" className="text-sm font-bold text-gray-900">Tiểu sử</label>
                                                {editingField !== 'bio' && (
                                                    <span
                                                        className="text-indigo-600 text-sm font-medium cursor-pointer hover:underline"
                                                        onClick={() => {
                                                            setEditingField('bio');
                                                            setTimeout(() => document.getElementById('edit-bio')?.focus(), 50);
                                                        }}
                                                    >
                                                        {advisor.bio && advisor.bio !== 'Chưa có giới thiệu.' ? 'Chỉnh sửa' : 'Thêm'}
                                                    </span>
                                                )}
                                            </div>
                                            <textarea
                                                id="edit-bio"
                                                name="bio"
                                                rows={3}
                                                defaultValue={advisor.bio === 'Chưa có giới thiệu.' ? '' : advisor.bio}
                                                readOnly={editingField !== 'bio'}
                                                className={`w-full p-3 rounded-xl outline-none resize-none font-medium transition-all border border-transparent ${editingField === 'bio'
                                                    ? 'bg-white ring-2 ring-indigo-500 shadow-sm'
                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}
                                                placeholder="Mô tả ngắn về bản thân..."
                                            />
                                        </div>

                                        {/* City Field */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label htmlFor="edit-city" className="text-sm font-bold text-gray-900">Tỉnh/Thành phố</label>
                                                {editingField !== 'city' && (
                                                    <span
                                                        className="text-indigo-600 text-sm font-medium cursor-pointer hover:underline"
                                                        onClick={() => {
                                                            setEditingField('city');
                                                            setTimeout(() => document.getElementById('edit-city')?.focus(), 50);
                                                        }}
                                                    >
                                                        Chỉnh sửa
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${editingField === 'city' ? 'text-indigo-500' : 'text-gray-400'}`} />
                                                <input
                                                    id="edit-city"
                                                    name="city"
                                                    defaultValue={advisor.city}
                                                    readOnly={editingField !== 'city'}
                                                    className={`w-full pl-10 p-3 rounded-xl outline-none font-medium transition-all border border-transparent ${editingField === 'city'
                                                        ? 'bg-white ring-2 ring-indigo-500 shadow-sm'
                                                        : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    placeholder="VD: Hà Nội, TP.HCM..."
                                                />
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3 sticky bottom-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditProfileOpen(false)}
                                        className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                                    >
                                        Lưu thay đổi
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};


