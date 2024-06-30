import { App } from "../app/app";
import { Tablet } from "./tablet";


export class State {
    public static getTablet(id: string) {
        return State.current?.tablets.get(id);
    }

    private static current?: State = undefined;

    readonly tablets = new Map<string, Tablet>();

    constructor(
        public readonly app: App
    ) {
        if (State.current) throw new Error('Only 1 state allowed');
        State.current = this;
    }

    private emit(event: string, data: unknown) {
        this.app.io.to('admin').emit(event, data);
    }

    public update() {
        const tablets = Array.from(this.tablets.values());
        this.emit('update', tablets);
    }

    public updateTablet(tablet: Tablet) {
        this.emit('update-tablet', tablet);
    }

    public newTablet(id: string) {
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
        this.update();
        return t;
    }

    public removeTablet(id: string) {
        this.tablets.delete(id);
        this.update();
    }
}