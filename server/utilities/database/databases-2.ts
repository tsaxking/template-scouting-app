/* eslint-disable no-await-in-loop */
import { attemptAsync, build, resolveAll, Result } from '../../../shared/check';
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
import { gitBranch, gitCommit } from '../git';
import { getVersions } from './versions';
import fs from 'fs';
import { error } from '../terminal-logging';
import { exec } from '../run-task';
import { SQL_Type } from '../../structure/structs/struct';

/**
 * Error class for the database
 *
 * @class DatabaseError
 * @typedef {DatabaseError}
 * @extends {Error}
 */
class DatabaseError extends Error {
    /**
     * Creates an instance of DatabaseError.
     *
     * @constructor
     * @param {string} message
     */
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseError';
    }
}

/**
 * Interface for using different databases in the future
 *
 * @export
 * @interface DatabaseInterface
 * @typedef {DatabaseInterface}
 */
export interface DatabaseInterface {
    /**
     * Queries the database
     *
     * @template {Record<string, unknown>} T
     * @param {Query} query
     * @returns {Promise<Result<QueryResult<T>>>}
     */
    query<T extends Record<string, unknown>>(
        query: Query
    ): Promise<Result<QueryResult<T>>>;
    /**
     * Connects to the database
     *
     * @returns {Promise<Result<boolean>>}
     */
    connect(): Promise<Result<boolean>>;
    /**
     * Creates a dump file of the database
     *
     * @param {string} target
     * @returns {Promise<Result<void>>}
     */
    dump(target: string): Promise<Result<void>>;
}

/**
 * Parameter for a query
 *
 * @export
 * @typedef {SimpleParameter}
 */
export type SimpleParameter = string | number | boolean | null;

/**
 * Parameter Object for a query
 *
 * @export
 * @typedef {Parameter}
 */
export type Parameter =
    SimpleParameter
    | {
          [key: string]: SimpleParameter;
      };

/**
 * Old query method, all paremters for a given query
 *
 * @typedef {QueryFileParams}
 * @template {keyof Queries} T
 */
type QueryFileParams<T extends keyof Queries> = Queries[T][0];

/**
 * Query object for the database
 *
 * @export
 * @class Query
 * @typedef {Query}
 */
export class Query {
    /**
     * Builds a query from a string and parameters
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
                throw new DatabaseError(
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

    /**
     * Builds a query object from a file and parameters
     *
     * @public
     * @static
     * @template {keyof Queries} T
     * @param {T} file
     * @param {...QueryFileParams<T> extends [undefined]
     *             ? []
     *             : QueryFileParams<T>} args
     * @returns {Promise<Result<Query>>}
     */
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

    /**
     * Query arguments
     *
     * @public
     * @readonly
     * @type {Parameter[]}
     */
    public readonly args: Parameter[];

    /**
     * Creates an instance of Query.
     *
     * @constructor
     * @param {string} sql
     * @param {Parameter[]} [args=[]]
     */
    constructor(
        public readonly sql: string,
        args: Parameter[] = []
    ) {
        this.args = bigIntEncode(args);
    }
}

/**
 * Result of a query
 *
 * @class QueryResult
 * @typedef {QueryResult}
 * @template {Record<string, unknown>} T
 */
class QueryResult<T extends Record<string, unknown>> {
    /**
     * Rows of the query result
     *
     * @public
     * @readonly
     * @type {T[]}
     */
    public readonly rows: T[];
    /**
     * Creates an instance of QueryResult.
     *
     * @constructor
     * @param {T[]} rows
     * @param {Query} query
     */
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

/**
 * Postgres database using the database interface
 *
 * @export
 * @class PgDatabase
 * @typedef {PgDatabase}
 * @implements {DatabaseInterface}
 */
export class PgDatabase implements DatabaseInterface {
    /**
     * Creates an instance of PgDatabase.
     *
     * @constructor
     * @param {Client} client
     */
    constructor(public readonly client: Client) {
        // super();
    }

