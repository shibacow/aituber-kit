import { create } from 'zustand';

// Bcsrvから受信するコメントデータの型（仮）
// 必要に応じて調整してください
export type Comment = {
  id: string;
  userName: string;
  userIconUrl?: string; // Add userIconUrl from CustomComment (optional)
  message: string;
  timestamp: string;
};

type CommentsState = {
  comments: Comment[];
  addComment: (comment: Comment) => void;
  clearComments: () => void;
};

export const useCommentsStore = create<CommentsState>((set) => ({
  comments: [],
  addComment: (comment) =>
    set((state) => ({
      comments: [...state.comments, comment],
    })),
  clearComments: () => set({ comments: [] }),
}));
