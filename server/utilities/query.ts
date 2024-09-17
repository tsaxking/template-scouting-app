import { attemptAsync, Result } from "../../shared/check";
import { Column, Blank, Struct, TS_TypeActual } from "../structure/cache/cache";

type QueryType = 'select' | 'insert' | 'update' | 'delete';


type Returnable<T extends {
    [key: string]: Column;
}> = {
    [K in keyof T]: TS_TypeActual<T[K]['type']>;
};

class Query<
    Type extends QueryType,
    Cols extends {
        [key: string]: Column;
    }, 
    Table extends Struct<Blank>, 
    Joins extends [Column, Column][], 
    Where extends Condition
> {
    constructor(
        public readonly type: Type,
        public readonly cols: Cols,
        public readonly table: Table,
        public readonly joins: Joins,
        public readonly where?: Where
    ) { }

    private serialize() {
        return '';
    }

    all(): Promise<Result<Returnable<Cols>[]>> {
        return attemptAsync(async () => {
            throw new Error('Not implemented');
        });
    }

    get(): Promise<Result<Returnable<Cols> | undefined>> {
        return attemptAsync(async () => {
            throw new Error('Not implemented');
        });
    }

    run(): Promise<Result<void>> {
        return attemptAsync(async () => {
            throw new Error('Not implemented');
        });
    }
}

export class QueryBuilder {
    private _type?: 'select' | 'insert' | 'update' | 'delete';
    private _cols: {
        [key: string]: Column;
    } = {};
    private _table?: Struct<Blank>;
    private _joins: [Column, Column][] = [];
    private _where?: Condition;

    select(cols: {
        [key: string]: Column;
    }) {
        if (this._type) throw new Error('Type already set');
        this._type = 'select';
        this._cols = cols;
        return this;
    }

    delete() {
        if (this._type) throw new Error('Type already set');
        this._type = 'delete';
        return this;
    }

    insert() {
        if (this._type) throw new Error('Type already set');
        this._type = 'insert';
        return this;
    }

    update() {
        if (this._type) throw new Error('Type already set');
        this._type = 'update';
        return this;
    }

    from(table: Struct<Blank>) {
        if (this._table) throw new Error('Table already set');
        this._table = table;
        return this;
    }

    innerJoin(col1: Column, col2: Column) {
        this._joins.push([col1, col2]);
        return this;
    }

    where(condition: Condition) {
        this._where = condition;
        return this;
    }

    run() {
        return attemptAsync(async () => {
            if (!this._type) throw new Error('No type specified');
            if (!this._table) throw new Error('No table specified');
            (await new Query(
                this._type,
                this._cols,
                this._table,
                this._joins,
                this._where
            ).run()).unwrap();
        });
    }

    all() {
        return attemptAsync(async () => {
            if (!this._type) throw new Error('No type specified');
            if (!this._table) throw new Error('No table specified');
            return (await new Query(
                this._type,
                this._cols,
                this._table,
                this._joins,
                this._where
            ).all()).unwrap();
        });
    }

    get() {
        return attemptAsync(async () => {
            if (!this._type) throw new Error('No type specified');
            if (!this._table) throw new Error('No table specified');
            return (await new Query(
                this._type,
                this._cols,
                this._table,
                this._joins,
                this._where
            ).get()).unwrap();
        });
    }
}


export class Condition {
    public static and(...conditions: Condition[]) {
        return new Condition(
            conditions.map(c => c.condition).join(' AND ')
        );
    }

    public static or(...conditions: Condition[]) {
        return new Condition(
            conditions.map(c => c.condition).join(' OR ')
        );
    }


    public static xor(...conditions: Condition[]) {
        return new Condition(
            conditions.map(c => c.condition).join(' XOR ')
        );
    }

    constructor(public readonly condition: string) { }
}

// type simple = {
//     name: string;
//     type: 'integer' | 'text' | 'json' | 'boolean' | 'real' | 'numeric';
// }

// interface SimpleMap {
//     [key: string]: simple;
//   }
  
//   // This will return an object where the key is the name and value is the type
//   type Returnable<T extends SimpleMap> = {
//     [K in keyof T]: T[K]['type'];
//   };
  
//   // Example input as an object instead of an array of Simple objects
//   const simpleMap = {
//     id: { name: 'id', type: 'integer' },
//     name: { name: 'name', type: 'text' },
//   } as const;
  
//   const createReturnable = <T extends SimpleMap>(cols: T): Returnable<T> => {
//     return Object.entries(cols).reduce((acc, [key, value]) => {
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         (acc as any)[key] = value.type;
//         return acc;
//         }, {} as Returnable<T>);
//   };
  
//   // Example usage
//   const r = createReturnable(simpleMap);
  
//   console.log(r.id);
//   console.log(r.name);
  