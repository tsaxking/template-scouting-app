import { Polygon } from "./polygon";

export class BorderPolygon extends Polygon {
    isIn(x: number, y: number) {
        return !super.isIn(x, y);
    }
};