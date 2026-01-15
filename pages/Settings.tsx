import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Navbar } from '../components/Navbar';

import { updateProfile } from 'firebase/auth';
import { User, Bell, Lock, Globe, Moon, Save, Loader2, Mail, Laptop } from 'lucide-react';

export const Settings: React.FC = () => {
    const [user, setUser] = useState<any>(null);

    const navigate = useNavigate();

    // Mock states for toggles
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [pushNotifs, setPushNotifs] = useState(false);
    const [language, setLanguage] = useState('vi');

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged((currentUser) => {
            if (!currentUser) {
                navigate('/login');
            } else {
                setUser(currentUser);
            }
        });
        return () => unsubscribe();
    }, [navigate]);



    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50">


            <div className="pt-4 pb-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">Cài đặt</h1>

                <div className="grid gap-8">
                    {/* Profile Section */}


                    {/* Preferences Section */}
                    <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900">
                            <Bell className="w-5 h-5 text-amber-500" />
                            Thông báo
                        </h2>

                        <div className="space-y-4 max-w-lg">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <div className="font-medium text-gray-900">Email thông báo</div>
                                        <div className="text-sm text-gray-500">Nhận tin tức và cập nhật qua email</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEmailNotifs(!emailNotifs)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${emailNotifs ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${emailNotifs ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <Laptop className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <div className="font-medium text-gray-900">Thông báo đẩy</div>
                                        <div className="text-sm text-gray-500">Nhận thông báo trên trình duyệt</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPushNotifs(!pushNotifs)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${pushNotifs ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${pushNotifs ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* System Section */}
                    <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900">
                            <Globe className="w-5 h-5 text-blue-500" />
                            Hệ thống
                        </h2>

                        <div className="space-y-4 max-w-lg">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <div className="font-medium text-gray-900">Ngôn ngữ</div>
                                        <div className="text-sm text-gray-500">Tiếng Việt</div>
                                    </div>
                                </div>
                                <button className="text-indigo-600 text-sm font-medium hover:text-indigo-700">Thay đổi</button>
                            </div>


                        </div>
                    </section>
                </div>
            </div>


        </div>
    );
};
