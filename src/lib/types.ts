export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  total_upvotes_received: number;
  total_posts_created: number;
  days_won: number;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  image_url: string | null;
  image_path: string | null;
  caption: string | null;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_url: string | null;
};

export type PostWithAuthor = Post & {
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url">;
  has_voted: boolean;
};

export type Vote = {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
};

export type Follow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type DailyLeaderboardEntry = {
  id: string;
  date: string;
  user_id: string;
  rank: number;
  total_upvotes: number;
  total_posts: number;
  best_post_caption: string | null;
  best_post_upvotes: number | null;
  created_at: string;
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url">;
};

export type LeaderboardEntry = {
  user_id: string;
  total_upvotes: number;
  post_count: number;
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url">;
};

export type TopPostAllTime = {
  id: string;
  date: string;
  user_id: string;
  image_url: string | null;
  image_path: string | null;
  caption: string | null;
  upvote_count: number;
  created_at: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_url: string | null;
  top_comments: TopComment[];
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url">;
};

export type TopComment = {
  username: string;
  text: string;
  upvote_count: number;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  upvote_count: number;
  created_at: string;
};

export type CommentWithAuthor = Comment & {
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url">;
  has_voted: boolean;
};

export type AppConfig = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
};

export type TimeState = {
  isOpen: boolean;
  isGracePeriod: boolean;
  nextOpenTime: Date;
  timeRemainingMs: number;
  sessionProgressPercent: number;
};

export type FeedPage = {
  posts: PostWithAuthor[];
  nextCursor: string | null;
};

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};
