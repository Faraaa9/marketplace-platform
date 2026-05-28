"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { User, Plus } from "lucide-react";
import StoryModal from "./StoryModal";

/**
 * Account-card avatar. When the story feature is enabled it doubles as the
 * entry point to the story manager (ring + "+"/count badge + modal); otherwise
 * it is a plain avatar. The active-story count is held locally so add/delete
 * inside the modal updates the badge optimistically.
 */
export default function AccountStoryAvatar({
  profileImageUrl,
  storyEnabled,
  isActive,
  emailVerified,
  activeStoryCount: initialStoryCount,
}: {
  profileImageUrl: string | null;
  storyEnabled: boolean;
  isActive: boolean;
  emailVerified: boolean;
  activeStoryCount: number;
}) {
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [activeStoryCount, setActiveStoryCount] = useState(initialStoryCount);

  const handleStoryChange = useCallback((delta: number) => {
    setActiveStoryCount((prev) => Math.max(0, prev + delta));
  }, []);

  if (!storyEnabled) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 dark:bg-brand-950">
        {profileImageUrl ? (
          <Image src={profileImageUrl} alt="" width={36} height={36} className="h-full w-full object-cover" />
        ) : (
          <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        )}
      </div>
    );
  }

  const canManage = isActive && emailVerified;

  return (
    <>
      <button
        onClick={() => setStoryModalOpen(true)}
        disabled={!canManage}
        className="group relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-default"
        aria-label={canManage ? (activeStoryCount > 0 ? "Tvarkyti story" : "Pridėti story") : "Profilio nuotrauka"}
        title={canManage ? (activeStoryCount > 0 ? "Tvarkyti story" : "Pridėti story") : undefined}
      >
        {/* Story ring */}
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${
          activeStoryCount > 0
            ? "bg-gradient-to-tr from-brand-500 via-violet-500 to-amber-400 p-[2.5px]"
            : canManage
              ? "bg-surface-200 p-[2px] transition-all group-hover:bg-gradient-to-tr group-hover:from-brand-500/60 group-hover:via-violet-500/60 group-hover:to-amber-400/60 dark:bg-surface-700"
              : ""
        }`}>
          <div className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full ${
            activeStoryCount > 0 || canManage
              ? "bg-white ring-0 dark:bg-surface-900"
              : "bg-brand-50 dark:bg-brand-950"
          }`}>
            {profileImageUrl ? (
              <Image src={profileImageUrl} alt="" width={44} height={44} className="h-full w-full object-cover" />
            ) : (
              <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            )}
          </div>
        </div>
        {/* "+" badge when no active stories */}
        {canManage && activeStoryCount === 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white transition-colors group-hover:bg-brand-700 dark:ring-surface-900">
            <Plus className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}
        {/* Active story count indicator */}
        {activeStoryCount > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-surface-900">
            {activeStoryCount}
          </span>
        )}
      </button>

      <StoryModal
        open={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        onStoryChange={handleStoryChange}
      />
    </>
  );
}
