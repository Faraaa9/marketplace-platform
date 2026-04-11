"use client";

import { create } from "zustand";

interface UIState {
  // Story viewer
  isStoryOpen: boolean;
  activeStoryId: string | null;

  // Message modal
  isMessageModalOpen: boolean;

  // Notifications
  unreadNotificationCount: number;

  // Actions
  openStory: (storyId?: string | null) => void;
  closeStory: () => void;
  openMessageModal: () => void;
  closeMessageModal: () => void;
  setUnreadNotificationCount: (count: number) => void;
  incrementUnreadNotificationCount: (amount?: number) => void;
  resetUnreadNotificationCount: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isStoryOpen: false,
  activeStoryId: null,

  isMessageModalOpen: false,

  unreadNotificationCount: 0,

  openStory: (storyId) =>
    set({ isStoryOpen: true, activeStoryId: storyId ?? null }),

  closeStory: () =>
    set({ isStoryOpen: false, activeStoryId: null }),

  openMessageModal: () =>
    set({ isMessageModalOpen: true }),

  closeMessageModal: () =>
    set({ isMessageModalOpen: false }),

  setUnreadNotificationCount: (count) =>
    set({ unreadNotificationCount: count }),

  incrementUnreadNotificationCount: (amount = 1) =>
    set((state) => ({
      unreadNotificationCount: state.unreadNotificationCount + amount,
    })),

  resetUnreadNotificationCount: () =>
    set({ unreadNotificationCount: 0 }),
}));