    /**
     * Queries the database
     *
     * @public
     * @async
     * @template {Record<string, unknown>} T
     * @param {Query} query
     * @returns {Promise<Result<QueryResult<T>>>}
     */
    public async query<T extends Record<string, unknown>>(
        query: Query
    ): Promise<Result<QueryResult<T>>> {
        return attemptAsync(async () => {
            const result = await this.client.query(query.sql, query.args);
            if (!result.rows) result.rows = [];
            return new QueryResult<T>(result.rows, query);
        });
    }

    /**
     * Connects to the database
     *
     * @public
     * @async
     * @returns {Promise<Result<boolean>>}
     */
    public async connect(): Promise<Result<boolean>> {
        return attemptAsync(async () => {
            await this.client.connect();
            return true;
        });
    }

    /**
     * Creates a dump file of the database
     *
     * @public
     * @async
     * @param {string} target
     * @returns {unknown}
     */
    public async dump(target: string) {
        return attemptAsync(async () => {
            const name = this.client.database;
            const password = this.client.password;
            const host = this.client.host;
            const port = this.client.port;
            if (!name) throw new DatabaseError('No database name found');
            if (!password) throw new DatabaseError('No password found');
            // dump the database

            (
                await exec(
                    `pg_dump -U postgres -h ${host} -p ${port} -d ${name} -w ${password} -f ${target}/dump.sql`
                )
            ).unwrap();
        });
    }
}


/**
 * Database where you can pass in queries directly rather than building them from files
 *
 * @class UnsafeDatabase
 * @typedef {UnsafeDatabase}
 */
class UnsafeDatabase {
    /**
     * Creates an instance of UnsafeDatabase.
     *
     * @constructor
     * @param {DatabaseInterface} db
     */
    constructor(public readonly db: DatabaseInterface) {}

    /**
     * Connects to the database
     *
     * @public
     * @async
     * @returns {Promise<Result<boolean>>}
     */
    public async connect(): Promise<Result<boolean>> {
        return this.db.connect();
    }

    /**
     * Returns a single row from a query
     *
     * @public
     * @async
     * @template T
     * @param {Query} query
     * @returns {Promise<Result<T | undefined>>}
     */
    public async get<T>(query: Query): Promise<Result<T | undefined>> {
        return attemptAsync(async () => {
            const result = (await this.db.query(query)).unwrap();
            if (result.rows.length === 0) {
                return undefined;
            }
            return result.rows[0] as T;
        });
    }

    /**
     * Returns all rows from a query
     *
     * @public
     * @async
     * @template T
     * @param {Query} query
     * @returns {Promise<Result<T[]>>}
     */
    public async all<T>(query: Query): Promise<Result<T[]>> {
        return attemptAsync(async () => {
            return (await this.db.query(query)).unwrap().rows as T[];
        });
    }

    /**
     * Runs a query
     *
     * @public
     * @async
     * @param {Query} query
     * @returns {Promise<Result<unknown>>}
     */
    public async run(query: Query): Promise<Result<unknown>> {
        return attemptAsync(async () => {
            return this.db.query(query);
        });
    }
}

/**
 * Column in a table
 *
 * @class Col
 * @typedef {Col}
 */
class Col {
    /**
     * Creates an instance of Col.
     *
     * @constructor
     * @param {string} name
     * @param {string} type
     * @param {StructTable} table
     */
    constructor(
        public readonly name: string,
        public readonly type: string,
        public readonly table: StructTable
    ) {}
}

/**
 * Backup of a table
 *
 * @class TableBackup
 * @typedef {TableBackup}
 */
class TableBackup {
    /**
     * Creates an instance of TableBackup.
     *
     * @constructor
     * @param {string} date
     * @param {string} table
     * @param {Database} database
     */
    constructor(
        public readonly date: string,
        public readonly table: string,
        public readonly database: Database
    ) {}

    /**
     * Restores the table to the state of the backup
     *
     * @returns {*}
     */
    restore() {
        return attemptAsync(async () => {});
    }

