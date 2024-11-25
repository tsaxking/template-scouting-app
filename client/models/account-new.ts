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
            account: 'text',
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
            account: 'text',
            key: 'text',
            value: 'text'
        }
    });


}
