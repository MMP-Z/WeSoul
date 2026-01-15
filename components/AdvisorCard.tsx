import React from 'react';
import { Star } from 'lucide-react';
import { Advisor, AdvisorStatus } from '../types';

interface AdvisorCardProps {
  advisor: Advisor;
  onClick: (advisor: Advisor) => void;
}

export const AdvisorCard: React.FC<AdvisorCardProps> = ({ advisor, onClick }) => {
  const [_, setTick] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const getDisplayStatus = (): AdvisorStatus => {
    if (advisor.status !== AdvisorStatus.ONLINE) return advisor.status;

    if (!advisor.lastActive) return AdvisorStatus.OFFLINE;

    const diff = Date.now() - new Date(advisor.lastActive).getTime();
    return diff < 5 * 60 * 1000 ? AdvisorStatus.ONLINE : AdvisorStatus.OFFLINE;
  };

  const displayStatus = getDisplayStatus();
  const isOnline = displayStatus === AdvisorStatus.ONLINE;
  const isBusy = displayStatus === AdvisorStatus.BUSY;

  return (
    <div
      onClick={() => onClick(advisor)}
      className="bg-white rounded-xl overflow-hidden hover:transform hover:-translate-y-1 border border-gray-200 hover:border-indigo-300 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group"
    >
      <div className="p-4 flex gap-4 items-start">
        <div className="relative">
          <img
            src={advisor.avatar}
            alt={advisor.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 group-hover:border-indigo-500 transition-colors shadow-sm"
          />
          <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${isOnline ? 'bg-green-500' : isBusy ? 'bg-red-500' : 'bg-gray-400'
            }`}>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-serif font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{advisor.name}</h3>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-amber-600 text-xs font-medium border border-amber-100">
              <Star className="w-3 h-3 fill-current" />
              <span>{advisor.rating}</span>
            </div>
          </div>

          <p className="text-indigo-600 text-sm font-medium mb-1">{advisor.specialty}</p>

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <span>{advisor.experienceYears} năm KN</span>
            <span>•</span>
            <span>{advisor.reviewCount} đánh giá</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {advisor.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center mt-2 group-hover:bg-indigo-50/30 transition-colors">
        <span className="text-sm text-gray-500 font-medium">Giá tham vấn</span>
        <span className="text-indigo-700 font-bold">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(advisor.price)}/lần xem
        </span>
      </div>
    </div>
  );
};