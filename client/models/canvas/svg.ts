import { Point2D } from '../../../shared/submodules/calculations/src/linear-algebra/point';
import { Drawable } from './canvas';
import { TextProperties } from './shape-properties';

type SVGProperties = {
    text: Partial<TextProperties>;
};

export class SVG implements Drawable<SVG> {
    public readonly img: HTMLImageElement = new Image();
    private ready = false;

    constructor(
        public svg: string, // path to svg
        public center: Point2D,
        public properties?: Partial<SVGProperties>,
    ) {
        this.img.src = svg;

        this.img.onload = () => {
            this.ready = true;

            if (this.properties?.text?.height) {
                this.img.height = this.properties.text.height;
            }

            if (this.properties?.text?.width) {
                this.img.width = this.properties.text.width;
            }
        };
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.ready) return;

        if (this.properties?.text?.color) {
            ctx.fillStyle = this.properties.text.color;
        }

        if (this.properties?.text?.font) {
            console.warn("You can't set the font of an SVG");
        }

        ctx.drawImage(
            this.img,
            this.center[0] * ctx.canvas.width,
            this.center[1] * ctx.canvas.height,
            this.img.width,
            this.img.height,
        );
    }
}
