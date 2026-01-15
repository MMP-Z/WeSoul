import React, { useState } from 'react';
import { X, Star, ShieldCheck, Clock, Calendar, Loader2, CheckCircle, MessageSquare } from 'lucide-react';
import { Advisor, BookingStatus } from '../types';
import { authService } from '../services/authService';
import { bookingService } from '../services/bookingService';
import { notificationService } from '../services/notificationService';

interface AdvisorModalProps {
  advisor: Advisor | null;
  onClose: () => void;
}

export const AdvisorModal: React.FC<AdvisorModalProps> = ({ advisor, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState('');

  // Mock data since UI doesn't have date/time picker
  const selectedDate = new Date();
  const durationMinutes = 30;

  if (!advisor) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // 1. Get current user
      const currentUser = authService.auth.currentUser;

      // 2. Save booking if user is logged in
      if (currentUser) {
        await bookingService.createBooking({
          userId: currentUser.uid,
          advisorId: advisor.id,
          advisorName: advisor.name,
          advisorAvatar: advisor.avatar,
          date: selectedDate.toISOString(),
          durationMinutes: durationMinutes,
          totalPrice: 0, // No price
          status: BookingStatus.PENDING,
          userName: currentUser.displayName || 'User',
          userAvatar: currentUser.photoURL || '',
          note: message // Pass the message as note
        });

        // Notify Advisor
        await notificationService.createNotification({
          userId: advisor.id,
          title: 'Yêu cầu đặt lịch mới',
          content: `${currentUser.displayName || 'Khách hàng'} muốn đặt lịch tư vấn với bạn.`,
          type: 'booking',
          link: '/advisor-dashboard'
        });
      }

      setIsSuccess(true);
    } catch (error) {
      console.error("Error creating booking:", error);
      alert('Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      ></div>

      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">
            Đặt lịch tư vấn
          </h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 bg-gray-50/50">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-bounce-short">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Đăng ký thành công!</h3>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 w-full max-w-sm">
                <p className="text-sm text-gray-600 mb-2">Yêu cầu đặt lịch với <span className="text-gray-900 font-semibold">{advisor.name}</span> đã được gửi đi.</p>
                <p className="text-xs text-gray-500">Cố vấn sẽ phản hồi lại bạn sớm nhất có thể.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Advisor Profile Header */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  <img
                    src={advisor.avatar}
                    alt={advisor.name}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                  <div className="absolute bottom-0 right-0 bg-green-500 w-5 h-5 rounded-full border-2 border-white"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{advisor.name}</h3>
                <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mt-1">
                  {advisor.specialty}
                </span>
                <div className="flex items-center gap-1 mt-3">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(advisor.rating) ? 'fill-current' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-gray-500 text-sm ml-2 font-medium">({advisor.reviewCount} đánh giá)</span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
                    <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <span className="block text-xs text-gray-500 uppercase tracking-wide">Đã xác thực</span>
                    <span className="block text-sm font-bold text-gray-900">Danh tính</span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
                    <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <span className="block text-xs text-gray-500 uppercase tracking-wide">Kinh nghiệm</span>
                    <span className="block text-sm font-bold text-gray-900">{advisor.experienceYears} năm</span>
                  </div>
                </div>

                {/* Bio */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                    Giới thiệu
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{advisor.bio}</p>
                </div>

                {/* Message Input */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    Lời nhắn cho Cố vấn
                  </h4>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Bạn muốn hỏi về vấn đề gì? (Tình duyên, Sự nghiệp...)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 min-h-[100px] resize-none"
                  ></textarea>
                </div>

                {/* Recent Reviews */}
                {advisor.reviews.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 px-1">Đánh giá gần đây</h4>
                    <div className="space-y-3">
                      {advisor.reviews.map(review => (
                        <div key={review.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-gray-900 text-sm">{review.user}</span>
                            <span className="text-xs text-gray-400">{review.date}</span>
                          </div>
                          <div className="flex text-amber-400 mb-1.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`} />
                            ))}
                          </div>
                          <p className="text-gray-600 text-sm italic">"{review.comment}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {isSuccess ? (
            <button
              onClick={handleClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3.5 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              Đóng
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang gửi yêu cầu...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  Gửi yêu cầu đặt lịch
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};