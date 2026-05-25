import { api } from './api';
import type { Message, Conversation } from '../types';

export const chatApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query<Conversation[], void>({
      query: () => '/messages/conversations',
      providesTags: ['Chat'],
    }),
    getMessages: builder.query<Message[], string>({
      query: (userId) => `/messages/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: 'Chat', id: userId }],
    }),
    sendMessage: builder.mutation<Message, { receiverId: string; content: string }>({
      query: (data) => ({
        url: '/messages',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { receiverId }) => [
        'Chat',
        { type: 'Chat', id: receiverId },
      ],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
} = chatApi;
