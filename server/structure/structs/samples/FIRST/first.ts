import { Struct } from "../../cache-2";
import { DB } from "../../../../utilities/database";

export namespace FIRST {
    export const Events = new Struct({
        database: DB,
        name: 'Events',
        structure: {
            eventKey: 'text',
            flipX: 'boolean',
            flipY: 'boolean',
        },
        sample: true,
    });

    export const Teams = new Struct({
        database: DB,
        name: 'Teams',
        structure: {
            number: 'integer',
            eventKey: 'text',
            watchPriority: 'integer',
        },
        sample: true,
    });

    export const Matches = new Struct({
        database: DB,
        name: 'Matches',
        structure: {
            eventKey: 'text',
            matchNumber: 'text',
            compLevel: 'text',
        },
        sample: true,
    });

    export const CustomMatches = new Struct({
        database: DB,
        name: 'CustomMatches',
        structure: {
            eventKey: 'text',
            matchNumber: 'text',
            compLevel: 'text',
            red1: 'integer',
            red2: 'integer',
            red3: 'integer',
            red4: 'integer',
            blue1: 'integer',
            blue2: 'integer',
            blue3: 'integer',
            blue4: 'integer',
            name: 'text',
        },
        sample: true,
    });
}