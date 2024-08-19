import { Next, Route } from '../structure/app/app';
import Account from '../structure/accounts';
import { Status } from '../utilities/status';
import Role from '../structure/roles';
import { messages, StatusId } from '../../shared/status-messages';
import { trimBody, validate } from '../middleware/data-type';
import env from '../utilities/env';
import { Req } from '../structure/app/req';
import { Res } from '../structure/app/res';
import { capitalize } from '../../shared/text';

export const router = new Route();

router.get('/*', (req, res, next) => {
    console.log('Account route');
    next();
});

const redirect = (req: Req, res: Res, next: Next) => {
    if (!req.session.accountId) return next();

    res.redirect(req.session.prevUrl || '/');
};

// gets the account from the session
router.post('/get-account', async (req, res) => {
    const account = await req.session.getAccount();
    // const account = await Account.fromUsername('tsaxking');

    if (account) {
        const safe = await account.safe({
            roles: true,
            email: true,
            memberInfo: true,
            permissions: true,
            id: true
        });
        res.json(safe);
    } else res.status(404).json({ error: 'Not logged in' });
});

// gets all roles available
router.post('/get-all-roles', (req, res) => {
    res.json(Role.all());
});

router.get('/sign-in', redirect, (req, res, next) => {
    if (req.session.accountId) return next();
    res.sendTemplate('entries/account/sign-in', {
        RECAPTCHA_SITE_KEY: env.RECAPTCHA_SITE_KEY
    });
});

router.get('/sign-up', redirect, (req, res, next) => {
    if (req.session.accountId) return next();
    res.sendTemplate('entries/account/sign-up', {
        RECAPTCHA_SITE_KEY: env.RECAPTCHA_SITE_KEY
    });
});

router.get('/change-password/:key', (req, res, next) => {
    const { key } = req.params;
    if (!key) return next();
    const a = Account.fromPasswordChangeKey(key);
    if (!a) return res.sendStatus('account:invalid-password-reset-key');
    res.sendTemplate('entries/account/reset-password');
});

router.post<{
    username: string;
    password: string;
}>(
    '/sign-in',
    Account.notSignedIn,
    redirect,
    validate({
        username: 'string',
        password: 'string'
    }),
    trimBody,
    async (req, res) => {
        const { username, password } = req.body;

        const [u, e] = await Promise.all([
            Account.fromUsername(username),
            Account.fromEmail(username)
        ]);

        const account = u || e;

        // send the same error for both username and password to prevent username enumeration
        if (!account) {
            return res.sendStatus('account:incorrect-username-or-password');
        }

        const hash = Account.hash(password, account.salt);
        if (hash !== account.key) {
            return Status.from('account:incorrect-username-or-password', req, {
                username: username
            }).send(res);
        }
        if (!account.verified) {
            return res.sendStatus('account:not-verified', {
                username
            });
        }

        await req.session.signIn(account);
        const roles = await account.getRoles();
        for (const role of roles) {
            // req.socket
        }

        // if (r.isErr()) return res.sendStatus('unknown:error');
        res.sendStatus(
            'account:logged-in',
            { username },
            req.session.prevUrl || '/home'
        );
    }
);

router.post<{
    username: string;
    password: string;
    confirmPassword: string;
    email: string;
    firstName: string;
    lastName: string;
}>(
    '/sign-up',
    Account.notSignedIn,
    redirect,
    validate({
        username: 'string',
        password: 'string',
        confirmPassword: 'string',
        email: 'string',
        firstName: 'string',
        lastName: 'string'
    }),
    trimBody,
    async (req, res) => {
        const {
            username,
            password,
            confirmPassword,
            email,
            firstName,
            lastName
        } = req.body;

        if (password !== confirmPassword) {
            return Status.from('account:password-mismatch', req).send(res);
        }

        const { status, data } = await Account.create(
            username,
            password,
            email,
            firstName,
            lastName
        );

        switch (status) {
            case 'created':
                res.sendStatus('account:created', { username });
                break;
            case 'username-taken':
                res.sendStatus('account:username-taken', { username });
                break;
            case 'email-taken':
                res.sendStatus('account:email-taken', { email });
                break;
            case 'invalid-username':
            case 'invalid-password':
            case 'invalid-email':
            case 'invalid-first-name':
            case 'invalid-last-name':
                res.sendCustomStatus(
                    new Status(
                        {
                            message:
                                'Input contains invalid characters: ' +
                                    data?.map(d => `"${d}"`).join(', ') || '',
                            color: 'warning',
                            code: 400,
                            instructions: 'Please try again.'
                        },
                        'Account',
                        capitalize(status.split('-').join(' ')),
                        JSON.stringify(req),
                        req
                    )
                );
                break;
        }

        if (status === 'created') {
            req.io.emit('account:created', username);
        }
    }
);

