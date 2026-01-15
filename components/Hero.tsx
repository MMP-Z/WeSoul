import React, { useState } from 'react';
import { Sparkles, Stars, Loader2 } from 'lucide-react';
import { generateDailyInsight } from '../services/geminiService';
import { chatService } from '../services/chatService';
import { authService } from '../services/authService';

export const Hero: React.FC = () => {
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<{ text: string, luckyColor: string, luckyNumber: string } | null>(null);

  const handleReveal = async () => {
    if (!birthDate) return;
    setLoading(true);
    setInsight(null);

    // Simulate a minimum wait time for "mystical processing" feel
    const minWait = new Promise(resolve => setTimeout(resolve, 1500));
    const apiCall = generateDailyInsight(birthDate);

    const [result] = await Promise.all([apiCall, minWait]);

    setInsight(result);
    setLoading(false);

    // Save to chat log
    const user = authService.auth.currentUser;
    if (user) {
      await chatService.saveLog({
        userId: user.uid,
        userName: user.displayName || 'Vô danh',
        message: `Xem tử vi ngày sinh: ${birthDate}`,
        response: result.text,
        timestamp: new Date().toISOString(),
        type: 'daily_insight'
      });
    }
  };

  return (
    <div className="relative pt-24 pb-12 sm:pt-32 sm:pb-20 overflow-hidden bg-gradient-to-b from-indigo-50 to-white">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200/50 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200/50 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-white shadow-sm text-amber-600 text-xs font-medium mb-6 animate-fade-in-up">
          <Stars className="w-3 h-3" />
          <span>Khám phá thông điệp vũ trụ hôm nay</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-serif font-bold text-gray-900 mb-6 tracking-tight">
          Giải mã định mệnh <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            theo cách riêng của bạn
          </span>
        </h1>

        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
          Kết nối với những Cố vấn tâm linh hàng đầu hoặc nhận thông điệp AI ngay lập tức. Không mê tín, chỉ là thấu hiểu bản thân.
        </p>

        {/* Interactive Oracle Box */}
        <div className="glass-card max-w-md mx-auto p-6 rounded-2xl relative overflow-hidden transition-all duration-500 bg-white border border-gray-200 shadow-xl">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-2" />
              <p className="text-indigo-600 text-sm animate-pulse font-medium">Đang kết nối vũ trụ...</p>
            </div>
          )}

          {!insight ? (
            <div className="space-y-4">
              <label className="block text-left text-sm font-medium text-gray-700 mb-1">
                Ngày tháng năm sinh của bạn
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
                <button
                  onClick={handleReveal}
                  disabled={!birthDate}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-lg shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Xem
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 italic">
                *Chúng tôi sử dụng AI để đọc bản đồ sao sơ khởi của bạn.
              </p>
            </div>
          ) : (
            <div className="text-left animate-in fade-in zoom-in duration-500">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-serif text-indigo-900 font-bold">Thông điệp hôm nay</h3>
                <button onClick={() => setInsight(null)} className="text-xs text-gray-400 hover:text-indigo-600 underline">
                  Xem ngày khác
                </button>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4 text-sm">
                "{insight.text}"
              </p>
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">Màu may mắn</span>
                  <span className="text-sm font-medium text-purple-600">{insight.luckyColor}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">Số may mắn</span>
                  <span className="text-sm font-medium text-amber-600">{insight.luckyNumber}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};