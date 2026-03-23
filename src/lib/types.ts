export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  total_upvotes_received: number;
  total_posts_created: number;
  days_won: number;
  is_admin: boolean;
  moderation_strikes: number;
  created_at: string;
  updated_at: string;
};

/** Profile data safe to expose to clients (no admin status, no strike counts). */
export type PublicProfile = Omit<Profile, "is_admin" | "moderation_strikes" | "updated_at">;

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
  audio_url: string | null;
  audio_path: string | null;
  audio_duration_ms: number | null;
  audio_mime_type: string | null;
};

export type PostWithAuthor = Post & {
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url">;
  has_voted: boolean;
  is_followed: boolean;
  top_comments?: CommentListItem[];
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
  audio_url: string | null;
  audio_path: string | null;
  audio_duration_ms: number | null;
  audio_mime_type: string | null;
  top_comments: TopComment[];
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url">;
};

export type TopComment = {
  username: string;
  text: string | null;
  upvote_count: number;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  text: string | null;
  image_path: string | null;
  upvote_count: number;
  parent_comment_id: string | null;
  created_at: string;
};

export type CommentWithAuthor = Comment & {
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url">;
  has_voted: boolean;
};

export type CommentListItem = CommentWithAuthor & {
  root_comment_id: string;
  depth: number;
  reply_count: number;
  deleted_at: string | null;
  deleted_by: string | null;
  is_deleted: boolean;
};

export type CommentPage = {
  comments: CommentListItem[];
  totalCount: number;
  topLevelCount: number;
  nextOffset: number | null;
};

export type TopWinner = {
  user_id: string;
  days_won: number;
  last_win_date: string;
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url">;
};

export type TopFollowedProfile = {
  user_id: string;
  follower_count: number;
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url">;
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

export type Mention = {
  id: string;
  mentioned_user_id: string;
  mentioning_user_id: string;
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
};

export type HashtagSearchResult = {
  hashtag: string;
  postCount: number;
  isFollowed: boolean;
};

export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};
