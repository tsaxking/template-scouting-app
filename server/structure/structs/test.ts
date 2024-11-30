import { DB } from "../../utilities/database";
import { DataAction, PropertyAction, Struct } from "./struct";

export namespace Testing {
    export const TestStruct = new Struct({
        database: DB,
        name: 'TestStruct',
        structure: {
            name: 'text',
            age: 'integer',
        },
    });

    TestStruct.bypass(DataAction.Create, () => true);
    TestStruct.bypass(PropertyAction.Read, () => true);
    TestStruct.bypass(PropertyAction.Update, () => true);
}