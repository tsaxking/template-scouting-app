import { EventEmitter } from "../../../shared/event-emitter";
import { Cache } from "../cache";


type Updates = {
    update: unknown;
}

type GlobalUpdates = {
    update: Updates;
}

export class Group extends Cache<Updates> {
    public static readonly cache = new Map<number, Group>();

    public static readonly emitter = new EventEmitter<keyof GlobalUpdates>();

    public static on<K extends keyof GlobalUpdates>(
        event: K,
        callback: (data: GlobalUpdates[K]) => void
    ): void {
        this.emitter.on(event, callback);
    }

    public static off<K extends keyof GlobalUpdates>(
        event: K,
        callback?: (data: GlobalUpdates[K]) => void
    ): void {
        this.emitter.off(event, callback);
    }

    constructor(
        public readonly number = -1,
        public readonly tablet = ''
    ) {
        super();
    }
}