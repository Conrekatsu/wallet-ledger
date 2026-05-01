import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export type QueryParams = readonly unknown[] | unknown[];

export interface Queryable {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: QueryParams
  ): Promise<QueryResult<T>>;
}

export interface DbPool extends Queryable {
  connect(): Promise<PoolClient>;
}

export function isPool(client: Queryable): client is Pool {
  return typeof (client as Pool).connect === 'function';
}
