/**
 * @fileoverview App class
 * @description This contains the main class for the app, which is responsible for running the match and keeping track of the state of the robot over time. The data is collected every 250ms, and the app will run for 150 seconds, so there will be 600 ticks in total.
 */

import { ActionState } from './app-object';
import { Point2D } from '../../../shared/submodules/calculations/src/linear-algebra/point';
import { EventEmitter } from '../../../shared/event-emitter';
import { ButtonCircle } from './button-circle';
import { Canvas } from '../canvas/canvas';
import { AppObject } from './app-object';
import { Path } from '../canvas/path';
import { Img } from '../canvas/image';
import { Border } from '../canvas/border';
import { Polygon } from '../canvas/polygon';
import { Circle } from '../canvas/circle';
import { Color } from '../../submodules/colors/color';
import { Settings } from '../settings';
import { attempt, Result } from '../../../shared/attempt';
import { Container } from '../canvas/container';
import { TraceArray } from '../../../shared/submodules/tatorscout-calculations/trace';
import {
    Action,
    TraceParse,
    Zones,
} from '../../../shared/submodules/tatorscout-calculations/trace';
import { generate2024App } from './2024-app';

/**
 * Description placeholder
 * @date 1/25/2024 - 4:59:07 PM
 */
const round = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Point including time
 * @date 1/9/2024 - 3:08:20 AM
 *
 * @export
 * @typedef {Point}
 */
export type Point = [...Point2D, number]; // x, y, path (time is the index of the tick)

/**
 * Data collected at a given point in time
 * @date 1/9/2024 - 3:08:20 AM
 *
 * @export
 * @typedef {CollectedData}
 */
export type CollectedData<actions = string> = ActionState<any, actions> | null;

/**
 * Section of the match
 * @date 1/9/2024 - 3:08:20 AM
 *
 * @typedef {Section}
 */
type Section = 'auto' | 'teleop' | 'endgame';

/**
 * Events emitted by the app
 * @date 1/9/2024 - 3:08:20 AM
 *
 * @typedef {AppEvents}
 */
type AppEvents = {
    section: Section;
    error: Error;
    stop: void;
    end: void;
    stopped: void;
};

/**
 * Tick of the match
 * @date 1/9/2024 - 3:08:20 AM
 *
 * @export
 * @class Tick
 * @typedef {Tick}
 */
export class Tick<actions = Action> {
    /**
     * Data collected at this tick
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @private
     * @type {CollectedData}
     */
    private data: CollectedData<actions> = null;

    /**
     * Point of the robot at this tick
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @type {(Point2D | null)}
     */
    public point: Point2D | null = null;

    /**
     * Creates an instance of Tick.
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @constructor
     * @param {number} time
     * @param {number} index
     * @param {App} app
     */
    constructor(
        public readonly time: number,
        public readonly index: number,
        public readonly app: App,
    ) {}

    /**
     * Nearest second
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {number}
     */
    public get second(): number {
        return Math.round(this.index / 250);
    }

    /**
     * Section of the match
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {(Section | null)}
     */
    public get section(): Section | null {
        for (const [section, range] of Object.entries(App.sections)) {
            const [start, end] = range as number[];
            if (this.second >= start && this.second <= end) {
                return section as Section;
            }
        }

        return null;
    }

    /**
     * Set the data collected at this tick
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @param {CollectedData} data
     */
    public set(data: CollectedData) {
        if (this.data instanceof ActionState) {
            this.next()?.set(data); // set next tick's data
            return;
        }
        this.data = data;

        if (data instanceof ActionState) {
            data.tick = this;
        }
    }

    /**
     * Removes data collected at this tick
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @public
     */
    public clear() {
        if (this.data instanceof ActionState) {
            this.data.tick = null;
        }

        this.data = null;
    }

    /**
     * Get the data collected at this tick
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @returns {CollectedData}
     */
    public get(): CollectedData {
        return this.data;
    }

    /**
     * returns the next tick
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @returns {(Tick | undefined)}
     */
    public next(): Tick | undefined {
        return this.app.ticks[this.index + 1];
    }

    /**
     * returns the previous tick
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @returns {(Tick | undefined)}
     */
    public prev(): Tick | undefined {
        return this.app.ticks[this.index - 1];
    }
}

/**
 * The full scouting app, including the canvas and all the buttons
 * @date 1/9/2024 - 3:08:20 AM
 *
 * @export
 * @class App
 * @typedef {App}
 */
