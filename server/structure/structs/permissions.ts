import {
    Struct,
    Data,
    Blank,
    DataError,
    DataInterface,
    TS_GlobalCols
} from './cache-2';
import { DB } from '../../utilities/database';
import {
    attempt,
    attemptAsync,
    resolveAll,
    Result
} from '../../../shared/check';
import { Account } from './account';

/*
general concept:
using a combination of RBAC & ABAC (Role Based Access Control & Attribute Based Access Control)
roles are assigned to accounts, and roles have permissions to access certain attributes of structs
this allows for fine-grained control over what a user can access, and what they can do with it
for example, a user can have a role that allows them to 'read' the 'name' attribute of a 'user' struct


how it works:
1. roles are created and assigned to accounts using the RoleAccount linking struct
2. roles are assigned RoleTargets, which are the actions they can perform onto a struct.property
3. When a RoleTarget.target is put into a Struct.data.attributes, that role is able to perform the RoleTarget.action onto the RoleTarget.structProperties

A role is really just a collection of RoleTargets. I could do away with those, but the idea is that it would be easier to manage permissions this way as an end-user, even though it is more verbose.
*/

export namespace Permissions {
    export enum DataAction {
        Read = 'read',
        Update = 'update',
        ReadArchived = 'read.archived',
        // Archive = 'archive',
        // Restore = 'restore',
        // Delete = 'delete',
        RestoreVersion = 'version.restore',
        DeleteVersion = 'version.delete',
        ReadVersionHistory = 'read.version-history'
    }

    export type StructProperty = {
        struct: string;
        property: string;
    };

    export const Role = new Struct({
        database: DB,
        name: 'Role',
        structure: {
            name: 'text',
            description: 'text'
        }
    });

    export const Target = new Struct({
        database: DB,
        name: 'Target',
        structure: {
            parent: 'text', // parent target (higher is more privileged)
            name: 'text', // target is the attribute added onto the struct
            action: 'text',
            structProperties: 'text' // struct.property1,struct.property2,str\,uct.property3
        }
    });

    // linking table
    export const RoleTarget = new Struct({
        database: DB,
        name: 'RoleTarget',
        structure: {
            role: 'text',
            target: 'text'
        }
    });

    // linking table
    export const RoleAccount = new Struct({
        database: DB,
        name: 'RoleAccount',
        structure: {
            role: 'text', // role id
            account: 'text' // account id
        }
    });

    type TargetChild = {
        target: Data<typeof Target>;
        children: TargetChild[];
    };

    export const getParents = async (target: Data<typeof Target>): Promise<Result<Data<typeof Target>[]>> => {
        return attemptAsync(async () => {
            const all = (await Target.all()).unwrap();
            const next = (): Data<typeof Target>[] => {
                const parent = all.find(t => t.data.name === target.data.parent);
                if (!parent) return [];
                all.splice(all.indexOf(parent), 1);
                return [parent, ...next()];
            };

            return next();
        });
    };

    export const getChildren = async (target: Data<typeof Target>): Promise<Result<TargetChild[]>> => {
        return attemptAsync(async () => {
            const all = (await Target.all()).unwrap();
            const next = (): TargetChild[] => {
                const children = all.filter(t => t.data.parent === target.data.name);
                children.forEach(c => all.splice(all.indexOf(c), 1));
                return children.map(c => ({ target: c, children: next() }));
            };

            return next();
        });
    };

    export const addStructProperty = async <S extends Struct<Blank, string>>(
        roleTarget: Data<typeof Target>,
        struct: S,
        property: keyof S['data']['structure']
    ) => {
        return attemptAsync(async () => {
            const properties = parseStructProperties(
                roleTarget.data.structProperties
            ).unwrap();
            properties.push({
                struct: struct.name,
                property: property as string
            });
            return (
                await roleTarget.update({
                    structProperties:
                        stringifyStructProperties(properties).unwrap()
                })
            ).unwrap();
        });
    };

