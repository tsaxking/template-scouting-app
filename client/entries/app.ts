import './../utilities/imports';
// import AppView from '../views/App.svelte';
import { App } from '../models/app/app';
import { Color } from '../submodules/colors/color';
import { BorderPolygon } from '../models/canvas/border';
import { AppObject, Iterator } from '../models/app/app-object';

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
    [
        [0.27475516866158867, 0.4961915125136017],
        [0.3781284004352557, 0.36670293797606096],
        [0.3895538628944505, 0.383025027203482],
        [0.39227421109902066, 0.6441784548422198],
        [0.3781284004352557, 0.6626768226332971],
        [0.27529923830250275, 0.5321001088139282],
    ],
    new Color(0, 0, 256, 0.25),
    (path) => (app.currentLocation ? path.isIn(app.currentLocation) : false),
);

const redStageArea = app.addArea(
    [
        [0.6066376496191512, 0.3808487486398259],
        [0.6180631120783461, 0.367791077257889],
        [0.720348204570185, 0.49836779107725787],
        [0.7219804134929271, 0.528835690968444],
        [0.6202393906420022, 0.6583242655059848],
        [0.6066376496191512, 0.6420021762785637],
    ],
    new Color(256, 0, 0, 0.25),
    (path) => (app.currentLocation ? path.isIn(app.currentLocation) : false),
);

const blueAmpArea = app.addArea(
    [
        [0.13547334058759522, 0.15451577801958652],
        [0.27747551686615884, 0.15451577801958652],
        [0.27747551686615884, 0.11099020674646355],
        [0.13438520130576714, 0.11099020674646355],
    ],
    new Color(0, 0, 256, 0.25),
    (path) => (app.currentLocation ? path.isIn(app.currentLocation) : false),
);

const redAmpArea = app.addArea(
    [
        [0.7176278563656148, 0.11425462459194777],
        [0.719260065288357, 0.15560391730141457],
        [0.8618063112078346, 0.15669205658324264],
        [0.8618063112078346, 0.10772578890097932],
    ],
    new Color(256, 0, 0, 0.25),
    (path) => (app.currentLocation ? path.isIn(app.currentLocation) : false),
);

const blueSrcArea = app.addArea(
    [
        [0.780739934711643, 0.9140369967355821],
        [0.780739934711643, 0.8618063112078346],
        [0.8601741022850925, 0.7606093579978237],
        [0.8612622415669206, 0.808487486398259],
    ],
    new Color(0, 0, 256, 0.25),
    (path) => (app.currentLocation ? path.isIn(app.currentLocation) : false),
);

const redSrcArea = app.addArea(
    [
        [0.13492927094668117, 0.7595212187159956],
        [0.21545157780195864, 0.8628944504896626],
        [0.21436343852013057, 0.911860718171926],
        [0.13329706202393907, 0.8073993471164309],
    ],
    new Color(256, 0, 0, 0.25),
    (path) => (app.currentLocation ? path.isIn(app.currentLocation) : false),
);

const blueZone = app.addArea(
    [
        [0.3911860718171926, 0.11207834602829161],
        [0.13547334058759522, 0.11534276387377584],
        [0.13492927094668117, 0.808487486398259],
        [0.21490750816104462, 0.9162132752992383],
        [0.3895538628944505, 0.9096844396082698],
    ],
    new Color(0, 0, 256, 0.25),
    (path) => (app.currentLocation ? path.isIn(app.currentLocation) : false),
);

const redZone = app.addArea(
    [
        [0.6055495103373232, 0.10990206746463548],
        [0.8607181719260065, 0.10663764961915125],
        [0.8623503808487486, 0.8073993471164309],
        [0.779651795429815, 0.911860718171926],
        [0.6066376496191512, 0.9064200217627857],
    ],
    new Color(256, 0, 0, 0.25),
    (path) => (app.currentLocation ? path.isIn(app.currentLocation) : false),
);

app.border = new BorderPolygon(
    [
        [0.13438520130576714, 0.11316648531011969],
        [0.8628944504896626, 0.10772578890097932],
        [0.8634385201305768, 0.8106637649619152],
        [0.780739934711643, 0.9162132752992383],
        [0.21545157780195864, 0.9162132752992383],
        [0.13329706202393907, 0.808487486398259],
    ],
    {
        fill: {
            color: Color.fromName('red').setAlpha(0.5).toString('rgba'),
        },
        drawCondition: (b: BorderPolygon) =>
            app.currentLocation ? b.isIn(app.currentLocation) : false,
    },
);

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

window.app = app;
