// import { writable, Writable } from 'svelte/store';
import { Socket } from '../utilities/socket';
import { attempt, attemptAsync, Result } from '../../shared/check';
import { match } from '../../shared/match';
import { Requester, ServerRequest } from '../utilities/requests';
import { writable, Writable } from 'svelte/store';

export class DataError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DataError';
    }
}

export class FatalDataError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FatalDataError';
    }
}

/*
File overview:
- This communicates with the companion class on the server to abstract socket.io, requests, messages, and the database from the end user
- In theory, this should be able to be used in a Svelte store to manage the state of the application without having to worry about all the event emitters
- This is a work in progress and is not yet complete

*/

export type SQL_Type =
    | 'integer'
    | 'bigint'
    | 'text'
    | 'json'
    | 'boolean'
    | 'real'
    | 'numeric';

export type TS_Types = 'number' | 'string' | 'object' | 'boolean' | 'unknown';

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
    | 'read';

type StructBuilder<T> = {
    name: string;
    structure: T;
    socket: Socket;
    route?: string;
    requester?: Requester;
};

type Blank = {
    [key: string]: SQL_Type;
};

type Structable<T extends Blank> = {
    [K in keyof T]: TS_TypeActual<Column<T[K], T>['type']>;
};

type PartialStructable<T extends Blank> = {
    [K in keyof T]?: TS_TypeActual<Column<T[K], T>['type']>;
}

type GlobalCols = {
    id: 'text';
    created: 'text';
    updated: 'text';
    archived: 'boolean';
};

class Column<Type extends SQL_Type, StructType extends Blank> {
    public readonly type: TS_TypeStr<Type>;

    constructor(
        public readonly name: string,
        public readonly sqlType: SQL_Type,
        public readonly struct: Struct<StructType>
    ) {
        this.type = match<SQL_Type, TS_TypeStr<typeof this.sqlType>>(
            this.sqlType
        )
            .case('integer', () => 'number')
            .case('bigint', () => 'number')
            .case('text', () => 'string')
            .case('json', () => 'object')
            .case('boolean', () => 'boolean')
            .case('real', () => 'number')
            .case('numeric', () => 'number')
            .default(() => 'unknown')
            .exec()
            .unwrap() as TS_TypeStr<Type>;
    }
}

class DataVersion<T extends Blank> {
    constructor(
        public readonly struct: Struct<T>,
        public readonly data: Readonly<
            Structable<
                T &
                    GlobalCols & {
                        vhId: 'text';
                        vhCreated: 'text';
                    }
            >
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
}

class Data<T extends Blank> implements Writable<PartialStructable<T>> {
    constructor(
        public readonly struct: Struct<T>,
        public readonly data: Readonly<PartialStructable<T & GlobalCols>>
    ) {}

    public readonly subscribers = new Set<
        (data: PartialStructable<T & GlobalCols>) => void
    >();

    get id() {
        return this.data.id;
    }

    get created() {
        return new Date(this.data.created || 'Invalid Date');
    }

    get updated() {
        return new Date(this.data.updated || 'Invalid Date');
    }

    get archived() {
        return this.data.archived;
    }

    set(data: PartialStructable<T>) {
        Object.assign(this.data, data);
        this.subscribers.forEach(s => s(this.data));
    }

    subscribe(fn: (data: PartialStructable<T>) => void) {
        this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    }

    // this will not update the subscribers until the server approves the update
    update(
        fn: (data: PartialStructable<T>) => Promise<PartialStructable<T>> | PartialStructable<T>
    ) {
        return attemptAsync(async () => {
            const prev = { ...this.data };
            const response = await fn(this.data);
            (
                await this.struct.requester.post(
                    `${this.struct.route}/${this.struct.data.name}/update`,
                    response
                )
            ).unwrap();
            return async () => {
                return this.update(() => prev);
            };
        });
    }

    delete() {
        return this.struct.requester.post(
            `${this.struct.route}/${this.struct.data.name}/delete`,
            this.data
        );
    }

    setArchive(archived: boolean) {
        return this.struct.requester.post(
            `${this.struct.route}/${this.struct.data.name}/${archived ? 'archive' : 'unarchive'}`,
            this.data
        );
    }

    getVersionHistory() {
        return attemptAsync(async () => {
            const response = (
                await this.struct.requester.post<
                    Structable<
                        T &
                            GlobalCols & {
                                vhId: 'text';
                                vhCreated: 'text';
                            }
                    >[]
                >(
                    `${this.struct.route}/${this.struct.data.name}/version-history`
                )
            ).unwrap();

            return response.map(d => new DataVersion(this.struct, d));
        });
    }

    pull<Property extends keyof T>(
        ...properties: Property[]
    ): Result<
    Writable<
        Readonly<{
            [P in Property]: TS_Type<T[P]>;
        }>
    >> {
        return attempt(() => {
            const o = Object.fromEntries(
                properties.map(p => {
                    if (typeof this.data[p] === 'undefined') {
                        throw new DataError('Property does not exist');
                    }

                    return [p, this.data[p]] as const;
                })
            ) as Readonly<{
                [P in Property]: TS_Type<T[P]>;
            }>;

            class PartialWritable implements Writable<typeof o> {
                constructor(public data: typeof o) {}

                public readonly subscribers = new Set<
                    (data: typeof o) => void
                >();

                set(data: typeof o) {
                    Object.assign(this.data, data);
                    this.subscribers.forEach(s => s(this.data));
                }

                subscribe(fn: (data: typeof o) => void) {
                    this.subscribers.add(fn);
                    return () => {
                        this.subscribers.delete(fn);
                        if (this.subscribers.size === 0) {
                            return u();
                        }
                    };
                }

                update(
                    fn: (
                        data: typeof o
                    ) => Promise<typeof o> | typeof o
                ) {
                    return attemptAsync(async () => {
                        const prev = { ...this.data };
                        const response = await fn(this.data);
                        Object.assign(this.data, response);
                        this.subscribers.forEach(s => s(this.data));
                        return async () => {
                            return this.update(() => prev);
                        };
                    });
                }
            }

            const w = new PartialWritable(o);

            const u = this.subscribe(d => {
                Object.assign(o, d);
                w.set(o);
            });


            return w;
        });
    }
}

export class Struct<T extends Blank> {
    private static structs = new Map<string, Struct<Blank>>();

