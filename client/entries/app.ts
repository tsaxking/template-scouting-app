import '../utilities/imports';

import Main from '../views/Main.svelte';

new Main({
    target: document.body,
});

document.body.style.padding = '0px';
document.body.style.margin = '0px';

import { Settings } from '../models/settings';
Object.assign(window, { Settings });
