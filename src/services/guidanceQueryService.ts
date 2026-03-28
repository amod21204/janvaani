import {getMySqlPool} from '../db/mysql.ts';
import type {CivicGuidanceResult} from './openaiGuidanceService.ts';

export async function saveGuidanceQuery(query: string, result: CivicGuidanceResult) {
  const pool = getMySqlPool();
  if (!pool) {
    return;
  }

  await pool.execute(
    `
      INSERT INTO guidance_queries (query_text, documents_required, steps, where_to_go, tips)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      query,
      JSON.stringify(result.documents_required),
      JSON.stringify(result.steps),
      result.where_to_go,
      JSON.stringify(result.tips),
    ],
  );
}
