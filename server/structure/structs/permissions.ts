/* 
General concept:
- RBAC (Role Based Access Control) is used to manage permissions
- Each role is a child of a parent role, except for the root role
- The higher the role (parent), the fewer permissions it has
- A child inherits all the permissions of its parent
- The root role has no permissions


- A universe is a collection of data, a data can only be inside one universe


- Questions:
    - Integrate permission block list, where instead of permitting anyone to perform an action, you allow an action except on certain data
        - Todo this, there would need to be a accountBlockList and/or roleBlockList in the globalCols of all data
*/

import {
    attempt,
    attemptAsync,
    resolveAll,
    Result
} from '../../../shared/check';
import { DB } from '../../utilities/database';
import { Account } from './account';
import {
    Struct,
    Data,
    Blank,
    DataError,
    GlobalCols,
    PartialStructable
} from './cache-2';
import { encode, decode } from '../../../shared/text';

export namespace Permissions {
    export enum PropertyAction {
        Read = 'read',
        Update = 'update',

        // anyone who can read version history or archives can read only the properties that they can read using their respective read permission
        ReadVersionHistory = 'read-version-history',
        ReadArchive = 'read-archive'
    }

    // these are not property specific
    export enum DataAction {
        Create = 'create',
        Delete = 'delete',
        Archive = 'archive',
        RestoreArchive = 'restore-archive',
        RestoreVersion = 'restore-version',
        DeleteVersion = 'delete-version'
    }

    export class DataPermission {
        static stringify(permissions: DataPermission[]): Result<string> {
            return attempt(() => {
                let result = '';
                for (const p of permissions) {
                    result +=
                        [p.permission, p.struct, p.property || '']
                            .map(encode)
                            .join(',') + ';';
                }

                return result;
            });
        }

        static parse(permissions: string): Result<DataPermission[]> {
            return attempt(() => {
                const result: DataPermission[] = [];
                const parts = permissions.split(';');
                for (const part of parts) {
                    const [permission, struct, property] = part
                        .split(',')
                        .map(decode);
                    result.push(
                        new DataPermission(
                            permission as PropertyAction,
                            struct,
                            property
                        )
                    );
                }

                return result;
            });
        }

        constructor(
            public readonly permission: PropertyAction | DataAction,
            public readonly struct: string,
            public readonly property?: string // If property is undefined, it means the permission is for the whole struct
        ) {}
    }

    export const Universe = new Struct({
        database: DB,
        name: 'Universe',
        structure: {
            name: 'text',
            description: 'text'
        }
    });

    export const Role = new Struct({
        database: DB,
        name: 'Role',
        structure: {
            name: 'text',
            parent: 'text',
            universe: 'text',
            permissions: 'text'
        }
    });

    Universe.on('create', universe => {
        Role.new({
            name: 'root',
            parent: '',
            universe: universe.id,
            permissions: ''
        });
    });

    export const RoleAccount = new Struct({
        database: DB,
        name: 'RoleAccount',
        structure: {
            role: 'text',
            account: 'text'
        }
    });

    // join socket room
    // RoleAccount.on('create', async ra => {});

    // leave socket room
    // RoleAccount.on('delete', async ra => {});

    export const getRolesFromUniverse = async (
        universe: Data<typeof Universe>
    ) => {
        return Role.fromProperty('universe', universe.id);
    };

    export const getRoles = async (account: Data<typeof Account.Account>) => {
        return attemptAsync(async () => {
            const roleAccounts = (
                await RoleAccount.fromProperty('account', account.id)
            ).unwrap();
            return resolveAll(
                await Promise.all(
                    roleAccounts.map(async ra => Role.fromId(ra.data.role))
                )
            )
                .unwrap()
                .filter(Boolean);
        });
    };

    export const giveRole = async (
        account: Data<typeof Account.Account>,
        role: Data<typeof Role>
    ) => {
        return attemptAsync(async () => {
            if (role.data.name !== 'root') {
                const roles = await (await getRoles(account)).unwrap();
                if (roles.find(r => r.id === role.id)) {
                    return;
                }
            }

            return (
                await RoleAccount.new({
                    role: role.id,
                    account: account.id
                })
            ).unwrap();
        });
    };

    export const permissionsFromRole = (role: Data<typeof Role>) => {
        return DataPermission.parse(role.data.permissions);
    };

    export const permissionsFromAccount = async (
        account: Data<typeof Account.Account>
    ) => {
        return attemptAsync(async () => {});
    };

    export const setPermissions = async (
        role: Data<typeof Role>,
        permissions: DataPermission[]
    ) => {
        return role.update({
            permissions: DataPermission.stringify(permissions).unwrap()
        });
    };

    export const givePermission = async (
        role: Data<typeof Role>,
        permission: DataPermission
    ) => {
        return attemptAsync(async () => {
            const permissions = (await permissionsFromRole(role)).unwrap();
            permissions.push(permission);
            return setPermissions(role, permissions);
        });
    };

    export const removePermission = async (
        role: Data<typeof Role>,
        permission: DataPermission
    ) => {
        return attemptAsync(async () => {
            const permissions = (await permissionsFromRole(role)).unwrap();
            const index = permissions.findIndex(
                p =>
                    p.permission === permission.permission &&
                    p.struct === permission.struct &&
                    p.property === permission.property
            );
            if (index === -1) {
                return;
            }

            permissions.splice(index, 1);
            return (await setPermissions(role, permissions)).unwrap();
        });
    };

    // TODO: This isn't really typed correctly. As of right now, the output is using the generic Struct<Blank, string> type rather than the actual struct type that's passed in.
    export const filterAction = async <
        S extends Struct<Blank, string>,
        D extends Data<S>
    >(
        roles: Data<typeof Role>[],
        data: D[],
        action: PropertyAction
    ): Promise<Result<PartialStructable<S>[]>> => {
        return attemptAsync(async () => {
            if (
                data.filter(
                    (v, i, a) =>
                        a.findIndex(d => d.struct.name === v.struct.name) === i
                ).length > 1
            ) {
                throw new DataError('Data must be from the same struct');
            }

            const struct = data[0].struct.name;
            if (!struct) {
                return [];
            }

            const universes = roles.map(r => r.data.universe);
            const permissions = resolveAll(
                roles.map(r => permissionsFromRole(r))
            )
                .unwrap()
                .flat()
                // TODO: if action is readversionhistory or readarchive, properties should be filtered by the read permissions
                .filter(p => p.permission === action && p.struct === struct);

            return data
                .filter(d => {
                    const dataUniverses = d.getUniverses().unwrap();
                    return dataUniverses.some(du => universes.includes(du));
                })
                .map(d => {
                    const { data } = d;
                    const properties = permissions
                        .map(p => p.property)
                        .concat(
                            'id',
                            'created',
                            'updated',
                            'archived',
                            'universes'
                        )
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .filter(Boolean);

                    return Object.fromEntries(
                        properties.map(p => [p, data[p]])
                    ) as PartialStructable<S>;
                });
        });
    };

    // global permissions
    export const canDo = (
        roles: Data<typeof Role>[],
        struct: Struct<Blank, string>,
        action: DataAction
    ) => {
        return attempt(async () => {
            const permissions = resolveAll(
                roles.map(r => permissionsFromRole(r))
            )
                .unwrap()
                .flat()
                .filter(
                    p => p.permission === action && p.struct === struct.name
                );

            return permissions.length > 0;
        });
    };
}
