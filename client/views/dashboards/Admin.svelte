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
                    icon: 'person',
                    iconType: 'material'
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
    {accountLinks}
    {groups}
    {navItems}
    title="Team Tators"
    bind:active
    on:openPage="{e => (active = e.detail)}"
>
    <Page
        {active}
        {domain}
        title="dashboard">\</Page>
</Main>
