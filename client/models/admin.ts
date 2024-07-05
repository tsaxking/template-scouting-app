import { attempt, attemptAsync } from '../../shared/check';
import { ServerRequest } from '../utilities/requests';
import { EventEmitter } from '../../shared/event-emitter';
import { socket } from '../utilities/socket';

export type TabletState = {
    matchNumber: number;
    compLevel: 'pr' | 'qm' | 'qf' | 'sf' | 'f' | string; // added "string" because svelte doesn't like ts inside of elements
    teamNumber: number;
    groupNumber: number;
    scoutName: string;
    preScouting: boolean;
};

type TabletEvents = {
    update: TabletState;
    destroy: Tablet;
};

type GlobalEvents = {
    'new-tablet': Tablet;
    update: Tablet[];
    'delete-tablet': Tablet;
    'refresh': void;
};

type TabletSafe = {
    state: TabletState;
    id: string;
};

export class Tablet {
    public readonly em = new EventEmitter<keyof TabletEvents>();

    on<K extends keyof TabletEvents>(
        event: K,
        cb: (data: TabletEvents[K]) => void
    ) {
        this.em.on(event, cb);
    }

    off<K extends keyof TabletEvents>(
        event: K,
        cb: (data: TabletEvents[K]) => void
    ) {
        this.em.off(event, cb);
    }

    emit<K extends keyof TabletEvents>(event: K, data: TabletEvents[K]) {
        this.em.emit(event, data);
    }

    constructor(
        public readonly id: string,
        public state: TabletState
    ) {}

    changeState(state: Partial<TabletState>) {
        return ServerRequest.post('/api/tablet/change-state', {
            ...this.state,
            ...state,
            id: this.id
        });
    }

    abort() {
        return ServerRequest.post('/api/tablet/abort', {
            id: this.id
        });
    }

    submit() {
        return ServerRequest.post('/api/tablet/submit', {
            id: this.id
        });
    }

    destroy() {
        this.emit('destroy', this);
    }
}

export class State {
    public static readonly em = new EventEmitter<keyof GlobalEvents>();

    public static on<K extends keyof GlobalEvents>(
        event: K,
        cb: (data: GlobalEvents[K]) => void
    ) {
        State.em.on(event, cb);
    }

    public static off<K extends keyof GlobalEvents>(
        event: K,
        cb: (data: GlobalEvents[K]) => void
    ) {
        State.em.off(event, cb);
    }

    public static emit<K extends keyof GlobalEvents>(
        event: K,
        data: GlobalEvents[K]
    ) {
        State.em.emit(event, data);
    }

    static readonly tablets = new Map<string, Tablet>();

    static pullState() {
        return attemptAsync(async () => {
            State.tablets.forEach(t => t.destroy());
            State.tablets.clear();

            const tablets = (
                await ServerRequest.post<TabletSafe[]>('/api/tablet/pull-state')
            ).unwrap();
            return tablets.map(t => {
                const tab = new Tablet(t.id, t.state);
                State.tablets.set(tab.id, tab);
                return tab;
            });
        });
    }

    static newTablet(id: string, state: TabletState) {
        return attempt(() => {
            const t = new Tablet(id, state);
            State.emit('new-tablet', t);
            return t;
        });
    }

    static updateTablet(id: string, state: TabletState) {
        return attempt(() => {
            const t = State.tablets.get(id);
            if (!t) throw new Error('Tablet not found');
            t.state = state;
            t.emit('update', state);
        });
    }

    static deleteTablet(id: string) {
        return attempt(() => {
            const t = State.tablets.get(id);
            if (!t) throw new Error('Tablet not found');
            t.destroy();
            State.tablets.delete(id);
        });
    }

    static refresh() {
        State.tablets.clear();
        State.emit('refresh', undefined);
    }
}

Object.assign(window, { State });

socket.on('update-tablet', (data: { state: TabletState; id: string }) => {
    console.log('Recieved tablet update!', data.id);
    const { id, state } = data;
    State.updateTablet(id, state);
});


socket.on('new-tablet', () => {
    State.refresh();
});

socket.on('delete-tablet', () => {
    State.refresh();
});