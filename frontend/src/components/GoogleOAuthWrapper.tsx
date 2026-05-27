import React from 'react';
import { useSelector } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { RootState } from '../store';

interface GoogleOAuthWrapperProps {
  children: React.ReactNode;
}

export const GoogleOAuthWrapper = ({ children }: GoogleOAuthWrapperProps) => {
  const { language } = useSelector((state: RootState) => state.auth);
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';

  // Google Identity Services (GIS) yêu cầu các mã tiêu chuẩn BCP-47 locale
  // Ánh xạ 'vn' nội bộ của chúng ta thành 'vi' cho Google, giữ nguyên 'en'.
  const googleLocale = language === 'vn' ? 'vi' : 'en';

  return (
    <GoogleOAuthProvider clientId={googleClientId} locale={googleLocale}>
      {children}
    </GoogleOAuthProvider>
  );
};
