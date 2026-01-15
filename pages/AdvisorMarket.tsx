import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AdvisorCard } from '../components/AdvisorCard';
import { Advisor, AdvisorCategory } from '../types';
import { CATEGORIES } from '../constants';
import { Search, Filter, Home } from 'lucide-react';
import { advisorService } from '../services/advisorService';
import { AdvisorModal } from '../components/AdvisorModal';
import { Navbar } from '../components/Navbar';

import { Link, useNavigate } from 'react-router-dom';

export const AdvisorMarket: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<AdvisorCategory>(AdvisorCategory.ALL);
    const [advisors, setAdvisors] = useState<Advisor[]>([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialSearch = queryParams.get('search') || '';
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        setSearchTerm(initialSearch);
    }, [initialSearch]);

    useEffect(() => {
        const fetchAdvisors = async () => {
            setLoading(true);
            const data = await advisorService.getAllAdvisors();
            // Filter out unapproved if needed, though getAllAdvisors usually fetches all. 
            // Ideally we should filter for status != OFF but for now showing all is fine or filter mainly approved.
            // Let's assume getAllAdvisors returns what we want, but we should probably filter for 'approved' in a real app.
            // For now, client side filter for display.
            const approved = data.filter(a => a.approvalStatus === 'approved' || !a.approvalStatus);
            setAdvisors(approved);
            setLoading(false);
        };

        fetchAdvisors();
        window.scrollTo(0, 0);
    }, []);

    const filteredAdvisors = advisors.filter(adv => {
        const matchesCategory = activeCategory === AdvisorCategory.ALL || adv.specialty === activeCategory;
        const matchesSearch = adv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adv.bio.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adv.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-slate-50">

            <main className="pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-left px-4 md:px-0 mt-4">

                    <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 inline-block">
                        Cố Vấn
                    </h1>
                    <p className="text-gray-600 max-w-2xl text-lg">
                        Kết nối với các chuyên gia Tarot, Tử Vi, Phong Thủy hàng đầu để giải đáp những thắc mắc của bạn.
                    </p>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 sticky top-20 z-30 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50">
                    {/* Cross-Search Toggle */}
                    {searchTerm && (
                        <div className="mb-6">
                            <button
                                onClick={() => navigate(`/?search=${encodeURIComponent(searchTerm)}`)}
                                className="w-full md:w-auto px-4 py-2 bg-white border border-indigo-100 text-indigo-600 font-medium rounded-xl text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Search className="w-4 h-4" />
                                Tìm "{searchTerm}" bên Bảng tin (Bài viết)
                            </button>
                        </div>
                    )}

                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên, lĩnh vực, từ khóa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>

                    <div className="flex overflow-x-auto gap-2 py-1 no-scrollbar md:py-0 items-center">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`whitespace-nowrap px-4 py-3 rounded-xl text-sm font-medium transition-all border shrink-0 flex items-center gap-2 ${activeCategory === cat
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                            >
                                {cat === AdvisorCategory.ALL && <Filter className="w-4 h-4" />}
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="animate-spin inline-block w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                        <p className="text-gray-500 animate-pulse">Đang tải danh sách Cố vấn...</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
                            <span>Hiển thị <strong>{filteredAdvisors.length}</strong> kết quả</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAdvisors.map(advisor => (
                                <AdvisorCard
                                    key={advisor.id}
                                    advisor={advisor}
                                    onClick={(adv) => navigate(`/profile/${adv.id}`)}
                                />
                            ))}
                        </div>

                        {filteredAdvisors.length === 0 && (
                            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
                                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-700 mb-2">Không tìm thấy kết quả</h3>
                                <p className="text-gray-500">Hãy thử thay đổi từ khóa tìm kiếm hoặc danh mục.</p>
                                <button
                                    onClick={() => { setSearchTerm(''); setActiveCategory(AdvisorCategory.ALL) }}
                                    className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>



            <AdvisorModal
                advisor={selectedAdvisor}
                onClose={() => setSelectedAdvisor(null)}
            />
        </div>
    );
};
