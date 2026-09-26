/**
 * Data-access helpers for retrieving and filtering game records.
 */

import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

/** Filters supported when retrieving games from the catalog. */
export interface GameFilters {
    /** Category IDs to match; a game may match any selected category. */
    categoryIds?: readonly number[];
    /** Publisher ID that matching games must belong to. */
    publisherId?: number;
}

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/**
 * Return games matching the supplied category and publisher filters.
 *
 * @param db - Injectable Drizzle database client used with the production connection or an in-memory test database.
 * @param filters - Optional category and publisher IDs used to narrow the catalog.
 * @returns Matching games ordered alphabetically by title.
 */
export async function getFilteredGames(
    db: Database,
    filters: GameFilters = {},
): Promise<Game[]> {
    const predicate = and(
        filters.categoryIds?.length
            ? inArray(games.categoryId, filters.categoryIds)
            : undefined,
        filters.publisherId !== undefined
            ? eq(games.publisherId, filters.publisherId)
            : undefined,
    );
    const query = baseGamesQuery(db);
    const rows = predicate
        ? await query.where(predicate).orderBy(asc(games.title))
        : await query.orderBy(asc(games.title));

    return rows.map(mapGame);
}

/**
 * Return all games ordered alphabetically by title.
 *
 * @param db - Injectable Drizzle database client used with the production connection or an in-memory test database.
 * @returns Every game in the catalog with its category and publisher.
 */
export async function getAllGames(db: Database): Promise<Game[]> {
    return getFilteredGames(db);
}

/**
 * Return all game IDs ordered by game title.
 *
 * @param db - Injectable Drizzle database client used with the production connection or an in-memory test database.
 * @returns Every game ID in deterministic title order.
 */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/**
 * Return a single game by its ID.
 *
 * @param db - Injectable Drizzle database client used with the production connection or an in-memory test database.
 * @param id - Numeric game identifier.
 * @returns The matching game, or `null` when no game has the supplied ID.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
