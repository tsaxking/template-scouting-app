import { Point } from './point';
import { Vector } from './vector';
import { Point2D } from './point';

// TODO: Add magnitude

export interface Spline {
    ft(t: number): Point;
    generatePoints(count: number): Point[];
}

/**
 * A curve defined by a series of points
 * @date 1/10/2024 - 2:41:33 PM
 *
 * @export
 * @class Spline
 * @typedef {BezzierSpline}
 */
export class BezzierSpline implements Spline {
    /**
     * An array of points defining the spline
     * @date 1/10/2024 - 2:41:33 PM
     *
     * @public
     * @type {Point[]}
     */
    public points: Point[];

    /**
     * Creates an instance of Spline.
     * @date 1/10/2024 - 2:41:33 PM
     *
     * @constructor
     * @param {...Point[]} points
     */
    constructor(...points: Point[]) {
        this.points = points;
    }

    /**
     * Returns the point on the spline at t
     * @param t (between 0 and 1)
     * @returns
     */
    ft(t: number): Point {
        let points: Point[] = this.points.slice();

        const createBezier = (points: Point[], factor: number): Point[] => {
            return new Array(points.length - 1).fill(null).map((_, i) => {
                const p1 = points[i];
                const p2 = points[i + 1];
                const end = p1.interpolate(p2, factor);
                return end;
            });
        };

        while (points.length > 1) {
            points = createBezier(points, t);
        }

        return points[0];
    }

    generatePoints(count: number): Point[] {
        return new Array(count).fill(null).map((_, i) => {
            return this.ft(i / count);
        });
    }
}

export class CubicSpline implements Spline {
    private xCoefficients: { a: number, b: number, c: number, d: number }[] = [];
    private yCoefficients: { a: number, b: number, c: number, d: number }[] = [];
    private n: number;

    constructor(points: Point2D[]) {
        this.n = points.length - 1;
        this.calculateCoefficients(points);
    }

    private calculateCoefficients(points: Point2D[]): void {
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        
        const h: number[] = [];
        const alpha: number[] = [];
        const l: number[] = [1];
        const mu: number[] = [0];
        const z: number[] = [0];

        for (let i = 1; i <= this.n; i++) {
            h[i] = xs[i] - xs[i - 1];
            alpha[i] = (3 / h[i]) * (ys[i] - ys[i - 1]) - (3 / h[i - 1]) * (ys[i - 1] - ys[i - 2]);
        }

        for (let i = 1; i < this.n; i++) {
            l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
            mu[i] = h[i] / l[i];
            z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
        }

        l[this.n] = 1;
        z[this.n] = 0;

        this.xCoefficients[this.n] = { a: xs[this.n], b: 0, c: 0, d: 0 };
        this.yCoefficients[this.n] = { a: ys[this.n], b: 0, c: 0, d: 0 };

        for (let j = this.n - 1; j >= 0; j--) {
            this.xCoefficients[j] = {
                a: xs[j],
                b: z[j] - mu[j] * this.xCoefficients[j + 1].b,
                c: this.xCoefficients[j + 1].c - h[j] * this.xCoefficients[j + 1].b,
                d: (this.xCoefficients[j + 1].b - this.xCoefficients[j].b) / (3 * h[j])
            };

            this.yCoefficients[j] = {
                a: ys[j],
                b: z[j] - mu[j] * this.yCoefficients[j + 1].b,
                c: this.yCoefficients[j + 1].c - h[j] * this.yCoefficients[j + 1].b,
                d: (this.yCoefficients[j + 1].b - this.yCoefficients[j].b) / (3 * h[j])
            };
        }
    }

    public ft(t: number): Point {
        if (t < 0 || t > 1) {
            throw new Error("Parameter t must be in the range [0, 1].");
        }

        const x = this.interpolate(t, this.xCoefficients);
        const y = this.interpolate(t, this.yCoefficients);

        return new Point(x, y);
    }

    private interpolate(t: number, coefficients: { a: number, b: number, c: number, d: number }[]): number {
        // Find the segment where t falls into
        const segmentIndex = Math.floor(t * this.n);
        const localT = (t - segmentIndex / this.n) * this.n;

        const coeffs = coefficients[segmentIndex];

        return coeffs.a + coeffs.b * localT + coeffs.c * localT * localT + coeffs.d * localT * localT * localT;
    }

    generatePoints(count: number): Point[] {
        return new Array(count).fill(null).map((_, i) => {
            return this.ft(i / count);
        });
    }
}