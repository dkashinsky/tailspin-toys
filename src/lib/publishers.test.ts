/**
 * Unit coverage for publisher data-access helpers.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { publishers } from '../../db/schema';
import { createTestDatabase } from '../../db/test-helpers';
import type { Database } from './db';
import { getAllPublishers } from './publishers';

describe('publisher data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns publishers ordered by name', async () => {
        await db.insert(publishers).values([
            { name: 'Zulu Publishing', description: null },
            { name: 'Alpha Publishing', description: null },
        ]);

        const allPublishers = await getAllPublishers(db);

        expect(allPublishers.map((publisher) => publisher.name)).toEqual([
            'Alpha Publishing',
            'Zulu Publishing',
        ]);
    });

    it('returns an empty list when no publishers exist', async () => {
        expect(await getAllPublishers(db)).toEqual([]);
    });
});
