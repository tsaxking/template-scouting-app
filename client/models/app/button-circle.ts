import { GameObject } from './game-object';
import { toRadians } from '../../../shared/submodules/calculations/src/graphing';
import { App } from './app';
import {
    Point,
    Point2D,
} from '../../../shared/submodules/calculations/src/linear-algebra/point';
import { BootstrapColor, Color } from '../../submodules/colors/color';
import { EventEmitter } from '../../../shared/event-emitter';
import { AppObject, Iterator } from './app-object';
import { Circle } from '../canvas/circle';
import { CanvasEvent } from '../canvas/canvas';

// ▄▀▀ ▄▀▄ █▄ █ ▄▀▀ ▀█▀ ▄▀▄ █▄ █ ▀█▀ ▄▀▀
// ▀▄▄ ▀▄▀ █ ▀█ ▄█▀  █  █▀█ █ ▀█  █  ▄█▀
const diameter = 300;
const circleRadius = diameter / 2;
const movingScale = 0.5; // size of the button when the robot is in motion
const fadeScale = 0.5; // opacity of the button when the robot is not in motion
const buttonOffset = 90; // deg from 0
const buttonDiameter = 5;

/**
 * Button on the button circle
 * @date 1/9/2024 - 3:34:30 AM
 *
 * @class Button
 * @typedef {Button}
 */
class Button<actions = string> {
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
    // public readonly circle: Circle;
    // public readonly el: HTMLButtonElement;

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
        public readonly abbr: actions,
        defaultState: number,
        public readonly condition: (app: App) => boolean,
        public readonly index: number,
        public readonly color: Color,
        // color: BootstrapColor,
    ) {
        // TODO: add icons
        this.iterator = new Iterator<actions>(
            name,
            description,
            abbr,
            defaultState,
        );
        // this.circle = new Circle([0, 0], radius, {
        //     fill: {
        //         color: this.color.toString('rgb'),
        //     },
        // });

        // this.el = document.createElement('button');

        // this.el.classList.add('btn', 'btn-' + color);
        // this.el.style.translate = `translate(${circleRadius}px, ${circleRadius}px)`;
        // this.el.style.position = 'absolute';
        // this.el.style.zIndex = '9999';
        // this.el.innerText = name;
    }

    draw(ctx: CanvasRenderingContext2D) {}

    // hide() {
    //     this.el.style.display = 'none';
    // }

    // show() {
    //     this.el.style.display = 'block';
    // }

    // moveTo(point: Point2D) {
    //     this.el.style.transform = `translate(${point[0]}px, ${point[1]}px)`;
    // }
}

/**
 * All events for the button circle
 * @date 1/9/2024 - 3:34:30 AM
 *
 * @typedef {ButtonEvents}
 */
type ButtonEvents = {
    click: CanvasEvent<MouseEvent | TouchEvent>;
};

/**
 * Button circle
 * @date 1/9/2024 - 3:34:30 AM
 *
 * @export
 * @class ButtonCircle
 * @typedef {ButtonCircle}
 */
export class ButtonCircle<actions = string> {
    /**
     * All buttons on the circle
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @public
     * @readonly
     * @type {Button[]}
     */
    public readonly buttons: Button<actions>[] = [];
    public visibleButtons: Button<actions>[] = [];

    /**
     * Event emitter for the button circle
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @public
     * @readonly
     * @type {*}
     */
    public readonly $emitter = new EventEmitter<keyof ButtonEvents>();
    public readonly el = document.createElement('div');

    /**
     * Creates an instance of ButtonCircle.
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @constructor
     * @param {App} app
     */
    constructor(public readonly app: App) {
        // this.on('click', (e) => {
        //     for (const button of this.buttons) {
        //         if (button.circle.isIn(e.point)) {
        //             button.iterator.change(e.point);
        //         }
        //     }
        // });
        this.el.style.position = 'relative';
        this.el.style.height = `${diameter}px`;
        this.el.style.width = `${diameter}px`;
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
        abbr: actions,
        defaultState = 0,
        condition: (app: App) => boolean = () => true,
        color: Color,
        // color: BootstrapColor
    ) {
        if (this.buttons.length > 8) {
            throw new Error('Cannot add more than 8 buttons');
        }
        const index = this.buttons.length;
        const button = new Button(
            name,
            description,
            abbr,
            defaultState,
            condition,
            index,
            color,
        );
        this.buttons.push(button);
        // this.el.appendChild(button.el);
        return this;
    }

