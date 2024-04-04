<script lang="ts">
import { App } from '../../models/app/app';
import Checkboxes from '../components/app/Checkboxes.svelte';
import type { BootstrapColor } from '../../submodules/colors/color';
import { capitalize, fromCamelCase } from '../../../shared/text';
import { Trace } from '../../../shared/submodules/tatorscout-calculations/trace';
import { choose, confirm, notify } from '../../utilities/notifications';
import { createEventDispatcher } from 'svelte';
import { Canvas } from '../../models/canvas/canvas';
import Summary from '../components/Summary.svelte';
import { Modal } from '../../utilities/modals';
import AutoCommenter from '../components/AutoCommenter.svelte';

const d = createEventDispatcher();

export let app: App;
export let active: string;
let canvas: HTMLCanvasElement;

type PostData = {
    value: boolean;
    color: BootstrapColor;
    comments: boolean;
    comment: string;
};

let data: {
    [key: string]: PostData;
} = {
    autoMobility: {
        value: false,
        color: 'success',
        comments: false,
        comment: ''
    },
    parked: {
        value: false,
        color: 'success',
        comments: false,
        comment: ''
    },
    playedDefense: {
        value: false,
        color: 'primary',
        comments: true,
        comment: ''
    },
    tippy: {
        value: false,
        color: 'warning',
        comments: true,
        comment: ''
    },
    easilyDefended: {
        value: false,
        color: 'warning',
        comments: true,
        comment: ''
    },
    robotDied: {
        value: false,
        color: 'danger',
        comments: true,
        comment: ''
    },
    slow: {
        value: false,
        color: 'warning',
        comments: true,
        comment: ''
    },
    problemsDriving: {
        value: false,
        color: 'danger',
        comments: true,
        comment: ''
    },
    groundPicks: {
        value: false,
        color: 'info',
        comments: true,
        comment: ''
    },
    penalized: {
        value: false,
        color: 'danger',
        comments: true,
        comment: ''
    },
    spectator: {
        value: false,
        color: 'danger',
        comments: true,
        comment: ''
    }
};

let c: Canvas;
let stop = () => {};

const open = async (active: string) => {
    if (active !== 'Post') return;
    stop();

    for (const key in data) {
        data[key].value = false;
        data[key].comment = '';
    }

    const traceArray = app.pull();

    const averageVelocity = Trace.velocity.average(traceArray);
    if (averageVelocity < 5) {
        data.slow.value = true;
    }

    if (!c) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return console.error('Could not get canvas context');
        c = new Canvas(ctx);
    }
    stop = c.animate();

    const res = await app.getRecap(c);
    if (res.isErr()) console.warn(res.error);
    if (res.isOk()) {
        const container = res.value;
        jQuery('#slider').slider({
            range: true,
            min: 0,
            max: container.children.length - 1,
            values: [0, container.children.length - 1],
            slide: (_, ui) => {
                const [start, end] = ui.values as [number, number];
                container.filter((_, i) => i >= start && i <= end);
            }
        });
    }

    // if the number of shots is larger than the number of picks from the source + 1, then the robot picked off the ground
    // + 1 because the robot starts with a note
    app.parsed.groundPicks = Trace.yearInfo[2024].mustGroundPick(traceArray);

    data.autoMobility.value = !!app.parsed.mobility;
    data.parked.value = !!app.parsed.parked;
    data.groundPicks.value = app.parsed.groundPicks;

    // reset the view
    data = data;
};

let commentsSections: string[] = [];
$: open(active);

$: commentsSections = Object.entries(data)
    .filter(([_, data]) => data.comments && data.value)
    .map(([key]) => key);

let teleopComment: string = '';
let autoComment: string = '';
let endComment: string = '';

let selectedTeleop: string[] = [];
let selectedAuto: string[] = [];
let selectedEnd: string[] = [];

const setComment = (type: 'auto' | 'tele' | 'end', comments: string[]) => {
    switch (type) {
        case 'auto':
            autoComment = comments.join('\n');
            break;
        case 'tele':
            teleopComment = comments.join('\n');
            break;
        case 'end':
            endComment = comments.join('\n');
            break;
    }
};

$: setComment('auto', selectedAuto);
$: setComment('tele', selectedTeleop);
$: setComment('end', selectedEnd);

const submit = async () => {
    if (
        !data.groundPicks.value &&
        Trace.yearInfo[2024].mustGroundPick(app.pull())
    ) {
        const doSubmit = await confirm(
            'You stated that the robot did not pick off the ground, but the have robot must pick off the ground because you said it shot more than it retrieved from the source. Are you sure you want to submit?'
        );
        if (!doSubmit)
            return notify(
                {
                    title: 'App',
                    message: 'You did not submit the match',
                    color: 'info',
                    status: 'Submission Cancelled'
                },
                'alert'
            );
    }

    await app.submit({
        checks: Object.entries(data)
            .map(([key, value]) => (value.value ? key : null))
            .filter(Boolean),
        comments: {
            ...() => {
                let comments = {};
                for (const [key, value] of Object.entries(data)) {
                    if (value.value && value.comments) {
                        comments = {
                            ...data,
                            [key]: value.comment
                        };
                    }
                }
                return comments;
            },
            general: teleopComment,
            auto: autoComment,
            endgame: endComment
        }
    });

    await App.matchData.next();
    d('submit');

    for (const key in data) {
        data[key].value = false;
        data[key].comment = '';
    }

    // these will reset the comments
    selectedAuto = [];
    selectedTeleop = [];
    selectedEnd = [];
};

