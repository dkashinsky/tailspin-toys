/**
 * Data-access helpers for retrieving publisher records from the application database.
 */

import { asc } from 'drizzle-orm';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';
import type { Database } from './db';

/**
 * Return all publishers ordered by name.
 *
 * @param db - Injectable Drizzle database client used with the production connection or an in-memory test database.
 * @returns A list containing the id and name of every publisher.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    return db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
}
