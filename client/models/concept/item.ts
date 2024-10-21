import { Struct } from '../frontend-cache';
import { socket } from '../../utilities/socket';
import { ServerRequest } from '../../utilities/requests';

export const Item = new Struct(
    {
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
        }
    },
    socket,
    'Item',
    ServerRequest
);
