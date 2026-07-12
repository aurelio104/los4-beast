export const STORY_REACTIONS = [
  { id: 'heart', glyph: '❤️', label: 'Corazón' },
  { id: 'fire', glyph: '🔥', label: 'Fuego' },
  { id: 'devil', glyph: '😈', label: 'Diablito' }
] as const;

export type StoryReactionId = (typeof STORY_REACTIONS)[number]['id'];

const GLYPHS: Record<StoryReactionId, string> = {
  heart: '❤️',
  fire: '🔥',
  devil: '😈'
};

export function storyReactionGlyph(id: string | null | undefined) {
  if (!id || !(id in GLYPHS)) return null;
  return GLYPHS[id as StoryReactionId];
}
