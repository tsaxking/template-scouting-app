import {
    attempt,
    attemptAsync,
    resolveAll,
    Result
} from '../../../shared/check';
import {
    Database,
    Parameter,
    Query
} from '../../utilities/database/databases-2';
import { uuid } from '../../utilities/uuid';
import { Route, ServerFunction } from '../app/app';
import { match } from '../../../shared/match';
import { validate } from '../../middleware/data-type';
import { Status } from '../../utilities/status';

/*
Questions:
- Say I want to emit only to a specific room, how would this be configured?
    - Should I have a room for each emittable action?
*/

export type SQL_Type =
    | 'integer'
    | 'bigint'
    | 'text'
    | 'boolean'
    | 'real'
    | 'numeric';

export type TS_Types = 'number' | 'string' | 'object' | 'boolean' | 'unknown';

const type = <T extends SQL_Type>(type: T): TS_TypeStr<T> => {
    switch (type) {
        case 'integer':
        case 'bigint':
        case 'real':
        case 'numeric':
            return 'number' as TS_TypeStr<T>;
        case 'text':
            return 'string' as TS_TypeStr<T>;
        case 'boolean':
            return 'boolean' as TS_TypeStr<T>;
        default:
            return 'unknown';
    }
};

export type TS_Type<T extends SQL_Type> =
    | (T extends 'integer'
          ? number
          : T extends 'bigint'
            ? number
            : T extends 'text'
              ? string
              : T extends 'json'
                ? object
                : T extends 'boolean'
                  ? boolean
                  : T extends 'real'
                    ? number
                    : T extends 'numeric'
                      ? number
                      : never)
    | unknown;

// for runtime
export type TS_TypeStr<T extends SQL_Type> =
    | (T extends 'integer'
          ? 'number'
          : T extends 'bigint'
            ? 'number'
            : T extends 'text'
              ? 'string'
              : T extends 'json'
                ? 'object'
                : T extends 'boolean'
                  ? 'boolean'
                  : T extends 'real'
                    ? 'number'
                    : T extends 'numeric'
                      ? 'number'
                      : never)
    | 'unknown';

export type TS_TypeActual<T extends TS_Types> = T extends 'number'
    ? number
    : T extends 'string'
      ? string
      : T extends 'object'
        ? object
        : T extends 'boolean'
          ? boolean
          : never;

type StructActions =
    | 'update'
    | 'delete'
    | 'archive'
    | 'unarchive'
    | 'create'
    | 'version'
    | 'read';

export type Callable<T extends Blank> = {
    [key: string]: (
        struct: Struct<T, Callable<T>, LocalCallable<T>>,
        ...params: string[]
    ) => unknown;
};

export type LocalCallable<T extends Blank> = {
    [key: string]: (
        data: Data<T, Callable<T>, LocalCallable<T>>,
        ...params: string[]
    ) => unknown;
};

type StructBuilder<
    T extends Blank,
    C extends Callable<T>,
    L extends LocalCallable<T>
> = {
    name: string;
    structure: T; // omit id because it will always be included as a uuid primary key
    database: Database;
    callables?: C;
    dataCallables?: L;
    versionHistory?: {
        type: 'days' | 'versions';
        amount: number;
    };
};

