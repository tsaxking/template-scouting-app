import { Drawable } from './drawable';
import { ShapeProperties } from './properties';
import { Point2D } from '../../../shared/submodules/calculations/src/linear-algebra/point';

/**
 * Polygon
 * @date 1/25/2024 - 12:36:59 PM
 *
 * @export
 * @class Polygon
 * @typedef {Polygon}
 * @extends {Drawable<Polygon>}
 */
export class Polygon extends Drawable<Polygon> {
    /**
     * Creates an instance of Polygon.
     * @date 1/25/2024 - 12:36:59 PM
     *
     * @constructor
     * @param {Point2D[]} points
     * @param {Partial<ShapeProperties<Polygon>>} [$properties={}]
     */
    constructor(
        public points: Point2D[],
        public readonly $properties: Partial<ShapeProperties<Polygon>> = {},
    ) {
        super();
    }

    /**
     * Draw the polygon
     * @date 1/25/2024 - 12:36:59 PM
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        const x0 = this.points[0][0] * ctx.canvas.width;
        const y0 = this.points[0][1] * ctx.canvas.height;
        ctx.moveTo(x0, y0);

        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(
                this.points[i][0] * ctx.canvas.width,
                this.points[i][1] * ctx.canvas.height,
            );
        }
        ctx.closePath();

        if (this.$properties?.line?.color) {
            ctx.strokeStyle = this.$properties.line.color;
        }
        if (this.$properties?.line?.width) {
            ctx.lineWidth = this.$properties.line.width;
        }

        if (this.$properties?.line) ctx.stroke();

        if (this.$properties?.fill?.color) {
            ctx.fillStyle = this.$properties.fill.color;
        }
        if (this.$properties?.fill) ctx.fill();
    }

    /**
     * Check if the given point is inside the polygon
     * @date 1/25/2024 - 12:36:59 PM
     *
     * @param {Point2D} point
     * @returns {boolean}
     */
    isIn(point: Point2D) {
        const [x, y] = point;
        let inside = false;
        for (
            let i = 0, j = this.points.length - 1;
            i < this.points.length;
            j = i++
        ) {
            const xi = this.points[i][0],
                yi = this.points[i][1];
            const xj = this.points[j][0],
                yj = this.points[j][1];

            const intersect = yi > y !== yj > y &&
                x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }

        return inside;
    }
}
