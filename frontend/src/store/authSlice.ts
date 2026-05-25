import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  language: 'vn' | 'en';
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  language: (localStorage.getItem('language') as 'vn' | 'en') || 'vn',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('token', action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    setLanguage: (state, action: PayloadAction<'vn' | 'en'>) => {
      state.language = action.payload;
      localStorage.setItem('language', action.payload);
    },
  },
});

export const { setCredentials, logout, updateUser, setLanguage } = authSlice.actions;
export default authSlice.reducer;
