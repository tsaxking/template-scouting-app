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
import { Icon } from '../canvas/material-icons';
import { SVG } from '../canvas/svg';

/**
 * Builds the app for the 2024 game
 * @date 1/25/2024 - 4:59:26 PM
 */
export const generate2024App = (
): App<Action2024> => {
    const alliance = App.matchData.alliance ?? null;

    const icons: {
        [key in Action2024]: Icon | SVG;
    } = {
        spk: new Icon('speaker'),
        amp: new Icon('campaign'),
        src: new Icon('back_hand'),
        clb: new Icon('dry_cleaning'),
        trp: new Icon('place_item'),
    };

    const app = new App<Action2024, Zones2024, TraceParse2024>(
        2024,
        alliance,
        icons,
    );

    const isIn = (d: Drawable) =>
        app.currentLocation ? d.isIn(app.currentLocation) : false;

    // const colors = {
    //     red: new Color(255, 0, 0),
    //     redFade: new Color(255, 0, 0, 0.25),
    //     blue: new Color(0, 0, 255),
    //     blueFade: new Color(0, 0, 255, 0.25),
    //     black: new Color(0, 0, 0),
    //     blackFade: new Color(0, 0, 0, 0.25),
    // };

    const colors = {
        red: Color.fromBootstrap('red'),
        blue: Color.fromBootstrap('blue'),
        redFade: Color.fromBootstrap('red').setAlpha(0.1),
        blueFade: Color.fromBootstrap('blue').setAlpha(0.1),
        black: Color.fromBootstrap('dark'),
        blackFade: Color.fromBootstrap('dark').setAlpha(0.5),
    };

    app.addArea('blue-stage', stages.blue, colors.blueFade, isIn);
    app.addArea('blue-amp', amps.blue, colors.blueFade, isIn);
    app.addArea('blue-src', srcs.blue, colors.blueFade, isIn);
    app.addArea('blue-zone', zones.blue, colors.blueFade, isIn);
    app.addArea('blue-auto', autoZone.blue, colors.blueFade, isIn);

    app.addArea('red-auto', autoZone.red, colors.redFade, isIn);
    app.addArea('red-zone', zones.red, colors.redFade, isIn);
    app.addArea('red-src', srcs.red, colors.redFade, isIn);
    app.addArea('red-amp', amps.red, colors.redFade, isIn);
    app.addArea('red-stage', stages.red, colors.redFade, isIn);

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

    const blueButtonClasses = ['btn', 'btn-primary', 'btn-lg'];
    const redButtonClasses = ['btn', 'btn-danger', 'btn-lg'];

    blueAmp.classList.add(...blueButtonClasses);
    blueAmp.innerHTML = `<i class="material-icons">campaign</i>`;
    redAmp.classList.add(...redButtonClasses);
    redAmp.innerHTML = `<i class="material-icons">campaign</i>`;
    blueSpeaker.classList.add(...blueButtonClasses);
    blueSpeaker.innerHTML = `<i class="material-icons">speaker</i>`;
    redSpeaker.classList.add(...redButtonClasses);
    redSpeaker.innerHTML = `<i class="material-icons">speaker</i>`;
    blueSource.classList.add(...blueButtonClasses);
    blueSource.innerHTML = `<i class="material-icons">back_hand</i>`;
    redSource.classList.add(...redButtonClasses);
    redSource.innerHTML = `<i class="material-icons">back_hand</i>`;

    const I = Iterator<Action2024>;

    app.addAppObject(
        [0.16976556184316896, 0.021018593371059015],
        new I('Blue Amp', 'Placing any note into the blue amp', 'amp', 0),
        blueAmp,
        (i) => i.toString(),
        'blue',
    );

    app.addAppObject(
        [0.8274050121261115, 0.018593371059013743],
        new I('Red Amp', 'Placing any note into the red amp', 'amp'),
        redAmp,
        (i) => i.toString(),
        'red',
    );

    app.addAppObject(
        [0.06345998383185125, 0.33063864187550523],
        new I('Blue Speaker', 'Shot a note into the blue speaker', 'spk'),
        blueSpeaker,
        (i) => i.toString(),
        'blue',
    );

    app.addAppObject(
        [0.9365400161681487, 0.32740501212611156],
        new I('Red Speaker', 'Shot a note into the red speaker', 'spk'),
        redSpeaker,
        (i) => i.toString(),
        'red',
    );

    app.addAppObject(
        [0.8823767178658044, 0.9062247372675829],
        new I(
            'Blue Source',
            'Robot retrieves a note from the blue source',
            'src',
        ),
        blueSource,
        (i) => i.toString(),
        'blue',
    );

    app.addAppObject(
        [0.11156022635408246, 0.9086499595796281],
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
            'Blue Trap',
            'When the robot has successfully placed an item in the trap',
            'trp',
            0,
            drawButton('blue-stage'),
            colors.blue,
            'blue',
            icons.trp,
        )
        .addButton(
            'Blue Climb',
            'Click when the robot has successfully pulled themselves up for the last time in the match',
            'clb',
            0,
            drawButton('blue-stage'),
            colors.blue,
            'blue',
            icons.clb,
        )
        .addButton(
            'Red Trap',
            'When the robot has successfully placed an item in the trap',
            'trp',
            0,
            drawButton('red-stage'),
            colors.red,
            'red',
            icons.trp,
        )
        .addButton(
            'Red Climb',
            'Click when the robot has successfully pulled themselves up for the last time in the match',
            'clb',
            0,
            drawButton('red-stage'),
            colors.red,
            'red',
            icons.clb,
        );

    const em = app.clickPoints();
    em.on('point', console.log);

    Object.assign(window, { app });

    app.on('action', (a) => {
        let data = 'help';
        const type = 'material-icons';
        switch (a.action) {
            case 'Red Amp':
            case 'Blue Amp':
                data = 'campaign';
                break;
            case 'Red Speaker':
            case 'Blue Speaker':
                data = 'speaker';
                break;
            case 'Red Source':
            case 'Blue Source':
                data = 'back_hand';
                break;
            case 'Red Trap':
            case 'Blue Trap':
                data = 'place_item';
                break;
            case 'Red Climb':
            case 'Blue Climb':
                data = 'dry_cleaning';
                break;
        }

        App.actionAnimation(type, data, a.alliance, a.point);
    });

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
