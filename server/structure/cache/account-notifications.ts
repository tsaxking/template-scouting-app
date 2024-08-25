import { Cache } from "./cache";
import { AccountNotifications as AN } from "../../utilities/tables";
import { attemptAsync } from "../../../shared/check";
import { DB } from "../../utilities/databases";
import { uuid } from "../../utilities/uuid";


export class AccountNotification extends Cache {
    public static all() {
        return attemptAsync(async () => {
            return (await DB.all('account-notifications/all'))
            .unwrap()
            .map(a => new AccountNotification(a));
        });
    }

    public static fromAccount(accountId: string) {
        return attemptAsync(async () => {
            return (await DB.all('account-notifications/from-account', { accountId }))
            .unwrap()
            .map(a => new AccountNotification(a));
        });
    }

    public static new(data: Omit<AN, 'id' | 'created'>) {
        return attemptAsync(async () => {
            const id = uuid();
            const created = Date.now();

            await DB.run('account-notifications/new', { ...data, id, created });

            return new AccountNotification({ ...data, id, created });
        });
    }

    public readonly id: string;
    public readonly accountId: string;
    public type: string;
    public data: string; // JSON
    public readonly created: number;
    public read: boolean;
    public message: string;

    constructor(obj: AN) {
        super();
        this.id = obj.id;
        this.accountId = obj.accountId;
        this.type = obj.type;
        this.data = obj.data;
        this.created = obj.created;
        this.read = obj.read;
        this.message = obj.message;
    }

    public markRead() {
        return attemptAsync(async () => {
            await DB.run('account-notifications/mark-read', { id: this.id, read: true });
            this.read = true;
        });
    }

    public markUnread() {
        return attemptAsync(async () => {
            await DB.run('account-notifications/mark-read', { id: this.id, read: false });
        });
    }

    public delete() {
        return attemptAsync(async () => {
            await DB.run('account-notifications/delete', { id: this.id });
        });
    }
}