/* 
General concept:
- RBAC (Role Based Access Control) is used to manage permissions
- Each role is a child of a parent role, except for the root role
- The higher the role (parent), the fewer permissions it has
- A child inherits all the permissions of its parent
- The root role has no permissions


- A universe is a collection of data, a data can only be inside one universe
*/

import { attemptAsync, resolveAll } from "../../../shared/check";
import { DB } from "../../utilities/database";
import { Account } from "./account";
import { Struct, Data } from "./cache-2";


export namespace Permissions {
    export enum Permission {
        // Data permissions
        Create = 'create',
        Read = 'read',
        Update = 'update',
        Delete = 'delete',

        ReadVersionHistory = 'read-version-history',
        RestoreVersion = 'restore-version',
        
        ReadArchive = 'read-archive',
        RestoreArchive = 'restore-archive',
        Archive = 'archive',
    }


    export const Universe = new Struct({
        database: DB,
        name: 'Universe',
        structure: {
            name: 'text',
            description: 'text',
            // doesn't matter
        },
    });

    export const Role = new Struct({
        database: DB,
        name: 'Role',
        structure: {
            name: 'text',
            parent: 'text',
            universe: 'text',
        },
    });

    Universe.on('create', (universe) => {
        Role.new({
            name: 'root',
            parent: '',
            universe: universe.id,
        });
    });

    export const RoleAccount = new Struct({
        database: DB,
        name: 'RoleAccount',
        structure: {
            role: 'text',
            account: 'text',
        },
    });


    export const getRolesFromUniverse = async (universe: Data<typeof Universe>) => {
        return Role.fromProperty('universe', universe.id);
    };

    export const getRolesFromAccount = async (account: Data<typeof Account.Account>) => {
        return attemptAsync(async () => {
            const roleAccounts = (await RoleAccount.fromProperty('account', account.id)).unwrap();
            return resolveAll(await Promise.all(
                roleAccounts.map(async ra => Role.fromId(ra.data.role)),
            )).unwrap()
            .filter(Boolean);
        });
    };

    export const giveRole = async (account: Data<typeof Account.Account>, role: Data<typeof Role>) => {
        return attemptAsync(async () => {
            if (role.data.name !== 'root') {
                const roles = await (await getRolesFromAccount(account)).unwrap();
                if (roles.find(r => r.id === role.id)) {
                    return;
                }
            }
        });
    };
}