router.get('/sign-out', async (req, res) => {
    // console.log('Signing out');
    await req.session.signOut();
    // console.log(req.session);
    res.redirect('/home');
});

// req.session.account is always available when Account.allowRoles/Permissions is used
// however, typescript doesn't know that, so we have to cast it

router.post<{
    id: string;
}>(
    '/verify',
    Account.allowPermissions('verify'),
    validate({
        id: 'string'
    }),
    async (req, res) => {
        const { id } = req.body;

        if (id === req.session.accountId) {
            return res.sendStatus('account:cannot-edit-self');
        }

        const a = await Account.fromId(id);
        if (!a) return res.sendStatus('account:not-found');
        const status = a.verify();
        res.sendStatus(('account:' + status) as StatusId, { id });

        if (status === 'verified') {
            req.io.emit('account:verified', id);
        }
    }
);

router.post<{
    id: string;
}>(
    '/reject',
    Account.allowPermissions('verify'),
    validate({
        id: 'string'
    }),
    async (req, res) => {
        const { id } = req.body;

        if (id === req.session.accountId) {
            return res.sendStatus('account:cannot-edit-self');
        }

        const account = await Account.fromId(id);
        if (!account) return res.sendStatus('account:not-found', { id });

        if (account.verified) {
            return res.sendStatus('account:cannot-reject-verified');
        }

        const status = await Account.delete(id);
        res.sendStatus(('account:' + status) as StatusId, { id });

        if (status === 'removed') {
            req.io.emit('account:removed', id);
        }
    }
);

router.post(
    '/get-pending-accounts',
    Account.allowPermissions('verify'),
    async (_req, res) => {
        const accounts = await Account.getUnverifiedAccounts();
        res.json(
            accounts.map(a =>
                a.safe({
                    roles: true,
                    memberInfo: true,
                    permissions: true,
                    email: true
                })
            )
        );
    }
);

router.post<{
    id: string;
}>(
    '/delete',
    Account.allowPermissions('editUsers'),
    validate({
        id: 'string'
    }),
    async (req, res) => {
        const { id } = req.body;

        if (id === req.session.accountId) {
            return res.sendStatus('account:cannot-edit-self', { id });
        }

        const status = await Account.delete(id);
        res.sendStatus(('account:' + status) as StatusId, { id });

        if (status === 'removed') {
            req.io.emit('account:removed', id);
        }
    }
);

router.post<{
    id: string;
}>(
    '/unverify',
    Account.allowPermissions('verify'),
    validate({
        id: 'string'
    }),
    async (req, res) => {
        const { id } = req.body;

        if (id === req.session.accountId) {
            return res.sendStatus('account:cannot-edit-self', { id });
        }

        const a = await Account.fromId(id);
        if (!a) return res.sendStatus('account:not-found');
        Status.from(('account:' + a.unverify()) as StatusId, req, {
            id
        }).send(res);

        req.io.emit('account:unverified', id);
    }
);

router.post<{
    accountId: string;
    roleId: string;
}>(
    '/add-role',
    Account.allowPermissions('editRoles'),
    validate({
        accountId: 'string',
        roleId: 'string'
    }),
    async (req, res) => {
        const { accountId, roleId } = req.body;

        if (accountId === req.session.accountId) {
            return res.sendStatus('account:cannot-edit-self', { accountId });
        }

        const [account, role] = await Promise.all([
            Account.fromId(accountId),
            Role.fromId(roleId)
        ]);

        if (!account) return res.sendStatus('account:not-found', { accountId });

        if (!role) return res.sendStatus('role:not-found', { roleId });

        const status = await account.addRole(role);
        if (status === 'role-added') {
            req.io.emit('account:role-added', { accountId, roleId });
        }
        if (!messages[('role:' + status) as keyof typeof messages]) {
            return res.sendStatus(('account:' + status) as StatusId, {
                accountId,
                role
            });
        }
        res.sendStatus(('role:' + status) as StatusId, { accountId, role });
    }
);

