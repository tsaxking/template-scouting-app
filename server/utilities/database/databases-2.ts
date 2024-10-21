import { attemptAsync, build, Result } from '../../../shared/check';
// import cliProgress from 'cli-progress';
import { EventEmitter } from '../../../shared/event-emitter';
import { Client } from 'pg';
import {
    fromCamelCase,
    toSnakeCase,
    parseObject,
    toCamelCase,
    fromSnakeCase,
    capitalize
} from '../../../shared/text';
import { bigIntDecode, bigIntEncode } from '../../../shared/objects';
import { readFile } from '../files';
import path from 'path';
import { Queries } from '../queries';
import { log } from '../../../client/utilities/logging';

/*
TODO:
- Versioning
- Migration
- Backups
*/

export interface DatabaseInterface {
    query<T extends Record<string, unknown>>(
        query: Query
    ): Promise<Result<QueryResult<T>>>;
    connect(): Promise<Result<boolean>>;
}

type DBEvents = {
    connected: void;
    disconnected: void;
    error: Error;
};
export type SimpleParameter = string | number | boolean | null;

export type Parameter =
    | SimpleParameter
    | {
          [key: string]: SimpleParameter;
      };

type QueryFileParams<T extends keyof Queries> = Queries[T][0];

export class Query {
    /**
     *
     * @param query Can be a query with ? or :variable, use camelCase for everything
     * @param args
     * @returns
     */
    public static build(query: string, ...args: Parameter[]): Query {
        const copied = [...args]; // no dependencies

        // remove all comments
        query = query.replaceAll(/--.*\n/g, '');

        const deCamelCase = (str: string) =>
            str.replace(
                /[A-Z]*[a-z]+((\d)|([A-Z0-9][a-z0-9]+))*([A-Z])?/g,
                word => {
                    // log(toSnakeCase(fromCamelCase(word)));
                    let w = toSnakeCase(fromCamelCase(word));
                    if (w.startsWith('_')) {
                        w = w.slice(1);
                        // capitalize first letter
                        // w = w.charAt(0).toUpperCase() + w.slice(1);
                    }
                    return w;
                }
            );

        const qMatches = query.match(/\?/g);

        if (qMatches) {
            if (qMatches.length !== args.length) {
                throw new Error(
                    `Number of parameters does not match number of ? in query. Query: ${query}, Parameters: ${copied}`
                );
            }
            // replace each ? with a $n
            for (let i = 0; i < qMatches.length; i++) {
                query = query.replace('?', `$${i + 1}`);
            }
            return new Query(deCamelCase(query), copied);
        }

        // get every :variable in the query
        const matches = query.match(/:\w+/g);
        // log(matches);
        const newArgs: Parameter[] = [];
        if (matches) {
            // for each match, replace it with a $n
            for (let i = 0; i < matches.length; i++) {
                query = query.replace(matches[i], `$${i + 1}`);
                newArgs.push(
                    typeof copied[0] === 'object'
                        ? // if the first parameter is an object, use the key
                          (
                              copied[0] as Record<
                                  string,
                                  string | number | boolean | null
                              >
                          )[matches[i].replace(/:/g, '')]
                        : // otherwise, use the parameter
                          copied[i]
                );
            }
            return new Query(deCamelCase(query), newArgs);
        }

        return new Query(deCamelCase(query), copied);
    }

    public static fromFile<T extends keyof Queries>(
        file: T,
        ...args: QueryFileParams<T> extends [undefined]
            ? []
            : QueryFileParams<T>
    ): Promise<Result<Query>> {
        return attemptAsync(async () => {
            const sql = (
                await readFile(
                    path.resolve(
                        __dirname,
                        '../../storage/db/queries/',
                        file + '.sql'
                    )
                )
            ).unwrap();

            return Query.build(sql, ...(args as Parameter[]));
        });
    }

    public readonly args: Parameter[];

    constructor(
        public readonly sql: string,
        args: Parameter[] = []
    ) {
        this.args = bigIntEncode(args);
    }
}

class QueryResult<T extends Record<string, unknown>> {
    public readonly rows: T[];
    constructor(
        rows: T[],
        public readonly query: Query
    ) {
        this.rows = bigIntDecode(
            rows.map(row =>
                parseObject(row, str => toCamelCase(fromSnakeCase(str)))
            )
        ) as T[];
    }
}

export class PgDatabase implements DatabaseInterface {
    constructor(public readonly client: Client) {
        // super();
    }

    public async query<T extends Record<string, unknown>>(
        query: Query
    ): Promise<Result<QueryResult<T>>> {
        return attemptAsync(async () => {
            const result = await this.client.query(query.sql, query.args);
            return new QueryResult<T>(result.rows, query);
        });
    }

