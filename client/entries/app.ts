import './../utilities/imports';
import AppView from '../views/App.svelte';

const appView = new AppView({
    target: document.body
});

import { App } from '../models/app/app';

const target = document.getElementById('app') as HTMLElement;
if (!target) throw new Error('Could not find target element');

export const app = new App(target as HTMLDivElement);

app.launch();


window.app = app;