router.post<{
    accountId: string;
    roleId: string;
}>(
    '/remove-role',
    Account.allowPermissions('editRoles'),
    validate({
        accountId: 'string',
        roleId: 'string'
    }),
    async (req, res) => {
        const { accountId, roleId } = req.body;

        if (accountId === req.session.accountId) {
            return res.sendStatus('account:cannot-edit-self', { accountId });
        }

        const [account, role] = await Promise.all([
            Account.fromId(accountId),
            Role.fromId(roleId)
        ]);

        if (!account) return res.sendStatus('account:not-found', { accountId });

        if (!role) return res.sendStatus('role:not-found', { roleId });

        const status = await account.removeRole(role);
        if (status === 'role-removed') {
            req.io.emit('account:role-removed', { accountId, roleId });
        }
        if (!messages[('role:' + status) as keyof typeof messages]) {
            return res.sendStatus(('account:' + status) as StatusId, {
                accountId,
                roleId
            });
        }

        res.sendStatus(('role:' + status) as StatusId, { accountId, roleId });
    }
);

router.post<{
    settings: string;
}>(
    '/set-settings',
    validate({
        settings: 'string'
    }),
    async (req, res) => {
        const { settings } = req.body;

        const account = await req.session.getAccount();
        if (!account) return res.status(404).json({ error: 'Not logged in' });

        try {
            account.setSettings(JSON.parse(settings));
        } catch (e) {
            return res.sendStatus('account:invalid-settings');
        }

        res.sendStatus('account:settings-set', {
            settings,
            id: account.id
        });

        req.session.emit('account:settings-set', settings);
    }
);

router.post('/get-settings', async (req, res) => {
    const account = await req.session.getAccount();
    if (!account) return res.status(404).json({ error: 'Not logged in' });

    const settings = await account.getSettings();

    res.json(settings || []);
});

router.post<{
    username: string;
}>(
    '/request-password-reset',
    validate({
        username: 'string'
    }),
    async (req, res) => {
        const { username } = req.body;

        const a =
            (await Account.fromUsername(username)) ||
            (await Account.fromEmail(username));

        if (!a) return res.sendStatus('account:not-found');

        a.requestPasswordChange();

        res.sendStatus('account:password-reset-request');
    }
);

router.post<{
    password: string;
    confirmPassword: string;
    key: string;
}>(
    '/reset-password',
    validate({
        password: 'string',
        confirmPassword: 'string',
        key: 'string'
    }),
    trimBody,
    async (req, res) => {
        const { password, confirmPassword, key } = req.body;

        const a = await Account.fromPasswordChangeKey(key);

        if (!a) return res.sendStatus('account:invalid-password-reset-key');

        if (password !== confirmPassword) {
            return res.sendStatus('account:password-mismatch');
        }

        a.changePassword(key, password);

        res.sendStatus('account:password-reset-success');
    }
);

router.post<{
    id: string;
}>(
    '/get-roles',
    validate({
        id: 'string'
    }),
    async (req, res) => {
        const { id } = req.body;

        const account = await req.session.getAccount();
        if (!account) return res.sendStatus('account:not-logged-in');

        if (account.id !== id) {
            if (await account.hasPermission('editRoles')) {
                const roles = await (await Account.fromId(id))?.getRoles();
                if (roles) {
                    return res.json(
                        await Promise.all(
                            roles.map(async r => ({
                                ...r,
                                permissions: await r.getPermissions()
                            }))
                        )
                    );
                } else {
                    return res.json([]);
                }
            }

            return res.sendStatus('account:cannot-edit-other-account');
        }

        res.json(await account.getRoles());
    }
);

router.post<{
    id: string;
}>(
    '/get-permissions',
    validate({
        id: 'string'
    }),
    async (req, res) => {
        const { id } = req.body;

        const account = await req.session.getAccount();
        if (!account) return res.sendStatus('account:not-logged-in');

        if (account.id !== id) {
            if (await account.hasPermission('editRoles')) {
                const permissions = await (
                    await Account.fromId(id)
                )?.getPermissions();
                if (permissions) {
                    return res.json(permissions);
                } else {
                    return res.json([]);
                }
            }

            return res.sendStatus('account:cannot-edit-other-account');
        }

        res.json(await account.getPermissions());
    }
);

router.post('/all', async (req, res) => {
    const account = await req.session.getAccount();
    if (!account) return res.sendStatus('account:not-logged-in');

    if (await account.hasPermission('editRoles')) {
        return res.json(
            await Promise.all(
                (await Account.getAll()).map(a =>
                    a.safe({
                        roles: true,
                        email: true,
                        memberInfo: true,
                        permissions: true,
                        id: true
                    })
                )
            )
        );
    }

    return res.sendStatus('account:insufficient-permissions');
});

router.post<{
    id: string;
}>(
    '/account-info',
    validate({
        id: 'string'
    }),
    async (req, res) => {
        const { id } = req.body;

        const a = await Account.fromId(id);

        if (a) res.json(await a.safe());
        else res.sendStatus('account:not-found');
    }
);
