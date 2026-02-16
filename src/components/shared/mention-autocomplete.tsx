"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type MentionUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

interface MentionAutocompleteProps {
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onSelect: (username: string, startIndex: number, endIndex: number) => void;
}

function getMentionQuery(
  value: string,
  cursorPos: number
): { query: string; startIndex: number; endIndex: number } | null {
  const beforeCursor = value.slice(0, cursorPos);
  const match = beforeCursor.match(/@([a-z0-9_]{0,20})$/);
  if (!match) return null;

  const query = match[1];
  const startIndex = beforeCursor.length - match[0].length;
  const endIndex = cursorPos;

  return { query, startIndex, endIndex };
}

export function MentionAutocomplete({
  inputRef,
  value,
  onSelect,
}: MentionAutocompleteProps) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [visible, setVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionInfo, setMentionInfo] = useState<{
    startIndex: number;
    endIndex: number;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUsers = useCallback(async (query: string) => {
    try {
      const res = await fetch(
        `/api/mentions/suggestions?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const results = data.users as MentionUser[];
      setUsers(results);
      setVisible(results.length > 0);
      setSelectedIndex(0);
    } catch {
      setUsers([]);
      setVisible(false);
    }
  }, []);

  // Detect @ + query on input changes
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const cursorPos = el.selectionStart ?? value.length;
    const result = getMentionQuery(value, cursorPos);

    if (!result) {
      setVisible(false);
      return;
    }

    setMentionInfo({ startIndex: result.startIndex, endIndex: result.endIndex });

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(result.query);
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [value, inputRef, fetchUsers]);

  // Keyboard navigation
  useEffect(() => {
    const el = inputRef.current;
    if (!el || !visible) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (!visible) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, users.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && users.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        selectUser(users[selectedIndex]);
      } else if (e.key === "Escape") {
        setVisible(false);
      }
    }

    el.addEventListener("keydown", handleKeyDown as EventListener);
    return () => el.removeEventListener("keydown", handleKeyDown as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, users, selectedIndex, inputRef]);

  // Scroll selected item into view
  useEffect(() => {
    if (!visible || !dropdownRef.current) return;
    const item = dropdownRef.current.children[selectedIndex] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, visible]);

  function selectUser(user: MentionUser) {
    if (!mentionInfo) return;
    onSelect(user.username, mentionInfo.startIndex, mentionInfo.endIndex);
    setVisible(false);
    setUsers([]);
  }

  if (!visible || users.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 z-50 mt-1 max-h-[220px] overflow-y-auto overscroll-contain rounded-md border border-border bg-popover shadow-md"
    >
      {users.map((user, i) => (
        <button
          key={user.id}
          type="button"
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
            i === selectedIndex && "bg-accent"
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            selectUser(user);
          }}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.username}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              user.username[0].toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-medium">@{user.username}</span>
            {user.display_name && (
              <span className="ml-1.5 text-muted-foreground">
                {user.display_name}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