    export const removeStructProperty = async <S extends Struct<Blank, string>>(
        roleTarget: Data<typeof Target>,
        struct: S,
        property: keyof S['data']['structure']
    ) => {
        return attemptAsync(async () => {
            const properties = parseStructProperties(
                roleTarget.data.structProperties
            ).unwrap();
            const index = properties.findIndex(
                p => p.struct === struct.name && p.property === property
            );
            if (index === -1) return roleTarget;
            properties.splice(index, 1);
            return (
                await roleTarget.update({
                    structProperties:
                        stringifyStructProperties(properties).unwrap()
                })
            ).unwrap();
        });
    };

    export const addRole = (
        role: Data<typeof Role>,
        account: Data<typeof Account.Account>
    ) => {
        return RoleAccount.new({
            role: role.id,
            account: account.id
        });
    };

    export const getRoles = async (account: Data<typeof Account.Account>) => {
        return attemptAsync(async () => {
            const roleAccounts = (await RoleAccount.all()).unwrap();
            const roles = (await Role.all()).unwrap();

            return roles.filter(r =>
                roleAccounts.some(
                    ra =>
                        ra.data.account === account.id && ra.data.role === r.id
                )
            );
        });
    };

    export const getRoleTargets = async (role: Data<typeof Role>) => {
        return attemptAsync(async () => {
            const roleTargets = (await RoleTarget.all()).unwrap();
            return roleTargets.filter(rt => rt.data.role === role.id);
        });
    };

    export const getTargets = async (role: Data<typeof Role>): Promise<Result<Data<typeof Target>[]>> => {
        return attemptAsync(async () => {
            const roleTargets = (await getRoleTargets(role)).unwrap();
            return resolveAll(
                await Promise.all(
                    roleTargets.map(rt => Target.fromId(rt.data.target))
                )
            ).unwrap().filter(Boolean);
        });
    };

    export const getTargetsFromAccount = async (
        account: Data<typeof Account.Account>
    ) => {
        return attemptAsync(async () => {
            const roles = (await getRoles(account)).unwrap();
            return resolveAll(
                await Promise.all(roles.map(r => getTargets(r)))
            )
                .unwrap()
                .flat();
        });
    };

    export const parseStructProperties = (
        properties: string
    ): Result<StructProperty[]> => {
        return attempt(() => {
            // split by comma not followed by a backslash
            return properties
                .split(/,(?<!\\)/)
                .map(p => p.replace(/\\,/g, ','))
                .map(p => p.split(/.(?<!\\)/))
                .map(([struct, property]) => ({ struct, property }));
        });
    };

    export const stringifyStructProperties = (
        properties: StructProperty[]
    ): Result<string> => {
        return attempt(() => {
            return properties
                .map(p => `${p.struct}.${p.property}`.replace(/,/g, '\\,'))
                .join(',');
        });
    };

    export const canCreate = async (
        account: Data<typeof Account.Account>,
        struct: Struct<Blank, string>
    ) => {
        return attemptAsync(async () => {
            const roleTargets = (
                await getTargetsFromAccount(account)
            ).unwrap();
            return roleTargets.some(
                rt =>
                    rt.data.action === 'create' &&
                    parseStructProperties(rt.data.structProperties)
                        .unwrap()
                        .some(p => p.struct === struct.name)
            );
        });
    };

    export const canDelete = async (
        account: Data<typeof Account.Account>,
        data: Data<Struct<Blank, string>>
    ) => {
        return attemptAsync(async () => {
            const roleTargets = (
                await getTargetsFromAccount(account)
            ).unwrap();
            return roleTargets.some(
                rt =>
                    rt.data.action === 'delete' &&
                    parseStructProperties(rt.data.structProperties)
                        .unwrap()
                        .some(p => p.struct === data.struct.name)
            );
        });
    };

    export const canArchive = async (
        account: Data<typeof Account.Account>,
        data: Data<Struct<Blank, string>>
    ) => {
        return attemptAsync(async () => {
            const roleTargets = (
                await getTargetsFromAccount(account)
            ).unwrap();
            return roleTargets.some(
                rt =>
                    rt.data.action === 'archive' &&
                    parseStructProperties(rt.data.structProperties)
                        .unwrap()
                        .some(p => p.struct === data.struct.name)
            );
        });
    };

