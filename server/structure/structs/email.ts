import { DB } from '../../utilities/database';
import { Struct } from './struct';

export namespace Email {
    export const Email = new Struct({
        database: DB,
        name: 'Email',
        structure: {
            type: 'text',
            to: 'text', // string[]
            clicked: 'boolean',
            link: 'text'
        }
    });
}
