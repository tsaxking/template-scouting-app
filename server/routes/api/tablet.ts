import { validate } from "../../middleware/data-type";
import { Route } from "../../structure/app/app";
import { TabletState } from "../../structure/cache/tablet";
import { State } from "../../structure/cache/state";

export const router = new Route();

router.post<TabletState>(
    '/update',
    validate({
        'compLevel': ['pr', 'qm', 'qf', 'sf', 'f'],
        'groupNumber': 'number',
        'matchNumber': 'number',
        'scoutName': 'string',
        'teamNumber': 'number',
        'preScouting': 'boolean'
    }),
    (req, res) => {
        const tablet = State.getTablet(req.session.id);
        if (!tablet) return res.status(400).json({
            success: false
        });

        const { compLevel, matchNumber, groupNumber, scoutName, teamNumber, preScouting } = req.body;
        tablet.tabletState.compLevel = compLevel;
        tablet.tabletState.groupNumber = groupNumber;
        tablet.tabletState.matchNumber = matchNumber;
        tablet.tabletState.scoutName = scoutName;
        tablet.tabletState.teamNumber = teamNumber;
        tablet.tabletState.preScouting = preScouting;

        tablet.push();

        res.status(200).json({
            success: true
        });
    }
);

router.post(
    '/init', 
    (req, res) => {
        const id = req.session.id;
        const state = State.current;
        if (!state) throw new Error('State not initialized');
        state.newTablet(id);
        res.status(200).json({
            success: true
        });
    }
);

router.post<TabletState & {
    id: string;
}>(
    '/change-state',
    validate({
        'compLevel': ['pr', 'qm', 'qf', 'sf', 'f'],
        'groupNumber': 'number',
        'matchNumber': 'number',
        'scoutName': 'string',
        'teamNumber': 'number',
        'preScouting': 'boolean',
        'id': 'string'
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
    validate({
        id: 'string',
    }),
    (req, res) => {
        const tablet = State.getTablet(req.body.id);
        if (!tablet) return res.sendStatus('tablet:not-found');
        tablet.forceSubmit();
        res.sendStatus('tablet:submitted');
    }
);