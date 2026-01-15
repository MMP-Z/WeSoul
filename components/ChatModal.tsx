import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Loader2 } from 'lucide-react';
import { advisorChatService } from '../services/advisorChatService';
import { ChatMessage, Advisor, Booking } from '../types';
import { authService } from '../services/authService';

interface ChatModalProps {
    booking: Booking;
    onClose: () => void;
    advisorName: string;
    advisorAvatar: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({ booking, onClose, advisorName, advisorAvatar }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const currentUser = authService.auth.currentUser;

    useEffect(() => {
        if (!booking.id) return;

        const unsubscribe = advisorChatService.subscribeToMessages(booking.id, (msgs) => {
            setMessages(msgs);
            setLoading(false);
            // Mark incoming messages as read if they are for the current user
            if (currentUser) {
                msgs.forEach(msg => {
                    if (msg.receiverId === currentUser.uid && !msg.isRead) {
                        advisorChatService.markAsRead(msg.id);
                    }
                });
            }
        });

        return () => unsubscribe();
    }, [booking.id, currentUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser) return;

        try {
            await advisorChatService.sendMessage({
                senderId: currentUser.uid,
                senderName: currentUser.displayName || 'User',
                receiverId: booking.advisorId,
                message: newMessage.trim(),
                bookingId: booking.id,
            });
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

            <div className="glass-modal w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative flex flex-col h-[600px] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0f172a]/95 z-10">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img src={advisorAvatar} alt={advisorName} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0f172a]"></div>
                        </div>
                        <div>
                            <h3 className="text-white font-serif font-bold">{advisorName}</h3>
                            <p className="text-xs text-green-400 flex items-center gap-1">Online</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#020617]/50">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                            <p>Bắt đầu cuộc trò chuyện với {advisorName}</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.senderId === currentUser?.uid;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white/10 text-gray-200 rounded-bl-none border border-white/5'
                                        }`}>
                                        <p>{msg.message}</p>
                                        <span className={`text-[10px] block mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-gray-500'}`}>
                                            {msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-[#0f172a] border-t border-white/10">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-indigo-500 placeholder-gray-500 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
