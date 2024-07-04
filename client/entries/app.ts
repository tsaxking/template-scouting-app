import '../utilities/imports';

import Main from '../views/Main.svelte';

new Main({
    target: document.body
});

document.body.style.padding = '0px';
document.body.style.margin = '0px';

import { Settings } from '../models/settings';
import { ServerRequest } from '../utilities/requests';
import { socket } from '../utilities/socket';
Object.assign(window, { Settings });

// initialize server side tablet state
const init = () => ServerRequest.post('/api/tablet/init');
socket.on('connect', init);
