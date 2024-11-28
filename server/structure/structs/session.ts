import { Data, Struct } from './struct';
import { DB } from '../../utilities/database';
import { Account } from './account';
import { attemptAsync, resolveAll } from '../../../shared/check';
import { Loop } from '../../../shared/loop';
import { App, CookieOptions, Next, ServerFunction } from '../app/app';
import { Req } from '../app/req';
import { Res } from '../app/res';
import express from 'express';
import { uuid } from '../../utilities/uuid';

export namespace Session {
    export const Session = new Struct({
        database: DB,
        structure: {
            accountId: 'text',
            ip: 'text',
            userAgent: 'text',
            requests: 'integer',
            prevUrl: 'text',
        },
        name: 'Session',
        generators: {
            id: () => (uuid() + uuid() + uuid() + uuid()).replace(/-/g, '')
        },
        universeLimit: 1
    });

    export const Blacklist = new Struct({
        database: DB,
        structure: {
            ip: 'text',
            userAgent: 'text',
            reason: 'text'
        },
        name: 'Blacklist'
    });

    export const CustomData = new Struct({
        database: DB,
        structure: {
            sessionId: 'text',
            // flexible
        },
        name: 'CustomData'
    });

    export const getAccount = async (session: Data<typeof Session>) => {
        return Account.Account.fromId(session.data.accountId);
    };

    export const deleteUnused = () => {
        return attemptAsync(async () => {
            const sessions = (await Session.all(false)).unwrap();
            const notUsed = sessions.filter(s => s.data.accountId === '');
            return resolveAll(
                await Promise.all(notUsed.map(s => s.delete()))
            ).unwrap();
        });
    };

    export const deleteInterval = (ms: number) => {
        return new Loop(deleteUnused, ms);
    };

    export const fromApp = async (
        app: App,
        req: express.Request,
        res: express.Response
    ) => {
        return attemptAsync(async () => {
            const id = req.headers.cookie
                ?.split(';')
                .find(c => c.includes('ssid'))
                ?.split('=')[1];
            if (id) {
                const s = (await Session.fromId(id)).unwrap();
                if (s) return s;
            }
            return (
                await Session.new({
                    accountId: '',
                    ip: req.ip || '',
                    userAgent: req.get('User-Agent') || '',
                    requests: 0,
                    prevUrl: req.url,
                })
            ).unwrap();
        });
    };

    export const middleware =
        (options: CookieOptions, int = 1000 * 60 * 10): ServerFunction =>
        async (req, res, next) => {
            const interval = deleteInterval(int);
            interval.start();
            const s = (await fromApp(req.app, req.req, res.res)).unwrap();
        };

    export const signIn = async (
        session: Data<typeof Session>,
        account: Data<typeof Account.Account>
    ) => {
        return session.update({
            accountId: account.id
        });
    };

    export const signOut = async (session: Data<typeof Session>) => {
        return session.update({
            accountId: ''
        });
    };
}