    /**
     * Reads the backup
     *
     * @returns {Promise<
     *         Result<{
     *             data: Record<string, unknown>[];
     *             version: {
     *                 major: number;
     *                 minor: number;
     *                 patch: number;
     *             };
     *         }>
     *     >}
     */
    read(): Promise<
        Result<{
            data: Record<string, unknown>[];
            version: {
                major: number;
                minor: number;
                patch: number;
            };
        }>
    > {
        return attemptAsync(async () => {
            const data = await fs.promises.readFile(
                path.resolve(
                    __dirname,
                    `../../storage/db/backups/${this.date}/${this.table}.table`
                )
            );
            return JSON.parse(data.toString());
        });
    }
}

/**
 * Database class that is used to interact with a database connection
 *
 * @export
 * @class Database
 * @typedef {Database}
 */
export class Database {
    /**
     * Unsafe database
     *
     * @public
     * @readonly
     * @type {UnsafeDatabase}
     */
    public readonly unsafe: UnsafeDatabase;

    /**
     * Creates an instance of Database.
     *
     * @constructor
     * @param {DatabaseInterface} db
     */
    constructor(public readonly db: DatabaseInterface) {
        this.unsafe = new UnsafeDatabase(db);
    }

    /**
     * Query class
     *
     * @public
     * @readonly
     * @type {typeof Query}
     */
    public readonly Query = Query;

    /**
     * If the database is initialized
     *
     * @public
     * @type {boolean}
     */
    public initialized = false;

    /**
     * Connects to the database
     *
     * @public
     * @async
     * @returns {Promise<Result<boolean>>}
     */
    public async connect(): Promise<Result<boolean>> {
        return this.db.connect();
    }

    /**
     * Returns a single row from a query
     *
     * @public
     * @async
     * @template {keyof Queries} T
     * @param {T} type
     * @param {...QueryFileParams<T> extends [undefined]
     *             ? []
     *             : QueryFileParams<T>} args
     * @returns {Promise<Result<Queries[T][1]>>}
     */
    public async get<T extends keyof Queries>(
        type: T,
        ...args: QueryFileParams<T> extends [undefined]
            ? []
            : QueryFileParams<T>
    ): Promise<Result<Queries[T][1]>> {
        if (!this.initialized)
            throw new DatabaseError('FATAL: Database not initialized');
        return attemptAsync(async () => {
            const query = (await Query.fromFile(type, ...args)).unwrap();

            const result = (await this.db.query(query)).unwrap();
            if (result.rows.length === 0) {
                console.error(type, query);
                throw new DatabaseError('No results found');
            }

            return result.rows[0] as Queries[T][1];
        });
    }

    /**
     * Returns all rows from a query
     *
     * @public
     * @async
     * @template {keyof Queries} T
     * @param {T} type
     * @param {...QueryFileParams<T> extends [undefined]
     *             ? []
     *             : QueryFileParams<T>} args
     * @returns {Promise<Result<Queries[T][1][]>>}
     */
    public async all<T extends keyof Queries>(
        type: T,
        ...args: QueryFileParams<T> extends [undefined]
            ? []
            : QueryFileParams<T>
    ): Promise<Result<Queries[T][1][]>> {
        if (!this.initialized)
            throw new DatabaseError('FATAL: Database not initialized');
        return attemptAsync(async () => {
            const query = (await Query.fromFile(type, ...args)).unwrap();
            return (await this.db.query(query)).unwrap()
                .rows as Queries[T][1][];
        });
    }

    /**
     * Runs a query
     *
     * @public
     * @async
     * @template {keyof Queries} T
     * @param {T} type
     * @param {...QueryFileParams<T> extends [undefined]
     *             ? []
     *             : QueryFileParams<T>} args
     * @returns {Promise<Result<Queries[T][1]>>}
     */
    public async run<T extends keyof Queries>(
        type: T,
        ...args: QueryFileParams<T> extends [undefined]
            ? []
            : QueryFileParams<T>
    ): Promise<Result<Queries[T][1]>> {
        if (!this.initialized)
            throw new DatabaseError('FATAL: Database not initialized');
        return attemptAsync(async () => {
            const query = (await Query.fromFile(type, ...args)).unwrap();
            return (await this.db.query(query)).unwrap()
                .rows[0] as Queries[T][1];
        });
    }

