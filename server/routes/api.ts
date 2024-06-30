import { Route } from '../structure/app/app';

export const router = new Route();


import { router as tablet } from './api/tablet';
router.route('/tablet', tablet);