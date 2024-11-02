import { Data, Struct, StructData } from './cache-2';
import { DB } from '../../utilities/database';
import { attempt, attemptAsync, resolveAll, Result } from '../../../shared/check';
import { Req } from '../app/req';
import { Res } from '../app/res';
import { Next } from '../app/app';
import crypto from 'node:crypto';
import { log } from '../../utilities/terminal-logging';
import Filter from 'bad-words';
import { trimBody, validate } from '../../middleware/data-type';
import { Status } from '../../utilities/status';
import { Session } from './session';
import { uuid } from '../../utilities/uuid';

export namespace Account {
    export const Account = new Struct({
        database: DB,
        structure: {
            username: 'text',
            key: 'text',
            salt: 'text',
            firstName: 'text',
            lastName: 'text',
            email: 'text',
            picture: 'text',
            verified: 'boolean',
            verification: 'text',
            // phoneNumber: 'text'
        },
        name: 'Account',
        generators: {
            attributes: () => ['admin']
        }
    });

    export const DiscordLink = new Struct({
        database: DB,
        structure: {
            discordID: 'text',
            account: 'text'
        },
        name: 'DiscordLink'
    });

    export const PasswordChange = new Struct({
        database: DB,
        structure: {
            account: 'text',
            key: 'text',
            expires: 'integer'
        },
        name: 'PasswordChange'
    });

    export const EmailChange = new Struct({
        database: DB,
        structure: {
            account: 'text',
            email: 'text',
            key: 'text',
            expires: 'integer'
        },
        name: 'EmailChange'
    });

    export const Notification = new Struct({
        database: DB,
        structure: {
            accountId: 'text',
            type: 'text',
            data: 'text', // json
            read: 'boolean',
            message: 'text',
            title: 'text'
        },
        name: 'Notification'
    });

    export const Settings = new Struct({
        database: DB,
        structure: {
            account: 'text',
            key: 'text',
            value: 'text'
        },
        name: 'Settings'
    });

    export const getNotifications = async (account: Data<typeof Account>) => {
        return attemptAsync(async () => {
            const all = (await Notification.all()).unwrap();
            return all.filter(n => n.data.accountId === account.id);
        });
    };

    export const getSettings = async (account: Data<typeof Account>) => {
        return attemptAsync(async () => {
            const all = (await Settings.all()).unwrap();
            return all.filter(s => s.data.account === account.id);
        });
    };

    export const getVerifiedAccounts = async () => {
        return attemptAsync(async () => {
            const all = (await Account.all()).unwrap();
            return all.filter(a => a.data.verified);
        });
    };

    export const getUnverifiedAccounts = async () => {
        return attemptAsync(async () => {
            const all = (await Account.all()).unwrap();
            return all.filter(a => !a.data.verified);
        });
    };

    export const fromUsername = async (username: string) => {
        return attemptAsync(async () => {
            return (await Account.all())
                .unwrap()
                .find(a => a.data.username === username);
        });
    };

    export const fromEmail = async (email: string) => {
        return attemptAsync(async () => {
            return (await Account.all())
                .unwrap()
                .find(a => a.data.email === email);
        });
    };

    export const fromVerificationKey = async (key: string) => {
        return attemptAsync(async () => {
            return (await Account.all())
                .unwrap()
                .find(a => a.data.verification === key);
        });
    };

    export const fromDiscordID = async (discordID: string) => {
        return attemptAsync(async () => {
            const [accounts, discordLinks] = await Promise.all([
                Account.all(),
                DiscordLink.all()
            ]);
            const a = accounts.unwrap();
            const d = discordLinks.unwrap();

            return a.find(a =>
                d.some(
                    dl =>
                        dl.data.discordID === discordID &&
                        dl.data.account === a.id
                )
            );
        });
    };

    export const fromPasswordChangeKey = async (key: string) => {
        return attemptAsync(async () => {
            return (await PasswordChange.all())
                .unwrap()
                .find(p => p.data.key === key);
        });
    };

    export const isSignedIn = async (req: Req, res: Res, next: Next) => {
        if (!req.session.data.accountId) {
            return res.sendStatus('account:not-logged-in');
        }
        next();
    };

    export const notSignedIn = async (req: Req, res: Res, next: Next) => {
        if (req.session.data.accountId) {
            return res.sendStatus('account:logged-in');
        }
        next();
    };

    export const newHash = (password: string) => {
        return attempt(() => {
            const salt = crypto.randomBytes(32).toString('hex');
            const h = hash(password, salt).unwrap();
            return { salt, hash: h };
        });
    };

