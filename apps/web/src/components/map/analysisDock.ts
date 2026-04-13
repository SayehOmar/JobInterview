/** Max minimized analysis tabs (memory / UX cap). */
export const ANALYSIS_DOCK_MAX = 5;

export type DockedAnalysis<T> = {
  id: string;
  name: string;
  result: T;
};

/** FIFO cap: newest wins; duplicates by id replaced and moved to end. */
export function pushDockItem<T>(
  items: DockedAnalysis<T>[],
  item: DockedAnalysis<T>,
): DockedAnalysis<T>[] {
  const withoutDup = items.filter((x) => x.id !== item.id);
  const next = [...withoutDup, item];
  return next.slice(-ANALYSIS_DOCK_MAX);
}
