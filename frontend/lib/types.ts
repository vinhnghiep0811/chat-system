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
