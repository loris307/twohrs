export function profilePath(username: string): string {
  return `/profile/${encodeURIComponent(username)}`;
}

export function profileFollowersPath(username: string): string {
  return `${profilePath(username)}/followers`;
}

export function profileFollowingPath(username: string): string {
  return `${profilePath(username)}/following`;
}
