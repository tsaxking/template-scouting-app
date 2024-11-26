import { read } from 'fs';
import { socket } from '../utilities/socket';
import { Data, StructData, Struct, SingleWritable } from './struct';
import { Blank } from '../../shared/struct';
import { attemptAsync } from '../../shared/check';

export namespace Accounts {

    export const Account = new Struct({
        name: 'Account',
        socket,
        structure: {
            username: 'text',
            key: 'text',
            salt: 'text',
            firstName: 'text',
            lastName: 'text',
            email: 'text',
            picture: 'text',
            verified: 'boolean',
            verification: 'text'
        }
    });

    export type AccountData = StructData<typeof Account.data.structure>;

    export const self = new SingleWritable(
        Account.Generator({
            username: 'guest',
            firstName: 'Guest',
            lastName: 'Guest',
            key: '',
            salt: '',
            email: '',
            picture: '',
            verified: false,
            verification: '',
        }),
    );

    export const DiscordLink = new Struct({
        name: 'DiscordLink',
        socket,
        structure: {
            discordId: 'text',
            account: 'text'
        }
    });

    export const PasswordChange = new Struct({
        name: 'PasswordChange',
        socket,
        structure: {
            accountId: 'text',
            key: 'text',
            expires: 'text'
        }
    });

    export const EmailChange = new Struct({
        name: 'EmailChange',
        socket,
        structure: {
            account: 'text',
            email: 'text',
            key: 'text',
            expires: 'text'
        }
    });

    export const Notification = new Struct({
        name: 'Notification',
        socket,
        structure: {
            accountId: 'text',
            type: 'text',
            data: 'text',
            read: 'boolean',
            message: 'text',
            title: 'text'
        }
    });

    export type NotificationData = StructData<typeof Notification.data.structure>;

    export const Settings = new Struct({
        name: 'Settings',
        socket,
        structure: {
            accountId: 'text',
            key: 'text',
            value: 'text',
        }
    });

    export type SettingsData = StructData<typeof Settings.data.structure>;

    export class SettingsObj<T extends Record<string, boolean | number | string>> {
        // public readonly settings: T;
        
        constructor(private data: SettingsData[], public readonly account: AccountData) {
            // this.settings = data.reduce((acc, setting) => {
            //     if (setting.data.accountId === account.id) {
            //         // eslint-disable-next-line @typescript-eslint/no-explicit-any
            //         // (acc as any)[setting.data.key || ''] = setting.data.value;

            //         acc = {
            //             ...acc,
            //             get [setting.data.key || '']() {
            //                 return setting.data.value;
            //             },

            //             set [setting.data.key || ''](value: string) {
            //                 setting.
            //             }
            //         };
            //     }
            //     return acc;
            // }, {} as T);
        }

        set(key: keyof T, value: string) {
            return attemptAsync(async () => {
                const setting = this.data.find(s => s.data.accountId === this.account.id && s.data.key === key);
                if (setting) {
                    setting.update((data) => ({
                        value,
                    }));
                } else {
                    Settings.new({
                        key: String(key),
                        value,
                        accountId: String(this.account.id),
                    });
                }
            });
        }

        get (key: keyof T) {
            return this.data.find(setting => setting.data.key === key)?.data.value;
        }
    }
}
