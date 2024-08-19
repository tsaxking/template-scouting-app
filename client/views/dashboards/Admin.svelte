<script lang="ts">
import Main from '../components/main/Main.svelte';
import Page from '../components/main/Page.svelte';
import { getOpenPage } from '../../utilities/page';
import type { PageGroup } from '../../utilities/general-types';
import Dashboard from '../pages/Dashboard.svelte';
import Accounts from '../pages/Accounts.svelte';
import Roles from '../pages/Roles.svelte';

const groups: PageGroup[] = [
    {
        name: 'Home',
        pages: [
            {
                name: 'dashboard',
                icon: 'home',
                iconType: 'material'
            },
            {
                name: 'account',
                icon: 'person',
                iconType: 'material',
            }
        ]
    }
];

let active: string = getOpenPage();
const domain = '';

const navItems: string[] = [];

const accountLinks: string[] = [
    // 'account',
    // 'contact',
    // null
];

let loading = false;
</script>

<Main
    title="Team Tators"
    {groups}
    bind:active
    on:openPage="{e => (active = e.detail)}"
    {navItems}
    {accountLinks}
>
    <Page {active} {domain} bind:loading title="dashboard"
        ><Dashboard></Dashboard></Page
    >
    <Page {active} {domain} bind:loading title="accounts"
        ><Accounts></Accounts></Page
    >
    <Page {active} {domain} bind:loading title="roles"><Roles></Roles></Page>
</Main>
