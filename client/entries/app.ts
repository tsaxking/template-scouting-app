import './../utilities/imports';
// import AppView from '../views/App.svelte';
import { App } from '../models/app/app';
import { Color } from '../submodules/colors/color';
import { BorderPolygon } from '../models/canvas/border';
import { Iterator } from '../models/app/app-object';
import {
    amps,
    autoZone,
    border,
    srcs,
    stages,
    zones,
} from '../../shared/submodules/tatorscout-calculations/2024-areas';

// const appView = new AppView({
//     target: document.body,
// });

document.body.id = 'app'; // just for speeding up build in development

const target = document.getElementById('app') as HTMLElement;
if (!target) throw new Error('Could not find target element');

export const app = new App<'clb' | 'spk' | 'amp' | 'src' | 'trp'>(
    target as HTMLDivElement,
);

const blueStageArea = app.addArea(
    stages.blue,
    new Color(0, 0, 256, 0.25),
    (path) => (app.currentLocation ? path.isIn(app.currentLocation) : false),
);

const redStageArea = app.addArea(
    stages.red,
    new Color(256, 0, 0, 0.25),
    (path) => (app.currentLocation ? path.isIn(app.currentLocation) : false),
);

const blueAmpArea = app.addArea(
    amps.blue,
    new Color(0, 0, 256, 0.25),
    (path) => app.currentLocation ? path.isIn(app.currentLocation) : false,
);

const redAmpArea = app.addArea(
    amps.red,
    new Color(256, 0, 0, 0.25),
    (path) => app.currentLocation ? path.isIn(app.currentLocation) : false,
);

const blueSrcArea = app.addArea(
    srcs.blue,
    new Color(0, 0, 256, 0.25),
    (path) => app.currentLocation ? path.isIn(app.currentLocation) : false,
);

const redSrcArea = app.addArea(
    srcs.red,
    new Color(256, 0, 0, 0.25),
    (path) => app.currentLocation ? path.isIn(app.currentLocation) : false,
);

const blueZone = app.addArea(
    zones.blue,
    new Color(0, 0, 256, 0.25),
    (path) => app.currentLocation ? path.isIn(app.currentLocation) : false,
);

const redZone = app.addArea(
    zones.red,
    new Color(256, 0, 0, 0.25),
    (path) => app.currentLocation ? path.isIn(app.currentLocation) : false,
);

app.border = new BorderPolygon(border as [number, number][], {
    fill: {
        color: Color.fromName('red').setAlpha(0.5).toString('rgba'),
    },
    drawCondition: (b: BorderPolygon) =>
        app.currentLocation ? b.isIn(app.currentLocation) : false,
});

// gameObject buttons
const blueAmp = document.createElement('button');
const redAmp = document.createElement('button');
const blueSpeaker = document.createElement('button');
const redSpeaker = document.createElement('button');
const blueSource = document.createElement('button');
const redSource = document.createElement('button');

const blueButtonClasses = ['btn', 'btn-primary'];
const redButtonClasses = ['btn', 'btn-danger'];

blueAmp.classList.add(...blueButtonClasses);
redAmp.classList.add(...redButtonClasses);
blueSpeaker.classList.add(...blueButtonClasses);
redSpeaker.classList.add(...redButtonClasses);
blueSource.classList.add(...blueButtonClasses);
redSource.classList.add(...redButtonClasses);

app.addGameObject(
    [0.19624217118997914, 0.060542797494780795],
    new Iterator('Blue Amp', 'Placing any note into the blue amp', 0),
    blueAmp,
);

app.addGameObject(
    [0.7974947807933194, 0.06889352818371608],
    new Iterator('Red Amp', 'Placing any note into the red amp', 0),
    redAmp,
);

app.addGameObject(
    [0.07828810020876827, 0.3653444676409186],
    new Iterator('Blue Speaker', 'Shot a note into the blue speaker', 0),
    blueSpeaker,
);

app.addGameObject(
    [0.9018789144050104, 0.3695198329853862],
    new Iterator('Red Speaker', 'Shot a note into the red speaker', 0),
    redSpeaker,
);

app.addGameObject(
    [0.8423799582463466, 0.8914405010438413],
    new Iterator(
        'Blue Source',
        'Robot retrieves a note from the blue source',
        0,
    ),
    blueSource,
);

app.addGameObject(
    [0.1524008350730689, 0.8914405010438413],
    new Iterator('Red Source', 'Robot retrieves a note from the red source', 0),
    redSource,
);

app.buttonCircle
    .addButton(
        'Blue Climb',
        'Click when the robot has successfully pulled themselves up for the last time in the match',
        'clb',
        0,
        (app: App) => true,
        // app.currentLocation
        //     ? blueStageArea.isIn(app.currentLocation)
        //     : false,
        // 'primary'
        Color.fromName('blue'),
    )
    .addButton(
        'Red Climb',
        'Click when the robot has successfully pulled themselves up for the last time in the match',
        'clb',
        0,
        (app: App) => true,
        // app.currentLocation
        //     ? redStageArea.isIn(app.currentLocation)
        //     : false,
        // 'danger'
        Color.fromName('red'),
    )
    .addButton(
        'Blue Trap',
        'When the robot has successfully placed an item in the trap',
        'clb',
        0,
        (app: App) => true,
        // app.currentLocation
        //     ? blueStageArea.isIn(app.currentLocation)
        //     : false,
        // 'primary'
        Color.fromName('blue'),
    )
    .addButton(
        'Red Trap',
        'When the robot has successfully placed an item in the trap',
        'trp',
        0,
        (app: App) => true,
        // app.currentLocation
        //     ? redStageArea.isIn(app.currentLocation)
        //     : false,
        // 'danger'
        Color.fromName('red'),
    );

app.launch();
const em = app.clickPoints();
em.on('point', console.log);

// window.app = app gives you a type error
Object.defineProperty(window, 'app', app);
