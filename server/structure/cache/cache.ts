import { attempt, attemptAsync, Result } from "../../../shared/check";
import { EventEmitter } from "../../../shared/event-emitter";
import { match } from "../../../shared/match";
import { validate } from "../../middleware/data-type";
import { Route, ServerFunction } from "../app/app";
import { QueryBuilder, Condition } from "../../utilities/query";


/*
Rules:
- Each table has a unique name
- Each table has a unique id column
- No data can have a null value
*/

export type SQL_Type = 'integer' | 'bigint' | 'text' | 'json' | 'boolean' | 'real' | 'numeric';

export type TS_Types = 'number' | 'string' | 'object' | 'boolean' | 'unknown';

// for runtime
export type TS_TypeStr<SQL_Type> = (
    SQL_Type extends 'integer' ? 'number' :
    SQL_Type extends 'bigint' ? 'number' :
    SQL_Type extends 'text' ? 'string' :
    SQL_Type extends 'json' ? 'object' :
    SQL_Type extends 'boolean' ? 'boolean' :
    SQL_Type extends 'real' ? 'number' :
    SQL_Type extends 'numeric' ? 'number' :
    never) | 'unknown';

// for tsc
export type TS_TypeActual<T extends TS_Types> = 
    T extends 'number' ? number :
    T extends 'string' ? string :
    T extends 'object' ? object :
    T extends 'boolean' ? boolean :
    never;

// To be used in the struct in place of the SQL_Type
type SQL_ColOptions = [
    SQL_Type,
    Partial<{
        unique: boolean;
        alter: string; // used for DEC(10, 2) or VARCHAR(255) etc.
    }>
] | SQL_Type; // if no options are needed. Will this work?

type DataBuilder<T extends Blank> = {
    structure: T; // omit id because it will always be included as a uuid primary key
};

type DataEvents = {
    built: undefined;
};

export type Blank = {
    [key: string]: SQL_Type;
};

type StructActions = 'create' | 'update' | 'delete' | 'read';

type Structable<T extends Blank> = {
    [K in keyof T]: TS_TypeActual<Column<T[K], T>['type']>;
};



export class Struct<T extends Blank> {
    public readonly route = new Route();

    private readonly routers: Record<StructActions, Route> = {
        create: new Route(),
        update: new Route(),
        delete: new Route(),
        read: new Route(),
    };

    public readonly cols: Readonly<ColMap<T>>;

    constructor(public readonly name: string, private readonly builder: DataBuilder<T>) { 
        this.route.route('/create', this.routers.create);
        this.route.route('/update', this.routers.update);
        this.route.route('/delete', this.routers.delete);
        this.route.route('/read', this.routers.read);

        this.cols = Object.freeze(Object.entries(this.builder.structure).reduce((acc, [key, value]) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (acc as any)[key] = new Column(key, value as SQL_Type, this);
            return acc;
        }, { id: new Column('id', 'text', this) } as ColMap<T>));
    }

    build(data: Structable<T>) {
        return attemptAsync(async () => { });
    }

    get(id: string) {
        return attemptAsync(async () => { });
    }

    all() {
        return attemptAsync(async () => { });
    }

    // validate a single piece of data
    validate(data: T) {
        return attempt(() => {

        });
    }

    // validator middleware
    validator(data: T) {
        return validate({

        });
    }

    createTable() {
        return attemptAsync(async () => { 
            const query = `
            CREATE TABLE IF NOT EXISTS ${this.name} (
                id TEXT PRIMARY KEY,
                ${Object.entries(this.builder.structure).map(([key, value]) => `${key} ${value} NOT NULL`).join(',')}
            );
            `;
        });
    }

    // iterate over all the data and validate it
    test() {
        return attemptAsync(async () => { });
    }

    listen<T>(path: string, ...fns: ServerFunction<T>[]) { 
        this.route.post(path, ...fns);
    }

    addPermission(type: 'create' | 'update' | 'delete' | 'read', ...fns: ServerFunction[]) {
        this.routers[type].post('/', ...fns);
    }
}

export class Column<Type extends SQL_Type = 'text', StructType extends Blank = Blank> {

    public readonly type: TS_TypeStr<Type>;

    constructor(public readonly name: string, public readonly sqlType: SQL_Type, public readonly struct: Struct<StructType>) {
        this.type = match<
            SQL_Type,
            TS_TypeStr<typeof this.sqlType>
        >(this.sqlType)
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

    validate(value: unknown) {
        const type = typeof value;
        return match<
            SQL_Type,
            boolean
        >(this.sqlType)
            .case('integer', () => type === 'number' && Number.isInteger(value))
            .case('bigint', () => type === 'number' && Number.isInteger(value))
            .case('text', () => type === 'string')
            .case('json', () => type === 'object') // TODO: validate JSON
            .case('boolean', () => type === 'boolean')
            .case('real', () => type === 'number')
            .case('numeric', () => type === 'number')
            .default(() => false)
            .exec();
    }

    is(value: unknown, strict = false) {
        return new Condition(`${this.name} ${strict ? '=' : 'LIKE'} ${value}`);
    }

    greaterThan(value: unknown, strict = false) {
        return new Condition(`${this.name} ${strict ? '>' : '>='} ${value}`);
    }

    lessThan(value: unknown, strict = false) {
        return new Condition(`${this.name} ${strict ? '<' : '<='} ${value}`);
    }

    between(min: unknown, max: unknown, strict = false) {
        return new Condition(`${this.name} ${strict ? '>' : '>='} ${min} AND ${this.name} ${strict ? '<' : '<='} ${max}`);
    }

    in(...values: unknown[]) {
        return new Condition(`${this.name} IN (${values.join(',')})`);
    }

    notIn(...values: unknown[]) {
        return new Condition(`${this.name} NOT IN (${values.join(',')})`);
    }

    like(value: string) {
        return new Condition(`${this.name} LIKE ${value}`);
    }
}

/**
 * Backend Data
 *
 * @export
 * @class Data
 * @typedef {Data}
 * @template E
 */
export class Data<T extends Blank = Blank> {
    public static readonly classes = new Map<string, Struct<Blank>>();

    private static readonly emitter = new EventEmitter<DataEvents>();

    public static on = Data.emitter.on.bind(Data.emitter);
    public static once = Data.emitter.once.bind(Data.emitter);
    public static off = Data.emitter.off.bind(Data.emitter);
    private static emit = Data.emitter.emit.bind(Data.emitter);

    public static query() {
        return new QueryBuilder();
    }

    public static create<T extends Blank, K extends string>(name: K, builder: DataBuilder<T>): Struct<T> {
        return new Struct<T>(name, builder);
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
        date: 'bigint',
        accountId: 'text',
    }
});

const t = Transaction.build({
    amount: 100,
    date: Date.now(),
    accountId: '1234',
});

Transaction.listen('/build', async (req, res, next) => {

});

Transaction.cols.amount.type;


Data.query()
    .select({
        id: Transaction.cols.id,
    })
    .from(Transaction)
    .where(Condition.and(
        Transaction.cols.amount.is(100),
        Transaction.cols.date.greaterThan(1000, true)
    ))
    .get()
    .then(r => {
        const data = r.unwrap();
        if (data) {
            const id = data.amount;
        }
    });














export type ColMap<Cols extends {
    [key: string]: SQL_Type;
}> = {
    id: Column<
        'text',
        Cols
    >;
} & {
    [K in keyof Cols]: Column<Cols[K], Cols>;
};