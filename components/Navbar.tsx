import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { Moon, Sparkles, User, Menu, X, LogIn, Bell, MessageSquare, Check, Search, Home, Users, UserCheck, Newspaper, Grid, Compass, Crown, ArrowLeft } from 'lucide-react';
import { notificationService, Notification } from '../services/notificationService';
import { advisorChatService } from '../services/advisorChatService';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse search history", e);
      }
    }
  }, []);

  const handleSearch = (term: string) => {
    if (!term.trim()) return;
    const newHistory = [term, ...recentSearches.filter(t => t !== term)].slice(0, 10);
    setRecentSearches(newHistory);
    localStorage.setItem('recent_searches', JSON.stringify(newHistory));

    navigate(`/market?search=${encodeURIComponent(term)}`);
    setIsSearchOpen(false);
  };

  const removeFromHistory = (term: string) => {
    const newHistory = recentSearches.filter(t => t !== term);
    setRecentSearches(newHistory);
    localStorage.setItem('recent_searches', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('recent_searches');
  };

  // Notification State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (!user?.uid) {
      setUnreadChatCount(0);
      return;
    }

    const unsubscribe = advisorChatService.subscribeToUnreadCount(user.uid, (count) => {
      setUnreadChatCount(count);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }

    const unsubscribe = notificationService.subscribeToNotifications(user.uid, (data) => {
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleMarkAllRead = async () => {
    if (user?.uid) {
      await notificationService.markAllAsRead(user.uid);
    }
  };

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationService.markAsRead(id);
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    // Handle Firestore Timestamp or Date object or ISO string
    let date;
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  // Close notification when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isNotificationOpen && !target.closest('.notification-container')) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationOpen]);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const profile = await userService.getUserProfile(currentUser.uid);
          setUser({
            ...currentUser,
            photoURL: profile?.photoURL || currentUser.photoURL,
            role: profile?.role
          });
          setIsAdmin(profile?.role === 'admin');
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(currentUser);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Close mobile menu on route change
  const location = useLocation();
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('.mobile-menu-container') && !target.closest('.mobile-menu-button')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
    setIsUserMenuOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Hide Navbar on Login and Register pages
  if (['/login', '/register'].includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-gray-200 shadow-sm">
      {/* DESKTOP NAVBAR */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/favicon.png" alt="Logo" className="w-10 h-10 object-contain rounded-full shadow-sm" />
            <span className="text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              WeSoul
            </span>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive('/')
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                  }`}
              >
                Trang Chủ
              </Link>
              <Link
                to="/ai-divination"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive('/ai-divination')
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                  }`}
              >
                Gieo quẻ AI
              </Link>
              <Link
                to="/market"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive('/market')
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                  }`}
              >
                Cố Vấn
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-8 h-8"></div>
            ) : user ? (
              <div className="relative flex items-center gap-2">
                {/* Notification Bell */}
                <div className="relative notification-container">
                  <button
                    onClick={() => navigate('/notifications')}
                    className={`p-2 rounded-full transition-colors relative ${isActive('/notifications') ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-100 text-gray-600 hover:text-indigo-600'}`}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                  </button>
                </div>

                <div role="button" onClick={() => navigate('/messages')} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-indigo-600 transition-colors cursor-pointer relative">
                  <MessageSquare className="w-5 h-5" />
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </span>
                  )}
                </div>

                <div className="relative user-menu-container">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="p-1 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2 border border-transparent hover:border-gray-200"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                        <span className="text-sm font-bold">{user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</span>
                      </div>
                    )}
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-[200px] rounded-xl shadow-xl bg-white border border-gray-100 ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in duration-200">
                      <div className="py-2">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-bold text-gray-900 truncate" title={user.displayName || 'User'}>{user.displayName || 'User'}</p>
                          <p className="text-xs text-gray-500 truncate" title={user.email}>{user.email}</p>
                        </div>

                        <div className="py-1">
                          {isAdmin && (
                            <Link to="/admin" onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 w-full text-left font-medium">
                              Quản trị viên
                            </Link>
                          )}
                          {user.role === 'advisor' && (
                            <Link to="/advisor-dashboard" onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 w-full text-left font-medium">
                              Kênh Cố Vấn
                            </Link>
                          )}
                          <Link
                            to={`/profile/${user.uid}`}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 w-full text-left"
                          >
                            Hồ sơ cá nhân
                          </Link>
                          <Link to="/history" onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 w-full text-left">Lịch sử tư vấn</Link>
                          <Link to="/settings" onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 w-full text-left">Cài đặt</Link>
                        </div>

                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                          >
                            Đăng xuất
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link to="/login" className="text-gray-600 hover:text-indigo-600 text-sm font-medium px-3 py-2 transition-colors">
                  Đăng nhập
                </Link>
                <Link to="/register" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-md shadow-indigo-200">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE NAVBAR (Facebook Style) */}
      <div className="md:hidden">
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100 bg-white">
          {isSearchOpen ? (
            <div className="flex items-center gap-2 flex-1 animate-in slide-in-from-right duration-200">
              <button onClick={() => setIsSearchOpen(false)} className="p-2 -ml-2 text-gray-700">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="relative flex-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="Tìm kiếm..."
                  className="w-full bg-gray-100 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(e.currentTarget.value);
                    }
                  }}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2" onClick={() => navigate('/')}>
                {/* Logo Text Only - Clean like FB */}
                <span className="text-2xl font-serif font-black text-indigo-600" style={{ WebkitTextStroke: '1px currentColor' }}>
                  WeSoul
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setIsSearchOpen(true)} className="p-2 rounded-full bg-gray-100 text-black hover:bg-gray-200 transition-colors">
                  <Search className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/messages')}
                  className="p-2 rounded-full bg-gray-100 text-black hover:bg-gray-200 transition-colors relative"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white">
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Search Overlay Body */}
        {isSearchOpen && (
          <div className="fixed top-14 left-0 right-0 bottom-0 bg-white z-[60] overflow-y-auto animate-in fade-in duration-200">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-gray-900 text-lg">Gần đây</span>
                {recentSearches.length > 0 && (
                  <button onClick={clearHistory} className="text-sm font-medium text-indigo-600">Xóa tất cả</button>
                )}
              </div>

              {recentSearches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Không có tìm kiếm nào gần đây
                </div>
              ) : (
                <div className="flex flex-col">
                  {recentSearches.map((term, index) => (
                    <div key={index} className="flex items-center justify-between py-3 active:bg-gray-50 -mx-4 px-4" onClick={() => handleSearch(term)}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <div className="w-5 h-5 text-gray-500">🕒</div>
                        </div>
                        <span className="text-gray-900 font-medium truncate">{term}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromHistory(term); }}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Bar Row */}
        <div className="flex items-center justify-between px-2 h-12 bg-white border-b border-gray-200">
          {/* Home Tab */}
          <div
            onClick={() => navigate('/')}
            className={`flex-1 flex justify-center items-center h-full cursor-pointer relative ${isActive('/') ? 'text-indigo-600' : 'text-gray-500'}`}
          >
            <Compass className="w-6 h-6" />
            {isActive('/') && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>}
          </div>

          {/* Advisor Tab */}
          <div
            onClick={() => navigate('/market')}
            className={`flex-1 flex justify-center items-center h-full cursor-pointer relative ${isActive('/market') ? 'text-indigo-600' : 'text-gray-500'}`}
          >
            {/* Crown for Advisors/Masters */}
            <Crown className="w-6 h-6" />
            {isActive('/market') && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>}
          </div>

          {/* AI Divination Tab (Old Feed) */}
          <div
            onClick={() => navigate('/ai-divination')}
            className={`flex-1 flex justify-center items-center h-full cursor-pointer relative ${isActive('/ai-divination') ? 'text-indigo-600' : 'text-gray-500'}`}
          >
            <Sparkles className="w-6 h-6" />
            {isActive('/ai-divination') && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>}
          </div>

          {/* Notification Tab */}
          <div
            onClick={() => navigate('/notifications')}
            className={`flex-1 flex justify-center items-center h-full cursor-pointer relative ${isActive('/notifications') ? 'text-indigo-600' : 'text-gray-500'}`}
          >
            <div className="relative">
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full border border-white">
                  {unreadCount}
                </span>
              )}
            </div>
            {isActive('/notifications') && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>}
          </div>

          {/* Menu Tab */}
          <div
            onClick={() => setIsMobileMenuOpen(true)} // Open full screen menu
            className={`flex-1 flex justify-center items-center h-full cursor-pointer relative ${isMobileMenuOpen ? 'text-indigo-600' : 'text-gray-500'}`}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} className={`w-6 h-6 rounded-full border ${isMobileMenuOpen ? 'border-indigo-600' : 'border-gray-200'}`} alt="Menu" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
            {isMobileMenuOpen && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>}
          </div>
        </div>
      </div>

      {/* Mobile Full Screen Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-100 z-[60] overflow-y-auto animate-in slide-in-from-right duration-200 mobile-menu-container">
          <div className="sticky top-0 bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold">Menu</h2>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-full bg-gray-100"><Search className="w-5 h-5" /></button> {/* Placeholder 'Search' or Close */}
            <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-3 right-4 p-2 bg-gray-200 rounded-full"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-4">
            {/* User Profile Card */}
            {user ? (
              <div className="flex items-center gap-3 mb-6" onClick={() => { navigate(`/profile/${user.uid}`); setIsMobileMenuOpen(false); }}>
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-10 h-10 rounded-full" alt="" />
                <div>
                  <p className="font-bold text-gray-900">{user.displayName}</p>
                  <p className="text-sm text-gray-500">Xem trang cá nhân của bạn</p>
                </div>
              </div>
            ) : (
              <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <p className="mb-4 text-center font-medium">Đăng nhập để trải nghiệm đầy đủ</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }} className="py-2 rounded-lg bg-gray-100 font-bold text-sm">Đăng nhập</button>
                  <button onClick={() => { navigate('/register'); setIsMobileMenuOpen(false); }} className="py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm">Đăng ký</button>
                </div>
              </div>
            )}

            {/* Menu Shortcuts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <div className="p-2 flex flex-col gap-2">
                {user?.role === 'advisor' && (
                  <div onClick={() => { navigate('/advisor-dashboard'); setIsMobileMenuOpen(false); }} className="p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 cursor-pointer shadow-sm bg-white flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">📊</div>
                    <p className="font-medium text-sm text-gray-700">Kênh Cố Vấn</p>
                  </div>
                )}
                <div onClick={() => { navigate(`/connections?tab=followers`); setIsMobileMenuOpen(false); }} className="p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 cursor-pointer shadow-sm bg-white flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0"><Users className="w-5 h-5" /></div>
                  <p className="font-medium text-sm text-gray-700">Người theo dõi</p>
                </div>
                <div onClick={() => { navigate(`/connections?tab=following`); setIsMobileMenuOpen(false); }} className="p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 cursor-pointer shadow-sm bg-white flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><UserCheck className="w-5 h-5" /></div>
                  <p className="font-medium text-sm text-gray-700">Đang theo dõi</p>
                </div>
                <div onClick={() => { navigate('/history'); setIsMobileMenuOpen(false); }} className="p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 cursor-pointer shadow-sm bg-white flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Grid className="w-5 h-5" /></div>
                  <p className="font-medium text-sm text-gray-700">Lịch sử tư vấn</p>
                </div>
                <div onClick={() => { navigate('/settings'); setIsMobileMenuOpen(false); }} className="p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 cursor-pointer shadow-sm bg-white flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">⚙️</div>
                  <p className="font-medium text-sm text-gray-700">Cài đặt</p>
                </div>
                {isAdmin && (
                  <div onClick={() => { navigate('/admin'); setIsMobileMenuOpen(false); }} className="p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 cursor-pointer shadow-sm bg-white flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0">🛡️</div>
                    <p className="font-medium text-sm text-gray-700">Quản trị viên</p>
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleLogout} className="w-full py-3 bg-gray-200 rounded-lg font-bold text-gray-700">Đăng xuất</button>
          </div>
        </div>
      )}

    </nav>
  );
};