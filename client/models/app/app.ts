import { ActionState } from "./app-object";
import { Point2D } from '../../submodules/calculations/src/linear-algebra/point';
import { EventEmitter } from '../../../shared/event-emitter';

export type Point = [...Point2D, number] // x, y, path (time is the index)


export type CollectedData = Point | ActionState | null;


type Section = 'auto' | 'teleop' | 'endgame';

type AppEvents = {
    'section': Section;
    'error': Error;
    'stop': void;
    'end': void;
    'stopped': void;
};

export class Tick {
    private data: CollectedData = null;

    constructor(public readonly time: number, public readonly index: number) {}

    public get second(): number {
        return Math.floor(this.index / 4);
    }

    public get section(): Section | null {
        for (const [section, range] of Object.entries(App.sections)) {
            const [start, end] = range as number[];
            if (this.second >= start && this.second <= end) {
                return section as Section;
            }
        }

        return null;
    }

    public set(data: CollectedData) {
        if (this.data instanceof ActionState) return; // don't overwrite action state
        this.data = data;
    }

    public get(): CollectedData {
        return this.data;
    }

    public next(): Tick | undefined {
        return App.ticks[this.index + 1];
    }

    public prev(): Tick | undefined {
        return App.ticks[this.index - 1];
    }
};


export class App {
    private static readonly tickDuration = 250; // ms
    public static currentTime = 0; // ms
    public static startTime = 0; // ms
    public static currentTick: Tick | undefined = undefined;
    private static readonly $emitter: EventEmitter<keyof AppEvents> = new EventEmitter<keyof AppEvents>();
    public static readonly sections: {
        [key in Section]: [number, number]
    } = {
        // [sectionName]: [start, end]
        auto: [0, 15],
        teleop: [15, 135],
        endgame: [135, 150]
    }

    public static readonly ticks: Tick[] = new Array<Tick>(150 * 4).fill(null as unknown as Tick).map((_, i) => new Tick(i * App.tickDuration, i));

    public static launch(cb: (app: App) => void) {
        App.startTime = Date.now();
        App.currentTime = App.startTime;
        let active = true;

        // reset active flag on stop
        const stop = () => active = false;
        App.off('stop');
        App.on('stop', stop);

        // adaptive loop to be as close to 250ms as possible
        const run = async (t: Tick | undefined) => {
            // section change
            App.currentTick = t;

            if (!t) return App.emit('end');
            if (!active) return App.emit('stopped');
            const start = Date.now();
            App.currentTime = start - App.startTime;

            try {
                await cb(App);
            } catch (error) {
                App.$emitter.emit('error', error);
                return App.stop();
            }

            const end = Date.now();
            const duration = end - start;
            const delay = App.tickDuration - duration;
            
            // there could be a major delay if the callback takes too long, so we need to account for that
            setTimeout(() => run(t.next()), Math.max(0, delay));
        }

        run(App.ticks[0]);
    }

    public static get section(): Section | null {
        if (!App.currentTick) return null;
        for (const [section, range] of Object.entries(App.sections)) {
            const [start, end] = range as number[];
            if (App.currentTick.second >= start && App.currentTick.second <= end) {
                return section as Section;
            }
        }
        return null;
    }

    // ms since start
    public static get time() {
        return App.currentTime - App.startTime;
    }

    public static stop() {
        App.emit('stop');
    }

    public static on<K extends keyof AppEvents>(event: K, cb: (data: AppEvents[K]) => void) {
        App.$emitter.on(event, cb);
    }

    public static off<K extends keyof AppEvents>(event: K, cb?: (data: AppEvents[K]) => void) {
        App.$emitter.off(event, cb);
    }

    public static emit<K extends keyof AppEvents>(event: K, data?: AppEvents[K]) {
        App.$emitter.emit(event, data);
    }
};