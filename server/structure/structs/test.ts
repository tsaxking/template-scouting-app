import { DB } from '../../utilities/database';
import { Struct } from './struct';
import { PropertyAction, DataAction } from '../../../shared/struct';

export namespace Testing {
    export const TestStruct = new Struct({
        database: DB,
        name: 'TestStruct',
        structure: {
            name: 'text',
            age: 'integer'
        },
    });

    TestStruct.on('create', (d) => {
        d.addUniverses('54105da1-5367-473a-bb53-7815927aa346');
    });

    TestStruct.bypass(DataAction.Create, () => true);
    TestStruct.bypass(PropertyAction.Read, () => true);
    TestStruct.bypass(PropertyAction.Update, () => true);
}
