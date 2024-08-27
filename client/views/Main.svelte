<script lang="ts">
  import { generate2024App } from '../models/app/2024-app';
  import NavTabs from './components/Tabs.svelte';
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
      if (a) {
        app = generate2024App(a);
      // reassign app at restart
      } else {
        app = generate2024App(null);
      }
      app.on('restart', generate);
    });

  generate();

  App.on('select-match', generate);

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
    if (active === '--$App') {
      fullscreen();
    } else {
      exitFullscreen();
    }
  }

  const isFullscreen = () => {
    return (
      document['fullscreenElement'] || // Standard
      document['webkitFullscreenElement'] || // Chrome, Safari and Opera
      document['mozFullScreenElement'] || // Firefox
      document['msFullscreenElement'] // IE/Edge
    );
  };

  let fs: boolean = false;

  let tabs = ['Pre', 'App', 'Post', 'Upload'];
  let active = '--$Pre';
  $: window.localStorage.setItem('page', active); // for use outside of svelte
  const domain = 'http://localhost:3000';

  // if reload, warn
  window.onbeforeunload = function () {
    return 'Are you sure you want to leave? You will lose all your progress on this match!';
  };
</script>

<main>
  <NavTabs
    {active}
    {tabs}
    on:change="{e => (active = '--$' + e.detail)}" />

  <Page
    {active}
    {domain}
    title="--$Pre"
  ><Pre
    {app}
    on:play="{() => (active = '--$App')}" /></Page
  >
  <Page
    {active}
    {domain}
    title="--$App"><AppView {app} /></Page>
  <Page
    {active}
    {domain}
    title="--$Post"
  ><Post
    {active}
    {app}
    on:submit="{async () => {
      active = '--$Pre';
      app = generate2024App(await App.matchData.getAlliance());
    }}"
  /></Page
  >
  <Page
    {active}
    {domain}
    title="--$Upload"><Upload /></Page>

  <!-- <button
        class="btn btn-outline-primary position-fixed top-0 end-0 me-3"
        style="z-index: 10000; margin-top: 2px;"
        on:click="{fullscreen}"
    >
        {fs ? 'Exit Fullscreen' : 'Fullscreen'}
    </button> -->
</main>
