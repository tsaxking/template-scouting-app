import {
    Point,
    Point2D,
} from '../../../shared/submodules/calculations/src/linear-algebra/point';
import { LineProperties } from './shape-properties';

/**
 * A line drawable. Because this is for the trace, each point will disappear after a few seconds
 * @date 1/9/2024 - 11:55:50 AM
 *
 * @export
 * @class Path
 * @typedef {Path}
 */
export class Path {
    /**
     * Creates an instance of Path.
     * @date 1/9/2024 - 11:55:50 AM
     *
     * @constructor
     * @param {Point2D[]} points
     * @param {?Partial<LineProperties>} [properties]
     */
    constructor(
        public readonly points: Point2D[],
        public properties?: Partial<LineProperties>,
    ) {}

    /**
     * Draw the path
     * @date 1/9/2024 - 11:55:50 AM
     *
     * @param {CanvasRenderingContext2D} context
     */
    draw(context: CanvasRenderingContext2D) {
        context.save();
        context.beginPath();
        if (!this.points[0]) return;
        context.moveTo(
            this.points[0][0] * context.canvas.width,
            this.points[0][1] * context.canvas.height,
        );
        if (this.properties?.color) context.strokeStyle = this.properties.color;
        if (this.properties?.width) context.lineWidth = this.properties.width;
        for (let i = 1; i < this.points.length; i++) {
            context.lineTo(
                this.points[i][0] * context.canvas.width,
                this.points[i][1] * context.canvas.height,
            );
        }
        context.stroke();
        context.restore();
    }

    /**
     * Add points to the path and remove them after 3 seconds
     * @date 1/9/2024 - 11:55:50 AM
     *
     * @param {...Point2D[]} points
     */
    add(...points: Point2D[]) {
        this.points.push(...points.map((p) => {
            setTimeout(() => this.points.shift(), 3000);
            return p;
        }));
    }
}

/**
 * A collection of paths
 * @date 1/9/2024 - 11:55:50 AM
 *
 * @export
 * @class PathCollection
 * @typedef {PathCollection}
 */
export class PathCollection {
    /**
     * Creates an instance of PathCollection.
     * @date 1/9/2024 - 11:55:50 AM
     *
     * @constructor
     * @param {Path[]} paths
     */
    constructor(public paths: Path[]) {}

    /**
     * Draw all the paths
     * @date 1/9/2024 - 11:55:50 AM
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx: CanvasRenderingContext2D) {
        for (const path of this.paths) {
            path.draw(ctx);
        }
    }
}
