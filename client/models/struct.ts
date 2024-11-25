// import { writable, Writable } from 'svelte/store';
import { Socket } from '../utilities/socket';
import { attempt, attemptAsync, Result } from '../../shared/check';
import { match } from '../../shared/match';
import { Requester, ServerRequest } from '../utilities/requests';
import {
    Invalidator,
    Readable,
    Subscriber,
    Unsubscriber,
    writable,
    Writable
} from 'svelte/store';
import {
    SQL_Type,
    TS_Type,
    TS_Types,
    type,
    typeValidation,
    TS_TypeStr,
    TS_TypeActual,
    GlobalCols,
    TS_GlobalCols,
    Blank
} from '../../shared/struct';
import { EventEmitter } from '../../shared/event-emitter';

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

type StructBuilder<T> = {
    name: string;
    structure: T;
    socket: Socket;
    route?: string;
    requester?: Requester;
};

export type Structable<T extends Blank> = {
    [K in keyof T]: TS_TypeActual<Column<T[K], T>['type']>;
};

type PartialStructable<T extends Blank> = {
    [K in keyof T]?: TS_TypeActual<Column<T[K], T>['type']>;
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
            // .case('json', () => 'object')
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

export class DataArr<T extends Blank> implements Readable<StructData<T>[]> {
    constructor(
        public readonly struct: Struct<T>,
        public readonly data: StructData<T>[]
    ) {}

    public readonly subscribers = new Set<(data: StructData<T>[]) => void>();

    private onUnsubscribe: (() => void) | undefined;

    subscribe(fn: (data: StructData<T>[]) => void) {
        this.subscribers.add(fn);
        return () => {
            this.subscribers.delete(fn);
            if (this.subscribers.size === 0) {
                this.onUnsubscribe?.();
            }
        };
    }

    get(id: string) {
        return this.data.find(d => d.id === id);
    }

    fromProperty<Key extends keyof StructData<T>['data']>(
        key: Key,
        value: StructData<T>['data'][Key]
    ) {
        return this.data.filter(d => d.data[key] === value);
    }

    add(...data: StructData<T>[]) {
        this.data.push(...data);
        this.subscribers.forEach(s => s(this.data));
    }

    remove(data: StructData<T>) {
        const index = this.data.indexOf(data);
        if (index === -1) return;
        this.data.splice(index, 1);
        this.subscribers.forEach(s => s(this.data));
    }

    onAllUnsubscribe(fn: () => void) {
        this.onUnsubscribe = fn;
    }
}

export class SingleWritable<T extends Blank> implements Writable<StructData<T>> {
    private data: StructData<T>;
    
    constructor(defaultData: StructData<T>) {
        this.data = defaultData;
    }

    private _onUnsubscribe?: () => void;
    private readonly subscribers = new Set<(data: StructData<T>) => void>();

    subscribe(fn: (data: StructData<T>) => void) {
        this.subscribers.add(fn);
        return () => {
            this.subscribers.delete(fn);
            if (!this.subscribers.size) this._onUnsubscribe?.();
        };
    }

    onUnsubscribe(fn: () => void) {
        this._onUnsubscribe = fn;
    }

    set(data: StructData<T>) {
        this.data = data;
        this.subscribers.forEach(fn => fn(data));
    }

    update(fn: (data: StructData<T>) => StructData<T>) {
        this.set(fn(this.data));
    }
}

export class UniverseArr<T extends Blank> implements Readable<string[]> {
    private readonly subscribers = new Set<Subscriber<string[]>>();

    constructor(
        public readonly data: StructData<T>,
        public readonly universes: string[]
    ) {}

    private onUnsubscribe: (() => void) | undefined;

    subscribe(run: Subscriber<string[]>): Unsubscriber {
        return () => {
            this.subscribers.delete(run);
            if (this.subscribers.size === 0) {
                this.onUnsubscribe?.();
            }
        };
    }

    add(...universes: string[]) {
        this.universes.push(
            ...universes.filter(u => !this.universes.includes(u))
        );
        this.subscribers.forEach(s => s(this.universes));
    }

    remove(universe: string) {
        this.universes.splice(this.universes.indexOf(universe), 1);
        this.subscribers.forEach(s => s(this.universes));
    }

    onAllUnsubscribe(fn: () => void) {
        this.onUnsubscribe = fn;
    }
}

export type Data<T extends Struct<Blank>> = StructData<T['data']['structure']>;

export class StructData<T extends Blank>
    implements Writable<PartialStructable<T>>
{
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

    get lifetime() {
        return this.data.lifetime;
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
        fn: (
            data: PartialStructable<T>
        ) => Promise<PartialStructable<T>> | PartialStructable<T>
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

    pull<Key extends keyof T>(...keys: Key[]) {
        const o = {} as Structable<{
            [Property in Key]: T[Property];
        }>;

        for (const k of keys) {
            if (typeof this.data[k] === 'undefined') {
                console.error(new DataError(
                    `User does not have permissions to read ${this.struct.name}.${k as string}`
                ));
                return;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (o as any)[k] = this.data[k];
        }
        class PartialReadable implements Readable<typeof o> {
            constructor(public data: typeof o) {}

            public readonly subscribers = new Set<
                (data: typeof o) => void
            >();

            subscribe(fn: (data: typeof o) => void) {
                this.subscribers.add(fn);
                return () => {
                    this.subscribers.delete(fn);
                    if (this.subscribers.size === 0) {
                        return u();
                    }
                };
            }
        }

        const w = new PartialReadable(o);

        const u = this.subscribe(d => {
            Object.assign(o, d);
        });

        return w;
    }

    getUniverses() {
        const { universes } = this.data;
        const universe = new UniverseArr(this, []);

        if (!universes) return undefined;

        const parsed = JSON.parse(universes);
        if (!Array.isArray(parsed)) {
            console.error(new DataError('Universes are not an array'));
            return universe;
        }
        if (!parsed.every(a => typeof a === 'string')) {
            console.error(new DataError('Universes contain non-string values'));
            return universe;
        }

        universe.add(...parsed);
        return universe;
    }

    addUniverse(...universes: string[]) {}

    removeUniverse(universe: string) {}

    getAttributes() {
        return attempt(() => {});
    }
}

// TODO: Infrastructure for changing universes and attributes from the client

type StructEvents<T extends Blank> = {
    new: StructData<T>;
    update: StructData<T>;
    delete: StructData<T>;
    archive: StructData<T>;
    restore: StructData<T>;
};

export class Struct<T extends Blank> {
    public static readonly structs = new Map<string, Struct<Blank>>();

    private readonly eventEmitter = new EventEmitter<StructEvents<T>>();

    public on = this.eventEmitter.on.bind(this.eventEmitter);
    public off = this.eventEmitter.off.bind(this.eventEmitter);
    public emit = this.eventEmitter.emit.bind(this.eventEmitter);
    public once = this.eventEmitter.once.bind(this.eventEmitter);

    constructor(public readonly data: StructBuilder<T>) {
        if (Struct.structs.has(this.data.name)) {
            throw new Error(`Struct ${this.data.name} already exists`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Struct.structs.set(this.data.name, this as any);

        this.listen(
            'create',
            (data: Structable<T & GlobalCols>) => {
                const has = this.cache.get(data.id);
                if (has) return;
                const d = new StructData(this, data);
                this.cache.set(data.id, d);
                this.emit('new', d);
            }
        );
        this.listen(
            'update',
            (data: Structable<T & GlobalCols>) => {
                const has = this.cache.get(data.id);
                if (!has) return;
                has.set(data);
                this.emit('update', has);
            }
        );
        this.listen('delete', (id: string) => {
            const has = this.cache.get(id);
            if (!has) return;
            this.cache.delete(id);
            this.emit('delete', has);
        });
        this.listen('archive', (id: string) => {
            const has = this.cache.get(id);
            if (!has) return;
            Object.assign(has.data, { archived: true });
            this.stores.all.update(d => d.filter(d => d.id !== id));
            this.stores.archived.update(d => [...d, has]);
            this.emit('archive', has);
        });
        this.listen('restore', (id: string) => {
            const has = this.cache.get(id);
            if (!has) return;
            Object.assign(has.data, { archived: false });
            this.stores.all.update(d => [...d, has]);
            this.stores.archived.update(d => d.filter(d => d.id !== id));
            this.emit('restore', has);
        });
        this.listen(
            'restore-version',
            (data: Structable<T & GlobalCols>) => {
                const has = this.cache.get(data.id);
                if (has) {
                    has.set(data);
                    return;
                }
                const d = new StructData(this, data);
                this.cache.set(data.id, d);
            }
        );
        this.listen(
            'delete-version',
            (id: string) => {
                // should this do anything?
            }
        );

        this.requester.post('/connect', {
            structure: this.data.structure
        });
    }

    get name() {
        return this.data.name;
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

    public listen<T>(event: string, fn: (data: T) => void) {
        this.socket.on(`struct:${this.name}:${event}`, fn);
        return () => {
            this.socket.off(`struct:${this.name}:${event}`, fn);
        };
    }

    public readonly stores = {
        all: writable<StructData<T>[]>([]),
        archived: writable<StructData<T>[]>([])
    };

    public readonly cache = new Map<string, StructData<T>>();

    get sample(): StructData<T> {
        throw new FatalDataError(
            'Cannot get sample of a struct at runtime. This is only used for type checking before compile'
        );
    }

    public readonly Generator = (data: Structable<T>) => {
        if (Object.hasOwn(data, 'id')) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (this.cache.has((data as any).id)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return this.cache.get((data as any).id) as StructData<T>;
            }
        }

        const d = new StructData(this, data);

        if (d.id) this.cache.set(d.id, d);

        return d;
    };

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
            return this.Generator(response);
        });
    }

    all() {
        const arr = new DataArr(this, []);
        const fetcher = async () => {
            const response = (
                await this.requester.post<PartialStructable<T & GlobalCols>[]>(
                    `${this.route}/${this.data.name}/all`
                )
            ).unwrap();

            const all = response.map(d => {
                const has = this.cache.get(d.id || '');
                if (has) return has;
                const data = new StructData(this, d);
                if (data.id) this.cache.set(data.id, data);
                return data;
            });

            this.stores.all.set(all);
            arr.add(...all);
        };

        const add = (data: StructData<T>) => {
            arr.add(data);
        };
        const remove = (data: StructData<T>) => {
            arr.remove(data);
        };

        this.on('new', add);
        this.on('archive', remove);
        this.on('delete', remove);

        arr.onAllUnsubscribe(() => {
            this.off('new', add);
            this.off('archive', remove);
            this.off('delete', remove);
        });

        // do not await because we want to return the array immediately
        // since it's returning a writable, we'll be able to get the changes through subscriptions
        fetcher();

        return arr;
    }

    archived() {
        return attemptAsync(async () => {
            const response = (
                await this.requester.post<Structable<T>[]>(
                    `${this.route}/${this.data.name}/archived`
                )
            ).unwrap();

            const data = response.map(this.Generator);
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
                        // } else if (type === 'json') {
                        // TODO: could have a better check in here in the future
                        // return typeof value === 'object';
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

    fromProperty<prop extends keyof T>(property: prop, value: TS_Type<T[prop]>) {
        const w = new DataArr(this, []);

        const run = async () => {
            const res = (await this.post<Structable<T>[]>('/read.from-property', {
                property,
                value,
            })).unwrap();

            const list = res.map(this.Generator);
            w.add(...list);
        };

        run();

        return w;
    }
}
