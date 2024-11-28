<script lang="ts">
    import { Accounts } from '../../../models/account-new';
    import TableAccountRow from './TableAccountRow.svelte';

    const allStore = Accounts.Account.all(true);

    const all = $allStore;

    let table: HTMLTableElement;
</script>

<table class="table" bind:this="{table}">
    <thead>
        <tr>
            <th>Username</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Picture</th>
            <th>Universes</th>
            <th>Verified</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody>
        {#each all as account (account.id)}
            <TableAccountRow {account} />
        {/each}
    </tbody>
</table>
