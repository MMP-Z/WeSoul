import React from 'react';
import { Sparkles } from 'lucide-react';


export const Footer: React.FC = () => {
  return (
    <footer id="about" className="bg-white border-t border-gray-100 py-3 flex flex-col items-center">
      <div className="max-w-6xl mx-auto px-4 w-full">
        <div className="flex flex-col gap-2 mb-3 items-center text-center">
          <div className="space-y-1 max-w-lg">
            <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              WeSoul
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Nền tảng kết nối tâm linh hiện đại dành cho giới trẻ Việt Nam.
              Thấu hiểu bản thân, kiến tạo tương lai.
            </p>
          </div>

          <div className="flex gap-4 text-xs text-gray-500 justify-center">
            <a href="#" className="hover:text-indigo-600 transition-colors">Điều khoản sử dụng</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Chính sách bảo mật</a>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="text-center text-xs text-gray-400">
            <p>@2026 MMP Vietnam. All rights reserved.</p>
          </div>
        </div>
      </div>

    </footer >
  );
};