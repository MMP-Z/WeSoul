import React, { useState } from 'react';
import { Sparkles, Calendar, Clock, User, ArrowRight, Loader2 } from 'lucide-react';

export const AIDivination: React.FC = () => {
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [gender, setGender] = useState('nam');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleAnalyze = (e: React.FormEvent) => {
        e.preventDefault();
        if (!birthDate || !birthTime) return;

        setLoading(true);
        setResult(null);

        // Simulate AI Analysis Delay
        setTimeout(() => {
            setLoading(false);
            const generatedText = `
**LUẬN GIẢI TỬ VI TỔNG QUAN**

Chào bạn, dựa trên ngày sinh **${birthDate}** và giờ sinh **${birthTime}**, AI xin gửi đến bạn bản luận giải sơ lược:

**1. Mệnh cách và Tính cách:**
Bạn là người có tư duy sắc bén và trực giác nhạy bén. Cục diện lá số cho thấy sự kiên định trong mục tiêu nhưng đôi khi hơi bảo thủ. Bạn có khả năng lãnh đạo tiềm ẩn và thường là chỗ dựa tinh thần cho người khác.

**2. Tài lộc và Sự nghiệp:**
Đường tài lộc của bạn khá rộng mở, tuy nhiên cần chú ý quản lý chi tiêu vào giai đoạn trung vận. Công việc phù hợp nhất với bạn liên quan đến quản lý, kỹ thuật hoặc các lĩnh vực đòi hỏi sự tỉ mỉ. Năm nay là thời điểm tốt để khởi động các dự án mới.

**3. Tình duyên và Gia đạo:**
Chuyện tình cảm có thể đến muộn nhưng bền vững. Bạn cần học cách chia sẻ và lắng nghe đối phương nhiều hơn để tránh những hiểu lầm không đáng có. 

**Lời khuyên từ vũ trụ:**
"Hãy tin vào trực giác của mình, nhưng đừng quên kiểm chứng bằng thực tế. Cơ hội đang ở ngay trước mắt, hãy nắm bắt lấy!"

*Lưu ý: Đây là kết quả phỏng đoán từ AI dựa trên dữ liệu mẫu. Để có kết quả chính xác hơn, bạn có thể trò chuyện sâu hơn hoặc tìm chuyên gia.*
            `;

            // Simulate Streaming Effect
            let i = 0;
            setResult('');
            const streamInterval = setInterval(() => {
                setResult(prev => generatedText.slice(0, i));
                i += 5; // Speed of typing
                if (i > generatedText.length) {
                    clearInterval(streamInterval);
                    setResult(generatedText); // Ensure full text at end
                }
            }, 10);

        }, 2000);
    };

    return (
        <div className="min-h-[calc(100vh-7rem)] md:min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-2xl mb-6 shadow-sm">
                        <Sparkles className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900 mb-3">
                        Luận Giải Tử Vi AI
                    </h1>
                    <p className="text-slate-500 text-lg">
                        Nhập thông tin ngày giờ sinh để AI phân tích vận mệnh của bạn.
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 overflow-hidden relative">
                    {/* Decorative Blob */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>

                    <form onSubmit={handleAnalyze} className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-500" /> Ngày tháng năm sinh
                            </label>
                            <input
                                type="date"
                                required
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-500" /> Giờ sinh
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={birthTime}
                                    onChange={(e) => setBirthTime(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                    <User className="w-4 h-4 text-indigo-500" /> Giới tính
                                </label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none"
                                >
                                    <option value="nam">Nam</option>
                                    <option value="nu">Nữ</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    AI đang phân tích...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                                    {result ? 'Luận giải lại' : 'Bắt đầu luận giải'}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Result Section */}
                {result && (
                    <div className="mt-8 bg-white rounded-3xl shadow-xl shadow-indigo-200/50 border border-indigo-100 p-8 animate-fade-in-up">
                        <div className="flex items-center gap-3 mb-6 border-b border-indigo-50 pb-4">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Sparkles className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Kết quả phân tích</h2>
                        </div>
                        <div className="prose prose-indigo max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
                            {result}
                        </div>
                        <div className="mt-8 pt-6 border-t border-indigo-50 flex justify-center">
                            <button className="px-6 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors">
                                Sao chép kết quả
                            </button>
                        </div>
                    </div>
                )}

                {!result && (
                    <p className="text-center text-slate-400 text-sm mt-8">
                        Kết quả phân tích dựa trên dữ liệu lá số Tử Vi.
                    </p>
                )}
            </div>
        </div>
    );
};
