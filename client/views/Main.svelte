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

const fullscreen = (data: 'open' | 'close' | 'toggle') => {
    if (!main) return;
    if (data === 'open') {
        main.requestFullscreen();
    } else if (data === 'close') {
        document.exitFullscreen();
    } else {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            main.requestFullscreen();
        }
    }
};

App.getEventData().then(data => {
    if (data.isOk()) {
        event = data.value;
    }
});

let app = generate2024App(null);

// reassign app at restart
app.on('restart', async () => app = generate2024App(
    await App.matchData.getAlliance()
));

let tabs = ['Pre', 'App', 'Post', 'Upload'];
let active = 'Pre';
const domain = 'http://localhost:3000';

let main: HTMLElement;

// if reload, warn
window.onbeforeunload = function () {
    return 'Are you sure you want to leave? You will lose all your progress on this match!';
};

$: {
    switch (active) {
        case 'App':
            fullscreen('open');
            break;
        default:
            fullscreen('close');
            break;
    }
}
</script>

<main bind:this={main}>
    <NavTabs {tabs} {active} on:change="{e => (active = e.detail)}" />

    <button class="btn btn-outline-primary position-fixed top-0 end-0"
        on:click={() => fullscreen('toggle')}
    >
        Fullscreen
    </button>

    <Page {active} {domain} title="Pre"><Pre on:play={() => active = 'App'} {app}></Pre></Page
    >
    <Page {active} {domain} title="App"><AppView {app}></AppView></Page>
    <Page {active} {domain} title="Post"><Post {app} {active} on:submit={() => active = 'Pre'}></Post></Page>
    <Page {active} {domain} title="Upload"><Upload /></Page>
</main>
