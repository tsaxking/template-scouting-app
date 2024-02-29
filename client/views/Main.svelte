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

let app: App;

const generate = () =>
    App.matchData.getAlliance().then(a => {
        console.log(a);
        if (a) {
            app = generate2024App(a);
            // reassign app at restart
        } else {
            app = generate2024App(null);
        }
        app.on('restart', generate);
    });

App.on('change-group', generate);
App.on('change-match', generate);
// App.on('change-alliance', generate);

const fullscreen = () => {
    try {
        if (isFullscreen()) {
            exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
            fs = true;
        }
    } catch (error) {
        console.warn(error);
    }
};
const exitFullscreen = () => {
    try {
        if (document['exitFullscreen']) {
            document['exitFullscreen']();
        } else if (document['webkitExitFullscreen']) {
            document['webkitExitFullscreen']();
        } else if (document['mozCancelFullScreen']) {
            document['mozCancelFullScreen']();
        } else if (document['msExitFullscreen']) {
            document['msExitFullscreen']();
        }
        fs = false;
    } catch (error) {
        console.warn(error);
    }
};

$: {
    if (active === 'App') {
        fullscreen();
    } else {
        exitFullscreen();
    }
}

const isFullscreen = () => {
    return (
        document['fullscreenElement'] ||
        document['webkitFullscreenElement'] ||
        document['mozFullScreenElement'] ||
        document['msFullscreenElement']
    );
};

let fs: boolean = false;

generate();
let tabs = ['Pre', 'App', 'Post', 'Upload'];
let active = 'Pre';
const domain = 'http://localhost:3000';

// if reload, warn
window.onbeforeunload = function () {
    return 'Are you sure you want to leave? You will lose all your progress on this match!';
};
</script>

<main>
    <NavTabs {tabs} {active} on:change="{e => (active = e.detail)}" />

    <Page {active} {domain} title="Pre"
        ><Pre on:play="{() => (active = 'App')}" {app}></Pre></Page
    >
    <Page {active} {domain} title="App"><AppView {app}></AppView></Page>
    <Page {active} {domain} title="Post"
        ><Post
            {app}
            {active}
            on:submit="{async () => {
                active = 'Pre';
                app = generate2024App(await App.matchData.getAlliance());
            }}"
        ></Post></Page
    >
    <Page {active} {domain} title="Upload"><Upload /></Page>

    <button
        class="btn btn-outline-primary position-fixed top-0 end-0 me-3"
        style="z-index: 10000; margin-top: 2px;"
        on:click="{fullscreen}"
    >
        {fs ? 'Exit Fullscreen' : 'Fullscreen'}
    </button>
</main>
