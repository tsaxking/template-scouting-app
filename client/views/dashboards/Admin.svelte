<script lang="ts">
import Main from '../components/main/Main.svelte';
import Page from '../components/main/Page.svelte';
import { getOpenPage } from '../../utilities/page';
import type { PageGroup } from '../../utilities/general-types';

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
                icon: 'person'
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
</script>

<Main
    title="Team Tators"
    {groups}
    bind:active
    on:openPage="{e => (active = e.detail)}"
    {navItems}
    {accountLinks}
>
    <Page {active} {domain} title="dashboard">\</Page>
</Main>
