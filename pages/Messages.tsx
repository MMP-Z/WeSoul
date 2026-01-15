import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Send, Image, MoreVertical, ArrowLeft, Loader2, Check, CheckCheck, MessageSquare } from 'lucide-react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { bookingService } from '../services/bookingService';
import { advisorChatService } from '../services/advisorChatService';
import { Booking, BookingStatus, ChatMessage, AdvisorStatus } from '../types';
import { imageUploadService } from '../services/imageUploadService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const Messages: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [conversationsMetadata, setConversationsMetadata] = useState<any[]>([]); // Metadata from advisor_messages

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentUser = authService.auth.currentUser;

    // Subscribe to live conversation metadata
    useEffect(() => {
        if (!currentUser) return;
        const unsubscribe = advisorChatService.subscribeToConversations(currentUser.uid, (data) => {
            setConversationsMetadata(data);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // Fetch conversations (bookings)
    // Fetch conversations (bookings)
    useEffect(() => {
        const fetchConversations = async (user: any) => {
            if (!user) return;
            try {
                // Get user role
                const profile = await userService.getUserProfile(user.uid);
                const role = profile?.role || 'user';

                let fetchedBookings: Booking[] = [];

                if (role === 'advisor') {
                    fetchedBookings = await bookingService.getAdvisorBookings(user.uid);
                } else {
                    fetchedBookings = await bookingService.getUserBookings(user.uid);
                }

                // Filter for confirmed/completed bookings that enable chat
                const chatEnabledBookings = fetchedBookings.filter(b =>
                    b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED
                );

                setBookings(chatEnabledBookings);
                setLoading(false);

                // Auto-select booking from URL param
                const bookingIdFromUrl = searchParams.get('bookingId');
                if (bookingIdFromUrl) {
                    const found = chatEnabledBookings.find(b => b.id === bookingIdFromUrl);
                    if (found) setSelectedBooking(found);
                }
            } catch (error) {
                console.error("Error fetching conversations:", error);
                setLoading(false);
            }
        };

        const unsubscribe = authService.onAuthStateChanged(user => {
            if (user) {
                fetchConversations(user);
            } else {
                navigate('/login');
            }
        });

        return () => unsubscribe();
    }, [navigate, searchParams]);

    // Self-healing: Fix missing names in bookings (For Advisors view)
    useEffect(() => {
        if (!bookings.length || !currentUser) return;

        const fixMissingNames = async () => {
            // Only run if I am an advisor in at least one booking (optimization)
            // or just check each booking.

            for (const booking of bookings) {
                // If I am the advisor, I need to see the User's name
                if (booking.advisorId === currentUser.uid) {
                    const currentName = booking.userName;
                    const isSuspicious = !currentName || currentName === 'User' || currentName === 'Người dùng' || currentName === 'Khách hàng';

                    if (isSuspicious) {
                        try {
                            // Fetch fresh profile
                            const userProfile = await userService.getUserProfile(booking.userId);
                            if (userProfile && userProfile.displayName && userProfile.displayName !== currentName) {
                                console.log(`Auto-fixing booking ${booking.id} user name: ${currentName} -> ${userProfile.displayName}`);

                                // Update Firestore
                                await bookingService.updateBookingInfo(booking.id, {
                                    userName: userProfile.displayName,
                                    userAvatar: userProfile.photoURL || booking.userAvatar || ''
                                });

                                // Update local state
                                setBookings(prev => prev.map(b => b.id === booking.id ? {
                                    ...b,
                                    userName: userProfile.displayName,
                                    userAvatar: userProfile.photoURL || b.userAvatar || ''
                                } : b));
                            }
                        } catch (err) {
                            console.error("Failed to fix booking user name:", err);
                        }
                    }
                }
            }
        };

        fixMissingNames();
    }, [bookings, currentUser]);

    // Subscribe to messages when a booking is selected
    // Note: The main subscription logic is handled in the second useEffect below which handles conversationId
    // keeping this empty or removing it to avoid double subscription
    // Trigger migration of legacy messages
    useEffect(() => {
        advisorChatService.migrateLegacyMessages();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && selectedBooking && currentUser) {
            const file = e.target.files[0];
            setIsUploading(true);
            try {
                const imageUrl = await imageUploadService.uploadImage(file);

                const isMeAdvisor = selectedBooking.advisorId === currentUser.uid;
                const receiverId = isMeAdvisor ? selectedBooking.userId : selectedBooking.advisorId;

                await advisorChatService.sendMessage({
                    senderId: currentUser.uid,
                    senderName: currentUser.displayName || 'User',
                    receiverId: receiverId,
                    message: 'Đã gửi một ảnh',
                    image: imageUrl,
                    bookingId: selectedBooking.id,
                });
            } catch (error) {
                console.error("Failed to upload image", error);
                alert("Không thể gửi ảnh");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedBooking || !currentUser) return;

        // Determine if I am the advisor or the user to set correct receiver
        // If I am the booking.advisorId, then receiver is booking.userId
        // If I am the booking.userId, then receiver is booking.advisorId
        const isMeAdvisor = selectedBooking.advisorId === currentUser.uid;
        const receiverId = isMeAdvisor ? selectedBooking.userId : selectedBooking.advisorId;

        try {
            await advisorChatService.sendMessage({
                senderId: currentUser.uid,
                senderName: currentUser.displayName || 'User',
                receiverId: receiverId,
                message: newMessage.trim(),
                bookingId: selectedBooking.id,
            });
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    // Helper to get partner info
    const getPartnerInfo = (booking: Booking) => {
        if (!currentUser) return { name: '...', avatar: '' };
        const isMeAdvisor = booking.advisorId === currentUser.uid;
        return {
            name: isMeAdvisor ? (booking.userName || 'Người dùng') : booking.advisorName,
            avatar: isMeAdvisor ? (booking.userAvatar || '') : booking.advisorAvatar
        };
    };

    // Group bookings by partner to show unique conversations
    const conversations = React.useMemo(() => {
        if (!currentUser) return [];
        const uniqueConversations = new Map();

        bookings.forEach(booking => {
            const partnerInfo = getPartnerInfo(booking);
            const partnerId = booking.advisorId === currentUser?.uid ? booking.userId : booking.advisorId;
            const conversationId = advisorChatService.getConversationId(currentUser.uid, partnerId);
            const metadata = conversationsMetadata.find(c => c.id === conversationId);

            // Allow reading from both nested map (correct) and legacy flat key (bug)
            // Allow reading from both nested map (correct) and legacy flat key (bug)
            const unreadCount = metadata?.unreadCounts?.[currentUser.uid] ?? 0;

            if (!uniqueConversations.has(partnerId)) {
                uniqueConversations.set(partnerId, {
                    partnerId,
                    partnerName: partnerInfo.name,
                    partnerAvatar: partnerInfo.avatar,
                    lastBookingDate: booking.date,
                    bookingId: booking.id,
                    conversationId,
                    lastMessage: metadata?.lastMessage || '',
                    lastSenderId: metadata?.lastSenderId,
                    unreadCount,
                    lastUpdated: metadata?.lastUpdated?.seconds ? new Date(metadata.lastUpdated.seconds * 1000) : new Date(booking.date), // Use chat update or booking date
                    ...booking
                });
            } else {
                const existing = uniqueConversations.get(partnerId);
                if (new Date(booking.date) > new Date(existing.lastBookingDate)) {
                    uniqueConversations.set(partnerId, {
                        ...existing,
                        lastBookingDate: booking.date,
                        bookingId: booking.id,
                        ...booking
                    });
                }
            }
        });

        // Sort by lastUpdated (chat activity) or booking date
        return Array.from(uniqueConversations.values()).sort((a: any, b: any) => {
            return b.lastUpdated.getTime() - a.lastUpdated.getTime();
        });
    }, [bookings, currentUser, conversationsMetadata]);

    // Update selected booking logic to select conversation
    // specificBookingId is used for initial selection from URL

    const [partnerStatus, setPartnerStatus] = useState<AdvisorStatus | 'Online' | 'Offline' | null>(null);
    const [partnerLastActive, setPartnerLastActive] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Update time for "X minutes ago" calculation
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Update my last active
    useEffect(() => {
        if (!currentUser) return;
        const interval = setInterval(() => {
            userService.updateLastActive(currentUser.uid);
        }, 60000); // Every 1 minute
        userService.updateLastActive(currentUser.uid); // Immediate
        return () => clearInterval(interval);
    }, [currentUser]);

    // Subscribe to partner status
    useEffect(() => {
        if (!selectedBooking || !currentUser) return;

        const isMeAdvisor = selectedBooking.advisorId === currentUser.uid;
        const partnerId = isMeAdvisor ? selectedBooking.userId : selectedBooking.advisorId;

        // Reset
        setPartnerStatus(null);
        setPartnerLastActive(null);

        // Listen to Partner's User Profile (for lastActive)
        const unsubUser = onSnapshot(doc(db, 'users', partnerId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPartnerLastActive(data.lastActive || null);
            }
        });

        let unsubAdvisor = () => { };
        if (!isMeAdvisor) {
            // If partner is Advisor, listen to their Advisor Profile for explicit status
            unsubAdvisor = onSnapshot(doc(db, 'advisors', partnerId), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.status) {
                        setPartnerStatus(data.status);
                    }
                }
            });
        }

        return () => {
            unsubUser();
            unsubAdvisor();
        };
    }, [selectedBooking, currentUser]);

    // Subscribe to messages when a booking/conversation is selected
    useEffect(() => {
        if (!selectedBooking || !currentUser) return;

        setLoadingMessages(true);

        // Calculate conversationId
        const isMeAdvisor = selectedBooking.advisorId === currentUser.uid;
        const partnerId = isMeAdvisor ? selectedBooking.userId : selectedBooking.advisorId;
        const conversationId = advisorChatService.getConversationId(currentUser.uid, partnerId);

        const unsubscribe = advisorChatService.subscribeToMessages(conversationId, selectedBooking.id, (msgs) => {
            setMessages(msgs);
            setLoadingMessages(false);

            // Mark conversation as read if there are unread messages for me
            if (currentUser) {
                const hasUnread = msgs.some(msg => msg.receiverId === currentUser.uid && !msg.isRead);
                if (hasUnread) {
                    advisorChatService.markConversationAsRead(conversationId, currentUser.uid);
                }
            }
        });

        return () => unsubscribe();
    }, [selectedBooking, currentUser]);

    const filteredBookings = conversations.filter(b => {
        const info = getPartnerInfo(b);
        return info.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const filteredConversations = conversations.filter(c =>
        c.partnerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-6.5rem)] md:h-[calc(100vh-64px)] bg-slate-50 flex">
            <div className="flex w-full max-w-7xl mx-auto h-full md:h-[calc(100vh-96px)] bg-white rounded-none md:rounded-2xl shadow-sm border-x-0 md:border border-gray-200 overflow-hidden">

                {/* Sidebar - List of Conversations */}
                <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col bg-white ${selectedBooking ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-xl font-serif font-bold text-gray-900 mb-4">Tin nhắn</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm cuộc trò chuyện..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có cuộc trò chuyện nào'}
                            </div>
                        ) : (
                            filteredConversations.map(conv => {
                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() => setSelectedBooking(conv)}
                                        className={`p-4 flex gap-3 cursor-pointer transition-colors border-b border-gray-50 hover:bg-gray-50 ${selectedBooking?.id === conv.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : conv.unreadCount > 0 ? 'bg-indigo-100 border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center border border-indigo-50">
                                                {conv.partnerAvatar ? (
                                                    <img src={conv.partnerAvatar} alt={conv.partnerName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-indigo-600 font-bold">{conv.partnerName ? conv.partnerName.charAt(0).toUpperCase() : 'U'}</span>
                                                )}
                                            </div>
                                            {conv.unreadCount > 0 && (
                                                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className={`font-semibold truncate ${selectedBooking?.id === conv.id ? 'text-indigo-900' : 'text-gray-900'} ${conv.unreadCount > 0 ? 'font-bold' : ''}`}>{conv.partnerName}</h3>
                                                <span className={`text-xs ${conv.unreadCount > 0 ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
                                                    {conv.lastUpdated instanceof Date ? conv.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(conv.lastBookingDate).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className={`text-sm truncate pr-2 ${conv.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                                                    {conv.lastMessage ? (
                                                        <span>
                                                            {conv.lastSenderId === currentUser?.uid ? 'Bạn: ' : ''}
                                                            {conv.lastMessage}
                                                        </span>
                                                    ) : 'Bấm để xem tin nhắn...'}
                                                </p>
                                                {conv.unreadCount > 0 && (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                                                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={`flex-1 flex flex-col bg-white ${!selectedBooking ? 'hidden md:flex' : 'flex'}`}>
                    {selectedBooking ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setSelectedBooking(null)}
                                        className="md:hidden p-1 text-gray-500 hover:text-gray-900"
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>
                                    {(() => {
                                        const status = (() => {
                                            if (partnerStatus === AdvisorStatus.BUSY) return { text: 'Đang bận', color: 'text-orange-500', bg: 'bg-orange-500' };
                                            if (partnerStatus === AdvisorStatus.OFFLINE) return { text: 'Offline', color: 'text-gray-400', bg: 'bg-gray-400' };

                                            if (!partnerLastActive) return { text: 'Offline', color: 'text-gray-400', bg: 'bg-gray-400' };

                                            const diff = currentTime - new Date(partnerLastActive).getTime();
                                            const mins = Math.floor(diff / 60000);

                                            if (mins < 3) return { text: 'Đang hoạt động', color: 'text-green-600', bg: 'bg-green-600' };
                                            if (mins < 60) return { text: `Hoạt động ${mins} phút trước`, color: 'text-gray-500', bg: 'bg-gray-400' };
                                            const hours = Math.floor(mins / 60);
                                            if (hours < 24) return { text: `Hoạt động ${hours} giờ trước`, color: 'text-gray-500', bg: 'bg-gray-400' };
                                            return { text: `Hoạt động ${Math.floor(hours / 24)} ngày trước`, color: 'text-gray-500', bg: 'bg-gray-400' };
                                        })();

                                        return (
                                            <>
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-50">
                                                        {getPartnerInfo(selectedBooking).avatar ? (
                                                            <img src={getPartnerInfo(selectedBooking).avatar} alt={getPartnerInfo(selectedBooking).name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-indigo-600 font-bold">{getPartnerInfo(selectedBooking).name ? getPartnerInfo(selectedBooking).name.charAt(0).toUpperCase() : 'U'}</span>
                                                        )}
                                                    </div>
                                                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${status.bg}`}></div>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{getPartnerInfo(selectedBooking).name}</h3>
                                                    <span className={`text-xs ${status.color} flex items-center gap-1`}>
                                                        {status.text}
                                                    </span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="flex items-center gap-4 text-gray-400">
                                    <button className="hover:text-indigo-600 transition-colors bg-gray-50 hover:bg-indigo-50 p-2 rounded-full"><MoreVertical className="w-4 h-4" /></button>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                                {loadingMessages ? (
                                    <div className="flex justify-center items-center h-full">
                                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                                            <Send className="w-10 h-10 text-indigo-300" />
                                        </div>
                                        <p>Bắt đầu cuộc trò chuyện với {getPartnerInfo(selectedBooking).name || 'Đối phương'}</p>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => {
                                        const isMe = msg.senderId === currentUser?.uid;
                                        const isSequence = index > 0 && messages[index - 1].senderId === msg.senderId;

                                        const nextMsg = messages[index + 1];
                                        const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;
                                        const timeGap = nextMsg?.timestamp?.seconds && msg.timestamp?.seconds
                                            ? Math.abs(nextMsg.timestamp.seconds - msg.timestamp.seconds) / 60
                                            : 0;
                                        const showTimestamp = isLastInGroup || (nextMsg && nextMsg.senderId === msg.senderId && timeGap > 5);

                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-1' : 'mt-4'}`}>
                                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                                    {msg.image ? (
                                                        <img
                                                            src={msg.image}
                                                            alt="Sent attachment"
                                                            className={`max-w-[240px] rounded-2xl cursor-pointer hover:opacity-95 shadow-sm border border-gray-100 object-cover ${isMe ? 'rounded-br-none' : 'rounded-bl-none'}`}
                                                            onClick={() => window.open(msg.image, '_blank')}
                                                        />
                                                    ) : (
                                                        <div className={`px-4 py-2 text-sm shadow-sm ${isMe
                                                            ? 'bg-indigo-600 text-white rounded-2xl ' + (isLastInGroup && !nextMsg ? 'rounded-br-none' : '')
                                                            : 'bg-white text-gray-700 rounded-2xl rounded-bl-none border border-gray-100'
                                                            }`}>
                                                            <p>{msg.message}</p>
                                                        </div>
                                                    )}
                                                    {showTimestamp && (
                                                        <div className="flex items-center gap-1 mt-1 px-1">
                                                            <span className="text-[10px] text-gray-400">
                                                                {msg.timestamp?.seconds
                                                                    ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                    : '...'
                                                                }
                                                            </span>
                                                            {isMe && msg.isRead && <CheckCheck className="w-3 h-3 text-indigo-600" />}
                                                            {isMe && !msg.isRead && <Check className="w-3 h-3 text-gray-400" />}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-gray-100">
                                <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                    />
                                    <div className="flex gap-2 pb-2 text-gray-400">
                                        <button
                                            type="button"
                                            onClick={handleImageClick}
                                            disabled={isUploading}
                                            className={`p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-indigo-600 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <Image className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl flex items-center p-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-100 transition-all">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Nhập tin nhắn..."
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 px-3 py-1 placeholder-gray-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-sm"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 bg-slate-50/50">
                            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                                <MessageSquare className="w-16 h-16 text-indigo-200" />
                            </div>
                            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Tin nhắn của bạn</h2>
                            <p className="max-w-md text-gray-500">Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin với Cố vấn.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


