import { ActionState } from "./app-object";
import { Point2D } from '../../submodules/calculations/src/linear-algebra/point';
import { EventEmitter } from '../../../shared/event-emitter';

type Section = 'auto' | 'teleop' | 'endgame';

type AppEvents = {
    'section': Section;
    'error': Error;
    'stop': void;
    'end': void;
    'stopped': void;
};

export class Tick {
    private data: Point2D | null = null;

    constructor(public readonly time: number, public readonly index: number, public readonly app: App) {}

    public set(data: Point2D) {
        if (this.data instanceof ActionState) return; // don't overwrite action state
        this.data = data;
    }

    public get(): Point2D | null {
        return this.data;
    }

    public next(): Tick | null {
        return App.ticks[this.index + 1];
    }

    public prev(): Tick | null {
        return App.ticks[this.index - 1];
    }
};


export class App {
    private static readonly tickDuration = 250; // ms
    public static currentTime = 0; // ms
    public static startTime = 0; // ms
    private static readonly $emitter: EventEmitter<keyof AppEvents> = new EventEmitter<keyof AppEvents>();
    private static readonly sections = {
        // [sectionName]: [start, end]
        auto: [0, 15],
        teleop: [15, 135],
        endgame: [135, 150]
    }

    public static readonly ticks: Tick[] = new Array<Tick>(150 * 4).fill(null as unknown as Tick).map((_, i) => new Tick(i * App.tickDuration, i, this));

    public static launch(cb: (app: App, setTickData: () => void) => void) {
        App.startTime = Date.now();
        App.currentTime = App.startTime;
        let active = true;

        // reset active flag on stop
        const stop = () => active = false;
        App.off('stop');
        App.on('stop', stop);

        // adaptive loop to be as close to 250ms as possible
        const run = async (t: Tick | null) => {
            if (!t) return App.emit('end');
            if (!active) return App.emit('stopped');
            const start = Date.now();
            App.currentTime = start - App.startTime;

            try {
                await cb(this, t.set.bind(t));
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

    // ms since start
    public static get time() {
        return App.currentTime - App.startTime;
    }

    public static get section(): string | null {
        for (const [section, range] of Object.entries(App.sections)) {
            const [start, end] = range as number[];
            if (App.time >= start && App.time <= end) {
                return section;
            }
        }
        return null;
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