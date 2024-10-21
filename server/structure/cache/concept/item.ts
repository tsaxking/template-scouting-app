import { DB } from "../../../utilities/database";
import { Struct } from "../cache-2";



const Item = new Struct({
    name: 'Item',
    structure: {
        make: 'text',
        model: 'text',
        type: 'text',
        price: 'integer', // in cents
        rentalPrice: 'integer', // in cents
        stock: 'integer',
        status: 'text',
        description: 'text',
    },
    database: DB,
});

const ItemGroup = new Struct({
    name: 'ItemGroup',
    structure: {
        item: 'text',
        group: 'text',
    },
    database: DB,
});

const Group = new Struct({
    name: 'Group',
    structure: {
        name: 'text',
        description: 'text',
    },
    database: DB,
});


(async () => {
    const streamDeck = (await Item.new({
        make: 'Stream Deck',
        model: '15 Button',
        type: 'Hardware',
        price: 13769,
        rentalPrice: 500,
        stock: 1,
        status: 'In Warehouse',
        description: 'A stream deck with 15 buttons',
    })).unwrap();

    const computer = (await Item.new({
        make: 'Dell',
        model: 'XPS 15',
        type: 'Hardware',
        price: 1376900,
        rentalPrice: 50000,
        stock: 1,
        status: 'In Warehouse',
        description: 'A laptop',
    })).unwrap();

    const group = (await Group.new({
        name: 'Tech',
        description: 'Technology items',
    })).unwrap();

    const itemGroup = (await ItemGroup.new({
        item: streamDeck.data.id,
        group: group.data.id,
    })).unwrap();

    const itemGroup2 = (await ItemGroup.new({
        item: computer.data.id,
        group: group.data.id,
    })).unwrap();

    streamDeck.update({
        stock: 0,
    });
})();