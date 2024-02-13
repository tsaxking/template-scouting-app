import '../utilities/imports';

import Main from '../views/Main.svelte';

new Main({
    target: document.body,
});

import { Settings } from '../models/settings';
Object.assign(window, { Settings });
