/**
 * @fileoverview App class
 * @description This contains the main class for the app, which is responsible for running the match and keeping track of the state of the robot over time. The data is collected every 250ms, and the app will run for 150 seconds, so there will be 600 ticks in total.
 */


import { ActionState } from "./app-object";
import { Point2D } from '../../../shared/submodules/calculations/src/linear-algebra/point';
import { EventEmitter } from '../../../shared/event-emitter';
import { ButtonCircle } from "./button-circle";
import { Canvas } from "../canvas/canvas";
import { AppObject } from "./app-object";
import { Path } from "../canvas/path";
import { Img } from "../canvas/image";
import { BorderPolygon } from "../canvas/border";
import { Polygon } from "../canvas/polygon";
import { Circle } from "../canvas/circle";
import { Color } from "../../submodules/colors/color";

/**
 * Point including time
 * @date 1/9/2024 - 3:08:20 AM
 *
 * @export
 * @typedef {Point}
 */
export type Point = [...Point2D, number] // x, y, path (time is the index of the tick)


/**
 * Data collected at a given point in time
 * @date 1/9/2024 - 3:08:20 AM
 *
 * @export
 * @typedef {CollectedData}
 */
export type CollectedData = ActionState | null;


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
    'section': Section;
    'error': Error;
    'stop': void;
    'end': void;
    'stopped': void;
};


/**
 * Tick of the match
 * @date 1/9/2024 - 3:08:20 AM
 *
 * @export
 * @class Tick
 * @typedef {Tick}
 */
export class Tick {
    /**
     * Data collected at this tick
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @private
     * @type {CollectedData}
     */
    private data: CollectedData = null;

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
    constructor(public readonly time: number, public readonly index: number, public readonly app: App) {}

    /**
     * Nearest second
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {number}
     */
    public get second(): number {
        return Math.round(this.index / 4);
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
};


/**
 * The full scouting app, including the canvas and all the buttons
 * @date 1/9/2024 - 3:08:20 AM
 *
 * @export
 * @class App
 * @typedef {App}
 */
export class App {

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
        [key in Section]: [number, number]
    } = {
        // [sectionName]: [start, end]
        auto: [0, 15],
        teleop: [15, 135],
        endgame: [135, 150]
    }


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
     * Creates an instance of App.
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @constructor
     * @param {HTMLDivElement} target
     */
    constructor(public readonly target: HTMLDivElement) {
        target.style.position = 'relative';
        this.canvas.ctx.canvas.width = target.clientWidth;
        this.canvas.ctx.canvas.height = target.clientHeight;
        this.canvas.add(this.buttonCircle, this.path);

        if (target.clientWidth > target.clientHeight * 2) {
            const xOffset = (target.clientWidth - target.clientHeight * 2) / 2;
            this.background = new Img('/assets/field.png', {
                x: xOffset,
                y: 0,
                width: target.clientHeight * 2,
                height: target.clientHeight
            });
        } else {
            const yOffset = (target.clientHeight - target.clientWidth / 2) / 2;
            this.background = new Img('/assets/field.png', {
                x: 0,
                y: yOffset,
                width: target.clientWidth,
                height: target.clientWidth / 2
            });
        }
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
    public currentTick: Tick | undefined = undefined;
    /**
     * The current location of the robot [x, y]
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @type {(Point2D | undefined)}
     */
    public currentLocation: Point2D | undefined = undefined;





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
    public readonly buttonCircle = new ButtonCircle(this);
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
        object: AppObject;
    }[] = [];
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
     * @type {?BorderPolygon}
     */
    public border?: BorderPolygon;
    /**
     * The areas of the field (Any area that is of significance)
     * @date 1/9/2024 - 3:23:58 AM
     *
     * @public
     * @readonly
     * @type {(Polygon | Circle)[]}
     */
    public readonly areas: (Polygon | Circle)[] = [];



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
        const b = new BorderPolygon(points, {
            fill: {
                color: color.toString('rgba')
            }
        });

