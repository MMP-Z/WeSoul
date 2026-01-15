import React, { useState, useEffect } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import { notificationService, Notification } from '../services/notificationService';
import { authService } from '../services/authService';

export const Notifications: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [user, setUser] = useState(authService.auth.currentUser);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = authService.onAuthStateChanged((u) => {
            setUser(u);
            if (!u) setLoading(false);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribeNotifs = notificationService.subscribeToNotifications(user.uid, (data) => {
            setNotifications(data);
            setLoading(false);
        });

        return () => unsubscribeNotifs();
    }, [user?.uid]);

    const handleMarkRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await notificationService.markAsRead(id);
    };

    const handleMarkAllRead = async () => {
        if (user?.uid) {
            await notificationService.markAllAsRead(user.uid);
        }
    };

    const formatTimeAgo = (timestamp: any) => {
        if (!timestamp) return '';
        let date;
        if (timestamp?.toDate) {
            date = timestamp.toDate();
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            date = new Date(timestamp);
        }

        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="max-w-2xl mx-auto px-4 pt-4">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
                    {notifications.some(n => !n.isRead) && (
                        <button
                            onClick={handleMarkAllRead}
                            className="bg-white px-4 py-2 rounded-lg text-sm font-medium text-indigo-600 shadow-sm border border-gray-100 hover:bg-indigo-50 transition-colors"
                        >
                            Đánh dấu tất cả đã đọc
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                        </div>
                    ) : notifications.length > 0 ? (
                        notifications.map(notification => (
                            <div
                                key={notification.id}
                                onClick={(e) => handleMarkRead(notification.id, e)}
                                className={`relative bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${!notification.isRead ? 'bg-indigo-50/50 border-indigo-100' : ''}`}
                            >
                                <div className="flex gap-4">
                                    <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!notification.isRead ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className={`text-base mb-1 ${!notification.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                                                {notification.title}
                                            </h3>
                                            {!notification.isRead && (
                                                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                                            )}
                                        </div>
                                        <p className={`text-sm mb-2 leading-relaxed ${!notification.isRead ? 'text-gray-900' : 'text-gray-500'}`}>
                                            {notification.content}
                                        </p>
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            {formatTimeAgo(notification.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Chưa có thông báo nào</h3>
                            <p className="text-gray-500">Chúng tôi sẽ báo cho bạn khi có cập nhật mới.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