    /**
     * Vacuums the database
     *
     * @public
     * @async
     * @returns {unknown}
     */
    public async vacuum() {
        if (!this.initialized)
            throw new DatabaseError('Database not initialized');
        return attemptAsync(async () => {
            log('Vacuum go brrrrrrr');
            const tables = await this.getStructTables();
            if (tables.isErr()) throw tables.error;
            return Promise.all(
                tables.value.map(async table => {
                    const q = new Query(`VACUUM ${table};`);
                    this.unsafe.run(q);
                })
            );
        });
    }

    /**
     * Get all structs in the database from the Structs table
     *
     * @async
     * @returns {Promise<Result<{
     *         name: string;
     *         schema: Record<string, SQL_Type>;
     *         major: number;
     *         minor: number;
     *         patch: number;
     *     }[]>>}
     */
    async getStructs(): Promise<Result<{
        name: string;
        schema: Record<string, SQL_Type>;
        major: number;
        minor: number;
        patch: number;
    }[]>> {
        return attemptAsync(async () => {
            const structs = (await this.unsafe.all<{
                name: string;
                schema: string;
            }>(
                Query.build(`
                        SELECT *
                        FROM Structs
                    `)
            )).unwrap();

            return structs.map(s => ({
                ...s,
                schema: JSON.parse(s.schema) 
            }));
        });
    }

    /**
     * Resets the database
     * If hard is true, it will drop all tables
     * If hard is false, it will only delete all data
     * 
     * 
     *
     * @async
     * @param {boolean} hard
     * @returns {unknown}
     */
    async reset(hard: boolean) {
        return attemptAsync(async () => {
            // TODO: This function only works for struct tables
            const tables = (await this.getStructTables()).unwrap();
            if (hard) {
                // drop all tables
                resolveAll(
                    await Promise.all(
                        tables.map(table => {
                            return this.unsafe.run(
                                Query.build(`DROP TABLE ${table};`)
                            );
                        })
                    )
                ).unwrap();
                this.initialized = false;
            } else {
                // delete all data
                resolveAll(
                    await Promise.all(
                        tables.map(table => {
                            return this.unsafe.run(
                                Query.build(`DELETE FROM ${table};`)
                            );
                        })
                    )
                ).unwrap();
            }
        });
    }

