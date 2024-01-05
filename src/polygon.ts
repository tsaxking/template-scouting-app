import { Point2D } from "./linear-algebra/point";

export const isInside = (point: Point2D, points: Point2D[]) => {
    // using ray-casting algorithm
    // test if a point is inside a polygon

    // points is an array of [x, y] points

    let [x, y] = point;

    let inside = false;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        let [xi, yi] = points[i];
        let [xj, yj] = points[j];

        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) {
            inside = !inside;
        }
    }

    return inside;
};