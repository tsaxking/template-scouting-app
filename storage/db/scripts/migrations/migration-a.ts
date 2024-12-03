import { Account } from '../../../../server/structure/structs/account';
import { Version } from '../../../../server/utilities/database/versions';

export default new Version('Idk, this does something', [2, 0, 1], async db => {
    Account.Account.createMigration(
        {
            dbVersion: [2, 0, 0],
            schema: {
                username: 'text',
                key: 'text',
                salt: 'text',
                firstName: 'text',
                lastName: 'text',
                email: 'text',
                picture: 'text',
                verified: 'boolean',
                verification: 'text'
            }
        },
        {
            dbVersion: [2, 0, 1],
            schema: {
                username: 'text',
                key: 'text',
                salt: 'text',
                firstName: 'text',
                lastName: 'text',
                email: 'text',
                picture: 'text',
                verified: 'boolean',
                verification: 'text',
                phoneNumber: 'text'
            }
        },
        account => {
            // return account;
            return {
                ...account,
                phoneNumber: ''
            };
        }
    );
});
