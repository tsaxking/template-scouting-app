import { attemptAsync } from '../../shared/check';
import { ServerRequest } from '../utilities/requests';
import { socket } from '../utilities/socket';
import { Accounts } from './account';
import { SingleWritable, Struct, StructData } from './struct';

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
            permissions: 'text',
            description: 'text'
        }
    });

    export type RoleData = StructData<typeof Role.data.structure>;

    export const RoleAccount = new Struct({
        name: 'RoleAccount',
        socket,
        structure: {
            role: 'text',
            account: 'text'
        }
    });

    export const currentUniverse: SingleWritable<
        typeof Universe.data.structure
    > = new SingleWritable(
        Universe.Generator({
            name: '',
            description: ''
        })
    );

    export const joinUniverse = (universe: UniverseData) => {
        currentUniverse.set(universe);

        ServerRequest.metadata.set('universe', universe.id || '');
    };

    export const removeRole = (
        account: Accounts.AccountData,
        role: RoleData
    ) => {
        return attemptAsync(async () => {
            const ra = (
                await RoleAccount.fromProperty('account', account.id, false)
            ).unwrap();
            const roleAccount = ra.find(i => i.data.role === role.id);
            if (!roleAccount) return;
            (await roleAccount.delete()).unwrap();
        });
    };
}