    /**
     * Draw the button circle
     * @date 1/9/2024 - 3:34:30 AM
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    // draw(ctx: CanvasRenderingContext2D) {
    //     const numButtons = this.buttons.length;
    //     const intervalAngle = toRadians(360 / numButtons); // interval between buttons
    //     const startAngle = toRadians(buttonOffset); // offset from 0

    //     const location = this.app.currentLocation;
    //     if (!location) return;
    //     const [x, y] = location;

    //     for (let i = 0; i < numButtons; i++) {
    //         const b = this.buttons[i];
    //         if (!b.condition(this.app)) return;
    //         ctx.save();
    //         const angle = startAngle - i * intervalAngle; // go clockwise, hence the negative
    //         const [dx, dy] = [
    //             Math.cos(angle) * radius,
    //             Math.sin(angle) * radius,
    //         ];

    //         b.circle.x = x + dx;
    //         b.circle.y = y + dy;

    //         const [mx, my] = [
    //             Math.cos(angle) * radius * movingScale,
    //             Math.sin(angle) * radius * movingScale,
    //         ];

    //         b.circle.x = x + mx;
    //         b.circle.y = y + my;

    //         b.circle.properties = {
    //             fill: {
    //                 color: b.color.setAlpha(fadeScale).toString('rgba'),
    //             },
    //         };

    //         b.circle.draw(ctx);
    //     }
    // }

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

    draw(ctx: CanvasRenderingContext2D) {
        const btns = this.buttons.filter((e) => e.condition(this.app));
        const numButtons = btns.length;

        for (const b of btns) b.draw(ctx);
    }

    // draw(app: App) {
    //     if (!app.currentLocation) return this.el.style.display = 'none';
    //     else this.el.style.display = 'block';

    //     // move button circle
    //     const [x, y] = app.currentLocation;
    //     const cx = app.xOffset + x * app.width;
    //     const cy = app.yOffset + y * app.height;

    //     if (app.isDrawing) this.el.style.transform = `translate(${cx - circleRadius}px, ${cy - circleRadius}px scale(${movingScale})`;
    //     else this.el.style.transform = `translate(${cx - circleRadius}px, ${cy - circleRadius}px) scale(1)`;

    //     const [btns, hide] = this.buttons.reduce<[Button[], Button[]]>((acc, btn) => {
    //         if (btn.condition(app)) acc[0].push(btn);
    //         else acc[1].push(btn);
    //         return acc;
    //     }, [[],[]]);

    //     for (const btn of hide) btn.hide();

    //     const numButtons = btns.length;
    //     const intervalAngle = toRadians(360 / numButtons); // interval between buttons
    //     const startAngle = toRadians(buttonOffset); // offset from 0

    //     for (const btn of btns) {
    //         btn.show();
    //         const angle = startAngle - btn.index * intervalAngle; // go clockwise, hence the negative

    //         const [dx, dy] = [
    //             Math.cos(angle) * circleRadius,
    //             Math.sin(angle) * circleRadius,
    //         ];

    //         // btn.moveTo([dx, dy]);

    //         const [mx, my] = [
    //             Math.cos(angle) * circleRadius * movingScale,
    //             Math.sin(angle) * circleRadius * movingScale,
    //         ];

    //         if (app.isDrawing) btn.moveTo([
    //             (cx + mx) - app.xOffset,
    //             (cy + my) - app.yOffset
    //         ]);
    //         else btn.moveTo([
    //             (cx + dx) - app.xOffset,
    //             (cy + dy) - app.yOffset
    //         ]);
    //     }

    //     console.log(this.buttons.map(e => e.el.outerHTML));
    // }
}
