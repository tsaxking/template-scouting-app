type Primitive = string | number | boolean;
type Return_Type<T extends Primitive> = T extends string ? string : T extends number ? number : T extends boolean ? boolean : never;

type Primitive_Object = {
    [key: string]: Primitive;
}

type Return_Object<T extends Primitive_Object> = {
    [K in keyof T]: Return_Type<T[K]>;
};

const createReturnType = <T extends Primitive_Object>(data: T): Return_Object<T> => {
    return Object.entries(data).reduce((acc, cur) => {
        const [key, value] = cur;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc as any)[key] = value;
        return acc;
    }, {} as Return_Object<T>);
};