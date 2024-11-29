import { Next, Route } from '../structure/app/app';
import env from '../utilities/env';
import { Req } from '../structure/app/req';
import { Res } from '../structure/app/res';
import { Account } from '../structure/structs/account';

export const router = new Route();

router.get('/*', (req, res, next) => {
    console.log('Account route');
    next();
});

const redirect = (req: Req, res: Res, next: Next) => {
    if (!req.session.data.accountId) return next();

    res.redirect(req.session.data.prevUrl || '/');
};

router.get('/sign-in', redirect, (req, res, next) => {
    if (req.session.data.accountId) return next();
    res.sendTemplate('entries/account/sign-in', {
        RECAPTCHA_SITE_KEY: env.RECAPTCHA_SITE_KEY
    });
});

router.get('/sign-up', redirect, (req, res, next) => {
    if (req.session.data.accountId) return next();
    res.sendTemplate('entries/account/sign-up', {
        RECAPTCHA_SITE_KEY: env.RECAPTCHA_SITE_KEY
    });
});

router.get('/change-password/:key', async (req, res, next) => {
    const { key } = req.params;
    if (!key) return next();
    const a = (await Account.fromPasswordChangeKey(key)).unwrap();
    if (!a) return res.sendStatus('account:invalid-password-reset-key');
    res.sendTemplate('entries/account/reset-password');
});
