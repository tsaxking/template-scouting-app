import { Drawable } from "./canvas";

/**
 * Location and size of the image
 * @date 1/9/2024 - 11:48:39 AM
 *
 * @typedef {CanvasImageProperties}
 */
type CanvasImageProperties = {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Image drawable
 * @date 1/9/2024 - 11:48:39 AM
 *
 * @export
 * @class Img
 * @typedef {Img}
 * @implements {Drawable}
 */
export class Img {
    /**
     * Description placeholder
     * @date 1/9/2024 - 11:48:39 AM
     *
     * @public
     * @readonly
     * @type {HTMLImageElement}
     */
    public readonly img: HTMLImageElement;
    // private data: Uint8ClampedArray | null = null;

    /**
     * Creates an instance of Img.
     * @date 1/9/2024 - 11:48:39 AM
     *
     * @constructor
     * @param {string} src
     * @param {Partial<CanvasImageProperties>} properties
     */
    constructor(public readonly src: string, public readonly properties: Partial<CanvasImageProperties>) {
        this.img = new Image();
        this.img.src = src;

        // this.img.onload = (d) => {
        //     const canvas = document.createElement('canvas');
        //     canvas.width = this.img.width;
        //     canvas.height = this.img.height;
        //     const ctx = canvas.getContext('2d');
        //     if (!ctx) return;
        //     ctx.drawImage(this.img, 0, 0);
        //     this.data = ctx.getImageData(0, 0, this.img.width, this.img.height).data;
        // }
    }

    /**
     * X coordinate of the image (left side)
     * @date 1/9/2024 - 11:50:23 AM
     *
     * @type {number}
     */
    get x() {
        return this.properties.x ?? 0;
    }

    /**
     * X coordinate of the image (left side)
     * @date 1/9/2024 - 11:50:23 AM
     *
     * @type {number}
     */
    set x(x: number) {
        this.properties.x = x;
    }

    /**
     * Y coordinate of the image (top side)
     * @date 1/9/2024 - 11:50:23 AM
     *
     * @type {number}
     */
    get y() {
        return this.properties.y ?? 0;
    }

    /**
     * Y coordinate of the image (top side)
     * @date 1/9/2024 - 11:50:23 AM
     *
     * @type {number}
     */
    set y(y: number) {
        this.properties.y = y;
    }

    /**
     * Width of the image (0 - 1)
     * @date 1/9/2024 - 11:50:23 AM
     *
     * @type {number}
     */
    get width() {
        return this.properties.width ?? this.img.width;
    }

    /**
     * Width of the image (0 - 1)
     * @date 1/9/2024 - 11:50:23 AM
     *
     * @type {number}
     */
    set width(width: number) {
        this.properties.width = width;
    }

    /**
     * Height of the image (0 - 1)
     * @date 1/9/2024 - 11:50:23 AM
     *
     * @type {number}
     */
    get height() {
        return this.properties.height ?? this.img.height;
    }

    /**
     * Height of the image (0 - 1)
     * @date 1/9/2024 - 11:50:23 AM
     *
     * @type {number}
     */
    set height(height: number) {
        this.properties.height = height;
    }

    /**
     * Draw the image
     * @date 1/9/2024 - 11:48:39 AM
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx: CanvasRenderingContext2D) {
        const { x, y, width, height } = this.properties;
        // if (!this.data) return;
        ctx.save();
        ctx.drawImage(
            this.img,
            this.x * ctx.canvas.width,
            this.y * ctx.canvas.height,
            this.width * ctx.canvas.width,
            this.height * ctx.canvas.height
        );
    }



    /**
     * Determines if the given point is inside the image
     * @date 1/9/2024 - 11:50:23 AM
     *
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    isIn(x: number, y: number) {
        return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height;
    }
};