    export const hash = (password: string, salt: string) => {
        return attempt(() => {
            return crypto
                .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
                .toString('hex');
        });
    };

    export const validAccountStr = (str: string) => {
        return attempt(() => {
            const chars =
                'abcdefghijklmnopqrstuvwxyz0123456789_-!@#$%^&*()+={}[]|;:,.<>?~`\'"/';
            const invalidChars: string[] = [];

            let valid = str
                .toLowerCase()
                .split('')
                .every(c => {
                    const validChar = chars.includes(c);
                    if (!validChar) invalidChars.push(c);
                    return validChar;
                });

            const filtered = new Filter().clean(str);
            if (filtered !== str) {
                valid = false;
                invalidChars.push(
                    ...str
                        .split(' ')
                        .filter(w => !filtered.split(' ').includes(w))
                );
            }

            if (!valid) log('Invalid characters/words:', invalidChars);

            return {
                valid,
                chars: invalidChars
            };
        });
    };

    export const verify = (account: Data<typeof Account>) => {
        return account.update({
            verified: true,
            verification: ''
        });
    };

    export const unverify = (account: Data<typeof Account>) => {
        return account.update({
            verified: false,
            verification: crypto.randomBytes(32).toString('hex')
        });
    };

    export const selfUpdateAllowed = (
        account: Data<typeof Account>,
        update: Partial<{
            username: string;
            firstName: string;
            lastName: string;
            email: string;
            picture: string;
            phoneNumber: string;
        }>
    ) => {
        return account.update(update);
    };

    export const safe = (account: Data<typeof Account>) => {
        const { data } = account;
        return {
            username: data.username,
            firstName: data.firstName,
            lastName: data.lastName,
            picture: data.picture,
            verified: data.verified,
            id: data.id,
        };
    };

    export const sendEmail = async (account: Data<typeof Account>) => {
        return attemptAsync(async () => {});
    };

    export const sendVerification = async (account: Data<typeof Account>) => {
        return attemptAsync(async () => {
            if (account.data.verified) return;

            return (await sendEmail(account)).unwrap();
        });
    };

    export const create = async (obj:  {
        username: string;
        password: string;
        firstName: string;
        lastName: string;
        email: string;
        picture: string;
        // phoneNumber: string;
    }): Promise<Result<Data<typeof Account> | {
        valid: false;
        reason: string;
    }>> => {
        return attemptAsync(async () => {
            const { username, password, firstName, lastName, email, picture } = obj;

            const [u, e] = await Promise.all([
                fromUsername(username),
                fromEmail(email),
            ]);

            const exists = u.unwrap() || e.unwrap();

            if (exists) {
                return {
                    valid: false,
                    reason: 'Account already exists',
                };
            }

            const validArr = resolveAll([
                username,
                password,
                email,
                firstName,
                lastName,
            ].map(validAccountStr)).unwrap();

            if (!validArr.every(v => v.valid)) {
                return {
                    valid: false,
                    reason: 'Invalid chars:' + validArr.filter(v => !v.valid).flatMap(v => v.chars).flat().join(', '),
                };
            }

            const { salt, hash } = newHash(password).unwrap();

            const verification = uuid();

            const account = (await Account.new({
                username,
                key: hash,
                salt,
                email,
                firstName,
                lastName,
                picture,
                verified: false,
                verification,
            })).unwrap();

            return account;
        });
    };

    const notSignedInStatus = (req: Req) => new Status(
        {
            message: 'Not signed in',
            color: 'danger',
            code: 401,
            instructions: 'Please sign in first.'
        },
        'Account',
        'Not Signed In',
        JSON.stringify(req.session.data),
        req,
    );
    
