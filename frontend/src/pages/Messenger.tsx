import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, MessageSquare } from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
} from '../store/chatApi';
import { useGetPublicProfileQuery } from '../store/authApi';
import { socket } from '../utils/socket';
import type { Message } from '../types';
import { getImageUrl } from '../utils/url';


export const Messenger = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  // ID của đối tác chat được chọn
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Đồng bộ hóa state từ tham số truy vấn (query) ?userId=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userIdQuery = params.get('userId');
    if (userIdQuery) {
      setActivePartnerId(userIdQuery);
    }
  }, [location]);

  // Các câu truy vấn (Queries)
  const { data: conversations = [], refetch: refetchConvos } = useGetConversationsQuery(
    undefined,
    { skip: !user }
  );

  const { data: messages = [], refetch: refetchMessages } = useGetMessagesQuery(
    activePartnerId || '',
    { skip: !activePartnerId }
  );

  const { data: partnerProfile } = useGetPublicProfileQuery(activePartnerId || '', {
    skip: !activePartnerId,
  });

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  // Tự động refetch danh sách các cuộc trò chuyện khi trang được mở
  useEffect(() => {
    if (user && location.pathname === '/messenger') {
      refetchConvos();
    }
  }, [location.pathname, user]);

  // Refetch các cuộc trò chuyện khi đối tác đang chat hoặc tin nhắn thay đổi để xóa huy hiệu chưa đọc
  useEffect(() => {
    if (user && activePartnerId) {
      refetchConvos();
    }
  }, [activePartnerId, messages, user]);




  // Các socket trigger cho nhắn tin thời gian thực
  useEffect(() => {
    const currentSocket = socket;
    if (!currentSocket) return;

    if (activePartnerId) {
      // Join vào room dành riêng cho cuộc trò chuyện đang hoạt động
      currentSocket.emit('join_chat', activePartnerId);
    }

    const handleNewMessage = (msg: Message) => {
      // Nếu tin nhắn đến là từ đối tác đang hoạt động, refetch log tin nhắn hoạt động
      if (
        activePartnerId &&
        (msg.senderId._id === activePartnerId || msg.receiverId._id === activePartnerId)
      ) {
        refetchMessages();
      }
      refetchConvos();
    };

    const handleTypingStatus = ({ senderId, isTyping }: { senderId: string; isTyping: boolean }) => {
      if (activePartnerId && senderId === activePartnerId) {
        setPartnerIsTyping(isTyping);
      }
    };

    currentSocket.on('new_message', handleNewMessage);
    currentSocket.on('typing_status', handleTypingStatus);

    return () => {
      currentSocket.off('new_message', handleNewMessage);
      currentSocket.off('typing_status', handleTypingStatus);
    };
  }, [activePartnerId, socket]);


  // Cuộn xuống dưới cùng khi có tin nhắn mới
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, partnerIsTyping]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    const currentSocket = socket;
    if (!currentSocket || !activePartnerId) return;

    // Kích hoạt socket event báo đang nhập (typing)
    if (!isTyping) {
      setIsTyping(true);
      currentSocket.emit('typing_status', { receiverId: activePartnerId, isTyping: true });
    }

    // Trì hoãn dọn dẹp trạng thái đang nhập (typing)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      currentSocket.emit('typing_status', { receiverId: activePartnerId, isTyping: false });
    }, 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || isSending || !activePartnerId) return;

    try {
      if (socket) {
        // Phát (Emit) trạng thái đang nhập: false ngay lập tức
        socket.emit('typing_status', { receiverId: activePartnerId, isTyping: false });
        setIsTyping(false);
      }

      await sendMessage({
        receiverId: activePartnerId,
        content: messageText.trim(),
      }).unwrap();

      setMessageText('');
      refetchMessages();
      refetchConvos();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="glass-panel animate-fade-in"
      style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        borderRadius: 'var(--border-radius-lg)',
        border: '1px solid var(--glass-border)',
        height: 'calc(100vh - 200px)',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      {/* 1. Cột trái: Danh sách các cuộc trò chuyện đang hoạt động */}
      <div
        style={{
          borderRight: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>{t.messenger}</h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              {t.noConversations}
            </div>
          ) : (
            conversations.map((convo) => (
              <div
                key={convo.user._id}
                onClick={() => {
                  setActivePartnerId(convo.user._id);
                  navigate(`/messenger?userId=${convo.user._id}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.01)',
                  cursor: 'pointer',
                  backgroundColor:
                    activePartnerId === convo.user._id
                      ? 'var(--bg-tertiary)'
                      : 'transparent',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseOver={(e) => {
                  if (activePartnerId !== convo.user._id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                  }
                }}
                onMouseOut={(e) => {
                  if (activePartnerId !== convo.user._id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <img
                  src={getImageUrl(convo.user.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + convo.user.username}
                  alt={convo.user.nickname}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      {convo.user.nickname}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {new Date(convo.lastMessage.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {convo.lastMessage.content}
                  </p>
                </div>

                {convo.unreadCount > 0 && (
                  <span
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      borderRadius: '50%',
                      fontSize: '10px',
                      fontWeight: 800,
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 8px var(--primary-glow)',
                    }}
                  >
                    {convo.unreadCount}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Cột phải: Phòng chat đang hoạt động */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: 'var(--bg-primary)',
          minHeight: 0,
        }}
      >
        {activePartnerId && partnerProfile ? (
          <>
            {/* Header: Chi tiết đối tác */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 32px',
                borderBottom: '1px solid var(--glass-border)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <div
                onClick={() => navigate(`/portfolio/${partnerProfile._id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              >
                <img
                  src={getImageUrl(partnerProfile.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + partnerProfile.username}
                  alt={partnerProfile.nickname}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700 }}>{partnerProfile.nickname}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{partnerProfile.username}</span>
                </div>
              </div>
            </div>

            {/* Logs dòng chảy tin nhắn (Messaging Streams) */}
            <div
              ref={messagesContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                minHeight: 0,
              }}
            >
              {messages.map((msg) => {
                const isSentByMe = msg.senderId._id === user?._id;

                return (
                  <div
                    key={msg._id}
                    style={{
                      display: 'flex',
                      justifyContent: isSentByMe ? 'flex-end' : 'flex-start',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '60%',
                        borderRadius: 'var(--border-radius-sm)',
                        padding: '12px 18px',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        backgroundColor: isSentByMe ? 'var(--primary)' : 'var(--bg-secondary)',
                        color: isSentByMe ? '#ffffff' : 'var(--text-primary)',
                        border: isSentByMe ? 'none' : '1px solid var(--glass-border)',
                        boxShadow: isSentByMe ? '0 4px 12px var(--primary-glow)' : 'var(--card-shadow)',
                      }}
                    >
                      <p style={{ margin: 0 }}>{msg.content}</p>
                      <span
                        style={{
                          fontSize: '10px',
                          color: isSentByMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                          display: 'block',
                          textAlign: 'right',
                          marginTop: '6px',
                        }}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Trạng thái chỉ báo đang nhập (typing) của đối tác */}
              {partnerIsTyping && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-muted)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {partnerProfile.nickname} {t.typing}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chân trang vùng nhập văn bản nhắn tin */}
            <form
              onSubmit={handleSend}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '20px 32px',
                backgroundColor: 'var(--bg-secondary)',
                borderTop: '1px solid var(--glass-border)',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                className="glass-input"
                value={messageText}
                onChange={handleMessageChange}
                placeholder={t.chatPlaceholder}
                style={{ flex: 1, height: '44px', borderRadius: '22px', padding: '0 20px' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ borderRadius: '50%', width: '44px', height: '44px', padding: 0 }}
                disabled={isSending || !messageText.trim()}
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-muted)' }}>
            <MessageSquare size={48} style={{ color: 'var(--glass-border)' }} />
            <p style={{ fontSize: '15px' }}>Chọn một người dùng hoặc đối tác để bắt đầu cuộc trò chuyện.</p>
          </div>
        )}
      </div>
    </div>
  );
};
