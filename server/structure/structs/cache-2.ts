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
import { Account } from './account';
import { EventEmitter } from '../../../shared/event-emitter';
import { Permissions } from './permissions';
import { Session } from './session';
import { Req } from '../app/req';
import { capitalize } from '../../../shared/text';

export class StructError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StructError';
    }
}

export class DataError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DataError';
    }
}

export class FatalStructError extends StructError {
    constructor(message: string) {
        super(message);
    }
}

export class FatalDataError extends DataError {
    constructor(message: string) {
        super(message);
    }
}

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

type StructBuilder<T extends Blank, Name extends string> = {
    name: Name;
    structure: T; // omit id because it will always be included as a uuid primary key
    database: Database;
    versionHistory?: {
        type: 'days' | 'versions';
        amount: number;
    };
    generators?: Partial<{
        id: () => string;
        attributes: () => string[];
    }>;
    // defaults?: Structable<Struct<T, Name>>[];
    // permissions?:
    sample?: boolean;
};

const newGlobalCols = (struct: Struct<Blank, string>) => {
    return {
        id: struct.data.generators?.id?.() || uuid(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        archived: false,
        attributes:
            struct.data.generators
                ?.attributes?.()
                .map(a => a.replaceAll(',', ''))
                .join(',') || ''
    };
};

export const prove = <T extends Blank, D, Name extends string>(
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

        return typesMatch as D extends St<T, Name> ? true : false;
    });
};

export type GlobalCols = {
    id: 'text';
    created: 'text';
    updated: 'text';
    archived: 'boolean';
    attributes: 'text';
};

export type TS_GlobalCols = {
    id: string;
    created: string;
    updated: string;
    archived: boolean;
    attributes: string;
};

export type ColMap<
    Cols extends {
        [key: string]: SQL_Type;
    },
    Name extends string
> = {
    [K in keyof Cols]: Column<Cols[K], Cols, Name>;
};

export class Column<
    Type extends SQL_Type,
    StructType extends Blank,
    Name extends string
