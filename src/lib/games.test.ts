/**
 * Unit coverage for game catalog data-access helpers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getFilteredGames,
    getGameById,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

interface FilterFixture {
    strategyId: number;
    puzzleId: number;
    publisherOneId: number;
    publisherTwoId: number;
}

async function seedFilterGames(db: Database): Promise<FilterFixture> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'Strategy games' })
        .returning({ id: categories.id });
    const [puzzle] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'Puzzle games' })
        .returning({ id: categories.id });
    const [publisherOne] = await db
        .insert(publishers)
        .values({ name: 'Publisher One', description: 'First publisher' })
        .returning({ id: publishers.id });
    const [publisherTwo] = await db
        .insert(publishers)
        .values({ name: 'Publisher Two', description: 'Second publisher' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Zulu Strategy',
            description: 'Strategy from publisher one',
            starRating: 4.1,
            categoryId: strategy.id,
            publisherId: publisherOne.id,
        },
        {
            title: 'Alpha Puzzle',
            description: 'Puzzle from publisher one',
            starRating: 4.2,
            categoryId: puzzle.id,
            publisherId: publisherOne.id,
        },
        {
            title: 'Beta Strategy',
            description: 'Strategy from publisher two',
            starRating: 4.3,
            categoryId: strategy.id,
            publisherId: publisherTwo.id,
        },
    ]);

    return {
        strategyId: strategy.id,
        puzzleId: puzzle.id,
        publisherOneId: publisherOne.id,
        publisherTwoId: publisherTwo.id,
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('returns all games when filters are empty', async () => {
        await seedFilterGames(db);

        const filtered = await getFilteredGames(db, { categoryIds: [] });

        expect(filtered.map((game) => game.title)).toEqual([
            'Alpha Puzzle',
            'Beta Strategy',
            'Zulu Strategy',
        ]);
    });

    it('filters games by one category', async () => {
        const fixture = await seedFilterGames(db);

        const filtered = await getFilteredGames(db, {
            categoryIds: [fixture.strategyId],
        });

        expect(filtered.map((game) => game.title)).toEqual([
            'Beta Strategy',
            'Zulu Strategy',
        ]);
    });

    it('matches any of multiple selected categories', async () => {
        const fixture = await seedFilterGames(db);

        const filtered = await getFilteredGames(db, {
            categoryIds: [fixture.strategyId, fixture.puzzleId],
        });

        expect(filtered.map((game) => game.title)).toEqual([
            'Alpha Puzzle',
            'Beta Strategy',
            'Zulu Strategy',
        ]);
    });

    it('filters games by publisher', async () => {
        const fixture = await seedFilterGames(db);

        const filtered = await getFilteredGames(db, {
            publisherId: fixture.publisherOneId,
        });

        expect(filtered.map((game) => game.title)).toEqual([
            'Alpha Puzzle',
            'Zulu Strategy',
        ]);
    });

    it('combines category and publisher filters', async () => {
        const fixture = await seedFilterGames(db);

        const filtered = await getFilteredGames(db, {
            categoryIds: [fixture.strategyId],
            publisherId: fixture.publisherOneId,
        });

        expect(filtered.map((game) => game.title)).toEqual(['Zulu Strategy']);
    });

    it('returns an empty list when no games match', async () => {
        const fixture = await seedFilterGames(db);

        const filtered = await getFilteredGames(db, {
            categoryIds: [fixture.puzzleId],
            publisherId: fixture.publisherTwoId,
        });

        expect(filtered).toEqual([]);
    });
});
