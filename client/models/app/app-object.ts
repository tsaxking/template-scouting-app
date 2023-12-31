export class ActionState<T = any> {
    public readonly created: Date = new Date();
    constructor(public readonly action: AppObject<T>, public state: T) {}
}


export class AppObject<T> {
    public static readonly actions: AppObject<any>[] = [];

    public state: T;
    public readonly stateHistory: ActionState<T>[] = [];

    private $onChange?: ((state: T) => T);

    constructor(public readonly name: string, public readonly description: string) {
        AppObject.actions.push(this);
    }

    public onChange(cb: (state: T) => T) {
        if (this.$onChange) {
            throw new Error(`onChange callback already set for action ${this.name}`);
        }
        this.$onChange = cb;
    }

    public change() {
        if (this.$onChange) {
            this.state = this.$onChange(this.state);
            this.stateHistory.push(new ActionState(this, this.state));
        }

        return this.state;
    }

    public undo() {
        if (this.stateHistory.length > 1) {
            this.stateHistory.pop();
            this.state = this.stateHistory[this.stateHistory.length - 1].state;
        }

        return this.state;
    }
};


export class Toggle extends AppObject<boolean> {
    constructor(name: string, description: string, defaultState: boolean = false) {
        super(name, description);
        this.state = defaultState;
        this.onChange((state) => !state);
    }
}

export class Iterator extends AppObject<number> {
    constructor(name: string, description: string, defaultState: number = 0) {
        super(name, description);
        this.state = defaultState;
        this.onChange((state) => state + 1);
    }
}

export class StateMachine<T> extends AppObject<T> {
    constructor(name: string, description: string, public readonly states = [] as T[]) {
        super(name, description);
        this.onChange((state) => {
            // move through states in a circular fashion
            const index = this.states.indexOf(state);
            return this.states[(index + 1) % this.states.length];
        });
    }
}

export class PingPong<T> extends AppObject<T> {
    private $direction = 1; // 1 is forward, -1 is backward

    constructor(name: string, description: string, public readonly states = [] as T[]) {
        super(name, description);
        this.onChange((state) => {
            // move through states, then reverse direction
            const index = this.states.indexOf(state);
            const nextIndex = index + this.$direction;
            if (nextIndex < 0 || nextIndex >= this.states.length) {
                this.$direction *= -1;
            }
            return this.states[index + this.$direction];
        });
    }
}