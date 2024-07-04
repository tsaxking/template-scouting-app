import { Cache } from './cache';
import { App } from '../app/app';
import { State } from './state';

export type TabletState = {
    matchNumber: number;
    compLevel: 'pr' | 'qm' | 'qf' | 'sf' | 'f';
    teamNumber: number;
    groupNumber: number;
    scoutName: string;
    preScouting: boolean;
};

export class Tablet extends Cache {
    public latestActivity = Date.now();

    constructor(
        public readonly app: App,
        public readonly id: string,
        public readonly tabletState: TabletState,
        public readonly globalState: State
    ) {
        super();
    }

    private emit(event: string, data: unknown) {
        this.app.io.to(this.id).emit(event, data);
        this.latestActivity = Date.now();
    }

    public changeState(state: TabletState) {
        this.emit('change-state', {
            id: this.id,
            state
        });
    }

    public forceSubmit() {
        this.emit('submit', undefined);
    }

    public abort() {
        this.emit('abort', undefined);
    }

    public push() {
        State.updateTablet(this);
    }

    get safe() {
        return {
            id: this.id,
            state: this.tabletState
        };
    }
}
