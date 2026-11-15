/** The feeling that leads at a given moment. Rules are in docs/10-feelings-and-states.md. */
export const MOODS = ['calm', 'hungry', 'content', 'curious', 'social', 'afraid'] as const;
export type Mood = (typeof MOODS)[number];
