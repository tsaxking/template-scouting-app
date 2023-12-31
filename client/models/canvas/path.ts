import { Point, Point2D } from "../../submodules/calculations/src/linear-algebra/point";

export class Path {
    constructor(public points: Point2D[]) {}

    draw(context: CanvasRenderingContext2D) {
        context.save();
        context.beginPath();
        context.moveTo(this.points[0][0], this.points[0][1]);
        for (let i = 1; i < this.points.length; i++) {
            context.lineTo(this.points[i][0], this.points[i][1]);
        }
        context.stroke();
        context.restore();
    }

    add(...points: Point2D[]) {
        this.points.push(...points.map(p => {
            setTimeout(() => this.points.shift(), 3000);
            return p;
        }));
    }
};


export class PathCollection {
    constructor(public paths: Path[]) {}

    draw(context: CanvasRenderingContext2D) {
        for (const path of this.paths) {
            path.draw(context);
        }
    }
};