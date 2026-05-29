// Shared between the API (validation) and the viewer UI (reaction bar). Kept
// deliberately small and restrained — a craftsman marketplace, not a meme feed.
export const STORY_REACTIONS: { emoji: string; label: string }[] = [
  { emoji: "👍", label: "Gerai" },
  { emoji: "❤️", label: "Patinka" },
  { emoji: "🔥", label: "Įspūdinga" },
  { emoji: "👏", label: "Bravo" },
  { emoji: "🤝", label: "Domina" },
];

export const STORY_REACTION_EMOJIS = STORY_REACTIONS.map((r) => r.emoji);

export function isValidReaction(emoji: string): boolean {
  return STORY_REACTION_EMOJIS.includes(emoji);
}