const buildComment = (type: 'auto' | 'tele' | 'end') => {
    const modal = new Modal();
    modal.setTitle(`Build ${capitalize(type)} Comment`);
    const commenter = new AutoCommenter({
        target: modal.target.querySelector('.modal-body') as HTMLElement,
        props: {
            type,
            year: app.year as 2024,
            selected: (() => {
                switch (type) {
                    case 'auto':
                        return selectedAuto;
                    case 'tele':
                        return selectedTeleop;
                    case 'end':
                        return selectedEnd;
                }
            })() as string[]
        }
    });

    let selected: string[] = [];
    commenter.$on('comments', (e: CustomEvent<string[]>) => {
        console.log('Comments', e.detail);
        selected = e.detail;
    });

    const submit = document.createElement('button');
    submit.classList.add('btn', 'btn-success');
    submit.textContent = 'Submit';
    submit.onclick = () => {
        console.log('Selected', selected);
        switch (type) {
            case 'auto':
                selectedAuto = selected;
                break;
            case 'tele':
                selectedTeleop = selected;
                break;
            case 'end':
                selectedEnd = selected;
                break;
        }
        modal.hide();
    };
    modal.addButton(submit);

    modal.show();
};
</script>

<div class="container mb-3">
    <div class="row d-flex justify-content-center w-100 p-0 mb-3">
        <Checkboxes
            bind:data
            on:change="{e => {
                console.log('Change', e.detail);
                const { key, value } = e.detail;
                data[key].value = value;
                data = data;
            }}"
        />
    </div>
    {#if commentsSections.length > 0}
        <div class="row mb-3">
            <div class="container">
                {#each commentsSections as section, i}
                    <div class="row mb-3">
                        <label for="textarea-{i}">
                            Please tell us why you checked "{capitalize(
                                fromCamelCase(section)
                            )}" (you don't have to be very detailed, but it's
                            helpful to understand the context of why you checked
                            it)
                        </label>
                        <textarea
                            class="form-control"
                            rows="3"
                            id="textarea-{i}"
                            bind:value="{data[section].comment}"
                        ></textarea>
                    </div>
                    <hr />
                {/each}
            </div>
        </div>
    {/if}

    <div class="row mb-1">
        <div class="col-8">
            <label for="textarea-auto">
                Please leave a comment here on how the robot performed in the
                autonomous period. (If it missed shots because notes collided in
                mid-air, etc.)
            </label>
        </div>
        <div class="col-4">
            <button
                class="btn btn-primary w-100"
                on:click="{() => buildComment('auto')}"
            >
                Build
            </button>
        </div>
        <div class="col-12 mt-1">
            <textarea
                class="form-control"
                rows="5"
                id="textarea-auto"
                bind:value="{autoComment}"
            ></textarea>
        </div>
    </div>

    <hr />

    <div class="row mb-3">
        <div class="col-8">
            <label for="textarea-general">
                Please leave a comment here on how the robot performed in the
                teleop period. (These are very helpful for analyzing the robot's
                performance, please be detailed)
            </label>
        </div>
        <div class="col-4">
            <button
                class="btn btn-primary w-100"
                on:click="{() => buildComment('tele')}"
            >
                Build
            </button>
        </div>
        <div class="col-12 mt-1">
            <textarea
                class="form-control"
                rows="5"
                id="textarea-general"
                bind:value="{teleopComment}"
            ></textarea>
        </div>
    </div>

    <hr />

    <div class="row mb-3">
        <div class="col-8">
            <label for="textarea-end">
                Please leave a comment here on how the robot performed in the
                endgame period. (If the robot climbed, how did it do? If it
                didn't, why not?)
            </label>
        </div>
        <div class="col-4">
            <button
                class="btn btn-primary w-100"
                on:click="{() => buildComment('end')}"
            >
                Build
            </button>
        </div>
        <div class="col-12 mt-1">
            <textarea
                class="form-control"
                rows="5"
                id="textarea-end"
                bind:value="{endComment}"
            ></textarea>
        </div>
    </div>

    <div class="row mb-3">
        <div class="btn-group">
            <button class="btn btn-success btn-lg" on:click="{() => submit()}">
                Submit Match
            </button>
            <button
                class="btn btn-danger btn-lg"
                on:click="{() =>
                    choose(
                        'Are you sure you want to delete this match?',
                        'Yes, delete this match',
                        "No, don't delete this match"
                    ).then(res => {
                        if (res?.toLowerCase().includes('yes')) {
                            app.destroy();
                        }
                    })}"
            >
                Delete match (Scouted wrong team/match)
            </button>
        </div>
    </div>
    <div class="row mb-3">
        <Summary {app} />
    </div>
    <div class="row p-0 m-0">
        <canvas bind:this="{canvas}"></canvas>
        <div id="slider" class="mt-1"></div>
    </div>
</div>
