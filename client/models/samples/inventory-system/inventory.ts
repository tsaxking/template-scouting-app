import { Struct } from '../../struct';
import { socket } from '../../../utilities/socket';

export namespace Inventory {
    export const Item = new Struct({
        name: 'Item',
        structure: {
            make: 'text',
            model: 'text',
            type: 'text',
            price: 'integer', // in cents
            rentalPrice: 'integer', // in cents
            stock: 'integer',
            status: 'text',
            description: 'text'
        },
        socket
    });

    export const Group = new Struct({
        name: 'Group',
        structure: {
            name: 'text',
            description: 'text'
        },
        socket
    });

    export const ItemGroup = new Struct({
        name: 'ItemGroup',
        structure: {
            item: 'text',
            group: 'text',
            test: 'integer'
        },
        socket
    });

    const sample = ItemGroup.sample;

    const data = sample.pull('item', 'group', 'test').unwrap();
}