    public async connect(): Promise<Result<boolean>> {
        return attemptAsync(async () => {
            await this.client.connect();
            return true;
        });
    }
}

class UnsafeDatabase {
    constructor(public readonly db: DatabaseInterface) {}

    public async connect(): Promise<Result<boolean>> {
        return this.db.connect();
    }

    public async get<T>(query: Query): Promise<Result<T | undefined>> {
        return attemptAsync(async () => {
            const result = (await this.db.query(query)).unwrap();
            if (result.rows.length === 0) {
                return undefined;
            }
            return result.rows[0] as T;
        });
    }

    public async all<T>(query: Query): Promise<Result<T[]>> {
        return attemptAsync(async () => {
            return (await this.db.query(query)).unwrap().rows as T[];
        });
    }

    public async run(query: Query): Promise<Result<unknown>> {
        return this.db.query(query);
    }
}

export class Database {
    public readonly unsafe: UnsafeDatabase;

    constructor(public readonly db: DatabaseInterface) {
        this.unsafe = new UnsafeDatabase(db);
    }

    public initialized = false;

    public async connect(): Promise<Result<boolean>> {
        return this.db.connect();
    }

    public async get<T extends keyof Queries>(
        type: T,
        ...args: QueryFileParams<T> extends [undefined]
            ? []
            : QueryFileParams<T>
    ): Promise<Result<Queries[T][1]>> {
        if (!this.initialized) throw new Error('Database not initialized');
        return attemptAsync(async () => {
            const query = (await Query.fromFile(type, ...args)).unwrap();

            const result = (await this.db.query(query)).unwrap();
            if (result.rows.length === 0) {
                console.error(type, query);
                throw new Error('No results found');
            }

            return result.rows[0] as Queries[T][1];
        });
    }

    public async all<T extends keyof Queries>(
        type: T,
        ...args: QueryFileParams<T> extends [undefined]
            ? []
            : QueryFileParams<T>
    ): Promise<Result<Queries[T][1][]>> {
        if (!this.initialized) throw new Error('Database not initialized');
        return attemptAsync(async () => {
            const query = (await Query.fromFile(type, ...args)).unwrap();
            return (await this.db.query(query)).unwrap()
                .rows as Queries[T][1][];
        });
    }

    public async run<T extends keyof Queries>(
        type: T,
        ...args: QueryFileParams<T> extends [undefined]
            ? []
            : QueryFileParams<T>
    ): Promise<Result<Queries[T][1]>> {
        if (!this.initialized) throw new Error('Database not initialized');
        return attemptAsync(async () => {
            const query = (await Query.fromFile(type, ...args)).unwrap();
            return (await this.db.query(query)).unwrap()
                .rows[0] as Queries[T][1];
        });
    }

    public async vacuum() {
        if (!this.initialized) throw new Error('Database not initialized');
        return attemptAsync(async () => {
            log('Vacuum go brrrrrrr');
            const tables = await this.getTables();
            if (tables.isErr()) throw tables.error;
            return Promise.all(
                tables.value.map(async table => {
                    const q = new Query(`VACUUM ${table};`);
                    this.unsafe.run(q);
                })
            );
        });
    }

    async getTables(): Promise<Result<string[]>> {
        if (!this.initialized) throw new Error('Database not initialized');
        return attemptAsync(async () => {
            const query = new Query(
                `
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name;
            `
            );

            const res = await this.unsafe.all<{ tableName: string }>(query);

            if (res.isOk()) {
                return res.value.map(r =>
                    capitalize(toCamelCase(fromSnakeCase(r.tableName)))
                );
            }
            throw res.error;
        });
    }

    async getVersion(): Promise<Result<{
        major: number;
        minor: number;
        patch: number;
    }>> {
        return attemptAsync(async () => {
            (await this.connect()).unwrap();
            const result = (await this.unsafe.get<{
                major: number;
                minor: number;
                patch: number;
            }>(
                Query.build('SELECT * FROM Version;')
            )).unwrap();
            if (!result) {
                throw new Error('Version not found');
            }

            return result;
        });
    }

    async init() {
        return attemptAsync(async () => {
            const version = await (await this.getVersion()).unwrap();
            if (version.major !== 0 || version.minor !== 0 || version.patch !== 0) {
                this.initialized = true;
                return;
            }

            (await this.connect()).unwrap();
            (await this.unsafe.run(
                Query.build(`
                    CREATE TABLE IF NOT EXISTS Tables (
                        name TEXT PRIMARY KEY,
                        schema TEXT NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS Vesrion (
                        major INTEGER NOT NULL,
                        minor INTEGER NOT NULL,
                        patch INTEGER NOT NULL
                    );

                    INSERT INTO Version (
                        major, minor, patch
                    ) VALUES (
                        0, 0, 0
                    );
                `),
            )).unwrap();

            this.initialized = true;
        });
    }
}
