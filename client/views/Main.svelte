<script lang="ts">
import { generate2024App } from '../models/app/2024-app';
import NavTabs from './components/bootstrap/NavTabs.svelte';
import Page from './components/main/Page.svelte';
import AppView from './pages/App.svelte';
import Post from './pages/Post.svelte';
import Pre from './pages/Pre.svelte';
import { App } from '../models/app/app';
import type { EventData } from '../models/app/app';
import Upload from './pages/Upload.svelte';

let event: EventData;

App.getEventData().then(data => {
    if (data.isOk()) {
        event = data.value;
    }
});

let app = generate2024App(null);

// reassign app at restart
app.on('restart', () => app = generate2024App(null));

let tabs = ['Pre', 'App', 'Post', 'Upload'];
let active = 'Pre';
const domain = 'http://localhost:3000';

// if reload, warn
// window.onbeforeunload = function () {
//     return 'Are you sure you want to leave? You will lose all your progress on this match!';
// };
</script>

<main>
    <NavTabs {tabs} {active} on:change="{e => (active = e.detail)}" />

    <Page {active} {domain} title="Pre"><Pre {app}></Pre></Page
    >
    <Page {active} {domain} title="App"><AppView {app}></AppView></Page>
    <Page {active} {domain} title="Post"><Post {app} {active}></Post></Page>
    <Page {active} {domain} title="Upload"><Upload /></Page>
</main>
