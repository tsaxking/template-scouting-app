import Account from '../../../../server/structure/accounts.ts';

const accounts = new Array(6).fill(0).map((_, i) => i);

for (const a of accounts) {
    Account.create(
        'Tablet ' + a,
        '2122',
        'no@email.com',
        'Tator',
        'Scout'
    );
}