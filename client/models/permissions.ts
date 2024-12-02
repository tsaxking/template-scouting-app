import { Writable, writable } from 'svelte/store';
import { attempt, attemptAsync } from '../../shared/check';
import { Blank } from '../../shared/struct';
import { ServerRequest } from '../utilities/requests';
import { socket } from '../utilities/socket';
import { Accounts } from './account';
import { SingleWritable, Struct, StructData } from './struct';

export namespace Permissions {
    export class PermissionError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'PermissionError';
        }
    }

    export type StructPermission<T extends Blank> = {
        property: keyof T;
        update: boolean;
        read: boolean;
    };

    type Permissions = {
        create: boolean;
        delete: boolean;

        readArchive: boolean;
        archive: boolean;
        restore: boolean;

        readVersionHistory: boolean;
        restoreVersion: boolean;
        deleteVersion: boolean;
    };

    export class StructPermissions<T extends Blank> implements Writable<{
        properties: StructPermission<T>[];
        permissions: Permissions;
    }>{
        public static fromRole(
            role: RoleData,
        ) {
            return attempt(() => {});
        }

        public static save(permissions: StructPermissions<Blank>[]) {
            return attemptAsync(async () => {
                const roles = permissions.map(i => i.role).filter((v, i, a) => a.indexOf(v) === i);
                if (roles.length > 1) {
                    throw new PermissionError('Multiple roles detected');
                }
            });
        }

        private data: {
            properties: StructPermission<T>[];
            permissions: Permissions;
        };

        private readonly subscribers: Set<(value: {
            properties: StructPermission<T>[];
            permissions: Permissions;
        }) => void> = new Set();

        constructor(
            public readonly struct: Struct<T>,
            public readonly role: RoleData,
            properties: StructPermission<T>[],
            permissions: Permissions
        ) {
            this.data = {
                properties,
                permissions
            };
        }

        private _onAllUnsubscribe?: () => void;

        set(value: {
            properties: StructPermission<T>[];
            permissions: Permissions;
        }) {
            this.data = value;
            this.subscribers.forEach(i => i(value));
        }

        update(fn: (value: {
            properties: StructPermission<T>[];
            permissions: Permissions;
        }) => {
            properties: StructPermission<T>[];
            permissions: Permissions;
        }) {
            this.set(fn(this.data));
        }

        subscribe(run: (value: {
            properties: StructPermission<T>[];
            permissions: Permissions;
        }) => void) {
            this.subscribers.add(run);
            run(this.data);

            return () => {
                this.subscribers.delete(run);
                if (!this.subscribers.size && this._onAllUnsubscribe) {
                    this._onAllUnsubscribe();
                }
            };
        }

        onAllUnsubscribe(fn: () => void) {
            this._onAllUnsubscribe = fn;
        }
    }

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

    export const givePermissions = async (role: RoleData, permissions: unknown[]) => {
        return attemptAsync(async () => {});
    };
}
