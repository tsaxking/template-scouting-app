import './../utilities/imports';

import { App } from '../models/app/app';

const target = document.getElementById('app') as HTMLElement;
if (!target) throw new Error('Could not find target element');

export const app = new App(target);
