import { Color } from '../../submodules/colors/color';
import { Iterator } from './app-object';
import { Drawable } from '../canvas/drawable';
import {
    amps,
    autoZone,
    border,
    srcs,
    stages,
    zones,
} from '../../../shared/submodules/tatorscout-calculations/2024-areas';
import {
    Action2024,
    TraceParse2024,
    Zones2024,
} from '../../../shared/submodules/tatorscout-calculations/trace';
import { App, Tick } from './app';
import { Point2D } from '../../../shared/submodules/calculations/src/linear-algebra/point';

/**
 * Builds the app for the 2024 game
 * @date 1/25/2024 - 4:59:26 PM
 */
export const generate2024App = (
    alliance: 'red' | 'blue' | null = null,
): App<Action2024> => {
    const app = new App<Action2024, Zones2024, TraceParse2024>(alliance);

    const isIn = (d: Drawable) =>
        app.currentLocation ? d.isIn(app.currentLocation) : false;

    const colors = {
        red: new Color(255, 0, 0),
        redFade: new Color(255, 0, 0, 0.25),
        blue: new Color(0, 0, 255),
        blueFade: new Color(0, 0, 255, 0.25),
        black: new Color(0, 0, 0),
        blackFade: new Color(0, 0, 0, 0.25),
    };

    app.addArea('blue-stage', stages.blue, colors.blueFade, isIn);

    app.addArea('red-stage', stages.red, colors.redFade, isIn);

    app.addArea('blue-amp', amps.blue, colors.blueFade, isIn);

    app.addArea('red-amp', amps.red, colors.redFade, isIn);

    app.addArea('blue-src', srcs.blue, colors.blueFade, isIn);

    app.addArea('red-src', srcs.red, colors.redFade, isIn);

    app.addArea('blue-zone', zones.blue, colors.blueFade, isIn);

    app.addArea('red-zone', zones.red, colors.redFade, isIn);

    app.addArea('blue-auto', autoZone.blue, colors.blueFade, isIn);

    app.addArea('red-auto', autoZone.red, colors.redFade, isIn);

    app.setBorder(border as Point2D[], colors.blackFade);

    // app.border = new Border(border as [number, number][]);

    // app.border.$properties.doDraw = isIn;
    // app.border.$properties.fill = {
    //     color: Color.fromName('black').setAlpha(0.5).toString('rgba'),
    // }

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

    const I = Iterator<Action2024>;

    app.addGameObject(
        [0.19624217118997914, 0.060542797494780795],
        new I('Blue Amp', 'Placing any note into the blue amp', 'amp', 0),
        blueAmp,
        (i) => i.toString(),
        'blue',
    );

    app.addGameObject(
        [0.7974947807933194, 0.06889352818371608],
        new I('Red Amp', 'Placing any note into the red amp', 'amp'),
        redAmp,
        (i) => i.toString(),
        'red',
    );

    app.addGameObject(
        [0.07828810020876827, 0.3653444676409186],
        new I('Blue Speaker', 'Shot a note into the blue speaker', 'spk'),
        blueSpeaker,
        (i) => i.toString(),
        'blue',
    );

    app.addGameObject(
        [0.9018789144050104, 0.3695198329853862],
        new I('Red Speaker', 'Shot a note into the red speaker', 'spk'),
        redSpeaker,
        (i) => i.toString(),
        'red',
    );

    app.addGameObject(
        [0.8423799582463466, 0.8914405010438413],
        new I(
            'Blue Source',
            'Robot retrieves a note from the blue source',
            'src',
        ),
        blueSource,
        (i) => i.toString(),
        'blue',
    );

    app.addGameObject(
        [0.1524008350730689, 0.8914405010438413],
        new I(
            'Red Source',
            'Robot retrieves a note from the red source',
            'src',
        ),
        redSource,
        (i) => i.toString(),
        'red',
    );

    const drawButton = (z: Zones2024) => (app: App): boolean => {
        const { currentLocation } = app;
        if (!currentLocation) return false;
        const zone = app.areas[z];
        if (!zone) {
            console.warn('Zone not found');
            return false;
        }
        return zone.area.isIn(currentLocation);
    };

    app.buttonCircle
        .addButton(
            'Blue Climb',
            'Click when the robot has successfully pulled themselves up for the last time in the match',
            'clb',
            0,
            drawButton('blue-stage'),
            colors.blue,
            'blue',
        )
        .addButton(
            'Blue Trap',
            'When the robot has successfully placed an item in the trap',
            'trp',
            0,
            drawButton('blue-stage'),
            colors.blue,
            'blue',
        )
        .addButton(
            'Red Climb',
            'Click when the robot has successfully pulled themselves up for the last time in the match',
            'clb',
            0,
            drawButton('red-stage'),
            colors.red,
            'red',
        )
        .addButton(
            'Red Trap',
            'When the robot has successfully placed an item in the trap',
            'trp',
            0,
            drawButton('red-stage'),
            colors.red,
            'red',
        );

    const em = app.clickPoints();
    em.on('point', console.log);

    Object.assign(window, { app });

    return app;
};

export const update2024 = (tick: Tick) => {
    const { app, section } = tick;
    const { currentLocation } = app;

    if (!currentLocation) return;

    if (section === 'auto') {
        const { area: redAuto } = app.areas['red-auto'];
        const { area: blueAuto } = app.areas['blue-auto'];

        // if the robot is not in the auto zone during auto, then they crossed the auto line
        if (!redAuto.isIn(currentLocation) && !blueAuto.isIn(currentLocation)) {
            app.parsed.mobility = true;
        }
    }
};