    constructor(public readonly data: StructBuilder<T>) {
        if (Struct.structs.has(this.data.name)) {
            throw new Error(`Struct ${this.data.name} already exists`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Struct.structs.set(this.data.name, this as any);

        data.socket.on(
            `struct:${this.data.name}:create`,
            (data: Structable<T & GlobalCols>) => {
                const has = this.cache.get(data.id);
                if (has) return;
                const d = new Data(this, data);
                this.cache.set(data.id, d);
            }
        );
        data.socket.on(
            `struct:${this.data.name}:update`,
            (data: Structable<T & GlobalCols>) => {
                const has = this.cache.get(data.id);
                if (!has) return;
                has.set(data);
            }
        );
        data.socket.on(`struct:${this.data.name}:delete`, (id: string) => {
            const has = this.cache.get(id);
            if (!has) return;
            this.cache.delete(id);
        });
        data.socket.on(`struct:${this.data.name}:archive`, (id: string) => {
            const has = this.cache.get(id);
            if (!has) return;
            Object.assign(has.data, { archived: true });
            this.stores.all.update(d => d.filter(d => d.id !== id));
            this.stores.archived.update(d => [...d, has]);
        });
        data.socket.on(`struct:${this.data.name}:unarchive`, (id: string) => {
            const has = this.cache.get(id);
            if (!has) return;
            Object.assign(has.data, { archived: false });
            this.stores.all.update(d => [...d, has]);
            this.stores.archived.update(d => d.filter(d => d.id !== id));
        });
        data.socket.on(
            `struct:${this.data.name}:restore-version`,
            (data: Structable<T & GlobalCols>) => {
                const has = this.cache.get(data.id);
                if (has) {
                    has.set(data);
                    return;
                }
                const d = new Data(this, data);
                this.cache.set(data.id, d);
            }
        );
        data.socket.on(
            `struct:${this.data.name}:delete-version`,
            (id: string) => {
                // should this do anything?
            }
        );

        this.requester.post('/connect', {
            structure: this.data.structure
        });
    }

    public get route() {
        return this.data.route ?? this.data.name;
    }

    public get requester() {
        return this.data.requester ?? ServerRequest;
    }

    public get socket() {
        return this.data.socket;
    }

    public readonly stores = {
        all: writable<Data<T>[]>([]),
        archived: writable<Data<T>[]>([])
    };

    public readonly cache = new Map<string, Data<T>>();

    get sample(): Data<T> {
        throw new FatalDataError(
            'Cannot get sample of a struct at runtime. This is only used for type checking before compile'
        );
    }

    new(data: Structable<T>) {
        return this.requester.post(
            `${this.route}/${this.data.name}/create`,
            data
        );
    }

    fromId(id: string) {
        return attemptAsync(async () => {
            const current = this.cache.get(id);
            if (current) return current;
            const response = (
                await this.requester.post<Structable<T>>(
                    `${this.route}/${this.data.name}/`
                )
            ).unwrap();
            // TODO: Prove this is a valid response
            const d = new Data(this, response);
            this.cache.set(id, d);
            return d;
        });
    }

    all() {
        return attemptAsync(async () => {
            const response = (
                await this.requester.post<PartialStructable<T & GlobalCols>[]>(
                    `${this.route}/${this.data.name}/all`
                )
            ).unwrap();

            const all = response.map(d => {
                const has = this.cache.get(d.id || '');
                if (has) return has;
                const data = new Data(this, d);
                if (data.id) this.cache.set(data.id, data);
                return data;
            });

            this.stores.all.set(all);

            return all;
        });
    }

    archived() {
        return attemptAsync(async () => {
            const response = (
                await this.requester.post<Structable<T>[]>(
                    `${this.route}/${this.data.name}/archived`
                )
            ).unwrap();

            const data = response.map(d => new Data(this, d));
            return data;
        });
    }

    validate(data: unknown) {
        return attempt(() => {
            if (data && typeof data === 'object') {
                const keys = Object.keys(data);
                if (keys.length === 0) {
                    return false;
                }

                const keysMatch = keys.every(k =>
                    Object.keys(this.data.structure).includes(k)
                );
                if (!keysMatch) {
                    return false;
                }

                const typesMatch = keys.every(k => {
                    const type = this.data.structure[k];
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
                    } else if (type === 'json') {
                        // TODO: could have a better check in here in the future
                        return typeof value === 'object';
                    } else if (type === 'boolean') {
                        return typeof value === 'boolean';
                    }
                    return false;
                });

                return typesMatch;
            }
            return false;
        });
    }

    get(path: string) {
        return this.requester.get<T>(path);
    }

    post<T = unknown>(path: string, data: unknown) {
        return this.requester.post<T>(path, data);
    }
}