const newGlobalCols = () => {
    return {
        id: uuid(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        archived: false
    };
};

export const prove = <T extends Blank, D>(
    data: D,
    structure: Blank
): Result<boolean> => {
    return attempt(() => {
        if (!data || typeof data !== 'object') {
            return false;
        }

        const keys = Object.keys(data);
        if (keys.length === 0) {
            return false;
        }

        const keysMatch = keys.every(k => Object.keys(structure).includes(k));
        if (!keysMatch) {
            return false;
        }

        const typesMatch = keys.every(k => {
            const type = structure[k];
            const value = (data as Record<string, unknown>)[k];
            if (
                type === 'integer' ||
                type === 'bigint' ||
                type === 'real' ||
                type === 'numeric'
            ) {
                return typeof value === 'number';
            } else if (type === 'text') {
                return typeof value === 'string';
            } else if (type === 'boolean') {
                return typeof value === 'boolean';
            }
            return false;
        });

        return typesMatch as D extends Structable<T> ? true : false;
    });
};

type GlobalCols = {
    id: 'text';
    created: 'text';
    updated: 'text';
    archived: 'boolean';
};

export type ColMap<
    Cols extends {
        [key: string]: SQL_Type;
    }
> = {
    [K in keyof Cols]: Column<Cols[K], Cols>;
};

export class Column<Type extends SQL_Type, StructType extends Blank> {
    public readonly type: TS_TypeStr<Type>;

    constructor(
        public readonly name: string,
        public readonly sqlType: SQL_Type,
        public readonly struct: Struct<
            StructType,
            Callable<StructType>,
            LocalCallable<StructType>
        >
    ) {
        this.type = match<SQL_Type, TS_TypeStr<typeof this.sqlType>>(
            this.sqlType
        )
            .case('integer', () => 'number')
            .case('bigint', () => 'number')
            .case('text', () => 'string')
            .case('boolean', () => 'boolean')
            .case('real', () => 'number')
            .case('numeric', () => 'number')
            .default(() => 'unknown')
            .exec()
            .unwrap() as TS_TypeStr<Type>;
    }
}

export type Blank = {
    [key: string]: SQL_Type;
};

type Structable<T extends Blank> = {
    [K in keyof T]: TS_TypeActual<Column<T[K], T>['type']>;
};

export class DataVersion<
    T extends Blank,
    C extends Callable<T>,
    L extends LocalCallable<T>
> {
    constructor(
        public readonly struct: Struct<T, C, L>,
        public readonly data: Structable<
            T &
                GlobalCols & {
                    vhId: 'text';
                    vhCreated: 'text';
                }
        >
    ) {}

    get vhId() {
        return this.data.vhId;
    }

    get vhCreated() {
        return new Date(this.data.vhCreated);
    }

    get id() {
        return this.data.id;
    }

    get created() {
        return new Date(this.data.created);
    }

    get updated() {
        return new Date(this.data.updated);
    }

    get archived() {
        return this.data.archived;
    }

    delete() {
        return attemptAsync(async () => {
            const query = Query.build(
                `
                DELETE FROM ${this.struct.data.name}History
                WHERE vhId = :vhId
            `,
                {
                    vhId: this.data.vhId
                }
            );

            (await this.struct.data.database.unsafe.run(query)).unwrap();
        });
    }

    restore() {
        return attemptAsync(async () => {
            const current = (await this.struct.fromId(this.data.id)).unwrap();
            if (!current) throw new Error('Current data not found');

            await current.update(this.data);
        });
    }
}

export class Data<
    T extends Blank,
    C extends Callable<T>,
    L extends LocalCallable<T>
> {
    constructor(
        public readonly struct: Struct<T, C, L>,
        public readonly data: Structable<T & GlobalCols>
    ) {}

    get id() {
        return this.data.id;
    }

    get created() {
        return new Date(this.data.created);
    }

    get updated() {
        return new Date(this.data.updated);
    }

    get archived() {
        return this.data.archived;
    }

    update(data: Partial<Structable<T>>) {
        return attemptAsync(async () => {
            await this.createVersion();

            if (!this.struct.validate(data))
                throw new Error(
                    `Invalid data recieved for ${this.struct.name}`
                );

            const query = Query.build(
                `
                    UPDATE ${this.struct.data.name}
                    SET ${Object.keys(data)
                        .map(k => `${k} = :${k}`)
                        .join(', ')},
                        updated = :updated
                    WHERE id = :id
                `,
                {
                    ...this.data,
                    ...data
                } as Parameter
            );

            (await this.struct.data.database.unsafe.run(query)).unwrap();

            Object.assign(this.data, data);
        });
    }

    delete() {
        return attemptAsync(async () => {
            await this.createVersion();
            const query = Query.build(
                `
                DELETE FROM ${this.struct.data.name}
                WHERE id = :id
            `,
                {
                    id: this.data.id
                }
            );

            (await this.struct.data.database.unsafe.run(query)).unwrap();
        });
    }

    setArchive(archive: boolean) {
        return attemptAsync(async () => {
            const query = Query.build(
                `
                UPDATE ${this.struct.data.name}
                SET archived = :archive
                WHERE id = :id
            `,
                {
                    id: this.data.id,
                    archive
                }
            );

            (await this.struct.data.database.unsafe.run(query)).unwrap();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.data.archived = archive as any;
        });
    }

    getVersionHistory() {
        return attemptAsync(async () => {
            if (!this.struct.data.versionHistory) {
                throw new Error('Version history not enabled');
            }

            const { type, amount } = this.struct.data.versionHistory;

            const query = Query.build(
                `
                SELECT * FROM ${this.struct.data.name}History
                WHERE id = :id
            `,
                {
                    id: this.data.id
                }
            );

            const versions = (
                await this.struct.data.database.unsafe.all<Structable<T>>(query)
            )
                .unwrap()
                .map(d => new DataVersion(this.struct, d));
            // sort by date created (oldest first)
            versions.sort(
                (a, b) => a.vhCreated.getTime() - b.vhCreated.getTime()
            );

            // TODO: validate version state

            if (type === 'versions') {
                const toRemove = versions.splice(0, versions.length - amount);
                await Promise.all(toRemove.map(v => v.delete()));
                return versions;
            } else if (type === 'days') {
                const toRemove = versions.filter(
                    v =>
                        v.vhCreated.getTime() <
                        new Date().getTime() - amount * 24 * 60 * 60 * 1000
                );
                await Promise.all(toRemove.map(v => v.delete()));
                return versions.filter(
                    v =>
                        v.vhCreated.getTime() >=
                        new Date().getTime() - amount * 24 * 60 * 60 * 1000
                );
            }
        });
    }

    createVersion() {
        return attemptAsync(async () => {
            if (!this.struct.data.versionHistory) {
                throw new Error('Version history not enabled');
            }

            const vhId = uuid();
            const query = Query.build(
                `
                INSERT INTO ${this.struct.data.name}History (
                    ${Object.keys(this.data).join(', ')},
                    vhId,
                    vhCreated
                )
                VALUES (${Object.keys(this.data)
                    .map(k => `:${k}`)
                    .join(', ')})
            `,
                {
                    ...this.data,
                    vhId,
                    vhCreated: new Date().toISOString()
                } as Parameter
            );

            (await this.struct.data.database.unsafe.run(query)).unwrap();

            return new DataVersion(this.struct, {
                ...this.data,
                vhId
            });
        });
    }

    // call<K extends keyof C>(fn: K, data: this): Promise<Result<C[K]>> {
    //     return attemptAsync(async () => {
    //         const callable = this.struct.data.callables?.[fn];
    //         if (!callable) throw new Error(`Callable ${String(fn)} for ${this.struct.name} not found`);

    //         return callable(data);
    //     });
    // }
}

export class Struct<
    T extends Blank,
    C extends Callable<T>,
    L extends LocalCallable<T>
> {
    private static structs = new Map<
        string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Struct<any, Callable<any>, LocalCallable<any>>
    >();

    public static buildAll() {
        return attemptAsync(async () => {
            return resolveAll(
                await Promise.all(
                    Array.from(Struct.structs.values()).map(s => s.build())
                )
            ).unwrap();
        });
    }

    public readonly route = new Route();

    private built = false;

    private readonly routers: Record<StructActions, Route> = {
        create: new Route(),
        update: new Route(),
        delete: new Route(),
        read: new Route(),
        archive: new Route(),
        unarchive: new Route(),
        version: new Route()
    };

    public readonly callables: {
        [key in keyof L]: (...parameters: string[]) => Promise<Result<unknown>>;
    };

    public readonly cols: Readonly<ColMap<T>>;

    constructor(public readonly data: StructBuilder<T, C, L>) {
        this.route.route('/create', this.routers.create);
        this.route.route('/update', this.routers.update);
        this.route.route('/delete', this.routers.delete);
        this.route.route('/read', this.routers.read);
        this.route.route('/archive', this.routers.archive);
        this.route.route('/unarchive', this.routers.unarchive);
        this.route.route('/version', this.routers.version);

        const cols = Object.keys(data.structure).map(k => k.toLowerCase());
        if (
            ['id', 'created', 'updated', 'archived'].some(k => cols.includes(k))
        ) {
            throw new Error(
                `${this.data.name} Struct cannot use id, created, updated, or archived as column names as they are reserved. Please remove ${cols.filter(k => ['id', 'created', 'updated', 'archived'].includes(k)).join(', ')}`
            );
        }

        this.cols = Object.entries(data.structure).reduce(
            (acc, [key, value]) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (acc as any)[key] = new Column(key, value, this);
                return acc;
            },
            {} as ColMap<T>
        );

        this.callables = Object.entries(data.callables || {}).reduce(
            (acc, [key, value]) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (acc as any)[key] = (...parameters: string[]) => {
                    return attemptAsync(async () => {
                        if (!this.built) {
                            throw new Error(
                                `Struct ${this.data.name} not built yet`
                            );
                        }

                        return value(this, ...parameters);
                    });
                };
                return acc;
            },
            {} as {
                [key in keyof L]: (
                    ...parameters: string[]
                ) => Promise<Result<unknown>>;
            }
        );

        if (Struct.structs.has(this.data.name)) {
            throw new Error(`Struct ${this.data.name} already exists`);
        }
        Struct.structs.set(this.data.name, this);
    }

    get name() {
        return this.data.name;
    }

    build() {
        if (this.built)
            throw new Error(`Struct ${this.data.name} already built`);
        return attemptAsync(async () => {
            const current = (
                await this.data.database.unsafe.get<{
                    schema: string;
                    name: string;
                    version: number;
                }>(
                    Query.build('SELECT * FROM Structs WHERE name = :name', {
                        name: this.data.name
                    })
                )
            ).unwrap();

            if (current) {
                const cols = Object.keys(this.data.structure).map(k =>
                    k.toLowerCase()
                );
                const currentCols = Object.keys(JSON.parse(current.schema)).map(
                    k => k.toLowerCase()
                );

                const throwErr = () => {
                    throw new Error(
                        `Struct ${this.data.name} already exists with different columns. Please remove ${cols.filter(c => !currentCols.includes(c)).join(', ')}`
                    );
                };

                if (!cols.every(c => currentCols.includes(c))) {
                    throwErr();
                }

                if (!currentCols.every(c => cols.includes(c))) {
                    throwErr();
                }

                if (
                    currentCols.some(
                        c =>
                            cols[c as keyof typeof cols] !==
                            currentCols[c as keyof typeof currentCols]
                    )
                ) {
                    throwErr();
                }
            } else {
                await this.data.database.unsafe.run(
                    Query.build(
                        `
                    INSERT INTO Tables (name, schema)
                    VALUES (:name, :schema)
                `,
                        {
                            name: this.data.name,
                            schema: JSON.stringify(this.data.structure)
                        }
                    )
                );
            }

            const query = Query.build(
                `
                    CREATE TABLE IF NOT EXISTS ${this.data.name} (
                        id text PRIMARY KEY,
                        created text NOT NULL,
                        updated text NOT NULL,
                        archived boolean NOT NULL,
                        ${Object.entries(this.data.structure)
                            .map(([key, value]) => {
                                return `${key} ${value}`;
                            })
                            .join(', ')}
                    );
                `
            );

            (await this.data.database.unsafe.run(query)).unwrap();

            if (this.data.versionHistory) {
                const query = Query.build(`
                    CREATE TABLE IF NOT EXISTS ${this.data.name}History (
                        vhId text PRIMARY KEY,
                        vhCreated text NOT NULL,
                        id text,
                        created text NOT NULL,
                        updated text NOT NULL,
                        archived boolean NOT NULL,
                        ${Object.entries(this.data.structure)
                            .map(([key, value]) => {
                                return `${key} ${value}`;
                            })
                            .join(', ')}
                    );
                `);

                (await this.data.database.unsafe.run(query)).unwrap();
            }
            {
                this.routers.create.post<Structable<T>>(
                    '/',
                    this.validator(false),
                    async (req, res) => {
                        const n = (await this.new(req.body)).unwrap();
                        res.sendCustomStatus(
                            new Status(
                                {
                                    code: 201,
                                    message: `${this.data.name} created successfully`,
                                    color: 'success',
                                    instructions: ''
                                },
                                this.data.name,
                                'Created',
                                '{}',
                                req
                            )
                        );

                        req.io.emit(`struct:${this.data.name}:create`, n.data);
                    }
                );

                this.routers.update.post<Structable<T & GlobalCols>>(
                    '/',
                    this.validator(true),
                    async (req, res) => {
                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) {
                            res.sendCustomStatus(
                                new Status(
                                    {
                                        code: 404,
                                        message: `${this.data.name} not found`,
                                        color: 'danger',
                                        instructions: ''
                                    },
                                    this.data.name,
                                    'Not Found',
                                    '{}',
                                    req
                                )
                            );
                            return;
                        }

                        n.update(req.body);

                        res.sendCustomStatus(
                            new Status(
                                {
                                    code: 200,
                                    message: `${this.data.name} updated successfully`,
                                    color: 'success',
                                    instructions: ''
                                },
                                this.data.name,
                                'Updated',
                                '{}',
                                req
                            )
                        );

                        req.io.emit(`struct:${this.data.name}:update`, n.data);
                    }
                );

                this.routers.read.post<{
                    id: string;
                }>(
                    '/from-id',
                    validate({
                        id: 'string'
                    }),
                    async (req, res) => {
                        const n = (await this.fromId(req.body.id)).unwrap();
                        res.json(n?.data);
                    }
                );

                this.routers.read.post('/all', async (req, res) => {
                    const n = (await this.all()).unwrap();

                    res.json(n.map(d => d.data));
                });

                this.routers.read.post('/archived', async (req, res) => {
                    const n = (await this.archived()).unwrap();
                    res.json(n.map(d => d.data));
                });

                this.routers.version.post<{
                    id: string;
                }>(
                    '/get-version-history',
                    validate({
                        id: 'string'
                    }),
                    async (req, res) => {
                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) {
                            return res.sendCustomStatus(
                                new Status(
                                    {
                                        code: 404,
                                        message: `${this.data.name} not found`,
                                        color: 'danger',
                                        instructions: ''
                                    },
                                    this.data.name,
                                    'Not Found',
                                    '{}',
                                    req
                                )
                            );
                        }
                        const versions = (await n.getVersionHistory()).unwrap();
                        if (!versions) {
                            return res.sendCustomStatus(
                                new Status(
                                    {
                                        code: 404,
                                        message: `No version history found for ${this.data.name}`,
                                        color: 'danger',
                                        instructions: ''
                                    },
                                    this.data.name,
                                    'Not Found',
                                    '{}',
                                    req
                                )
                            );
                        }
                        res.json(versions.map(d => d.data));
                    }
                );

                this.routers.version.post<{
                    id: string;
                    vId: string;
                }>(
                    '/restore-version',
                    validate({
                        id: 'string',
                        vId: 'string'
                    }),
                    async (req, res) => {
                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) {
                            return res.sendCustomStatus(
                                new Status(
                                    {
                                        code: 404,
                                        message: `${this.data.name} not found`,
                                        color: 'danger',
                                        instructions: ''
                                    },
                                    this.data.name,
                                    'Not Found',
                                    '{}',
                                    req
                                )
                            );
                        }

                        const version = (await n.getVersionHistory())
                            .unwrap()
                            ?.find(v => v.vhId === req.body.vId);
                        if (!version) {
                            return res.sendCustomStatus(
                                new Status(
                                    {
                                        code: 404,
                                        message: `Version not found for ${this.data.name}`,
                                        color: 'danger',
                                        instructions: ''
                                    },
                                    this.data.name,
                                    'Not Found',
                                    '{}',
                                    req
                                )
                            );
                        }

                        (await version.restore()).unwrap();

                        res.sendCustomStatus(
                            new Status(
                                {
                                    code: 200,
                                    message: `${this.data.name} restored successfully`,
                                    color: 'success',
                                    instructions: ''
                                },
                                this.data.name,
                                'Restored',
                                '{}',
                                req
                            )
                        );

                        req.io.emit(`struct:${this.data.name}:restore`, n.data);
                    }
                );

                this.routers.version.post<{
                    id: string;
                    vhId: string;
                }>(
                    '/delete-version',
                    validate({
                        id: 'string',
                        vhId: 'string'
                    }),
                    async (req, res) => {
                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) {
                            return res.sendCustomStatus(
                                new Status(
                                    {
                                        code: 404,
                                        message: `${this.data.name} not found`,
                                        color: 'danger',
                                        instructions: ''
                                    },
                                    this.data.name,
                                    'Not Found',
                                    '{}',
                                    req
                                )
                            );
                        }

                        const version = (await n.getVersionHistory())
                            .unwrap()
                            ?.find(v => v.vhId === req.body.vhId);
                        if (!version) {
                            return res.sendCustomStatus(
                                new Status(
                                    {
                                        code: 404,
                                        message: `Version not found for ${this.data.name}`,
                                        color: 'danger',
                                        instructions: ''
                                    },
                                    this.data.name,
                                    'Not Found',
                                    '{}',
                                    req
                                )
                            );
                        }

                        (await version.delete()).unwrap();

                        res.sendCustomStatus(
                            new Status(
                                {
                                    code: 200,
                                    message: `${this.data.name} version deleted successfully`,
                                    color: 'success',
                                    instructions: ''
                                },
                                this.data.name,
                                'Deleted',
                                '{}',
                                req
                            )
                        );

                        req.io.emit(
                            `struct:${this.data.name}:delete-version`,
                            n.data
                        );
                    }
                );

                this.routers.delete.post<{
                    id: string;
                }>(
                    '/',
                    validate({
                        id: 'string'
                    }),
                    async (req, res) => {
                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) {
                            res.sendCustomStatus(
                                new Status(
                                    {
                                        code: 404,
                                        message: `${this.data.name} not found`,
                                        color: 'danger',
                                        instructions: ''
                                    },
                                    this.data.name,
                                    'Not Found',
                                    '{}',
                                    req
                                )
                            );
                            return;
                        }

                        n.delete();

                        res.sendCustomStatus(
                            new Status(
                                {
                                    code: 200,
                                    message: `${this.data.name} deleted successfully`,
                                    color: 'success',
                                    instructions: ''
                                },
                                this.data.name,
                                'Deleted',
                                '{}',
                                req
                            )
                        );

                        req.io.emit(`struct:${this.data.name}:delete`, n.data);
                    }
                );

                this.routers.archive.post<{
                    id: string;
                }>(
                    '/',
                    validate({
                        id: 'string'
                    }),
                    async (req, res) => {
                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) {
                            res.sendCustomStatus(
                                new Status(
                                    {
                                        code: 404,
                                        message: `${this.data.name} not found`,
                                        color: 'danger',
                                        instructions: ''
                                    },
                                    this.data.name,
                                    'Not Found',
                                    '{}',
                                    req
                                )
                            );
                            return;
                        }

                        n.setArchive(true);

                        res.sendCustomStatus(
                            new Status(
                                {
                                    code: 200,
                                    message: `${this.data.name} archived successfully`,
                                    color: 'success',
                                    instructions: ''
                                },
                                this.data.name,
                                'Archived',
                                '{}',
                                req
                            )
                        );

                        req.io.emit(`struct:${this.data.name}:archive`, n.data);
                    }
                );

                this.routers.unarchive.post<{
                    id: string;
                    vId: string;
                }>(
                    '/',
                    validate({
                        id: 'string',
                        vId: 'string'
                    }),
                    async (req, res) => {
                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) {
                            res.sendCustomStatus(
                                new Status(
                                    {
                                        code: 404,
                                        message: `${this.data.name} not found`,
                                        color: 'danger',
                                        instructions: ''
                                    },
                                    this.data.name,
                                    'Not Found',
                                    '{}',
                                    req
                                )
                            );
                            return;
                        }

                        n.setArchive(false);

                        res.sendCustomStatus(
                            new Status(
                                {
                                    code: 200,
                                    message: `${this.data.name} unarchived successfully`,
                                    color: 'success',
                                    instructions: ''
                                },
                                this.data.name,
                                'Unarchived',
                                '{}',
                                req
                            )
                        );

                        req.io.emit(
                            `struct:${this.data.name}:unarchive`,
                            n.data
                        );
                    }
                );
            }
            this.built = true;
        });
    }

    getVersion() {
        return attemptAsync(async () => {
            const query = Query.build(
                'SELECT version FROM Tables WHERE name = :name'
            );
            return (
                (
                    await this.data.database.unsafe.get<{ version: number }>(
                        query
                    )
                ).unwrap()?.version || -1
            );
        });
    }

    new(data: Structable<T>) {
        if (!this.built) throw new Error(`Struct ${this.data.name} not built`);
        return attemptAsync(async () => {
            if (!this.validate(data))
                throw new Error(`Invalid data for ${this.data.name}`);

            const d = new Data<T, C, L>(this, {
                ...newGlobalCols(),
                ...data
            });

            const query = Query.build(
                `
                INSERT INTO ${this.data.name} (${Object.keys(d.data).join(', ')})
                VALUES (${Object.keys(d.data)
                    .map(k => `:${k}`)
                    .join(', ')})
                `,
                d.data as Parameter
            );

            (await this.data.database.unsafe.run(query)).unwrap();

            return d;
        });
    }

    fromId(id: string) {
        if (!this.built) throw new Error(`Struct ${this.data.name} not built`);
        return attemptAsync(async () => {
            const query = Query.build(
                `SELECT * FROM ${this.data.name} WHERE id = :id`,
                { id }
            );

            const data = (
                await this.data.database.unsafe.get<Structable<T>>(query)
            ).unwrap();

            if (!data) return undefined;

            const invalid = !this.validate(data);
            if (invalid)
                throw new Error(
                    `Invalid data found in database. ${this.name}:${data.id} is corrupted`
                );

            return new Data<T, C, L>(this, data);
        });
    }

    all(includeArchived: boolean = false) {
        if (!this.built) throw new Error(`Struct ${this.data.name} not built`);
        return attemptAsync(async () => {
            const query = Query.build(`SELECT * FROM ${this.data.name}`);

            const data = (
                await this.data.database.unsafe.all<Structable<T>>(query)
            ).unwrap();

            const invalid = data.filter(d => !this.validate(d));
            if (invalid.length)
                throw new Error(
                    `Invalid data found in database. ${this.name} is corrupted` +
                        invalid.map(d => d.id).join(', ')
                );

            return data
                .map(d => new Data<T, C, L>(this, d))
                .filter(d => includeArchived || !d.data.archived);
        });
    }

    archived() {
        if (!this.built) throw new Error(`Struct ${this.data.name} not built`);
        return attemptAsync(async () => {
            const query = Query.build(
                `SELECT * FROM ${this.data.name} WHERE archived = true`
            );

            const data = (
                await this.data.database.unsafe.all<Structable<T>>(query)
            ).unwrap();

            const invalid = data.filter(d => !this.validate(d));
            if (invalid.length)
                throw new Error(
                    `Invalid data found in database. ${this.name} is corrupted` +
                        invalid.map(d => d.id).join(', ')
                );

            return data.map(d => new Data<T, C, L>(this, d));
        });
    }

    validate(data: unknown) {
        return prove(data, this.data.structure);
    }

    validator(defaults: boolean) {
        return validate({
            ...(defaults
                ? {
                      id: 'string',
                      created: 'string',
                      updated: 'string',
                      archived: 'boolean'
                  }
                : {}),
            ...Object.entries(this.data.structure).reduce((acc, cur) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (acc as any)[cur[0]] = type(cur[1]);
                return acc;
            }, {})
        });
    }

    listen(path: string, ...fns: ServerFunction<Structable<T & GlobalCols>>[]) {
        this.route.post(path, this.validator(true), ...fns);
        return this;
    }

    addPermission(
        type: StructActions,
        ...fns: ServerFunction<Structable<T & GlobalCols>>[]
    ) {
        if (this.built)
            throw new Error(
                `Struct ${this.data.name} already built, cannot add permissions after building.`
            );
        this.routers[type].post('/', this.validator(true), ...fns);
        return this;
    }

    drop() {
        return attemptAsync(async () => {
            const all = (await this.all(true)).unwrap();
            if (all.length) throw new Error('Cannot drop table with data');
        });
    }
}
