import { Cache } from "./cache";
import { Tablet } from "./tablet";


export class AppState extends Cache {
    static tablets: Tablet[] = [];


    constructor() {
        super();
        throw new Error('Illegal constructor call');
    }
}