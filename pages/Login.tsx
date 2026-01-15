import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { Mail, Lock, Loader2, ArrowRight, Moon } from 'lucide-react';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await authService.login(email, password);
            // Check for admin role
            const profile = await userService.getUserProfile(user.uid);
            if (profile?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (error: any) {
            console.error(error);
            setError('Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const user = await authService.loginWithGoogle();
            // Check for admin role
            const profile = await userService.getUserProfile(user.uid);
            if (profile?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (error: any) {
            console.error(error);
            setError('Đăng nhập Google thất bại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left Side - Hero Image */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-900">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-purple-900/90 mix-blend-multiply z-10" />
                <img
                    src="https://images.unsplash.com/photo-1655648856869-703a55ca3364?q=80&w=2670&auto=format&fit=crop"
                    alt="Spiritual Background"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                <div className="relative z-20 flex flex-col justify-center px-12 text-white">
                    <div className="mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center mb-6 shadow-2xl border border-white/10">
                            <Moon className="w-8 h-8 text-indigo-100" />
                        </div>
                        <h1 className="text-5xl font-bold font-serif mb-6 leading-tight">
                            Khám phá <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200">
                                Định mệnh của bạn
                            </span>
                        </h1>
                        <p className="text-lg text-indigo-100/80 leading-relaxed max-w-md">
                            Kết nối với những cố vấn tâm linh hàng đầu và tìm kiếm câu trả lời cho những băn khoăn của cuộc đời.
                        </p>
                    </div>

                    <div className="flex gap-4 mt-8">
                        <div className="flex -space-x-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-900 bg-indigo-800 overflow-hidden">
                                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-sm font-bold text-white">1000+ Cố vấn</p>
                            <p className="text-xs text-indigo-200">Đã tham gia cùng chúng tôi</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-gray-900">Chào mừng trở lại</h2>
                        <p className="text-gray-500 mt-2">Nhập thông tin đăng nhập của bạn để tiếp tục</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
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

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="flex justify-end mt-2">
                                    <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                                        Quên mật khẩu?
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng nhập'}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">Hoặc tiếp tục với</span>
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
                            Đăng nhập bằng Google
                        </button>
                    </form>

                    <div className="text-center">
                        <p className="text-sm text-gray-500">
                            Chưa có tài khoản?{' '}
                            <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                                Đăng ký ngay
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
