import { api } from './api';
import type { Commission } from '../types';

export const commissionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getClientCommissions: builder.query<Commission[], void>({
      query: () => '/commissions/client',
      providesTags: ['Commission'],
    }),
    getArtistCommissions: builder.query<Commission[], void>({
      query: () => '/commissions/artist',
      providesTags: ['Commission'],
    }),
    getCommissionById: builder.query<Commission, string>({
      query: (id) => `/commissions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Commission', id }],
    }),
    createCommission: builder.mutation<
      Commission,
      { artistId: string; title: string; description: string; price: number; deadline: string; isPrivate: boolean }
    >({
      query: (data) => ({
        url: '/commissions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Commission', 'Wallet'],
    }),
    acceptCommission: builder.mutation<Commission, string>({
      query: (id) => ({
        url: `/commissions/${id}/accept`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Commission', id }, 'Commission'],
    }),
    rejectCommission: builder.mutation<Commission, string>({
      query: (id) => ({
        url: `/commissions/${id}/reject`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Commission', id }, 'Commission', 'Wallet'],
    }),
    cancelCommission: builder.mutation<Commission, string>({
      query: (id) => ({
        url: `/commissions/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Commission', id }, 'Commission', 'Wallet'],
    }),
    completeCommission: builder.mutation<Commission, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({
        url: `/commissions/${id}/complete`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Commission', id }, 'Commission', 'Wallet', 'Illustration'],
    }),
  }),
});

export const {
  useGetClientCommissionsQuery,
  useGetArtistCommissionsQuery,
  useGetCommissionByIdQuery,
  useCreateCommissionMutation,
  useAcceptCommissionMutation,
  useRejectCommissionMutation,
  useCancelCommissionMutation,
  useCompleteCommissionMutation,
} = commissionApi;