    {
        Account.listen<{
            username: string;
            password: string;
        }>('/sign-in', notSignedIn, validate({
            username: 'string',
            password: 'string',
        }), trimBody, async (req, res) => {
            const { username, password } = req.body;

            const incorrectStatus = new Status(
                {
                    message: 'Incorrect username or password',
                    color: 'danger',
                    code: 401,
                    instructions: 'Please try again.'
                },
                'Account',
                'Incorrect Username or Password',
                JSON.stringify({ username, password }),
                req,
            );

            const notVerifiedStatus = new Status(
                {
                    message: 'Account not verified',
                    color: 'danger',
                    code: 401,
                    instructions: 'Please verify your account.'
                },
                'Account',
                'Account Not Verified',
                JSON.stringify({ username, password }),
                req,
            );

            const signedInStatus = new Status(
                {
                    message: 'Already signed in',
                    color: 'danger',
                    code: 401,
                    instructions: 'Please sign out first.'
                },
                'Account',
                'Already Signed In',
                JSON.stringify({ username, password }),
                req,
            );

            const [u, e] = await Promise.all([
                fromUsername(username),
                fromEmail(username),
            ]);

            const account = u.unwrap() || e.unwrap();
            if (!account) return res.sendStatus(incorrectStatus);

            const h = hash(password, account.data.salt).unwrap();
            if (h !== account.data.key) return res.sendStatus(incorrectStatus);

            if (!account.data.verified) return res.sendStatus(notVerifiedStatus);

            (await Session.signIn(req.session, account)).unwrap();

            res.sendStatus(signedInStatus);

            req.socket?.join(account.id);
        });

        Account.listen<{
            username: string;
            password: string;
            confirmPassword: string;
            email: string;
            firstName: string;
            lastName: string;
            // phoneNumber: string;
        }>('/sign-up', notSignedIn, validate({
            username: 'string',
            password: 'string',
            confirmPassword: 'string',
            email: 'string',
            firstName: 'string',
            lastName: 'string',
            // phoneNumber: 'string',
        }), trimBody, async (req, res) => {
            const { username, password, confirmPassword, email, firstName, lastName } = req.body;

            if (password !== confirmPassword) {
                return res.sendStatus(new Status(
                    {
                        message: 'Passwords do not match',
                        color: 'danger',
                        code: 400,
                        instructions: 'Please try again.'
                    },
                    'Account',
                    'Passwords Do Not Match',
                    JSON.stringify({ username, password, email, firstName, lastName }),
                    req,
                ));
            }

            const accountOrReason = (await create({
                username,
                password,
                firstName,
                lastName,
                email,
                picture: '',
            })).unwrap();

            if (accountOrReason instanceof StructData) {
                return res.sendStatus(new Status(
                    {
                        message: 'Account created',
                        color: 'success',
                        code: 201,
                        instructions: 'Please verify your account.',
                        redirect: req.session.data.prevUrl || '/',
                    },
                    'Account',
                    'Account Created',
                    JSON.stringify({ username, password, email, firstName, lastName }),
                    req,
                ));
            }

            return res.sendStatus(new Status({
                    message: accountOrReason.reason,
                    color: 'danger',
                    code: 400,
                    instructions: 'Please try again.'
                },
                'Account',
                'Account Creation Failed',
                JSON.stringify({ username, password, email, firstName, lastName }),
                req,
            ));

            // const [u, e] = await Promise.all([
            //     fromUsername(username),
            //     fromEmail(email),
            // ]);

            // const exists = u.unwrap() || e.unwrap();
            // if (exists) {
            //     return res.sendStatus(new Status(
            //         {
            //             message: 'Account already exists',
            //             color: 'danger',
            //             code: 400,
            //             instructions: 'Please try again.'
            //         },
            //         'Account',
            //         'Account Already Exists',
            //         JSON.stringify({ username, password, email, firstName, lastName }),
            //         req,
            //     ));
            // }

            // const validArr = resolveAll([
            //     username,
            //     password,
            //     email,
            //     firstName,
            //     lastName,
            // ].map(validAccountStr)).unwrap();

            // if (!validArr.every(v => v.valid)) {
            //     return res.sendStatus(new Status(
            //         {
            //             message: 'Invalid characters/words (valid characters: a-z, 0-9, _-!@#$%^&*()+={}[]|;:,.<>?~`\'"/)',
            //             color: 'danger',
            //             code: 400,
            //             instructions: 'Please try again.'
            //         },
            //         'Account',
            //         'Invalid Characters/Words',
            //         JSON.stringify(validArr),
            //         req,
            //     ));
            // }

            // const { salt, hash } = newHash(password).unwrap();

            // const verification = uuid();

            // const account = (await Account.new({
            //     username,
            //     key: hash,
            //     salt,
            //     email,
            //     firstName,
            //     lastName,
            //     picture: '',
            //     verified: false,
            //     verification,
            // })).unwrap();

            // sendVerification(account);
        });

        Account.listen('/get-account', async (req, res) => {
            const account = await (await Session.getAccount(req.session)).unwrap();
            if (!account) return res.sendStatus(notSignedInStatus(req));
            
            res.json(safe(account));
        });

        Account.listen('/sign-out', isSignedIn, async (req, res) => {
            await Session.signOut(req.session);
            res.sendStatus(new Status(
                {
                    message: 'Signed out',
                    color: 'success',
                    code: 200,
                    instructions: 'Please sign in again.'
                },
                'Account',
                'Signed Out',
                JSON.stringify(req.session.data),
                req,
            ));
        });
    }
}
