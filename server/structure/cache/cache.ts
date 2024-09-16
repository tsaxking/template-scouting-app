import { attempt, attemptAsync, Result } from "../../../shared/check";
import { EventEmitter } from "../../../shared/event-emitter";
import { ServerFunction } from "../app/app";

type SQL_Type = 'integer' | 'bigint' | 'text' | 'json' | 'boolean' | 'real' | 'numeric';

type TS_Type<SQL_Type, T = unknown> = SQL_Type extends 'integer' ? number :
    SQL_Type extends 'bigint' ? number :
    SQL_Type extends 'text' ? string :
    SQL_Type extends 'json' ? T :
    SQL_Type extends 'boolean' ? boolean :
    SQL_Type extends 'real' ? number :
    SQL_Type extends 'numeric' ? number :
    never;

type Permission = ServerFunction[] | ServerFunction;

type DataBuilder<T> = {
    structure: Omit<T, 'id'>;
    permissions?: Partial<{
        create: Permission;
        update: Permission;
        delete: Permission;
        read: Permission;
    }>;
};

type DataEvents = {
    built: undefined;
};

type Default = Record<string, unknown>;

type CreateDataReturnType<T extends Default = Default> = {
    // create
    build(data: T): Promise<Result<Data<T>>>;

    // read
    get(id: string): Promise<Result<Data<T>>>;
    all(): Promise<Result<Data<T>[]>>;

    // other
    validate(data: T): ServerFunction;
    createTable(): Promise<Result<void>>;
    query(query: string): Promise<Result<Data<T>[]>>;
    listen<T = unknown>(path: string, ...fn: ServerFunction<T>[]): void;

    test(): Promise<Result<boolean>>;
}

/**
 * Backend Data
 *
 * @export
 * @class Data
 * @typedef {Data}
 * @template E
 */
export class Data<T extends Default = Default> {
    public static readonly classes = new Map<string, CreateDataReturnType>();

    private static readonly emitter = new EventEmitter<DataEvents>();

    public static on = Data.emitter.on.bind(Data.emitter);
    public static once = Data.emitter.once.bind(Data.emitter);
    public static off = Data.emitter.off.bind(Data.emitter);
    private static emit = Data.emitter.emit.bind(Data.emitter);

    public static create<T extends Record<string, unknown>, K extends string>(name: K, builder: DataBuilder<T>): CreateDataReturnType<T> {
        return {
            get(id: string) {
                return attemptAsync(async () => {
                    throw new Error('Not implemented');
                });
            },
            all() {
                return attemptAsync(async () => {
                    throw new Error('Not implemented');
                });
            },
            // creates a new instance of the data
            build(data: T) {
                return attemptAsync(async () => {
                    return new Data<T>(name, data);
                });
            },
            validate(data: T) {
                return async (req, res, next) => {
                    throw new Error('Not implemented');
                };
            },
            createTable() {
                return attemptAsync(async () => {

                });
            },
            query(query: string) {
                return attemptAsync(async () => {
                    throw new Error('Not implemented');
                });
            },
            test() {
                return attemptAsync(async () => {
                    throw new Error('Not implemented');
                });
            },
            listen<T>(path: string, ...fn: ServerFunction<T>[]) {
                throw new Error('Not implemented');
            }
        };
    }

    public static middleware(): ServerFunction {
        return async (req, res, next) => {
            const [action, classname] = req.pathname.split('/').reverse();

            const table = Data.classes.get(classname);
            if (!table) return next();

        };
    }



    constructor(public readonly name: string, public readonly data: T) { }

    public update(data: Partial<T>) {
        return attemptAsync(async () => {});
    }

    public delete() {
        return attemptAsync(async () => {});
    }
}

const Transaction = Data.create('transaction', {
    structure: {
        amount: 'integer',
        data: 'bigint',
    },
    permissions: {
        create: (req, res, next) => {
            next();
        },
        update: [],
        delete: [],
        read: [],
    }
});

Transaction.listen('/build', async (req, res, next) => {

});