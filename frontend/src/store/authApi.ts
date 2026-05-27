import { api } from './api';
import type { User } from '../types';

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<User & { token: string }, any>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    googleLogin: builder.mutation<User & { token: string }, { credential: string }>({
      query: (body) => ({
        url: '/auth/google',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    register: builder.mutation<User & { token: string }, any>({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User', 'Wallet', 'Chat', 'Notification'],
    }),
    getPublicProfile: builder.query<User, string>({
      query: (id) => `/auth/profile/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),
    updateProfile: builder.mutation<User, FormData>({
      query: (formData) => ({
        url: '/auth/update',
        method: 'PUT',
        body: formData,
      }),
      invalidatesTags: (result) => ['User', { type: 'User', id: result?._id }],
    }),
    getRecommendedArtists: builder.query<User[], void>({
      query: () => '/auth/artists/recommended',
      providesTags: ['User'],
    }),
    changePassword: builder.mutation<{ message: string }, any>({
      query: (data) => ({
        url: '/auth/change-password',
        method: 'PUT',
        body: data,
      }),
    }),
    updateRequestTerms: builder.mutation<User, FormData>({
      query: (formData) => ({
        url: '/auth/request-terms',
        method: 'PUT',
        body: formData,
      }),
      invalidatesTags: (result) => ['User', { type: 'User', id: result?._id }],
    }),
    deleteRequestTerms: builder.mutation<User, void>({
      query: () => ({
        url: '/auth/request-terms',
        method: 'DELETE',
      }),
      invalidatesTags: (result) => ['User', { type: 'User', id: result?._id }],
    }),
    searchUsers: builder.query<any[], string>({
      query: (search) => `/auth/search?search=${encodeURIComponent(search)}`,
      providesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useGoogleLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetPublicProfileQuery,
  useUpdateProfileMutation,
  useGetRecommendedArtistsQuery,
  useChangePasswordMutation,
  useUpdateRequestTermsMutation,
  useDeleteRequestTermsMutation,
  useSearchUsersQuery,
} = authApi;
