import { Advisor, AdvisorCategory, AdvisorStatus } from './types';

export const ADVISORS: Advisor[] = [
  {
    id: '1',
    name: 'Cô Minh Tâm',
    avatar: 'https://picsum.photos/200/200?random=1',
    specialty: AdvisorCategory.TAROT,
    rating: 4.9,
    reviewCount: 128,
    price: 15000,
    status: AdvisorStatus.ONLINE,
    bio: 'Chuyên gia Tarot với 5 năm kinh nghiệm. Phong cách chữa lành, nhẹ nhàng nhưng thẳng thắn. Giúp bạn gỡ rối tơ lòng trong chuyện tình cảm và sự nghiệp.',
    experienceYears: 5,
    tags: ['Tình yêu', 'Chữa lành', 'Sự nghiệp'],
    reviews: [
      { id: 'r1', user: 'Lan Anh', rating: 5, comment: 'Cô xem rất đúng, giọng nói ấm áp.', date: '2023-10-15' },
      { id: 'r2', user: 'Minh Khang', rating: 4.5, comment: 'Khá chi tiết, sẽ quay lại.', date: '2023-10-10' }
    ]
  },
  {
    id: '2',
    name: 'Thầy Hữu Duyên',
    avatar: 'https://picsum.photos/200/200?random=2',
    specialty: AdvisorCategory.ASTROLOGY,
    rating: 4.8,
    reviewCount: 342,
    price: 20000,
    status: AdvisorStatus.BUSY,
    bio: 'Luận giải lá số Tử Vi trọn đời, vận hạn từng năm. Am hiểu sâu sắc về Âm Dương Ngũ Hành.',
    experienceYears: 15,
    tags: ['Tử vi trọn đời', 'Vận hạn', 'Kinh doanh'],
    reviews: [
      { id: 'r3', user: 'Đức Thịnh', rating: 5, comment: 'Thầy nói chuyện rất có tâm.', date: '2023-11-01' }
    ]
  },
  {
    id: '3',
    name: 'Master Feng',
    avatar: 'https://picsum.photos/200/200?random=3',
    specialty: AdvisorCategory.FENG_SHUI,
    rating: 5.0,
    reviewCount: 56,
    price: 30000,
    status: AdvisorStatus.ONLINE,
    bio: 'Tư vấn phong thủy nhà ở, văn phòng. Kích hoạt tài lộc, hóa giải sát khí.',
    experienceYears: 8,
    tags: ['Nhà cửa', 'Tài lộc', 'Bố trí'],
    reviews: []
  },
  {
    id: '4',
    name: 'Chị Moon',
    avatar: 'https://picsum.photos/200/200?random=4',
    specialty: AdvisorCategory.TAROT,
    rating: 4.6,
    reviewCount: 89,
    price: 12000,
    status: AdvisorStatus.OFFLINE,
    bio: 'Kết nối năng lượng vũ trụ qua từng lá bài. Chuyên trị các ca khó về crush, người yêu cũ.',
    experienceYears: 3,
    tags: ['Crush', 'Ex', 'Tâm sự'],
    reviews: []
  },
  {
    id: '5',
    name: 'Thầy Ba Chỉ',
    avatar: 'https://picsum.photos/200/200?random=5',
    specialty: AdvisorCategory.PALMISTRY,
    rating: 4.7,
    reviewCount: 210,
    price: 18000,
    status: AdvisorStatus.ONLINE,
    bio: 'Xem chỉ tay, đoán vận mệnh. Nhìn bàn tay biết ngay sướng khổ.',
    experienceYears: 20,
    tags: ['Tiền tài', 'Hậu vận', 'Sức khỏe'],
    reviews: []
  }
];

export const CATEGORIES = [
  AdvisorCategory.ALL,
  AdvisorCategory.TAROT,
  AdvisorCategory.ASTROLOGY,
  AdvisorCategory.FENG_SHUI,
  AdvisorCategory.PALMISTRY
];
