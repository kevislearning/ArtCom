import { api } from './api';
import type { Comment } from '../types';

export const commentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getComments: builder.query<Comment[], string>({
      query: (illustrationId) => `/comments/illustration/${illustrationId}`,
      providesTags: (_result, _error, illustrationId) => [
        { type: 'Comment', id: `LIST-${illustrationId}` },
      ],
    }),
    createComment: builder.mutation<Comment, { illustrationId: string; content: string; parentCommentId?: string | null }>({
      query: (commentData) => ({
        url: '/comments',
        method: 'POST',
        body: commentData,
      }),
      invalidatesTags: (_result, _error, { illustrationId }) => [
        { type: 'Comment', id: `LIST-${illustrationId}` },
        { type: 'Illustration', id: illustrationId },
      ],
    }),
    deleteComment: builder.mutation<{ message: string }, { commentId: string; illustrationId: string }>({
      query: ({ commentId }) => ({
        url: `/comments/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { illustrationId }) => [
        { type: 'Comment', id: `LIST-${illustrationId}` },
        { type: 'Illustration', id: illustrationId },
      ],
    }),
  }),
});

export const {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
} = commentApi;
