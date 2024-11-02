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

class DatabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseError';
    }
}

export interface DatabaseInterface {
    query<T extends Record<string, unknown>>(
        query: Query
    ): Promise<Result<QueryResult<T>>>;
    connect(): Promise<Result<boolean>>;
    dump(target: string): Promise<Result<void>>;
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
            if (!result.rows) result.rows = [];
            return new QueryResult<T>(result.rows, query);
        });
    }

    public async connect(): Promise<Result<boolean>> {
        return attemptAsync(async () => {
            await this.client.connect();
            return true;
        });
    }

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
        return attemptAsync(async () => {
            return this.db.query(query);
        });
    }
}

class Col {
    constructor(
        public readonly name: string,
        public readonly type: string,
        public readonly table: StructTable
    ) {}
}

class TableBackup {
    constructor(
        public readonly date: string,
        public readonly table: string,
        public readonly database: Database
    ) {}

    restore() {
        return attemptAsync(async () => {});
    }

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

class StructTable {
    constructor(
        public readonly name: string,
        public readonly version: {
            major: number;
            minor: number;
            patch: number;
        },
        public readonly database: Database
    ) {}

    public async getCols() {
        return attemptAsync(async () => {
            const res = await this.database.unsafe.all<{
                column_name: string;
                data_type: string;
            }>(
                Query.build(
                    `
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = :table
                `,
                    { table: this.name }
                )
            );
            if (res.isOk()) {
                return res.value.map(
                    r => new Col(r.column_name, r.data_type, this)
                );
            }
            throw res.error;
        });
    }

    public async getVersions() {
        return attemptAsync(async () => {
            const versions = (await getVersions()).unwrap();
            return versions.filter(v => v.struct === this.name);
        });
    }

    public async *getBackups() {
        const dbBackups = (
            await fs.promises.readdir(
                path.resolve(__dirname, '../../storage/db/backups/')
            )
        )
            .map(d => new Date(d))
            .filter(d => d.toString() === 'Invalid Date')
            .sort((a, b) => {
                if (a > b) return -1;
                if (a < b) return 1;
                return 0;
            })
            .map(d => d.toISOString());

        for (const dir of dbBackups) {
            const backupPath = path.resolve(
                __dirname,
                '../../storage/db/backups/',
                dir
            );

            const stats = await fs.promises.stat(backupPath);
            if (stats.isDirectory()) {
                const backupFiles = await fs.promises.readdir(backupPath);
                for (const file of backupFiles) {
                    if (file.endsWith('.table')) {
                        const tableName = file.replace('.table', '');
                        if (tableName === this.name) {
                            yield new TableBackup(
                                dir,
                                tableName,
                                this.database
                            );
                        }
                    }
                }
            }
        }
    }

    public async backup(dir: string) {
        return attemptAsync(async () => {
            const data = (
                await this.database.unsafe.all<{
                    [key: string]: unknown;
                }>(Query.build(`SELECT * FROM ${this.name}`))
            ).unwrap();

            const str = JSON.stringify(
                {
                    data,
                    version: this.version
                },
                null,
                2
            );

            await fs.promises.writeFile(
                path.resolve(
                    __dirname,
                    `../../storage/db/backups/${dir}/${this.name}.table`
                ),
                str
            );

            return new TableBackup(dir, this.name, this.database);
        });
    }

    public async clear() {
        return attemptAsync(async () => {
            return this.database.unsafe.run(
                Query.build(`DELETE FROM ${this.name}`)
            );
        });
    }
}

export class Database {
    public readonly unsafe: UnsafeDatabase;

    constructor(public readonly db: DatabaseInterface) {
        this.unsafe = new UnsafeDatabase(db);
    }

    public readonly Query = Query;

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

    async getStructs() {
        return this.unsafe.all<{
            name: string;
            schema: string;
            major: number;
            minor: number;
            patch: number;
        }>(
            Query.build(`
                    SELECT *
                    FROM Structs
                `)
        );
    }

    async getStructTables(): Promise<Result<StructTable[]>> {
        return attemptAsync(async () => {
            const structs = (await this.getStructs()).unwrap();

            const res = await this.unsafe.all<{ tableName: string }>(
                Query.build(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name;
            `)
            );

            if (res.isOk()) {
                return res.value
                    .map(r =>
                        capitalize(toCamelCase(fromSnakeCase(r.tableName)))
                    )
                    .filter(table => structs.find(s => s.name === table))
                    .map(table => {
                        const struct = structs.find(s => s.name === table);
                        if (!struct)
                            throw new DatabaseError(
                                `Struct ${table} not found in Structs table. This should never happen!!! :(`
                            );
                        return new StructTable(
                            table,
                            {
                                major: struct.major,
                                minor: struct.minor,
                                patch: struct.patch
                            },
                            this
                        );
                    });
            }
            throw res.error;
        });
    }

    async reset(hard: boolean) {
        return attemptAsync(async () => {
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

    async init() {
        return attemptAsync(async () => {
            if (this.initialized) return;
            // this query must be safe from repeated calls
            (
                await this.unsafe.run(
                    Query.build(`
                        CREATE TABLE IF NOT EXISTS Structs (
                            name TEXT PRIMARY KEY,
                            schema TEXT NOT NULL,
                            major INTEGER NOT NULL,
                            minor INTEGER NOT NULL,
                            patch INTEGER NOT NULL
                        );

                        -- CREATE TABLE IF NOT EXISTS Git (
                        --     branch TEXT PRIMARY KEY,
                        --     commit TEXT NOT NULL
                        -- );
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

    public async backup() {
        return attemptAsync(async () => {
            const dir = (await this.makeCurrentBackupDir()).unwrap();

            const tables = (await this.getStructTables()).unwrap();

            return Promise.all(tables.map(table => table.backup(dir)));
        });
    }

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

    public async dump() {
        return attemptAsync(async () => {
            const dir = (await this.makeCurrentBackupDir()).unwrap();
        });
    }

    public async restore(path: string) {
        return attemptAsync(async () => {});
    }
}
