<script lang="ts">
import { onMount } from 'svelte';
import { App } from '../../models/app/app';
import { ServerRequest } from '../../utilities/requests';

let name: string = App.scoutName;
let accounts: string[] = [];

const fns = {
    save: (a: string) => {
        App.scoutName = a;
    },
    getAccounts: async () => {
        const res = await ServerRequest.post<string[]>('/get-accounts');
        if (res.isOk()) {
            accounts = res.value;
        }
    }
};

onMount(() => {
    fns.getAccounts();
});

$: fns.save(name);
</script>

<div class="form-floating p-0">
    <input
        type="text"
        class="form-control"
        id="scout-name-input"
        list="accounts"
        bind:value="{name}"
    />
    <label for="scout-name-input">Scout Name</label>
    <datalist id="accounts">
        {#each accounts as account}
            <option value="{account}" />
        {/each}
    </datalist>
</div>
