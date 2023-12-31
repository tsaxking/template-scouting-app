import { Point2D } from "../../submodules/calculations/src/linear-algebra/point";

export class Circle {
    constructor(public center: Point2D, public radius: number) {}

    isIn(x: number, y: number) {
        return Math.sqrt(Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2)) < this.radius;
    }

    draw(context: CanvasRenderingContext2D) {
        context.save();
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        context.stroke();
        context.restore();
    }

    get x() {
        return this.center[0];
    }

    get y() {
        return this.center[1];
    }
};