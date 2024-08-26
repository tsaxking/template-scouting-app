import { validate } from '../middleware/data-type';
import { Route } from '../structure/app/app';
import { AccountNotification } from '../structure/cache/account-notifications';

export const router = new Route();

router.post('/get', async (req, res) => {
    // const notifs = (await AccountNotification.random()).unwrap();
    // res.json(notifs);
    const a = (await req.session.getAccount()).unwrap();
    if (!a) return res.sendStatus('account:not-logged-in');

    const notifs = (await a.getNotifications()).unwrap();
    res.json(notifs);
});

router.post<{ id: string; read: boolean }>(
    '/mark-read',
    validate({ id: 'string', read: 'boolean' }),
    async (req, res) => {
        const { id, read } = req.body;
        const notif = (await AccountNotification.fromId(id)).unwrap();
        if (!notif) return res.sendStatus('account-notification:not-found');

        await notif.markRead(read);

        if (read) res.sendStatus('account-notification:mark-read');
        else res.sendStatus('account-notification:mark-unread');

        req.io.emit('account-notification:read', notif);
    }
);