import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Trash2, MessageSquare, CornerDownRight } from 'lucide-react';
import type { Comment } from '../types';
import type { RootState } from '../store';
import { useCreateCommentMutation, useDeleteCommentMutation } from '../store/commentApi';
import { translations } from '../utils/translation';

interface CommentSectionProps {
  illustrationId: string;
  artistId: string;
  comments: Comment[];
}

export const CommentSection = ({ illustrationId, artistId, comments }: CommentSectionProps) => {
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  const [newCommentText, setNewCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const [createComment, { isLoading: isCreating }] = useCreateCommentMutation();
  const [deleteComment, { isLoading: isDeleting }] = useDeleteCommentMutation();

  const handlePostRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isCreating) return;

    try {
      await createComment({
        illustrationId,
        content: newCommentText.trim(),
      }).unwrap();
      setNewCommentText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyText.trim() || isCreating) return;

    try {
      await createComment({
        illustrationId,
        content: replyText.trim(),
        parentCommentId: parentId,
      }).unwrap();
      setReplyText('');
      setReplyTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) {
      try {
        await deleteComment({ commentId, illustrationId }).unwrap();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Build comment trees: separate root comments from nested replies
  const rootComments = comments.filter((c) => !c.parentCommentId);
  const replies = comments.filter((c) => c.parentCommentId);

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = user && comment.userId._id === user._id;
    const isArtist = user && artistId === user._id;
    const canDelete = isOwner || isArtist;

    return (
      <div
        key={comment._id}
        style={{
          display: 'flex',
          gap: '12px',
          padding: '16px',
          borderRadius: 'var(--border-radius-sm)',
          backgroundColor: isReply ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--glass-border)',
          marginLeft: isReply ? '40px' : '0',
          position: 'relative',
          marginBottom: '12px',
        }}
      >
        {isReply && (
          <CornerDownRight
            size={16}
            style={{
              position: 'absolute',
              left: '-26px',
              top: '20px',
              color: 'var(--text-muted)',
            }}
          />
        )}

        <img
          src={comment.userId.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + comment.userId.username}
          alt={comment.userId.nickname}
          style={{
            width: isReply ? '32px' : '40px',
            height: isReply ? '32px' : '40px',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginRight: '8px' }}>
                {comment.userId.nickname}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user && !isReply && (
                <button
                  onClick={() => setReplyTarget(replyTarget === comment._id ? null : comment._id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <MessageSquare size={13} />
                  {t.reply}
                </button>
              )}

              {canDelete && (
                <button
                  disabled={isDeleting}
                  onClick={() => handleDelete(comment._id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Xóa bình luận"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {comment.content}
          </p>

          {/* Sub reply input box */}
          {replyTarget === comment._id && (
            <form
              onSubmit={(e) => handlePostReply(e, comment._id)}
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '12px',
              }}
            >
              <input
                type="text"
                className="glass-input"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Trả lời bình luận này..."
                style={{ flex: 1, height: '36px', borderRadius: '18px', padding: '0 16px', fontSize: '13px' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ height: '36px', borderRadius: '18px', fontSize: '13px', padding: '0 16px' }}
              >
                {t.send}
              </button>
            </form>
          )}

          {/* Render replies to this specific root comment */}
          {!isReply &&
            replies
              .filter((r) => r.parentCommentId === comment._id)
              .map((reply) => renderComment(reply, true))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: 'var(--text-primary)' }}>
        {t.comments} ({comments.length})
      </h3>

      {/* Main post comment text area */}
      {user ? (
        <form onSubmit={handlePostRootComment} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <textarea
            className="glass-input"
            rows={3}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={t.addComment}
            style={{
              width: '100%',
              resize: 'none',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '14px',
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ alignSelf: 'flex-end' }}
            disabled={isCreating || !newCommentText.trim()}
          >
            {t.submitComment}
          </button>
        </form>
      ) : (
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--border-radius-sm)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--glass-border)',
            textAlign: 'center',
            marginBottom: '24px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          Vui lòng <a href="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Đăng nhập</a> để bình luận.
        </div>
      )}

      {/* Renders hierarchical lists */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rootComments.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            Chưa có bình luận nào cho tác phẩm này.
          </div>
        ) : (
          rootComments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
};
