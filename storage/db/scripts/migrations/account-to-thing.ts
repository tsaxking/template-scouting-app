import { Version } from '../../../../server/utilities/database/versions';

export default new Version(
    'Migrate global tables to structs',
    [2, 0, 0],
    async db => {}
);