> {
    public readonly type: TS_TypeStr<Type>;

    constructor(
        public readonly name: string,
        public readonly sqlType: SQL_Type,
        public readonly struct: Struct<StructType, Name>
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

type St<T extends Blank, Name extends string> = {
    [K in keyof T]: TS_TypeActual<Column<T[K], T, Name>['type']>;
};

export type Structable<SubStruct extends Struct<Blank, string>> = St<
    SubStruct['data']['structure'] & GlobalCols,
    SubStruct['data']['name']
>;
export type BasicStructable<SubStruct extends Struct<Blank, string>> = St<
    SubStruct['data']['structure'],
    SubStruct['data']['name']
>;

export interface DataInterface<S extends Struct<Blank, string>> {
    get id(): string;
    get created(): Date;
    get updated(): Date;
    get archived(): boolean;
    get database(): Database;

    data: St<S['data']['structure'] & GlobalCols, S['data']['name']>;

    struct: S;

    getAttributes(): Result<string[]>;
}

export class DataVersion<T extends Blank, Name extends string>
    implements DataInterface<Struct<T, Name>>
{
    constructor(
        public readonly struct: Struct<T, Name>,
        public readonly data: St<
            T &
                GlobalCols & {
                    vhId: 'text';
                    vhCreated: 'text';
                },
            Name
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

    get database() {
        return this.struct.data.database;
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

            this.struct.emit('delete-version', this);
        });
    }

    restore() {
        return attemptAsync(async () => {
            const current = (await this.struct.fromId(this.data.id)).unwrap();
            if (!current) throw new DataError('Current data not found');

            await current.update(this.data);

            this.struct.emit('restore-version', this);
        });
    }

    getAttributes() {
        return attempt(() => {
            const { attributes } = this.data;
            if (!attributes) throw new FatalDataError('No attributes found');

            const parsed = JSON.parse(attributes);
            if (!Array.isArray(parsed))
                throw new FatalDataError('Attributes not an array');
            if (!parsed.every(a => typeof a === 'string'))
                throw new FatalDataError('Attributes not all strings');

            return parsed;
        });
    }
}

export class StructData<Structure extends Blank, Name extends string>
    implements DataInterface<Struct<Structure, Name>>
{
    constructor(
        public readonly struct: Struct<Structure, Name>,
        public readonly data: Readonly<St<Structure & GlobalCols, Name>>
    ) {
        if (!this.struct.validate(data))
            throw new DataError(
                `Invalid data recieved for ${this.struct.name}`
            );
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

    get database() {
        return this.struct.data.database;
    }

    update(data: Partial<St<Structure, Name>>) {
        return attemptAsync(async () => {
            await this.createVersion();

            if (!this.struct.validate(data))
                throw new DataError(
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

            this.struct.emit('update', this);

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

            this.struct.emit('delete', this);

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

            this.struct.emit(archive ? 'archive' : 'unarchive', this);

            Object.assign(this.data, {
                archived: archive
            });
        });
    }

    getVersionHistory() {
        return attemptAsync(async () => {
            if (!this.struct.data.versionHistory) return 'not-enabled';

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

            let versions = (
                await this.struct.data.database.unsafe.all<St<Structure, Name>>(
                    query
                )
            )
                .unwrap()
                .map(d => new DataVersion(this.struct, d));
            // sort by date created (oldest first)
            versions.sort(
                (a, b) => a.vhCreated.getTime() - b.vhCreated.getTime()
            );

            versions = versions.filter(v =>
                this.struct.validate(v.data).unwrap()
            );

            if (type === 'versions') {
                const toRemove = versions.splice(0, versions.length - amount);
                await Promise.all(toRemove.map(v => v.delete()));
                return versions;
            }

            // type === 'days';
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
        });
    }

    createVersion() {
        return attemptAsync(async () => {
            if (!this.struct.data.versionHistory) {
                throw new DataError('Version history not enabled');
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

            const v = new DataVersion(this.struct, {
                ...this.data,
                vhId
            });

            this.struct.emit('version', v);

            return v;
        });
    }

    getAttributes() {
        return attempt(() => {
            const { attributes } = this.data;
            if (!attributes) throw new FatalDataError('No attributes found');

            const parsed = JSON.parse(attributes);
            if (!Array.isArray(parsed))
                throw new FatalDataError('Attributes not an array');
            if (!parsed.every(a => typeof a === 'string'))
                throw new FatalDataError('Attributes not all strings');

            return parsed;
        });
    }

    addAttributes(...attrs: string[]) {
        return attemptAsync(async () => {
            const attributes = this.getAttributes().unwrap();
            const combined = [...attributes, ...attrs].filter(
                (a, i, arr) => arr.indexOf(a) === i
            );

            (await this.setAttributes(combined)).unwrap();
        });
    }

    removeAttribute(attr: string) {
        return attemptAsync(async () => {
            const attributes = this.getAttributes().unwrap();

            if (!attributes.includes(attr)) return;

            const index = attributes.indexOf(attr);

            attributes.splice(index, 1);

            (await this.setAttributes(attributes)).unwrap();
        });
    }

    setAttributes(attrs: string[]) {
        return attemptAsync(async () => {
            Object.assign(this.data, {
                attributes: JSON.stringify(attrs)
            });

            const query = Query.build(
                `
                UPDATE ${this.struct.data.name}
                SET attributes = :attributes
                WHERE id = :id
            `,
                {
                    id: this.data.id,
                    attributes: JSON.stringify(attrs)
                }
            );

            (await this.struct.data.database.unsafe.run(query)).unwrap();

            this.struct.emit('update', this);
        });
    }
}

export type Data<SubStruct extends Struct<Blank, string>> = StructData<
    SubStruct['data']['structure'],
    SubStruct['data']['name']
>;

export class Struct<Structure extends Blank, Name extends string> {
    private static structs = new Map<
        string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Struct<any, string>
    >();

    public static readonly router = new Route();

    public static buildAll() {
        return attemptAsync(async () => {
            resolveAll(
                await Promise.all(
                    Array.from(Struct.structs.values()).map(s => s.build())
                )
            ).unwrap();

            for (const s of this.structs.values()) {
                Struct.router.route('/' + s.name, s.route);
            }
        });
    }

    private readonly route = new Route();

    private readonly defaults: Structable<Struct<Structure, Name>>[] = [];

    private built = false;

    // private readonly permissions: {
    //     [key: string]: (target: string, data: Data<typeof this>) => boolean;
    // } = {};

    public Generator(data: St<Structure & GlobalCols, Name>) {
        return new StructData<Structure, Name>(this, data);
    }

    public readonly cols: Readonly<ColMap<Structure, Name>>;

    private readonly emitter = new EventEmitter<{
        update: Data<Struct<Structure, Name>>;
        delete: Data<Struct<Structure, Name>>;
        archive: Data<Struct<Structure, Name>>;
        unarchive: Data<Struct<Structure, Name>>;
        create: Data<Struct<Structure, Name>>;
        version: DataVersion<Structure, Name>;
        'restore-version': DataVersion<Structure, Name>;
        'delete-version': DataVersion<Structure, Name>;
        // read: Data<Struct<Structure, Name>>;
        build: void;
    }>();

    public on = this.emitter.on.bind(this.emitter);
    public off = this.emitter.off.bind(this.emitter);
    public emit = this.emitter.emit.bind(this.emitter);

    constructor(public readonly data: StructBuilder<Structure, Name>) {
        if (Struct.structs.has(this.data.name)) {
            throw new FatalStructError(
                `Struct ${this.data.name} already exists`
            );
        }
        Struct.structs.set(this.data.name, this);

        const cols = Object.keys(data.structure).map(k => k.toLowerCase());
        if (
            ['id', 'created', 'updated', 'archived'].some(k => cols.includes(k))
        ) {
            throw new FatalStructError(
                `${this.data.name} Struct cannot use id, created, updated, or archived as column names as they are reserved. Please remove ${cols.filter(k => ['id', 'created', 'updated', 'archived'].includes(k)).join(', ')}`
            );
        }

        this.cols = Object.entries(data.structure).reduce(
            (acc, [key, value]) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (acc as any)[key] = new Column(key, value, this);
                return acc;
            },
            {} as ColMap<Structure, Name>
        );

        // this.route.post<{
        //     id: 'string';
        // }>('/*', validate({
        //     id: 'string',
        // }), async (req, res, next) => {
        //     const functions = this.permissionFunctions.get(req.pathname.replace('/', ''));
        //     if (!functions) return res.sendStatus(new Status(
        //         {
        //             code: 404,
        //             message: 'Not Found',
        //             color: 'danger',
        //             instructions: ''
        //         },
        //         this.data.name,
        //         'Not Found',
        //         '{}',
        //         req
        //     ));

        //     next();
        // });
    }

    get name() {
        return this.data.name;
    }

    get database() {
        return this.data.database;
    }

    /**
     * Creates a sample type of the struct.
     * This should only be used for testing the typesystem, and not be actually run.
     * If this is run at all, it will throw an error.
     *
     * @readonly
     * @type {StructData<Structure, Name>}
     */
    get sample(): StructData<Structure, Name> {
        throw new FatalStructError(
            `${this.name}.sample should never be run. It is only used for testing the typesystm. Remove this in order for the program to run.`
        );
    }

    build() {
        if (this.built)
            throw new FatalStructError(
                `Struct ${this.data.name} already built`
            );
        if (this.data.sample)
            throw new FatalStructError(
                `Sample struct: ${this.data.name}. Not built`
            );
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
                    throw new StructError(
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

            const { defaults } = this;
            if (defaults) {
                // doesn't matter if this throws an error
                await Promise.all(defaults.map(d => this.new(d)));
            }

            const notSignedInStatus = (req: Req) =>
                new Status(
                    {
                        code: 401,
                        message: 'Not Signed In',
                        color: 'danger',
                        instructions: ''
                    },
                    this.data.name,
                    'Not Signed In',
                    '{}',
                    req
                );

            const notPermittedStatus = (req: Req, action: string) =>
                new Status(
                    {
                        code: 403,
                        message: `You are not permitted to perform action: ${capitalize(action)} on ${capitalize(this.data.name)}`,
                        color: 'danger',
                        instructions: ''
                    },
                    this.data.name,
                    'Not Permitted',
                    '{}',
                    req
                );

            const notFoundStatus = (req: Req) =>
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
                );

            const noVersionHistoryStatus = (req: Req) =>
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
                );

            const versionHistoryNotEnabledStatus = (req: Req) =>
                new Status(
                    {
                        code: 404,
                        message: `Version history not enabled for ${this.data.name}`,
                        color: 'danger',
                        instructions: ''
                    },
                    this.data.name,
                    'Not Found',
                    '{}',
                    req
                );

            {
                this.route.post<St<Structure & GlobalCols, Name>>(
                    '/create',
                    this.validator(false),
                    validate({
                        attributes: 'string'
                    }),
                    async (req, res) => {
                        const account = (
                            await Session.getAccount(req.session)
                        ).unwrap();
                        if (!account)
                            return res.sendStatus(notSignedInStatus(req));

                        if (
                            !(
                                await Permissions.canCreate(account, this)
                            ).unwrap()
                        ) {
                            return res.sendStatus(
                                notPermittedStatus(req, 'create')
                            );
                        }

                        const attributes = req.body.attributes.split(',');

                        // delete attributes from body so they aren't added to the data improperly
                        Object.assign(req.body, {
                            attributes: undefined
                        });

                        const n = (await this.new(req.body)).unwrap();

                        (await n.addAttributes(...attributes)).unwrap();

                        res.sendStatus(
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

                        req.io
                            .to(attributes)
                            .emit(`struct:${this.data.name}:create`, n.data);
                    }
                );

                this.route.post<St<Structure & GlobalCols, Name>>(
                    '/update',
                    this.validator(true),
                    async (req, res) => {
                        const account = (
                            await Session.getAccount(req.session)
                        ).unwrap();
                        if (!account)
                            return res.sendStatus(notSignedInStatus(req));

                        const n = (await this.fromId(req.body.id)).unwrap();
                        const roles = (
                            await Permissions.getRoles(account)
                        ).unwrap();

                        if (!n) return res.sendStatus(notFoundStatus(req));

                        const [updatable] = (
                            await Permissions.filterAction(
                                roles,
                                Permissions.DataAction.Update,
                                [n]
                            )
                        ).unwrap();

                        const updated = Object.fromEntries(
                            Object.entries(updatable).map(([k, v]) => [
                                k,
                                req.body[k] || v
                            ])
                        ) as St<Structure, Name>;

                        // only update the fields that are updatable
                        (await n.update(updated)).unwrap();

                        res.sendStatus(
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

                        req.io
                            .to(n.getAttributes().unwrap())
                            .emit(`struct:${this.data.name}:update`, updated);
                    }
                );

                this.route.post<{
                    id: string;
                }>(
                    '/read.from-id',
                    validate({
                        id: 'string'
                    }),
                    async (req, res) => {
                        const account = (
                            await Session.getAccount(req.session)
                        ).unwrap();
                        if (!account)
                            return res.sendStatus(notSignedInStatus(req));

                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) return res.sendStatus(notFoundStatus(req));

                        const roles = (
                            await Permissions.getRoles(account)
                        ).unwrap();

                        const [readable] = (
                            await Permissions.filterAction(
                                roles,
                                Permissions.DataAction.Read,
                                [n]
                            )
                        ).unwrap();
                        if (!readable)
                            return res.sendStatus(
                                notPermittedStatus(req, 'read')
                            );

                        res.json(readable);
                    }
                );

                this.route.post('/read.all', async (req, res) => {
                    const account = (
                        await Session.getAccount(req.session)
                    ).unwrap();
                    if (!account) return res.sendStatus(notSignedInStatus(req));
                    const roles = (
                        await Permissions.getRoles(account)
                    ).unwrap();

                    const n = (await this.all()).unwrap();

                    res.json(
                        (
                            await Permissions.filterAction(
                                roles,
                                Permissions.DataAction.Read,
                                n.filter(d => !d.archived)
                            )
                        ).unwrap()
                    );
                });

                this.route.post('/read.archived', async (req, res) => {
                    const account = (
                        await Session.getAccount(req.session)
                    ).unwrap();
                    if (!account) return res.sendStatus(notSignedInStatus(req));

                    const roles = (
                        await Permissions.getRoles(account)
                    ).unwrap();

                    const n = (await this.archived()).unwrap();
                    res.json(
                        (
                            await Permissions.filterAction(
                                roles,
                                Permissions.DataAction.ReadArchived,
                                n
                            )
                        )
                            .unwrap()
                            .map(d => d.data)
                    );
                });

                this.route.post<{
                    id: string;
                }>(
                    '/read.version-history',
                    validate({
                        id: 'string'
                    }),
                    async (req, res) => {
                        const account = (
                            await Session.getAccount(req.session)
                        ).unwrap();
                        if (!account)
                            return res.sendStatus(notSignedInStatus(req));

                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) return res.sendStatus(notFoundStatus(req));

                        const roles = (
                            await Permissions.getRoles(account)
                        ).unwrap();
                        if (
                            !(
                                await Permissions.filterAction(
                                    roles,
                                    Permissions.DataAction.ReadVersionHistory,
                                    [n]
                                )
                            ).unwrap().length
                        ) {
                            return res.sendStatus(
                                notPermittedStatus(req, 'read version history')
                            );
                        }

                        const versions = (await n.getVersionHistory()).unwrap();

                        if (versions === 'not-enabled') {
                            return res.sendStatus(
                                versionHistoryNotEnabledStatus(req)
                            );
                        }

                        // TODO: If you can read version history, how can we make it so you only see the properties you have access to?

                        // const readable = (await Permissions.filterAction(
                        //     roles,
                        //     'read',
                        //     versions
                        // )).unwrap();

                        res.json(versions.map(d => d.data));
                    }
                );

                this.route.post<{
                    id: string;
                    vId: string;
                }>(
                    '/version.restore',
                    validate({
                        id: 'string',
                        vId: 'string'
                    }),
                    async (req, res) => {
                        const account = (
                            await Session.getAccount(req.session)
                        ).unwrap();
                        if (!account)
                            return res.sendStatus(notSignedInStatus(req));

                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) return res.sendStatus(notFoundStatus(req));

                        const roles = (
                            await Permissions.getRoles(account)
                        ).unwrap();

                        const [restorable] = (
                            await Permissions.filterAction(
                                roles,
                                Permissions.DataAction.RestoreVersion,
                                [n]
                            )
                        ).unwrap();

                        if (!restorable)
                            return res.sendStatus(
                                notPermittedStatus(req, 'version restore')
                            );

                        const versions = (await n.getVersionHistory()).unwrap();
                        if (versions === 'not-enabled') {
                            return res.sendStatus(
                                versionHistoryNotEnabledStatus(req)
                            );
                        }

                        const version = versions.find(
                            v => v.vhId === req.body.vId
                        );
                        if (!version)
                            return res.sendStatus(noVersionHistoryStatus(req));

                        (await version.restore()).unwrap();

                        res.sendStatus(
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

                        req.io
                            .to(n.getAttributes().unwrap())
                            .emit(`struct:${this.data.name}:restore`, n.data);
                    }
                );

                this.route.post<{
                    id: string;
                    vhId: string;
                }>(
                    '/version.delete',
                    validate({
                        id: 'string',
                        vhId: 'string'
                    }),
                    async (req, res) => {
                        const account = (
                            await Session.getAccount(req.session)
                        ).unwrap();
                        if (!account)
                            return res.sendStatus(notSignedInStatus(req));

                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) return res.sendStatus(notFoundStatus(req));

                        const versions = (await n.getVersionHistory()).unwrap();
                        if (versions === 'not-enabled') {
                            return res.sendStatus(
                                versionHistoryNotEnabledStatus(req)
                            );
                        }

                        const roles = (
                            await Permissions.getRoles(account)
                        ).unwrap();

                        const [deletable] = (
                            await Permissions.filterAction(
                                roles,
                                Permissions.DataAction.DeleteVersion,
                                [n]
                            )
                        ).unwrap();

                        if (!deletable)
                            return res.sendStatus(
                                notPermittedStatus(req, 'delete version')
                            );

                        const version = versions.find(
                            v => v.vhId === req.body.vhId
                        );
                        if (!version) {
                            return res.sendStatus(noVersionHistoryStatus(req));
                        }

                        (await version.delete()).unwrap();

                        res.sendStatus(
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

                        req.io
                            .to(n.getAttributes().unwrap())
                            .emit(
                                `struct:${this.data.name}:delete-version`,
                                n.data
                            );
                    }
                );

                this.route.post<{
                    id: string;
                }>(
                    '/delete',
                    validate({
                        id: 'string'
                    }),
                    async (req, res) => {
                        const account = (
                            await Session.getAccount(req.session)
                        ).unwrap();
                        if (!account)
                            return res.sendStatus(notSignedInStatus(req));

                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) return res.sendStatus(notFoundStatus(req));

                        // const roles = (
                        //     await Permissions.getRoles(account)
                        // ).unwrap();

                        // const [deletable] = (await Permissions.filterAction(
                        //     roles,
                        //     Permissions.DataAction.Delete,
                        //     [n]
                        // )).unwrap();

                        // if (!deletable)
                        if (!(await Permissions.canDelete(account, n)).unwrap())
                            return res.sendStatus(
                                notPermittedStatus(req, 'delete')
                            );

                        n.delete();

                        res.sendStatus(
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

                        req.io
                            .to(n.getAttributes().unwrap())
                            .emit(`struct:${this.data.name}:delete`, n.data);
                    }
                );

                this.route.post<{
                    id: string;
                    archive: boolean;
                }>(
                    '/archive.set',
                    validate({
                        id: 'string',
                        archive: 'boolean'
                    }),
                    async (req, res) => {
                        const account = (
                            await Session.getAccount(req.session)
                        ).unwrap();
                        if (!account)
                            return res.sendStatus(notSignedInStatus(req));

                        const n = (await this.fromId(req.body.id)).unwrap();
                        if (!n) return res.sendStatus(notFoundStatus(req));

                        // const roles = (
                        //     await Permissions.getRoles(account)
                        // ).unwrap();

                        // const [archivable] = (await Permissions.filterAction(
                        //     roles,
                        //     Permissions.DataAction.Archive,
                        //     [n]
                        // )).unwrap();

                        // if (!archivable)
                        if (
                            !(await Permissions.canArchive(account, n)).unwrap()
                        )
                            return res.sendStatus(
                                notPermittedStatus(req, 'archive')
                            );

                        n.setArchive(req.body.archive);

                        res.sendStatus(
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

                        req.io
                            .to(n.getAttributes().unwrap())
                            .emit(`struct:${this.data.name}:archive`, n.data);
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

    new(data: St<Structure & Partial<GlobalCols>, Name>) {
        if (!this.built)
            throw new FatalStructError(`Struct ${this.data.name} not built`);
        return attemptAsync(async () => {
            if (!this.validate(data))
                throw new StructError(`Invalid data for ${this.data.name}`);

            const d = new StructData<Structure, Name>(this, {
                ...newGlobalCols(this),
                ...data // will overwrite global cols if they are included
            });

            const current = (await this.fromId(d.data.id)).unwrap();
            if (current) throw new DataError('Data already exists');

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

            this.emit('create', d);

            return d;
        });
    }

    fromId(id: string) {
        if (!this.built)
            throw new FatalStructError(`Struct ${this.data.name} not built`);
        return attemptAsync(async () => {
            const query = Query.build(
                `SELECT * FROM ${this.data.name} WHERE id = :id`,
                { id }
            );

            const data = (
                await this.data.database.unsafe.get<St<Structure, Name>>(query)
            ).unwrap();

            if (!data) return undefined;

            const invalid = !this.validate(data);
            if (invalid)
                throw new StructError(
                    `Invalid data found in database. ${this.name}:${data.id} is corrupted`
                );

            return new StructData<Structure, Name>(this, data);
        });
    }

    all(includeArchived: boolean = false) {
        if (!this.built)
            throw new FatalStructError(`Struct ${this.data.name} not built`);
        return attemptAsync(async () => {
            const query = Query.build(`SELECT * FROM ${this.data.name}`);

            const data = (
                await this.data.database.unsafe.all<St<Structure, Name>>(query)
            ).unwrap();

            const invalid = data.filter(d => !this.validate(d));
            if (invalid.length)
                throw new StructError(
                    `Invalid data found in database. ${this.name} is corrupted` +
                        invalid.map(d => d.id).join(', ')
                );

            return data
                .map(d => new StructData<Structure, Name>(this, d))
                .filter(d => includeArchived || !d.data.archived);
        });
    }

    archived() {
        if (!this.built)
            throw new FatalStructError(`Struct ${this.data.name} not built`);
        return attemptAsync(async () => {
            const query = Query.build(
                `SELECT * FROM ${this.data.name} WHERE archived = true`
            );

            const data = (
                await this.data.database.unsafe.all<St<Structure, Name>>(query)
            ).unwrap();

            const invalid = data.filter(d => !this.validate(d));
            if (invalid.length)
                throw new StructError(
                    `Invalid data found in database. ${this.name} is corrupted` +
                        invalid.map(d => d.id).join(', ')
                );

            return data.map(d => new StructData<Structure, Name>(this, d));
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

    listen<data>(path: string, ...fns: ServerFunction<data>[]) {
        this.route.post(path, ...fns);
        return this;
    }

    drop() {
        return attemptAsync(async () => {
            const all = (await this.all(true)).unwrap();
            if (all.length)
                throw new StructError('Cannot drop table with data');
        });
    }

    addDefaults(...data: St<Structure & Partial<GlobalCols>, Name>[]) {
        if (this.built)
            throw new FatalStructError(
                `Struct ${this.data.name} already built, cannot add default data`
            );
        this.defaults.push(...data);
    }
}
