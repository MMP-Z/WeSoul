import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Moon, Sparkles, Loader2 } from 'lucide-react';

export const Register: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Mật khẩu nhập lại không khớp.');
            return;
        }

        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }

        setLoading(true);

        try {
            await authService.register(email, password, name);
            // Optional: Show success message or auto-login
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError('Đăng ký thất bại. Email có thể đã được sử dụng.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await authService.loginWithGoogle();
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError('Đăng nhập Google thất bại.');
        }
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left Side - Hero Image */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-900">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-purple-900/90 mix-blend-multiply z-10" />
                <img
                    src="https://images.unsplash.com/photo-1532012117238-d98ef01d8480?q=80&w=2574&auto=format&fit=crop"
                    alt="Spiritual Background"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                <div className="relative z-20 flex flex-col justify-center px-12 text-white">
                    <div className="mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center mb-6 shadow-2xl border border-white/10">
                            <Sparkles className="w-8 h-8 text-amber-200" />
                        </div>
                        <h1 className="text-5xl font-bold font-serif mb-6 leading-tight">
                            Bắt đầu <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-200">
                                Hành trình mới
                            </span>
                        </h1>
                        <p className="text-lg text-indigo-100/80 leading-relaxed max-w-md">
                            Tạo tài khoản ngay hôm nay để khám phá bản đồ sao, kết nối với cố vấn và làm chủ vận mệnh của bạn.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-8">
                        <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                            <h3 className="font-bold text-white mb-1">Cộng đồng</h3>
                            <p className="text-xs text-indigo-200">Hàng ngàn thành viên tích cực</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                            <h3 className="font-bold text-white mb-1">Tin cậy</h3>
                            <p className="text-xs text-indigo-200">Bảo mật thông tin tuyệt đối</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-gray-900">Tạo tài khoản mới</h2>
                        <p className="text-gray-500 mt-2">Điền thông tin bên dưới để bắt đầu</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-3">
                                <div className="p-0.5 rounded-full bg-red-100">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ tên</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                                placeholder="Nguyễn Văn A"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                                placeholder="Ít nhất 6 ký tự"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nhập lại mật khẩu</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                                placeholder="Khớp với mật khẩu trên"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng ký tài khoản'}
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">Hoặc đăng ký với</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all text-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 4.6c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Google
                        </button>
                    </form>

                    <div className="text-center">
                        <p className="text-sm text-gray-500">
                            Đã có tài khoản?{' '}
                            <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                                Đăng nhập ngay
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
