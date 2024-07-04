import { EventEmitter } from './event-emitter';
import { sleep } from './sleep';

type LoopEvents = {
    stop: void;
    start: void;
};

export class Loop<
    T = {
        [key: string]: unknown;
    }
> {
    private readonly emitter = new EventEmitter<keyof (T & LoopEvents)>();

    public on<K extends keyof (T & LoopEvents)>(
        event: K,
        fn: (data: (T & LoopEvents)[K]) => void
    ) {
        this.emitter.on(event, fn);
    }

    public off<K extends keyof (T & LoopEvents)>(
        event: K,
        fn: (data: (T & LoopEvents)[K]) => void
    ) {
        this.emitter.off(event, fn);
    }

    private _running = false;
    public stop = () => {
        this._running = false;
        this.emitter.emit('stop');
    };

    constructor(
        public readonly fn: () => void,
        public interval: number
    ) {}

    public start() {
        if (this._running) return this.stop;
        this._running = true;
        this.emitter.emit('start');

        const loop = async () => {
            if (!this._running) return;
            const start = Date.now();
            this.fn();
            const end = Date.now();
            const diff = end - start;
            const wait = Math.max(0, this.interval - diff);
            await sleep(wait);
            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }
}
