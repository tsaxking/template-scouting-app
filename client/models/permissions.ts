import { socket } from '../utilities/socket';
import { Struct, StructData } from './struct';

export namespace Permissions {
    export const Universe = new Struct({
        name: 'Universe',
        socket,
        structure: {
            name: 'text',
            description: 'text'
        }
    });

    export type UniverseData = StructData<typeof Universe.data.structure>;

    export const Role = new Struct({
        name: 'Role',
        socket,
        structure: {
            name: 'text',
            universe: 'text',
            permissions: 'text'
        }
    });

    export const RoleAccount = new Struct({
        name: 'RoleAccount',
        socket,
        structure: {
            role: 'text',
            account: 'text'
        }
    });
}
