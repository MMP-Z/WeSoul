export enum AdvisorCategory {
  ALL = 'Tất cả',
  TAROT = 'Tarot',
  ASTROLOGY = 'Tử Vi',
  FENG_SHUI = 'Phong Thủy',
  PALMISTRY = 'Chỉ Tay'
}

export enum AdvisorStatus {
  ONLINE = 'Online',
  BUSY = 'Bận',
  OFFLINE = 'Offline'
}

export interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export interface AdvisorServiceItem {
  id: string;
  name: string;
  price: number;
}

export interface Advisor {
  id: string;
  name: string;
  avatar: string;
  specialty: AdvisorCategory;
  rating: number;
  reviewCount: number;
  price: number; // in VND
  status: AdvisorStatus;
  lastActive?: string;
  bio: string;
  experienceYears: number;
  tags: string[];
  reviews: Review[];
  phone?: string;
  zaloLink?: string;
  city?: string;
  workHours?: string;
  services?: AdvisorServiceItem[];
  type?: 'advisor' | 'store';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface DailyInsightRequest {
  birthDate: string;
}

export interface DailyInsightResponse {
  horoscope: string;
  luckyColor: string;
  luckyNumber: string;
}

export enum BookingStatus {
  PENDING = 'Chờ xác nhận',
  CONFIRMED = 'Đã đặt',
  COMPLETED = 'Hoàn thành',
  CANCELLED = 'Đã hủy'
}

export interface Booking {
  id: string;
  userId: string;
  advisorId: string;
  advisorName: string;
  advisorAvatar: string;
  date: string; // ISO string
  durationMinutes: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
  userName?: string;
  userAvatar?: string;
  note?: string;
  isReviewed?: boolean;
}

export type UserRole = 'user' | 'admin' | 'advisor';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
  lastActive?: string; // ISO String
  isBlocked?: boolean;
  following?: string[]; // Array of advisor IDs
}

export interface ChatLog {
  id: string;
  userId: string;
  userName?: string;
  message: string;
  response: string;
  timestamp: string;
  type: 'daily_insight' | 'personal_chat';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string; // Optional for UI display
  receiverId: string;
  message: string;
  timestamp: any; // Firestore Timestamp
  bookingId: string;
  isRead: boolean;
  isAdmin?: boolean; // To distinguish system messages if needed
  conversationId?: string; // For grouping messages
  image?: string;
}

export interface AdvisorPost {
  id: string;
  advisorId: string;
  advisorName: string;
  advisorAvatar: string;
  isVerified?: boolean;
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  timestamp: any; // Firestore Timestamp
  createdAt: string; // ISO String for easier display if needed
}

export interface AdvisorComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: any; // Firestore Timestamp
}