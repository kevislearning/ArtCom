import { useState } from 'react';
import { Trophy, CalendarDays, Award } from 'lucide-react';
import { useGetIllustrationsQuery } from '../store/illustrationApi';
import { ArtworkCard } from '../components/ArtworkCard';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { translations } from '../utils/translation';

export const Rankings = () => {
  const { language } = useSelector((state: RootState) => state.auth);
  const t = language === 'en' ? translations.en : translations.vn;

  // State for ranking period
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');

  // Query popular illustrations by time period
  const { data: artworks = [], isLoading } = useGetIllustrationsQuery({
    sort: 'popular',
    period: period,
  });

  const getPeriodLabel = (p: 'day' | 'week' | 'month' | 'year', lang: 'vn' | 'en') => {
    if (p === 'day') return lang === 'en' ? 'Today' : 'Hôm nay';
    if (p === 'week') return lang === 'en' ? 'Weekly' : 'Tuần này';
    if (p === 'month') return lang === 'en' ? 'Monthly' : 'Tháng này';
    return lang === 'en' ? 'Yearly' : 'Năm nay';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Header section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Trophy size={28} style={{ color: 'var(--warning)', filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))' }} />
            {language === 'vn' ? 'Bảng xếp hạng tác phẩm' : 'Art Rankings'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {language === 'vn'
              ? 'Khám phá các tác phẩm được yêu thích nhất trong cộng đồng được xếp hạng theo thời gian thực.'
              : 'Discover the most loved artworks in the community ranked in real-time.'}
          </p>
        </div>

        {/* Time period filter tabs */}
        <div
          className="glass-panel"
          style={{
            display: 'flex',
            padding: '4px',
            borderRadius: '24px',
            border: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          {(['day', 'week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: period === p ? 'var(--primary)' : 'transparent',
                color: period === p ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <CalendarDays size={13} />
              {getPeriodLabel(p, language)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Results */}
      {isLoading ? (
        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>
      ) : artworks.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '64px 32px',
            textAlign: 'center',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            background: 'var(--glass-bg)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--warning)',
            }}
          >
            <Award size={32} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {language === 'vn' ? 'Chưa có tác phẩm nào lọt top' : 'No ranked artworks yet'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: '1.6' }}>
            {language === 'vn'
              ? 'Trong thời gian này chưa phát sinh tương tác hoặc không tìm thấy bài viết nào hiển thị. Hãy cùng tương tác thật nhiều để vinh danh tác phẩm nhé!'
              : 'There are no active interactions in this period. Interact with artworks to feature them on the leaderboard!'}
          </p>
        </div>
      ) : (
        <div className="masonry-grid animate-fade-in">
          {artworks.map((artwork, index) => (
            <ArtworkCard key={artwork._id} artwork={artwork} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
