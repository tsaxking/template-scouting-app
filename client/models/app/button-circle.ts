import { GameObject } from './game-object';
import { toRadians } from '../../../shared/submodules/calculations/src/graphing';
import { App } from './app';
import { Point } from '../../../shared/submodules/calculations/src/linear-algebra/point';
import { Color } from '../../submodules/colors/color';
import { EventEmitter } from '../../../shared/event-emitter';
import { AppObject, Iterator } from './app-object';
import { Circle } from '../canvas/circle';
import { CanvasEvent } from '../canvas/canvas';

/**
 * Order of colors for the buttons
 * @date 1/9/2024 - 3:34:30 AM
 *
 * @type {{}}
 */
const colorOrder = [
    Color.fromName('red'),
    Color.fromName('orange'),
    Color.fromName('yellow'),
    Color.fromName('green'),
    Color.fromName('blue'),
    Color.fromName('purple'),
    Color.fromName('pink'),
    Color.fromName('brown'),
];

// ▄▀▀ ▄▀▄ █▄ █ ▄▀▀ ▀█▀ ▄▀▄ █▄ █ ▀█▀ ▄▀▀
// ▀▄▄ ▀▄▀ █ ▀█ ▄█▀  █  █▀█ █ ▀█  █  ▄█▀
const diameter = 100;
const radius = diameter / 2;
const movingScale = 0.5; // size of the button when the robot is in motion
const fadeScale = 0.5; // opacity of the button when the robot is not in motion
const buttonOffset = 90; // deg from 0

/**
 * Button on the button circle
 * @date 1/9/2024 - 3:34:30 AM
 *
 * @class Button
 * @typedef {Button}
 */
class Button {
    /**
     * State machine for the button
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @public
     * @readonly
     * @type {Iterator}
     */
    public readonly iterator: Iterator;
    /**
     * Creates a circle for the button image
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @public
     * @readonly
     * @type {Circle}
     */
    public readonly circle: Circle;
    public readonly color: Color;

    /**
     * Creates an instance of Button.
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @constructor
     * @param {string} name
     * @param {string} description
     * @param {number} [defaultState=0]
     */
    constructor(
        public readonly name: string,
        public readonly description: string,
        defaultState: number,
        public readonly condition: (app: App) => boolean,
        public readonly index: number,
    ) {
        // TODO: add icons
        this.iterator = new Iterator(name, description, defaultState);
        this.color = colorOrder[index];
        this.circle = new Circle([0, 0], radius, {
            fill: {
                color: this.color.toString('rgb'),
            },
        });
    }
}

/**
 * All events for the button circle
 * @date 1/9/2024 - 3:34:30 AM
 *
 * @typedef {ButtonEvents}
 */
type ButtonEvents = {
    'click': CanvasEvent<MouseEvent | TouchEvent>;
};

/**
 * Button circle
 * @date 1/9/2024 - 3:34:30 AM
 *
 * @export
 * @class ButtonCircle
 * @typedef {ButtonCircle}
 */
export class ButtonCircle {
    /**
     * All buttons on the circle
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @public
     * @readonly
     * @type {Button[]}
     */
    public readonly buttons: Button[] = [];
    public visibleButtons: Button[] = [];

    /**
     * Event emitter for the button circle
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @public
     * @readonly
     * @type {*}
     */
    public readonly $emitter = new EventEmitter<keyof ButtonEvents>();

    /**
     * Creates an instance of ButtonCircle.
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @constructor
     * @param {App} app
     */
    constructor(public readonly app: App) {
        this.on('click', (e) => {
            for (const button of this.buttons) {
                if (button.circle.isIn(e.point)) {
                    button.iterator.change(e.point);
                }
            }
        });
    }

    /**
     * Add a button to the circle
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @param {string} name
     * @param {string} description
     * @param {number} [defaultState=0]
     * @param {() => boolean} [condition=() => true]
     * @returns {boolean) => void}
     */
    addButton(
        name: string,
        description: string,
        defaultState = 0,
        condition: (app: App) => boolean = () => true,
    ) {
        if (this.buttons.length > 8) {
            throw new Error('Cannot add more than 8 buttons');
        }
        const index = this.buttons.length;
        const button = new Button(
            name,
            description,
            defaultState,
            condition,
            index,
        );
        this.buttons.push(button);
        return this;
    }

    /**
     * Draw the button circle
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx: CanvasRenderingContext2D) {
        const numButtons = this.buttons.length;
        const intervalAngle = toRadians(360 / numButtons); // interval between buttons
        const startAngle = toRadians(buttonOffset); // offset from 0

        const location = this.app.currentLocation;
        if (!location) return;
        const [x, y] = location;

        for (let i = 0; i < numButtons; i++) {
            const b = this.buttons[i];
            if (!b.condition(this.app)) return;
            ctx.save();
            const angle = startAngle - i * intervalAngle; // go clockwise, hence the negative
            const [dx, dy] = [
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
            ];

            b.circle.x = x + dx;
            b.circle.y = y + dy;

            const [mx, my] = [
                Math.cos(angle) * radius * movingScale,
                Math.sin(angle) * radius * movingScale,
            ];

            b.circle.x = x + mx;
            b.circle.y = y + my;

            b.circle.properties = {
                fill: {
                    color: b.color.setAlpha(fadeScale).toString('rgba'),
                },
            };

            b.circle.draw(ctx);
        }
    }

    /**
     * Add an event listener
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @template {keyof ButtonEvents} K
     * @param {K} event
     * @param {(e: ButtonEvents[K]) => void} cb
     */
    on<K extends keyof ButtonEvents>(
        event: K,
        cb: (e: ButtonEvents[K]) => void,
    ): void {
        this.$emitter.on(event, cb);
    }

    /**
     * Remove an event listener
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @template {keyof ButtonEvents} K
     * @param {K} event
     * @param {(e: ButtonEvents[K]) => void} cb
     */
    off<K extends keyof ButtonEvents>(
        event: K,
        cb: (e: ButtonEvents[K]) => void,
    ): void {
        this.$emitter.off(event, cb);
    }

    /**
     * Emit an event
     * @date 1/9/2024 - 3:34:29 AM
     *
     * @template {keyof ButtonEvents} K
     * @param {K} event
     * @param {ButtonEvents[K]} data
     */
    emit<K extends keyof ButtonEvents>(event: K, data: ButtonEvents[K]): void {
        this.$emitter.emit(event, data);
    }
}
