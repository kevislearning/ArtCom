export interface RequestTerms {
  title: string;
  details: string;
  targetPrice: number;
  backgroundUrl: string;
  hasTerms: boolean;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  nickname: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  isArtist: boolean;
  requestTerms?: RequestTerms;
  walletBalance: number;
  socialLinks?: {
    twitter?: string;
    behance?: string;
    artstation?: string;
  };
  website?: {
    value: string;
    isPublic: boolean;
  };
  customSocialLinks?: Array<{
    platform: string;
    username: string;
    isPublic: boolean;
  }>;
  gender?: {
    value: 'male' | 'female' | 'other';
    isPublic: boolean;
  };
  country?: {
    value: string;
    isPublic: boolean;
  };
  birthday?: {
    value: string | null;
    isPublic: boolean;
  };
  occupation?: {
    value: string;
    isPublic: boolean;
  };
  totalViews?: number;
  totalLikes?: number;
  totalBookmarks?: number;
  totalComments?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Illustration {
  _id: string;
  artistId: User | string;
  title: string;
  description: string;
  imageUrls: string[];
  tags: string[];
  visibility: 'everyone' | 'private' | 'logged_in';
  commentsEnabled: boolean;
  viewsCount: number;
  likesCount: number;
  bookmarksCount: number;
  commentsCount: number;
  isAIGenerated?: boolean;
  aiDetectionResult?: {
    isAIDetected: boolean;
    aiProbability: number;
  };
  liked?: boolean;
  bookmarked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  illustrationId: string;
  userId: User;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Commission {
  _id: string;
  clientId: User | string;
  artistId: User | string;
  title: string;
  description: string;
  price: number;
  deadline: string;
  paymentStatus: 'unpaid' | 'escrow' | 'paid_to_artist' | 'refunded';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'canceled' | 'rejected';
  resultIllustrationId?: Illustration | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  senderId: User;
  receiverId: User;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  recipientId: string;
  actorId: User | null;
  type: 'new_illustration' | 'like' | 'bookmark' | 'follow' | 'comment' | 'reply' | 'commission_update' | 'message';
  targetId: string | null;
  targetModel: 'Illustration' | 'Commission' | 'Comment' | 'Message' | null;
  contentPreview: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  _id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdraw' | 'escrow_hold' | 'escrow_release' | 'escrow_refund';
  referenceId?: Commission | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  user: User;
  lastMessage: Message;
  unreadCount: number;
}