        const { draw } = b;
        b.draw = (ctx) => {
            if (this.currentLocation && b.isIn(this.currentLocation)) {
                draw(ctx);
            }
        }

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
    addArea(points: Point2D[], color: Color) {
        const p = new Polygon(points, {
            fill: {
                color: color.toString('rgba')
            }
        });

        // only draw if the robot is in the area
        const { draw } = p;
        p.draw = (ctx) => {
            if (this.currentLocation && p.isIn(this.currentLocation)) {
                draw(ctx);
            }
        }

        this.canvas.add(p);
        this.areas.push(p);
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
    public readonly canvas = new Canvas(this.canvasEl.getContext('2d')!);
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
    private readonly $emitter: EventEmitter<keyof AppEvents> = new EventEmitter<keyof AppEvents>();


    /**
     * All the ticks of the match
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @readonly
     * @type {Tick[]}
     */
    public readonly ticks: Tick[] = new Array(150 * App.ticksPerSecond).fill(null).map((_, i) => new Tick(i * App.tickDuration, i, this));

    /**
     * Launch the app
     * @date 1/9/2024 - 3:08:20 AM
     *
     * @public
     * @param {() => void} cb The callback to run every tick
     * @returns {void) => void}
     */
    public launch(cb?: (tick: Tick) => void) {
        this.build();
        this.startTime = Date.now();
        this.currentTime = this.startTime;
        let active = true;

        // reset active flag on stop
        const stop = () => active = false;
        this.off('stop');
        this.on('stop', stop);

        // adaptive loop to be as close to 250ms as possible
        const run = async (t: Tick | undefined) => {
            const start = Date.now();

            const { section } = this;
            this.currentTick = t;
            if (this.section !== section) this.emit('section', this.section ?? undefined);

            if (!t) return this.emit('end');
            if (!active) return this.emit('stopped');
            this.currentTime = start - this.startTime;
            if (this.currentLocation) t.point = this.currentLocation;

            try {
                await cb?.(t);
            } catch (error) {
                this.$emitter.emit('error', error);
                return this.stop();
            }

            const end = Date.now();
            const duration = end - start;
            const delay = App.tickDuration - duration;
            
            // there could be a major delay if the callback takes too long, so we need to account for that
            setTimeout(() => run(t.next()), Math.max(0, delay));
        }

        run(this.ticks[0]);
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
            if (this.currentTick.second >= start && this.currentTick.second <= end) {
                return section as Section;
            }
        }
        return null;
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
    public on<K extends keyof AppEvents>(event: K, cb: (data: AppEvents[K]) => void) {
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
    public off<K extends keyof AppEvents>(event: K, cb?: (data: AppEvents[K]) => void) {
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
    public get timeLeft(): [number, number] { // [minutes, seconds]
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
    addGameObject<T = unknown>(x: number, y: number, object: AppObject<T>, button: HTMLElement, convert?: (state: T) => string) {
        this.gameObjects.push({ x, y, object });

        button.innerText = object.name;
        button.style.position = 'absolute';
        button.style.left = `${x}px`;
        button.style.top = `${y}px`;
        button.style.transform = 'translate(-50%, -50%)';

        this.target.appendChild(button);

        object.listen((state) => {
            this.currentTick?.set(state);
            button.innerText = `${object.name}: ${convert ? convert(state.state) : state.state}`;
        });

        button.addEventListener('click', () => {
            object.change(this.currentLocation);
        });

        // if the button is held down, change the state 
        let interval: NodeJS.Timeout | undefined = undefined;
        const start = () => {
            if (interval) end();
            interval = setTimeout(() => {
                object.undo()
            }, 1000);
        }
        const end = () => {
            if (interval) clearTimeout(interval);
        }

        button.addEventListener('mousedown', start);
        button.addEventListener('touchstart', start);
        button.addEventListener('mouseup', end);
        button.addEventListener('touchend', end);
        button.addEventListener('touchcancel', end);
        button.addEventListener('mouseleave', end);
        button.addEventListener('touchleave', end);
    }

    /**
     * Build the app
     * @date 1/9/2024 - 3:08:19 AM
     *
     * @public
     * @returns {*}
     */
    public build() {
        if (this.built) return console.warn('App already built');
        this.target.appendChild(this.canvasEl);
        this.setListeners();
    }

    /**
     * Set the listeners for the app
     * @date 1/9/2024 - 3:08:19 AM
     *
     * @public
     */
    public setListeners() {
        const push = (x: number, y: number) => {
            this.path.add([x, y]);
            setInterval(() => {
                this.path.points.shift();
            }, 1000); // clear after 1 second
        }

        const down = (x: number, y: number) => {
            push(x, y);
        };
        const move = (x: number, y: number) => {
            push(x, y);
        };
        const up = (x: number, y: number) => {
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
            const [[x, y]] = this.canvas.getXY(e);
            up(x, y);
        });

        this.canvasEl.addEventListener('touchcancel', (e) => {
            const [[x, y]] = this.canvas.getXY(e);
            up(x, y);
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
};