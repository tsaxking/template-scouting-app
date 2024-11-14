import { Route, ServerFunction } from '../structure/app/app';
import { Account } from '../structure/structs/account';

export const router = new Route();

const loggedInRedirect: ServerFunction = (req, res, next) => {
    if (!req.session.data.accountId) return next();

    res.redirect(req.session.data.prevUrl || '/');
};
