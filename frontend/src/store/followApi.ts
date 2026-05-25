import { api } from './api';

export const followApi = api.injectEndpoints({
  endpoints: (builder) => ({
    checkFollowStatus: builder.query<{ followed: boolean }, string>({
      query: (artistId) => `/follows/${artistId}/status`,
      providesTags: (_result, _error, artistId) => [{ type: 'User' as const, id: `FOLLOW-${artistId}` }],
    }),
    toggleFollow: builder.mutation<{ followed: boolean; message: string }, string>({
      query: (artistId) => ({
        url: `/follows/${artistId}/toggle`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, artistId) => [
        { type: 'User', id: `FOLLOW-${artistId}` },
        'User',
      ],
    }),
  }),
});

export const { useCheckFollowStatusQuery, useToggleFollowMutation } = followApi;
