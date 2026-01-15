import React, { useState, useEffect } from 'react';
import { AdvisorCard } from './AdvisorCard';
import { Advisor, AdvisorCategory } from '../types';
import { CATEGORIES } from '../constants';
import { Filter } from 'lucide-react';
import { advisorService } from '../services/advisorService.ts';

interface AdvisorGridProps {
  onSelectAdvisor: (advisor: Advisor) => void;
  limit?: number; // Optional limit for preview mode
}

export const AdvisorGrid: React.FC<AdvisorGridProps> = ({ onSelectAdvisor, limit }) => {
  const [activeCategory, setActiveCategory] = useState<AdvisorCategory>(AdvisorCategory.ALL);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerTarget = React.useRef<HTMLDivElement>(null);

  const fetchAdvisors = async (isInitial = false, category = activeCategory) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsFetchingMore(true);
      }

      // If limit is provided (Preview mode), just fetch that amount once
      const fetchLimit = limit || 10;

      const result = await advisorService.getAdvisors(
        fetchLimit,
        isInitial ? null : lastDoc,
        category
      );

      if (isInitial) {
        setAdvisors(result.advisors);
        setHasMore(!limit && result.advisors.length === fetchLimit);
      } else {
        setAdvisors(prev => [...prev, ...result.advisors]);
        setHasMore(!limit && result.advisors.length === fetchLimit);
      }

      setLastDoc(result.lastDoc);

    } catch (error) {
      console.error("Error fetching advisors:", error);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  // Initial load or Category change
  useEffect(() => {
    setAdvisors([]);
    setLastDoc(null);
    setHasMore(true);
    fetchAdvisors(true, activeCategory);
  }, [activeCategory, limit]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (limit) return; // Disable infinite scroll for preview mode

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !isFetchingMore) {
          fetchAdvisors();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, isFetchingMore, lastDoc, limit, activeCategory]);

  return (
    <section id="market" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">Cố Vấn</h2>
          <p className="text-gray-600">Kết nối với những chuyên gia hàng đầu</p>
        </div>

        <div className="flex overflow-x-auto gap-2 w-full md:w-auto no-scrollbar scroll-smooth">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all border shrink-0 ${activeCategory === cat
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && advisors.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-500">Đang tải danh sách...</p>
          </div>
        ) : (
          advisors.map(advisor => (
            <AdvisorCard
              key={advisor.id}
              advisor={advisor}
              onClick={onSelectAdvisor}
            />
          ))
        )}
      </div>

      {
        advisors.length === 0 && !loading && (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
            <p className="text-gray-500">Chưa tìm thấy Cố vấn phù hợp trong danh mục này.</p>
          </div>
        )
      }

      {/* Infinite Scroll Trigger */}
      {!limit && (
        <div ref={observerTarget} className="h-10 flex justify-center items-center mt-8 w-full">
          {isFetchingMore && <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>}
        </div>
      )}

      {/* View More Button (Only if limit is applied and there might be more - naive check or just link to market) */}
      {/* Since we don't know total count easily, just show button if limit is set */}
      {limit && (
        <div className="mt-12 text-center">
          <a
            href="/market"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-full text-indigo-600 font-medium transition-all hover:scale-105 group shadow-sm"
          >
            Xem tất cả Cố vấn
            <Filter className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          </a>
        </div>
      )}
    </section >
  );
};