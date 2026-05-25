import { api } from './api';
import type { WalletTransaction } from '../types';

export const walletApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getWalletBalance: builder.query<{ walletBalance: number }, void>({
      query: () => '/wallet/balance',
      providesTags: ['Wallet'],
    }),
    getWalletTransactions: builder.query<WalletTransaction[], void>({
      query: () => '/wallet/transactions',
      providesTags: ['Wallet'],
    }),
    depositFunds: builder.mutation<{ walletBalance: number; transaction: WalletTransaction }, number>({
      query: (amount) => ({
        url: '/wallet/deposit',
        method: 'POST',
        body: { amount },
      }),
      invalidatesTags: ['Wallet', 'User'],
    }),
    withdrawFunds: builder.mutation<{ walletBalance: number; transaction: WalletTransaction }, number>({
      query: (amount) => ({
        url: '/wallet/withdraw',
        method: 'POST',
        body: { amount },
      }),
      invalidatesTags: ['Wallet', 'User'],
    }),
    initiateMomoDeposit: builder.mutation<{ payUrl: string; orderId: string }, number>({
      query: (amount) => ({
        url: '/wallet/deposit/momo',
        method: 'POST',
        body: { amount },
      }),
    }),
    mockConfirmMomoDeposit: builder.mutation<{ walletBalance: number; transaction: WalletTransaction }, { orderId: string; amount: number }>({
      query: (data) => ({
        url: '/wallet/deposit/momo/mock-confirm',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Wallet', 'User'],
    }),
    confirmBankDeposit: builder.mutation<{ walletBalance: number; transaction: WalletTransaction }, { amount: number; referenceCode: string }>({
      query: (data) => ({
        url: '/wallet/deposit/bank/confirm',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Wallet', 'User'],
    }),
  }),
});

export const {
  useGetWalletBalanceQuery,
  useGetWalletTransactionsQuery,
  useDepositFundsMutation,
  useWithdrawFundsMutation,
  useInitiateMomoDepositMutation,
  useMockConfirmMomoDepositMutation,
  useConfirmBankDepositMutation,
} = walletApi;
