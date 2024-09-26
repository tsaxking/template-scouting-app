import '../utilities/imports';
import { v4 as uuid } from 'uuid';

import Main from '../views/Main.svelte';

new Main({
    target: document.body
});

document.body.style.padding = '0px';
document.body.style.margin = '0px';

import { Settings } from '../models/settings';
import { ServerRequest } from '../utilities/requests';
import { socket } from '../utilities/socket';
import { App } from '../models/app/app';
socket.onInit = () => {
    const id = window.localStorage.getItem('tablet-id') || uuid();
    window.localStorage.setItem('tablet-id', id);
    ServerRequest.metadata.set('tablet-id', id);
    const init = async () => {
        await ServerRequest.post('/api/tablet/init');

        App.updateState();
    };
    socket.on('connect', init);
    init();
};
Object.assign(window, { Settings });

window.addEventListener('beforeunload', () => {
    ServerRequest.post('/api/tablet/disconnect');
});
