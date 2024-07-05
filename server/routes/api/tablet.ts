import { validate } from '../../middleware/data-type';
import { Route } from '../../structure/app/app';
import { TabletState } from '../../structure/cache/tablet';
import { State } from '../../structure/cache/state';
import { Req } from '../../structure/app/req';
import { Res } from '../../structure/app/res';
import { NextFunction } from 'express';

export const router = new Route();

const auth = (req: Req<any, any>, res: Res, next: NextFunction) => {
    if (req.session.customData.isAdmin) return next();
    return res.redirect('/sign-in');
}

router.post<TabletState>(
    '/update',
    validate({
        compLevel: ['pr', 'qm', 'qf', 'sf', 'f'],
        groupNumber: 'number',
        matchNumber: 'number',
        scoutName: 'string',
        teamNumber: 'number',
        preScouting: 'boolean'
    }),
    (req, res) => {
        const tablet = State.getTablet(req.headers.get('tablet-id') || '');
        if (!tablet)
            return res.status(400).json({
                success: false,
                error: 'Could not find tablet :('
            });

        const {
            compLevel,
            matchNumber,
            groupNumber,
            scoutName,
            teamNumber,
            preScouting
        } = req.body;

        if (
            tablet.tabletState.compLevel !== compLevel ||
            tablet.tabletState.groupNumber !== groupNumber ||
            tablet.tabletState.matchNumber !== matchNumber ||
            tablet.tabletState.scoutName !== scoutName ||
            tablet.tabletState.teamNumber !== teamNumber ||
            tablet.tabletState.preScouting !== preScouting
        ) {
            console.log('State change!');
            tablet.tabletState.compLevel = compLevel;
            tablet.tabletState.groupNumber = groupNumber;
            tablet.tabletState.matchNumber = matchNumber;
            tablet.tabletState.scoutName = scoutName;
            tablet.tabletState.teamNumber = teamNumber;
            tablet.tabletState.preScouting = preScouting;
            tablet.push();
        }

        res.status(200).json({
            success: true
        });
    }
);

router.post('/init',  (req, res) => {
    const id = req.headers.get('tablet-id') || '';
    const result = State.newTablet(id);
    if (result.isErr()) {
        return res.status(400).json({
            success: false
        });
    }
    const disconnect = () => {
        State.removeTablet(id);
    }
    req.socket?.on('disconnect', disconnect);
    res.status(200).json({
        success: true
    });
});

router.post<
    TabletState & {
        id: string;
    }
>(
    '/change-state',
    auth,
    validate({
        compLevel: ['pr', 'qm', 'qf', 'sf', 'f'],
        groupNumber: 'number',
        matchNumber: 'number',
        scoutName: 'string',
        teamNumber: 'number',
        preScouting: 'boolean',
        id: 'string'
    }),
    (req, res) => {
        const tablet = State.getTablet(req.body.id);
        if (!tablet) return res.sendStatus('tablet:not-found');

        tablet.changeState(req.body);

        res.sendStatus('tablet:state-updated');
    }
);

router.post<{ id: string }>(
    '/abort',
    auth,
    validate({
        id: 'string'
    }),
    (req, res) => {
        const tablet = State.getTablet(req.body.id);
        if (!tablet) return res.sendStatus('tablet:not-found');

        tablet.abort();

        res.sendStatus('tablet:aborted');
    }
);

router.post<{ id: string }>(
    '/submit',
    auth,
    validate({
        id: 'string'
    }),
    (req, res) => {
        const tablet = State.getTablet(req.body.id);
        if (!tablet) return res.sendStatus('tablet:not-found');
        tablet.forceSubmit();
        res.sendStatus('tablet:submitted');
    }
);

router.post('/pull-state', auth, (_req, res) => {
    res.status(200).json(
        State.getState()
            .unwrap()
            .map(t => t.safe)
    );
});

router.post<{
    id: string;
}>('/disconnect', validate({
    id: 'string'
}), (req, res) => {
    State.removeTablet(req.body.id);
    res.status(200).json({
        success: true
    });
});