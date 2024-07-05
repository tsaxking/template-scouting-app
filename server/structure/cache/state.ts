import { attempt } from '../../../shared/check';
import { App } from '../app/app';
import { Tablet } from './tablet';

export class State {
    public static getTablet(id: string) {
        return State.current?.tablets.get(id);
    }

    public static getState() {
        return attempt(() => {
            const s = State.current;
            if (!s) throw new Error('State not initialized');
            return Array.from(s.tablets.values());
        });
    }

    public static updateTablet(tablet: Tablet) {
        return attempt(() => {
            console.log('updateTablet static');
            const s = State.current;
            if (!s) throw new Error('State not initialized');
            s.updateTablet(tablet);
        });
    }

    public static newTablet(id: string) {
        return attempt(() => {
            if (State.getTablet(id))
                throw new Error('Tablet already initialized');
            const s = State.current;
            if (!s) throw new Error('State not initialized');
            return s.newTablet(id);
        });
    }

    public static removeTablet(id: string) {
        return attempt(() => {
            const s = State.current;
            if (!s) throw new Error('State not initialized');
            return s.removeTablet(id);
        });
    }

    private static current?: State = undefined;

    readonly tablets = new Map<string, Tablet>();

    constructor(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        public readonly app: App<any>
    ) {
        if (State.current) throw new Error('Only 1 state allowed');
        State.current = this;
    }

    private emit(event: string, data: unknown) {
        this.app.io.emit(event, data);
    }

    private updateTablet(tablet: Tablet) {
        // called when the tablet state has changed
        this.emit('update-tablet', tablet.safe);
    }

    private newTablet(id: string) {
        const t = new Tablet(
            this.app,
            id,
            {
                matchNumber: 0,
                compLevel: 'qm',
                teamNumber: 0,
                groupNumber: -1,
                scoutName: '',
                preScouting: false
            },
            this
        );
        this.tablets.set(id, t);
        console.log('Emitting new tablet');
        this.emit('new-tablet', t.safe);
        return t;
    }

    private removeTablet(id: string) {
        const t = this.tablets.get(id);
        if (!t) return;
        this.tablets.delete(id);
        this.emit('delete-tablet', t.safe);
    }
}
