import { api } from './api';
import type { Illustration } from '../types';

export const illustrationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getIllustrations: builder.query<
      Illustration[],
      { sort?: string; tag?: string; search?: string; artistId?: string; period?: string }
    >({
      query: (params) => ({
        url: '/illustrations',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Illustration' as const, id: _id })),
              { type: 'Illustration', id: 'LIST' },
            ]
          : [{ type: 'Illustration', id: 'LIST' }],
    }),
    getTrendingTags: builder.query<{ _id: string; count: number }[], void>({
      query: () => '/illustrations/trending-tags',
    }),
    getFollowedFeed: builder.query<Illustration[], void>({
      query: () => '/illustrations/followed',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Illustration' as const, id: _id })),
              { type: 'Illustration', id: 'FOLLOWED_LIST' },
              'User',
            ]
          : [{ type: 'Illustration', id: 'FOLLOWED_LIST' }, 'User'],
    }),
    getIllustrationById: builder.query<Illustration, string>({
      query: (id) => `/illustrations/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Illustration', id }],
    }),
    createIllustration: builder.mutation<Illustration, FormData>({
      query: (formData) => ({
        url: '/illustrations',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'Illustration', id: 'LIST' }],
    }),
    deleteIllustration: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/illustrations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Illustration', id: 'LIST' }],
    }),
    toggleLike: builder.mutation<{ liked: boolean; likesCount: number }, string>({
      query: (id) => ({
        url: `/illustrations/${id}/like`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Illustration', id },
        { type: 'User' },
      ],
    }),
    toggleBookmark: builder.mutation<{ bookmarked: boolean; bookmarksCount: number }, string>({
      query: (id) => ({
        url: `/illustrations/${id}/bookmark`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Illustration', id },
        { type: 'User' },
      ],
    }),
    getBookmarkedIllustrations: builder.query<Illustration[], void>({
      query: () => '/illustrations/feed/bookmarks',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Illustration' as const, id: _id })),
              { type: 'Illustration', id: 'BOOKMARKS_LIST' },
              'User',
            ]
          : [{ type: 'Illustration', id: 'BOOKMARKS_LIST' }, 'User'],
    }),
    updateIllustration: builder.mutation<
      Illustration,
      {
        id: string;
        title?: string;
        description?: string;
        tags?: string | string[];
        visibility?: string;
        commentsEnabled?: boolean;
      }
    >({
      query: ({ id, ...data }) => ({
        url: `/illustrations/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Illustration', id },
        { type: 'Illustration', id: 'LIST' },
      ],
    }),
    searchTags: builder.query<{ _id: string; count: number }[], string>({
      query: (search) => `/illustrations/tags/search?search=${encodeURIComponent(search)}`,
    }),
  }),
});

export const {
  useGetIllustrationsQuery,
  useGetTrendingTagsQuery,
  useGetFollowedFeedQuery,
  useGetIllustrationByIdQuery,
  useCreateIllustrationMutation,
  useDeleteIllustrationMutation,
  useToggleLikeMutation,
  useToggleBookmarkMutation,
  useGetBookmarkedIllustrationsQuery,
  useUpdateIllustrationMutation,
  useSearchTagsQuery,
} = illustrationApi;
