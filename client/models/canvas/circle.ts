import { Point2D } from "../../submodules/calculations/src/linear-algebra/point";
import { ShapeProperties } from "./shape-properties";

export class Circle {
    constructor(public center: Point2D, public radius: number, public properties?: ShapeProperties) {}

    isIn(x: number, y: number) {
        return Math.sqrt(Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2)) < this.radius;
    }

    draw(context: CanvasRenderingContext2D) {
        context.save();
        context.beginPath();
        if (this.properties?.line?.color) context.strokeStyle = this.properties.line.color;
        if (this.properties?.line?.width) context.lineWidth = this.properties.line.width;
        if (this.properties?.fill?.color) context.fillStyle = this.properties.fill.color;
        context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        if (this.properties?.fill) context.fill();
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