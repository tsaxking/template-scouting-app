import { backToMain } from '../manager';
import { repeatPrompt, search, confirm } from '../prompt';
import { attemptAsync, Result } from '../../shared/check';
import { addRoleToAccount, removeRoleFromAccount } from './roles';
import { Account } from '../../server/structure/structs/account';
import { selectData, structActions } from './structs';

export const selectAccount = async () => {
    const accounts = (await Account.Account.all(false)).unwrap();

    return selectData(accounts, 'Select an account...');
};

export const verifyAccount = async () => {
    const accounts = (
        await Account.Account.fromProperty('verified', false, false)
    ).unwrap();
    const account = await selectData(
        accounts,
        'Select an account to verify...'
    );
    if (!account) return backToMain('No account selected');

    const isGood = await confirm(
        `Are you sure you want to verify the account ${account.data.username}?`
    );

    if (isGood) {
        (
            await account.update({
                verified: true
            })
        ).unwrap();
        return backToMain(`Account ${account.data.username} verified`);
    }

    return backToMain('Account not verified');
};

export const unverifyAccount = async () => {
    const accounts = (
        await Account.Account.fromProperty('verified', true, false)
    ).unwrap();
    const account = await selectData(
        accounts,
        'Select an account to unverify...'
    );
    if (!account) return backToMain('No account selected');

    const isGood = await confirm(
        `Are you sure you want to unverify the account ${account.data.username}?`
    );

    if (isGood) {
        (
            await account.update({
                verified: false
            })
        ).unwrap();
        return backToMain(`Account ${account.data.username} unverified`);
    }

    return backToMain('Account not unverified');
};

export const removeAccount = async () => {
    const account = await selectAccount();
    if (!account) return backToMain('No account selected');

    const isGood = await confirm(
        `Are you sure you want to remove the account ${account.data.username}?`
    );

    if (isGood) {
        (await account.delete()).unwrap();
        return backToMain(`Account ${account.data.username} removed`);
    }

    return backToMain('Account not removed');
};

export const createAccount = async () => {
    return structActions.new(Account.Account);
};

export const createNewHash = async () => {
    const password = await repeatPrompt('Enter a new password');
    if (!password) return backToMain('No password entered');
    const confirmPassword = await repeatPrompt('Confirm the new password');
    if (!confirmPassword) return backToMain('No password entered');

    if (password !== confirmPassword)
        return backToMain('Passwords do not match');

    const { hash, salt } = Account.newHash(password).unwrap();

    return backToMain(`Hash: ${hash}\nSalt: ${salt}`);
};

export const accounts = [
    {
        icon: '🔍',
        value: verifyAccount,
        description: 'Verify an account'
    },
    {
        icon: '🗑️',
        value: removeAccount,
        description: 'Remove an account'
    },
    {
        icon: '🔑',
        value: createNewHash,
        description: 'Create a new hash'
    },
    {
        icon: '📝',
        value: createAccount,
        description: 'Create an account'
    },
    {
        icon: '🔄',
        value: unverifyAccount,
        description: 'Unverify an account'
    },
    {
        icon: '➕',
        value: addRoleToAccount,
        description: 'Add a role to an account'
    },
    {
        icon: '➖',
        value: removeRoleFromAccount,
        description: 'Remove a role from an account'
    }
];
