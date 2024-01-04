import { Point2D } from '../../submodules/calculations/src/linear-algebra/point';
import { ShapeProperties } from './shape-properties';

export class Polygon {

    constructor(public points: Point2D[], public properties?: ShapeProperties) {}

    isIn(x: number, y: number) {
        let inside = false;
        for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
            const xi = this.points[i][0], yi = this.points[i][1];
            const xj = this.points[j][0], yj = this.points[j][1];
    
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
    
        return inside;
    }

    draw(context: CanvasRenderingContext2D) {
        context.save();
        context.beginPath();
        context.moveTo(this.points[0][0], this.points[0][1]);
        if (this.properties?.line?.color) context.strokeStyle = this.properties.line.color;
        if (this.properties?.line?.width) context.lineWidth = this.properties.line.width;
        for (let i = 1; i < this.points.length; i++) {
            context.lineTo(this.points[i][0], this.points[i][1]);
        }
        context.lineTo(this.points[0][0], this.points[0][1]);
        context.closePath();
        if (this.properties?.fill?.color) context.fillStyle = this.properties.fill.color;
        if (this.properties?.fill) context.fill();
        context.stroke();
        context.restore();
    }
}