export type UserLite = {
  id: number;
  username: string;
  email: string;
};

export type Friend = UserLite;

export type FriendRequest = {
  id: number;
  from_user: UserLite;
  to_user: UserLite;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  created_at: string;
  responded_at: string | null;
};

export type Conversation = {
  id: number;
  type: "dm";
  created_at: string;
  participants: { user_id: number; joined_at: string }[];
};

export type GetOrCreateDMResponse = {
  conversation: Conversation;
  created: boolean;
};

export type Message = {
  id: number;
  // conversation: number; // DRF thường trả id conversation
  sender_id: number;
  content: string;
  created_at: string;
  thread_root: number | null;
};

export type PaginatedMessages = {
  results: Message[];
  next_before_id: number | null;
};