export class App<a = Action, z extends Zones = Zones, parse = TraceParse> {
    public static build(year: 2024, alliance: 'red' | 'blue' | null = null) {
        switch (year) {
            case 2024:
                return generate2024App(alliance);
        }
    }

    // ▄▀▀ ▄▀▄ █▄ █ ▄▀▀ ▀█▀ ▄▀▄ █▄ █ ▀█▀ ▄▀▀
    // ▀▄▄ ▀▄▀ █ ▀█ ▄█▀  █  █▀█ █ ▀█  █  ▄█▀
    /**
     * All the sections of the match
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @static
     * @readonly
     * @type {{
     *         [key in Section]: [number, number]
     *     }}
     */
    public static readonly sections: {
        [key in Section]: [number, number];
    } = {
        // [sectionName]: [start, end]
        auto: [0, 15],
        teleop: [15, 135],
        endgame: [135, 150],
    };

    /**
     * The number of ticks per second
     * @date 1/9/2024 - 3:33:17 AM
     *
     * @public
     * @static
     * @readonly
     * @type {4}
     */
    public static readonly ticksPerSecond = 4;

    /**
     * Duration of a tick in ms
     * @date 1/9/2024 - 3:33:17 AM
     *
     * @public
     * @static
     * @readonly
     * @type {number}
     */
    public static get tickDuration() {
        return 1000 / App.ticksPerSecond;
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @private
     * @type {?HTMLDivElement}
     */
    private $target?: HTMLDivElement;

    public readonly parsed: Partial<parse> = {};

    private clicking = false;

    /**
     * Creates an instance of App.
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @constructor
     * @param {HTMLDivElement} target
     */
    constructor(public readonly currentAlliance: 'red' | 'blue' | null = null) {
        this.canvas.$ctx.canvas.style.position = 'absolute';

        this.background = new Img('/public/pictures/field.png', {
            x: 0,
            y: 0,
            width: 1,
            height: 1,
        });

        this.path.$properties.line = {
            color: Color.fromName('black').toString('rgba'),
            width: 1,
        };

        this.canvas.add(this.background, this.path);

        this.clicking = false;

        const click = () => {
            this.clicking = true;

            setTimeout(unclick, App.tickDuration);
        };
        const unclick = () => (this.clicking = false);

        // this.buttonCircle.on('click', click);
        this.buttonCircle.on('mousedown', click);
        this.buttonCircle.on('mouseup', unclick);
        this.buttonCircle.on('touchstart', click);
        this.buttonCircle.on('touchend', unclick);
        this.buttonCircle.on('touchcancel', unclick);

        this.setView();

        this.canvas.data = this;
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @type {*}
     */
    get target() {
        return this.$target;
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @type {*}
     */
    set target(target: HTMLDivElement | undefined) {
        this.$target = target;
        if (target) {
            target.style.position = 'relative';
            target.classList.add('no-scroll');
            target.style.height = 'calc(100vh - 42px)';
            target.style.width = '100%';
            this.setView();
        }
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @private
     */
    private setView() {
        const { target } = this;
        if (!target) return;

        if (target.clientWidth > target.clientHeight * 2) {
            const xOffset = (target.clientWidth - target.clientHeight * 2) / 2;
            this.canvas.$ctx.canvas.width = target.clientHeight * 2;
            this.canvas.$ctx.canvas.height = target.clientHeight;
            this.height = target.clientHeight;
            this.width = target.clientHeight * 2;
            this.canvas.$ctx.canvas.style.top = '0px';
            this.canvas.$ctx.canvas.style.left = `${xOffset}px`;
            this.xOffset = xOffset;
            this.yOffset = 0;

            for (const o of this.gameObjects) {
                const { element, x, y } = o;
                element.style.left = `${x * this.canvas.width + xOffset}px`;
                element.style.top = `${y * this.canvas.height}px`;
            }
        } else {
            const yOffset = (target.clientHeight - target.clientWidth / 2) / 2;
            this.canvas.$ctx.canvas.width = target.clientWidth;
            this.canvas.$ctx.canvas.height = target.clientWidth / 2;
            this.height = target.clientWidth / 2;
            this.width = target.clientWidth;
            this.canvas.$ctx.canvas.style.top = `${yOffset}px`;
            this.canvas.$ctx.canvas.style.left = '0px';
            this.xOffset = 0;
            this.yOffset = yOffset;

            for (const o of this.gameObjects) {
                const { element, x, y } = o;
                element.style.left = `${x * this.canvas.width}px`;
                element.style.top = `${y * this.canvas.height + yOffset}px`;
            }
        }

        // if (target.clientWidth > target.clientHeight * 2) {
        //     const xOffset = (target.clientWidth - target.clientHeight * 2) / 2;
        //     this.xOffset = xOffset;
        //     this.yOffset = 0;
        //     this.width = target.clientHeight * 2;
        //     this.height = target.clientHeight;
        // } else {
        //     const yOffset = (target.clientHeight - target.clientWidth / 2) / 2;
        //     this.$xOffset = 0;
        //     this.$yOffset = yOffset;
        //     this.width = target.clientWidth;
        //     this.height = target.clientWidth / 2;
        // }

        // for (const o of this.gameObjects) {
        //     const { element, x, y } = o;
        //     element.style.left = `${x * this.canvas.width + this.xOffset}px`;
        //     element.style.top = `${y * this.canvas.height + this.yOffset}px`;
        // }
    }

    // █ █ ▄▀▄ █▀▄ █ ▄▀▄ ██▄ █   ██▀ ▄▀▀
    // ▀▄▀ █▀█ █▀▄ █ █▀█ █▄█ █▄▄ █▄▄ ▄█▀
    /**
     * The current time in the match
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @type {number}
     */
    public currentTime = 0; // ms
    /**
     * The time the match started (date)
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @type {number}
     */
    public startTime = 0; // ms
    /**
     * The current tick of the match
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @type {(Tick | undefined)}
     */
    public currentTick: Tick<a> | undefined = undefined;
    /**
     * The current location of the robot [x, y]
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @type {(Point2D | undefined)}
     */
    public currentLocation: Point2D | undefined = undefined;
    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @public
     * @type {number}
     */
    public xOffset = 0;
    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @public
     * @type {number}
     */
    public yOffset = 0;
    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @public
     * @type {number}
     */
    public width = 0;
    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @public
     * @type {number}
     */
    public height = 0;

    // █▀▄ █▀▄ ▄▀▄ █   █ ▄▀▄ ██▄ █   ██▀ ▄▀▀
    // █▄▀ █▀▄ █▀█ ▀▄▀▄▀ █▀█ █▄█ █▄▄ █▄▄ ▄█▀
    /**
     * Whether the robot is drawing or not
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {Path}
     */
    public readonly path: Path = new Path([]);
    /**
     * The circle of buttons surrounding the robot
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {*}
     */
    public readonly buttonCircle = new ButtonCircle<a>(this as App<any, any>);

    public readonly appObjects: AppObject<any, a>[] = [];

    get appObjectData() {
        const output = {} as {
            [key: string]: unknown;
        };
        for (const action of this.appObjects) {
            output[action.name] = action.state;
        }
        return output;
    }

    /**
     * All the game objects and their respective locations on the field
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {{
     *         x: number;
     *         y: number;
     *         object: AppObject;
     *     }[]}
     */
    public readonly gameObjects: {
        x: number;
        y: number;
        object: AppObject<any, a>;
        element: HTMLElement;
        alliance: 'red' | 'blue' | null;
    }[] = [];

    public readonly areas = {} as {
        [key in z]: {
            area: Polygon | Circle;
            color: Color;
            condition: (shape: Polygon) => boolean;
        };
    };

    /**
     * Whether the robot is drawing or not
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {Img}
     */
    public readonly background: Img;

    /**
     * The border of the field
     * @date 1/9/2024 - 3:23:58 AM
     *
     * @public
     * @type {?Border}
     */
    private $border?: Border;
    /**
     * The areas of the field (Any area that is of significance)
     * @date 1/9/2024 - 3:23:58 AM
     *
     * @public
     * @readonly
     * @type {(Polygon | Circle)[]}
     */
    // public readonly areas: (Polygon | Circle)[] = [];

    /**
     * Sets the border of the field
     * @date 1/9/2024 - 3:23:58 AM
     *
     * @param {Point2D[]} points
     * @param {Color} color
     * @returns {*}
     */
    setBorder(points: Point2D[], color: Color) {
        if (this.border) throw new Error('Border already set');
        const b = new Border(points);
        b.$properties.doDraw = () =>
            this.currentLocation ? b.isIn(this.currentLocation) : false;
        b.$properties.fill = {
            color: color.toString('rgba'),
        };

        this.canvas.add(b);
        this.border = b;
        return b;
    }

    /**
     * Adds an area to the field
     * @date 1/9/2024 - 3:23:58 AM
     *
     * @param {Point2D[]} points
     * @param {Color} color
     * @returns {*}
     */
    addArea(
        zone: z,
        points: Point2D[],
        color: Color,
        condition: (shape: Polygon) => boolean,
    ) {
        const p = new Polygon(points);

        p.$properties.doDraw = () => {
            if (Settings.get('showAreas') === false) return false;

            const draw = condition(p);

            return draw;
        };
        p.$properties.fill = {
            color: color.toString('rgba'),
        };

        // p.fade(5);

        this.canvas.add(p);
        // this.areas.push(p);

        this.areas[zone] = {
            area: p,
            color: color,
            condition: condition,
        };

        return p;
    }

    /**
     * The canvas element
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {*}
     */
    public readonly canvasEl = document.createElement('canvas');
    /**
     * The canvas object
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {*}
     */
    public readonly canvas = new Canvas<App<a, z>>(
        this.canvasEl.getContext('2d')!,
        {
            events: [
                'click',
                'mousedown',
                'mouseup',
                'touchstart',
                'touchend',
                'touchcancel',
            ],
        },
    );
    /**
     * Whether the app has been built or not
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @private
     * @type {boolean}
     */
    private built = false;

    /**
     * Event emitter for the app
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @private
     * @readonly
     * @type {EventEmitter<keyof AppEvents>}
     */
    private readonly $emitter: EventEmitter<keyof AppEvents> = new EventEmitter<
        keyof AppEvents
    >();

    /**
     * All the ticks of the match
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {Tick[]}
     */
    public ticks: Tick<a>[];

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @public
     * @type {boolean}
     */
    public isDrawing = false;

    /**
     * Launch the app
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @param {() => void} cb The callback to run every tick
     * @returns {void) => void}
     */
    public launch(cb?: (tick: Tick) => void) {
        if (!this.target) return console.error('No target set');
        const { target } = this;
        this.build();
        this.startTime = Date.now();
        this.currentTime = this.startTime;
        let active = true;

        // reset active flag on stop
        const stop = () => (active = false);
        this.off('stop');
        this.on('stop', stop);

        // adaptive loop to be as close to 250ms as possible
        const run = async (t: Tick | undefined) => {
            const start = Date.now();

            const { section } = this;
            this.currentTick = t;
            if (this.section !== section) {
                this.emit('section', this.section ?? undefined);
            }

            if (!t) return this.emit('end');
            if (!active) return this.emit('stopped');
            this.currentTime = start - this.startTime;
            if (this.currentLocation) t.point = this.currentLocation;

            try {
                const s = Date.now();
                await cb?.(t);
                if (Date.now() - s > 250) {
                    console.warn('Callback took too long');
                }
            } catch (error) {
                this.$emitter.emit('error', error);
                return this.stop();
            }

            const end = Date.now();
            const duration = end - start;
            const delay = App.tickDuration - duration;

            // there could be a major delay if the callback takes too long, so we need to account for that
            setTimeout(() => run(t.next()), Math.max(0, App.tickDuration));
        };

        const start = () => {
            run(this.ticks[0]);
            target.removeEventListener('mousedown', start);
            target.removeEventListener('touchstart', start);
        };

        target.addEventListener('mousedown', start);
        target.addEventListener('touchstart', start);
    }

    /**
     * The current section of the match
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {(Section | null)}
     */
    public get section(): Section | null {
        if (!this.currentTick) return null;
        for (const [section, range] of Object.entries(App.sections)) {
            const [start, end] = range as number[];
            if (
                this.currentTick.second >= start &&
                this.currentTick.second <= end
            ) {
                return section as Section;
            }
        }
        return null;
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @public
     * @type {(Border | undefined)}
     */
    public get border(): Border | undefined {
        return this.$border;
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @public
     * @type {*}
     */
    public set border(b: Border) {
        this.$border = b;
        this.canvas.add(b);
    }

    // ms since start
    /**
     * The time since the match started (in ms)
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {number}
     */
    public get time() {
        return this.currentTime - this.startTime;
    }

    /**
     * The state of all the game objects
     * @date 1/9/2024 - 3:08:19 AM
     *
     * @readonly
     * @type {{
     *         [key: string]: unknown;
     *     }}
     */
    get state(): {
        [key: string]: unknown;
    } {
        const output = {};
        for (const action of this.gameObjects) {
            output[action.object.name] = action.object.state;
        }
        return output;
    }

    /**
     * The state of all the game objects
     * @date 1/9/2024 - 3:08:19 AM
     *
     * @public
     */
    public stop() {
        this.emit('stop');
    }

    /**
     * Add an event listener
     * @date 1/9/2024 - 3:08:19 AM
     *
     * @public
     * @template {keyof AppEvents} K
     * @param {K} event
     * @param {(data: AppEvents[K]) => void} cb
     * @returns {void) => void}
     */
    public on<K extends keyof AppEvents>(
        event: K,
        cb: (data: AppEvents[K]) => void,
    ) {
        this.$emitter.on(event, cb);
    }

    /**
     * Remove an event listener
     * @date 1/9/2024 - 3:08:19 AM
     *
     * @public
     * @template {keyof AppEvents} K
     * @param {K} event
     * @param {?(data: AppEvents[K]) => void} [cb]
     * @returns {void) => void}
     */
    public off<K extends keyof AppEvents>(
        event: K,
        cb?: (data: AppEvents[K]) => void,
    ) {
        this.$emitter.off(event, cb);
    }

    /**
     * Emit an event
     * @date 1/9/2024 - 3:08:19 AM
     *
     * @public
     * @template {keyof AppEvents} K
     * @param {K} event
     * @param {?AppEvents[K]} [data]
     */
    public emit<K extends keyof AppEvents>(event: K, data?: AppEvents[K]) {
        this.$emitter.emit(event, data);
    }

    /**
     * The time left in the match
     * @date 1/9/2024 - 3:08:19 AM
     *
     * @public
     * @readonly
     * @type {[number, number]}
     */
    public get timeLeft(): [number, number] {
        // [minutes, seconds]
        const left = 150 - this.time;
        return [Math.floor(left / 60), left % 60];
    }

    /**
     * Add a game object to the app
     * @date 1/9/2024 - 3:08:19 AM
     *
     * @template [T=unknown]
     * @param {number} x
     * @param {number} y
     * @param {AppObject<T>} object
     * @param {HTMLElement} button
     * @param {?(state: T) => string} [convert]
     * @returns {string) => void}
     */
    addGameObject<T = unknown>(
        point: Point2D,
        object: AppObject<T, a>,
        button: HTMLElement,
        convert?: (state: T) => string,
        alliance: 'red' | 'blue' | null = null,
    ) {
        const [x, y] = point;
        this.gameObjects.push({ x, y, object, element: button, alliance });

        button.innerText = object.name;
        button.style.position = 'absolute';
        button.style.zIndex = '100';
        button.style.transform = 'translate(-50%, -50%)';

        object.listen((state, event) => {
            console.log('state change!', state, event);

            switch (event) {
                case 'new':
                    this.currentTick?.set(state);
                    break;
                case 'undo':
                    this.currentTick?.clear();
                    break;
            }

            button.innerText = `${object.name}: ${
                convert ? convert(state.state) : state.state
            }`;
        });

        button.addEventListener('click', () => {
            object.change(this.currentLocation);
        });

        // if the button is held down, change the state
        let interval: NodeJS.Timeout | undefined = undefined;
        const start = () => {
            if (interval) end();
            interval = setTimeout(() => {
                object.undo();
            }, 1000);
        };
        const end = () => {
            if (interval) clearTimeout(interval);
        };

        button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        button.addEventListener('mousedown', start);
        button.addEventListener('touchstart', start);
        button.addEventListener('mouseup', end);
        button.addEventListener('touchend', end);
        button.addEventListener('touchcancel', end);
        button.addEventListener('mouseleave', end);
        button.addEventListener('touchleave', end);

        this.appObjects.push(object);
    }

    /**
     * Resets every state in the app
     * @date 1/9/2024 - 3:08:19 AM
     *
     * @public
     * @returns {Function} Stops the app
     */
    public build(): undefined | (() => void) {
        if (this.built) {
            console.error('App already built');
            return;
        }

        const { target } = this;

        if (!target) {
            console.error('No target');
            return;
        }

        this.canvas.add(this.buttonCircle);

        let quitView = false;

        const view = () => {
            if (quitView) return;
            this.setView();
            requestAnimationFrame(view);
        };

        requestAnimationFrame(view);

        this.currentLocation = undefined;
        this.currentTime = 0;
        this.currentTick = undefined;
        this.built = true;
        this.ticks = new Array(150 * App.ticksPerSecond)
            .fill(null)
            .map(
                (_, i) =>
                    new Tick<a>(i * App.tickDuration, i, this as App<any, any>),
            );
        target.appendChild(this.canvasEl);

        for (const o of this.gameObjects) {
            const { element, alliance } = o;
            let appended = false;
            const append = () => {
                if (appended) return;
                target.appendChild(element);
            };
            console.log(alliance, this.currentAlliance);
            if (alliance === null) append();
            if (alliance === this.currentAlliance) append();
            if (this.currentAlliance === null) append();
        }

        this.setListeners();
        const stopAnimation = this.canvas.animate();

        const stop = () => {
            this.built = false;
            stopAnimation();
            quitView = true;
            this.emit('stop');
        };

        this.on('stop', stopAnimation);

        return stop;
    }

    /**
     * Set the listeners for the app
     * @date 1/9/2024 - 3:08:19 AM
     *
     * @public
     */
    public setListeners() {
        const push = (x: number, y: number) => {
            if (!this.isDrawing) return;
            this.path.add([x, y]);
            this.currentLocation = [x, y];
            setTimeout(() => {
                this.path.points.shift();
            }, 1000); // clear after 1 second
        };

        const down = (x: number, y: number) => {
            if (this.clicking) return;
            this.isDrawing = true;
            push(x, y);
        };
        const move = (x: number, y: number) => {
            if (this.clicking) return;
            push(x, y);
        };
        const up = (x: number, y: number) => {
            if (this.clicking) return;
            this.isDrawing = false;
            push(x, y);
        };

        this.canvasEl.addEventListener('mousedown', (e) => {
            const [[x, y]] = this.canvas.getXY(e);
            down(x, y);
        });

        this.canvasEl.addEventListener('mousemove', (e) => {
            const [[x, y]] = this.canvas.getXY(e);
            move(x, y);
        });

        this.canvasEl.addEventListener('mouseup', (e) => {
            const [[x, y]] = this.canvas.getXY(e);
            up(x, y);
        });

        this.canvasEl.addEventListener('touchstart', (e) => {
            const [[x, y]] = this.canvas.getXY(e);
            down(x, y);
        });

        this.canvasEl.addEventListener('touchmove', (e) => {
            const [[x, y]] = this.canvas.getXY(e);
            move(x, y);
        });

        this.canvasEl.addEventListener('touchend', (e) => {
            this.isDrawing = false;
            // const [[x, y]] = this.canvas.getXY(e);
            // up(x, y);
        });

        this.canvasEl.addEventListener('touchcancel', (e) => {
            this.isDrawing = false;
            // const [[x, y]] = this.canvas.getXY(e);
            // up(x, y);
        });
    }

    /**
     * Use this to get the location of points for your polygons. This is not to be used in the actual app, but rather to help you develop.
     * @date 1/9/2024 - 3:33:17 AM
     *
     * @public
     * @returns {*}
     */
    public clickPoints() {
        const em = new EventEmitter<'point'>();

        this.canvasEl.addEventListener('click', (e) => {
            const [p] = this.canvas.getXY(e);
            em.emit('point', p);
        });

        return em;
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @returns {TraceArray}
     */
    pull(): TraceArray {
        return this.ticks
            .map((t, i) => {
                const [x, y] = t.point ?? [-1, -1];
                return [i, round(x), round(y), t.get()?.action.abbr ?? 0];
            })
            .filter((p, i, a) => {
                if (p[3] !== 0) return true;
                if (i !== 0) {
                    if (a[i - 1][1] === p[1] && a[i - 1][2] === p[2]) {
                        return false;
                    }
                }
                return p[1] !== -1 && p[2] !== -1;
            }) as TraceArray;
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:59:07 PM
     *
     * @param {HTMLCanvasElement} canvas
     * @returns {Result<Container>}
     */
    drawRecap(canvas: HTMLCanvasElement): Result<Container> {
        return attempt(() => {
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No context');
            const c = new Canvas(ctx);

            const d = this.pull();
            const container = new Container();

            container.children = d.map((p) => {
                const [index, x, y, action] = p;

                if (action) return new Circle([x, y], 0.1);
                return new Circle([x, y], 0.05);
            });

            const from = 0;
            const to = d.length - 1;
            container.filter((_, i) => i >= from && i <= to);

            c.add(container);
            return container;
        });
    }
}
