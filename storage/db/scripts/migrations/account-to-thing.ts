import { Version } from '../../../../server/utilities/database/versions';

export default new Version(
    'Change account structure to not use usernames at all, use age instead',
    'Account',
    1,
    0,
    1,
    async db => {}
);
