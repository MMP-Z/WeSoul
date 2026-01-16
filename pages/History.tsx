import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { bookingService } from '../services/bookingService';
import { advisorService } from '../services/advisorService';
import { Booking, BookingStatus } from '../types';
import { Navbar } from '../components/Navbar';

import { MessageCircle, Clock, Calendar, Star, X, Pencil } from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';

export const History: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [isLoadingReview, setIsLoadingReview] = useState(false);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(async (user) => {
            if (!user) {
                navigate('/login');
                return;
            }

            try {
                const data = await bookingService.getUserBookings(user.uid);
                setBookings(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const getStatusColor = (status: BookingStatus) => {
        switch (status) {
            case BookingStatus.CONFIRMED: return 'text-green-700 bg-green-50 border-green-200';
            case BookingStatus.PENDING: return 'text-amber-700 bg-amber-50 border-amber-200';
            case BookingStatus.COMPLETED: return 'text-blue-700 bg-blue-50 border-blue-200';
            case BookingStatus.CANCELLED: return 'text-red-700 bg-red-50 border-red-200';
            default: return 'text-gray-700 bg-gray-50 border-gray-200';
        }
    };

    const openReviewModal = async (booking: Booking) => {
        setSelectedBookingForReview(booking);
        setShowReviewModal(true);

        if (booking.isReviewed) {
            setIsLoadingReview(true);
            try {
                const review = await advisorService.getReview(booking.advisorId, booking.id);
                if (review) {
                    setRating(review.rating);
                    setComment(review.comment);
                }
            } catch (error) {
                console.error("Error fetching review:", error);
            } finally {
                setIsLoadingReview(false);
            }
        } else {
            setRating(5);
            setComment('');
        }
    };

    const handleSubmitReview = async () => {
        if (!selectedBookingForReview) return;
        setIsSubmittingReview(true);
        try {
            const reviewData = {
                id: selectedBookingForReview.id,
                user: selectedBookingForReview.userName || 'Anonymous',
                rating,
                comment,
                date: new Date().toISOString()
            };

            if (selectedBookingForReview.isReviewed) {
                await advisorService.updateReview(selectedBookingForReview.advisorId, reviewData);
                // Toast success?
            } else {
                await advisorService.addReview(selectedBookingForReview.advisorId, reviewData);
                await bookingService.markAsReviewed(selectedBookingForReview.id);
            }

            setBookings(bookings.map(b =>
                b.id === selectedBookingForReview.id ? { ...b, isReviewed: true } : b
            ));

            setShowReviewModal(false);
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra khi gửi đánh giá.");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            <div className="pt-4 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">Lịch sử tư vấn</h1>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed shadow-sm">
                        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">Bạn chưa có lịch sử tư vấn nào.</p>
                        <button
                            onClick={() => navigate('/market')}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors text-white shadow-sm"
                        >
                            Tìm Chuyên Gia Ngay
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => (
                            <div key={booking.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-all duration-200">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex gap-3">
                                        <img
                                            src={booking.advisorAvatar}
                                            alt={booking.advisorName}
                                            className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm shrink-0"
                                        />
                                        <div>
                                            <h3 className="font-bold text-gray-900 leading-tight mb-1">{booking.advisorName}</h3>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(booking.date)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    1 lần xem
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="font-bold text-indigo-600 mb-1">
                                            {booking.totalPrice.toLocaleString('vi-VN')} đ
                                        </div>
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(booking.status)}`}>
                                            {booking.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons Row */}
                                {(booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.COMPLETED) && (
                                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end gap-2">
                                        <button
                                            onClick={() => navigate(`/messages?bookingId=${booking.id}`)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            Nhắn tin
                                        </button>

                                        {booking.status === BookingStatus.COMPLETED && !booking.isReviewed && (
                                            <button
                                                onClick={() => openReviewModal(booking)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                <Star className="w-3.5 h-3.5" />
                                                Đánh giá
                                            </button>
                                        )}

                                        {booking.status === BookingStatus.COMPLETED && booking.isReviewed && (
                                            <button
                                                onClick={() => openReviewModal(booking)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                Sửa đánh giá
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>



            {/* Review Modal */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Đánh giá dịch vụ</h3>
                            <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex flex-col items-center mb-6">
                            {isLoadingReview ? (
                                <div className="py-8">
                                    <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-2 mb-4">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setRating(star)}
                                                className={`transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-gray-200'}`}
                                            >
                                                <Star className="w-8 h-8 fill-current" />
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-sm font-medium text-gray-600">
                                        {rating === 5 ? 'Tuyệt vời!' : rating === 4 ? 'Rất tốt' : rating === 3 ? 'Bình thường' : rating === 2 ? 'Tệ' : 'Rất tệ'}
                                    </p>
                                </>
                            )}
                        </div>

                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Chia sẻ cảm nhận của bạn về buổi tư vấn..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSubmitReview}
                                disabled={isSubmittingReview}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                {isSubmittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