    export const canRestore = async (
        account: Data<typeof Account.Account>,
        data: Data<Struct<Blank, string>>
    ) => {
        return attemptAsync(async () => {
            const roleTargets = (
                await getTargetsFromAccount(account)
            ).unwrap();
            return roleTargets.some(
                rt =>
                    rt.data.action === 'restore' &&
                    parseStructProperties(rt.data.structProperties)
                        .unwrap()
                        .some(p => p.struct === data.struct.name)
            );
        });
    };

    export const filterAction = <
        D extends DataInterface<Struct<Blank, string>>
    >(
        roles: Data<typeof Role>[],
        action: DataAction,
        data: D[]
    ): Promise<Result<(Partial<D['data']> & TS_GlobalCols)[]>> => {
        return attemptAsync(async () => {
            // this needs to filter out the data that the user does not have any permission to do <action> on
            // then it needs to filter out the attributes that the user does not have permission to do <action> on

            if (
                data.filter(
                    (v, i, a) =>
                        a.findIndex(t => t.struct.name === v.struct.name) === i
                ).length > 1
            )
                throw new DataError(
                    'Multiple structs found, please ensure the data is of the same struct'
                );

            const roleTargets = resolveAll(
                await Promise.all(roles.map(getTargets))
            )
                .unwrap()
                .flat();

            return data
                .map(d => {
                    // find all applicable rulesets for this data
                    const rulesets = roleTargets.filter(
                        rt =>
                            rt.data.action === action &&
                            d
                                .getAttributes()
                                .unwrap()
                                .includes(rt.data.name) &&
                            parseStructProperties(rt.data.structProperties)
                                .unwrap()
                                .some(p => p.struct === d.struct.name)
                    );
                    if (!rulesets.length) return undefined;
                    // these are the properties that the user has permission to do <action> on
                    const allowedProperties = rulesets
                        .map(rt =>
                            parseStructProperties(
                                rt.data.structProperties
                            ).unwrap()
                        )
                        .flat()
                        .filter(p => p.struct === d.struct.name)
                        .map(p => p.property);

                    const data = Object.fromEntries(
                        [
                            ...allowedProperties,
                            ...[
                                'id',
                                'created',
                                'updated',
                                'archived',
                                'attributes'
                            ]
                        ].map(p => [p, d.data[p]])
                    );

                    return data as Partial<D['data']> & TS_GlobalCols;
                })
                .filter(Boolean);
        });
    };
}

/*


    export const isAllowed = (
        roleTargets: Data<typeof RoleTarget>[],
        action: Action,
        struct: Struct<Blank, string>,
    ) => {
        return attempt(() => {
            return roleTargets.some(rt => {
                const properties = parseProperties(rt.data.structProperties).unwrap();
                return rt.data.action === action && properties.some(p => p.struct === struct.name);
            });
        });
    };

    / **
     * 
     * @param roleTargets 
     * @param action 
     * @param data 
     * @returns Filtered data array with only the properties that the role has access to
     * /
    export const filterData = <D extends Data<Struct<Blank, string>>>(
        roleTargets: Data<typeof RoleTarget>[],
        action: Action,
        ...data: D[]
    ): Result<Partial<D['data']>[]> => {
        return attempt(() => {
            return data
                .map(d => {
                    const attributes = d.getAttributes().unwrap();
                    const rt = roleTargets.find(rt => attributes.includes(rt.data.target));
                    const properties = parseProperties(rt?.data.structProperties || '').unwrap();
                    return {
                        data: d,
                        roleTarget: rt,
                        attributes,
                        properties
                    };
                })
                .filter(d => !!d.roleTarget)
                // .filter(d => d.attributes.includes(d.roleTarget?.data.target || ''))
                .filter(d => d.roleTarget?.data.action === action)
                .map(d => {
                    return d.properties.reduce((acc, p) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (acc as any)[p.property] = d.data.data[p.property];
                        return acc;
                    }, {} as Partial<D['data']>);
                });
        });
    };

    export const canCreate = (
        account: Data<typeof Account.Account>,
        struct: Struct<Blank, string>,
    ) => {
        return attemptAsync(async () => {
            const roleTargets = (await roleTargetsFromAccount(account)).unwrap();
            return isAllowed(roleTargets, 'create', struct).unwrap();
        });
    };
*/
