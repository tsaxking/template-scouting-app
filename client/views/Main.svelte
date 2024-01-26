<script lang="ts">
import { generate2024App } from '../models/app/2024-app';
import NavTabs from './components/bootstrap/NavTabs.svelte';
import Page from './components/main/Page.svelte';
import AppView from './pages/App.svelte';

const app = generate2024App('blue');

let tabs = ['Home', 'App', 'Post', 'Upload'];
let active = 'Home';
const domain = 'http://localhost:3000';
</script>

<main>
    <NavTabs {tabs} {active} on:change="{e => (active = e.detail)}" />

    <Page {active} {domain} title="Home"></Page>
    <Page {active} {domain} title="App"><AppView {app}></AppView></Page>
    <Page {active} {domain} title="Post"></Page>
    <Page {active} {domain} title="Upload"></Page>
</main>
