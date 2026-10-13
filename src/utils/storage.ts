import type { FavoriteMovie } from '../types/movie';

/** Single, documented localStorage key. Bump the suffix if the stored shape changes. */
export const FAVORITES_STORAGE_KEY = 'movieverse:favorites:v1';

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    // Accessing localStorage can throw (blocked cookies, sandboxed iframes…).
    return null;
  }
}

function isFavorite(value: unknown): value is FavoriteMovie {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'number' &&
    Number.isInteger(v.id) &&
    v.id > 0 &&
    typeof v.title === 'string' &&
    (v.posterPath === null || typeof v.posterPath === 'string') &&
    typeof v.releaseDate === 'string' &&
    typeof v.voteAverage === 'number' &&
    Number.isFinite(v.voteAverage) &&
    typeof v.addedAt === 'number'
  );
}

/** Parses the raw stored string, dropping invalid entries and duplicate IDs. Never throws. */
export function parseFavorites(raw: string | null): FavoriteMovie[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<number>();
  const result: FavoriteMovie[] = [];
  for (const item of data) {
    if (isFavorite(item) && !seen.has(item.id)) {
      seen.add(item.id);
      result.push({
        id: item.id,
        title: item.title,
        posterPath: item.posterPath,
        releaseDate: item.releaseDate,
        voteAverage: item.voteAverage,
        addedAt: item.addedAt,
      });
    }
  }
  return result;
}

export function loadFavorites(): FavoriteMovie[] {
  try {
    return parseFavorites(getStorage()?.getItem(FAVORITES_STORAGE_KEY) ?? null);
  } catch {
    return [];
  }
}

/** Returns false when the write failed (quota, unavailable storage). */
export function saveFavorites(favorites: readonly FavoriteMovie[]): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    return true;
  } catch {
    return false;
  }
}