    /**
     * Initializes the database
     * This function will create the Structs and Git tables if they do not exist
     * It will also update all tables to the latest version
     * It will also create a backup of the current state
     *
     * @async
     * @returns {unknown}
     */
    async init() {
        return attemptAsync(async () => {
            if (this.initialized) return;
            // this query must be safe from repeated calls
            (
                await this.unsafe.run(
                    Query.build(`
                        CREATE TABLE IF NOT EXISTS Structs (
                            name TEXT PRIMARY KEY,
                            schema TEXT NOT NULL
                        );

                        CREATE TABLE IF NOT EXISTS Git (
                            branch TEXT PRIMARY KEY,
                            commit TEXT NOT NULL
                        );
                `)
                )
            ).unwrap();

            // Is git branch information necessary now?
            // the system below should handle the issues that git branch information would solve

            // answer: yes, git information is necessary
            // if a user makes 2 branches that update the schema of a table in different ways, but have the same version numbers,
            // the system would stay on the first branch and never update to the second branch

            let currentGit = (
                await this.unsafe.get<{
                    branch: string;
                    commit: string;
                }>(
                    Query.build(`
                    SELECT *
                    FROM Git
                `)
                )
            ).unwrap();
            const [branch, commit] = await Promise.all([
                gitBranch(),
                gitCommit()
            ]);

            const b = branch.unwrap();
            const c = commit.unwrap();

            if (!currentGit) {
                currentGit = {
                    branch: b,
                    commit: c
                };
            }

            (
                await this.unsafe.run(
                    Query.build(`
                        DELETE FROM Git;
                `)
                )
            ).unwrap();

            (
                await this.unsafe.run(
                    Query.build(`
                        INSERT INTO Git (branch, commit)
                        VALUES (:branch, :commit);
                `, {
                        branch: b,
                        commit: c
                    })
                )
            ).unwrap();

            const dir = (await this.makeCurrentBackupDir()).unwrap();

            // each table has its own Major, minor, patch
            // for each table version that needs to be made, make a backup before updating
            // If current runtime version is lower than the version in the database, revert state to the latest backup in the branch or purge if no backup
            // update all tables to latest backup state
            // make a backup of the current state
            // TODO: test if the previous state is the same as the backup
            // TODO: optimize by merging states
            // if there is new stuff in new state, merge it with the backup
            // if there is new stuff in both states, user must resolve
            // if so, do nothing
            // if not, purge and set the table to the backup state

            const tables = (await this.getStructTables()).unwrap();

            // TODO: Parallelize
            for (const table of tables) {
                const tv = table.version;

                const versions = (await table.getVersions()).unwrap();

                const last = versions[versions.length - 1];
                if (last && last.lessThan(tv.major, tv.minor, tv.patch)) {
                    // this assumes the schema in the runtime struct is correct
                    // the runtime struct should insert the correct schema into the database
                    // so delete the struct from the structs table and reinsert all data

                    const backup = (await table.backup(dir)).unwrap();
                    try {
                        (await table.clear()).unwrap();

                        (
                            await this.unsafe.run(
                                Query.build(
                                    `
                                DELETE FROM Structs
                                WHERE name = :name;
                            `,
                                    {
                                        name: table.name
                                    }
                                )
                            )
                        ).unwrap();

                        const backups = table.getBackups();
                        BACKUP: for await (const backup of backups) {
                            const data = (await backup.read()).unwrap();
                            if (
                                data.version.major === tv.major &&
                                data.version.minor === tv.minor &&
                                data.version.patch === tv.patch
                            ) {
                                // apply data
                                await Promise.all(
                                    data.data.map(async d => {
                                        const keys = Object.keys(d);
                                        const q = Query.build(
                                            `
                                                INSERT INTO ${table.name} (${keys.join(', ')})
                                                VALUES (${keys.map(k => `:${k}`).join(', ')});
                                            `,
                                            d as Parameter
                                        );
                                        return this.unsafe.run(q);
                                    })
                                );
                                break BACKUP;
                            }
                        }
                    } catch (e) {
                        error(e);
                        error(
                            new DatabaseError(
                                `Failed to clear and update table ${table.name}`
                            )
                        );
                        await backup.restore();
                        process.exit(1);
                    }
                }

                VERSION: for (const version of versions) {
                    if (version.greaterThan(tv.major, tv.minor, tv.patch)) {
                        const backup = (await table.backup(dir)).unwrap();
                        try {
                            await version.update(this);
                        } catch (e) {
                            error(e);
                            await backup.restore();
                            break VERSION;
                        }

                        // if the update is successful, update the version
                        tv.major = version.major;
                        tv.minor = version.minor;
                        tv.patch = version.patch;

                        (
                            await this.unsafe.run(
                                Query.build(
                                    `
                                UPDATE Structs
                                SET major = :major, minor = :minor, patch = :patch
                                WHERE name = :name;
                                `,
                                    {
                                        name: table.name,
                                        major: version.major,
                                        minor: version.minor,
                                        patch: version.patch
                                    }
                                )
                            )
                        ).unwrap();
                    }
                }
            }

            this.initialized = true;
        });
    }

    /**
     * Makes a backup of the current state of the database
     *
     * @public
     * @async
     * @returns {unknown}
     */
    public async backup() {
        return attemptAsync(async () => {
            const dir = (await this.makeCurrentBackupDir()).unwrap();

            const tables = (await this.getStructTables()).unwrap();

            return Promise.all(tables.map(table => table.backup(dir)));
        });
    }

    /**
     * Creates the directory for the current backup
     *
     * @private
     * @returns {*}
     */
    private makeCurrentBackupDir() {
        return attemptAsync(async () => {
            const now = new Date().toISOString();

            await fs.promises.mkdir(
                path.resolve(__dirname, '../../storage/db/backups/', now),
                { recursive: true }
            );

            return now;
        });
    }

    /**
     * Creates a dump file of the database
     *
     * @public
     * @async
     * @returns {unknown}
     */
    public async dump() {
        return attemptAsync(async () => {
            const dir = (await this.makeCurrentBackupDir()).unwrap();
        });
    }

    /**
     * Restores the database from a dump file
     *
     * @public
     * @async
     * @param {string} path
     * @returns {unknown}
     */
    public async restore(path: string) {
        return attemptAsync(async () => {});
    }
}
