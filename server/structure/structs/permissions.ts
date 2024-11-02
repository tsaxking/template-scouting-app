import { Struct, Data, Action, Blank } from './cache-2';
import { DB } from '../../utilities/database';
import { attempt, attemptAsync, resolveAll, Result } from '../../../shared/check';
import { Account } from './account';


export namespace Permissions {
    export type Property = {
        struct: string;
        property: string;
    }

    export const Role = new Struct({
        database: DB,
        name: 'Role',
        structure: {
            name: 'text',
            description: 'text',
            // parent: 'text', // role id
            // permissions: 'text' // array of permissions split by comma
        }
    });

    // Role.addDefaults({
    //     archived: false,
    //     id: 'general',
    //     name: 'General',
    //     description: 'General role',
    //     // parent: '', // no parent, everything is a child of this
    //     // permissions: '' // market.read,market.write,etc.
    // });

    export const RoleTarget = new Struct({
        database: DB,
        name: 'RoleTarget',
        structure: {
            role: 'text',
            target: 'text', // target is the attribute added onto the struct
            action: 'text',
            structProperties: 'text', // struct.property1,struct.property2,str\,uct.property3
        }
    });

    export const Target = new Struct({
        database: DB,
        name: 'Target',
        structure: {
            name: 'text',
            description: 'text',
        },
    });

    export const RoleAccount = new Struct({
        database: DB,
        name: 'RoleAccount',
        structure: {
            role: 'text', // role id
            account: 'text' // account id
        }
    });

    export const addStructProperty = async <S extends Struct<Blank, string>>(
        roleTarget: Data<typeof RoleTarget>,
        struct: S,
        property: keyof S['data']['structure'],
    ) => {
        return attemptAsync(async () => {
            const properties = parseProperties(roleTarget.data.structProperties).unwrap();
            properties.push({ struct: struct.name, property: property as string });
            return (await roleTarget.update({
                structProperties: stringifyProperties(properties).unwrap(),
            })).unwrap();
        });
    };

    export const removeStructProperty = async <S extends Struct<Blank, string>>(
        roleTarget: Data<typeof RoleTarget>,
        struct: S,
        property: keyof S['data']['structure']
    ) => {};

    export const addRole = (role: Data<typeof Role>, account: Data<typeof Account.Account>) => {
        return RoleAccount.new({
            role: role.id,
            account: account.id,
        });
    };

    export const getRoles = async (account: Data<typeof Account.Account>) => {
        return attemptAsync(async () => {
            const roleAccounts = (await RoleAccount.all()).unwrap();
            const roles = (await Role.all()).unwrap();

            return roles.filter(r =>
                roleAccounts.some(ra =>
                    ra.data.account === account.id && ra.data.role === r.id
                )
            );
        });
    };

    export const getTargets = async (...roles: Data<typeof Role>[]) => {
        return attemptAsync(async () => {
            const roleAttributes = (await RoleTarget.all()).unwrap();
            const targets = (await Target.all()).unwrap();

            return targets.filter(t =>
                roleAttributes.some(ra =>
                    roles.some(r =>
                        ra.data.role === r.id && ra.data.target === t.id
                    )
                )
            );
        });
    };

    export const getRoleTargets = async (role: Data<typeof Role>) => {
        return attemptAsync(async () => {
            return (await RoleTarget.all()).unwrap().filter(rt => rt.data.role === role.id);
        });
    };

    export const roleTargetsFromAccount = async (account: Data<typeof Account.Account>) => {
        return attemptAsync(async () => {
            const roles = (await getRoles(account)).unwrap();
            return resolveAll(
                await Promise.all(roles.map(r => getRoleTargets(r)))
            ).unwrap().flat();
        });
    };

    export const parseProperties = (properties: string): Result<Property[]> => {
        return attempt(() => {
            // split by comma not followed by a backslash
            return properties.split(/,(?<!\\)/)
                .map(p => p.replace(/\\,/g, ','))
                .map(p => p.split(/.(?<!\\)/))
                .map(([struct, property]) => ({ struct, property }));
        });
    };

    export const stringifyProperties = (properties: Property[]): Result<string> => {
        return attempt(() => {
            return properties.map(p => `${p.struct}.${p.property}`.replace(/,/g, '\\,')).join(',');
        });
    };

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

    /**
     * 
     * @param roleTargets 
     * @param action 
     * @param data 
     * @returns Filtered data array with only the properties that the role has access to
     */
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
}