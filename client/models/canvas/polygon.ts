import { Point2D } from '../../submodules/calculations/src/linear-algebra/point';

export class Polygon {

    constructor(public points: Point2D[]) {}

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
        for (let i = 1; i < this.points.length; i++) {
            context.lineTo(this.points[i][0], this.points[i][1]);
        }
        context.closePath();
        context.stroke();
        context.restore();
    }
}