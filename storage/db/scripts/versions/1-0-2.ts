import Account from '../../../../server/structure/accounts.ts';

await Promise.all(new Array(6).fill(0).map((_, i) => {
    return Account.create(
        'Tablet-' + (i + 1),
        '2122',
        'tablet-' + (i + 1) + '@gmail.com',
        'Tator',
        'Scout',
    )
}));

Deno.exit();