<script lang="ts">
import { App } from '../../models/app/app';
import Checkboxes from '../components/app/Checkboxes.svelte';
import type { BootstrapColor } from '../../submodules/colors/color';
import { capitalize, fromCamelCase } from '../../../shared/text';
import { Trace } from '../../../shared/submodules/tatorscout-calculations/trace';
import { confirm, notify } from '../../utilities/notifications';
import { createEventDispatcher } from 'svelte';

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

type Types =
    | 'autoMobility'
    | 'parked'
    | 'playedDefense'
    | 'tippy'
    | 'easilyDefended'
    | 'robotDied'
    | 'problemsDriving'
    | 'groundPicks';

let data: {
    [key in Types]: PostData;
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
    }
};

const open = (active: string) => {
    if (active !== 'Post') return;

    const traceArray = app.pull();
    const secondsNotMoving = Trace.secondsNotMoving(traceArray, false);
    if (secondsNotMoving > 20) {
        // robot likely died, was intermitent, or had problems driving
        data.robotDied.value = true;
    }

    const res = app.getRecap(canvas);
    if (res.isErr()) console.warn(res.error);
    if (res.isOk()) {
        jQuery('#slider').slider({
            range: true,
            min: 0,
            max: res.value.children.length - 1,
            values: [0, res.value.children.length - 1],
            slide: (_, ui) => {
                const [start, end] = ui.values;
                res.value.filter((_, i) => i >= start && i <= end);
            }
        });
        // if the number of shots is larger than the number of picks from the source + 1, then the robot picked off the ground
        // + 1 because the robot starts with a note
        app.parsed.groundPicks =
            Trace.yearInfo[2024].mustGroundPick(traceArray);

        data.autoMobility.value = app.parsed.mobility;
        data.parked.value = app.parsed.parked;
        data.groundPicks.value = app.parsed.groundPicks;
    }
    // reset the view
    data = data;
};

let commentsSections: string[] = [];
$: {
    open(active);
    commentsSections = Object.entries(data)
        .filter(([_, data]) => data.comments && data.value)
        .map(([key]) => key);
}

let generalComment: string = '';
let autoComment: string = '';

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

    app.submit({
        checks: Object.entries(data)
            .map(([key, value]) => (value ? key : null))
            .filter(Boolean),
        comments: {
            defensive: data.playedDefense.comment,
            tippy: data.tippy.comment,
            easilyDefended: data.easilyDefended.comment,
            robotDied: data.robotDied.comment,
            problemsDriving: data.problemsDriving.comment,
            general: generalComment,
            audo: autoComment
        }
    });

    await App.moveMatchIndex(1);
    d('submit');
};
</script>

<div class="container">
    <div class="row d-flex justify-content-center w-100 p-0">
        <Checkboxes bind:data />
    </div>
    {#if commentsSections.length > 0}
        <div class="row">
            <div class="container">
                {#each commentsSections as section, i}
                    <div class="row mb-3">
                        <!-- <div class="form-floating"> -->
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
                    <!-- </div> -->
                {/each}
            </div>
        </div>
    {/if}
    <div class="row mb-3">
        <!-- <div class="form-floating"> -->
        <label for="textarea-general">
            Please leave a comment here on how the robot performed in the match.
            (These are very helpful for analyzing the robot's performance,
            please be detailed)
        </label>
        <textarea
            class="form-control"
            rows="5"
            id="textarea-general"
            bind:value="{generalComment}"
        ></textarea>
        <!-- </div> -->
    </div>
    <div class="row mb-3">
        <!-- <div class="form-floating"> -->
        <label for="textarea-auto">
            Please leave a comment here on how the robot performed in the
            autonomous period. (If it missed shots because notes collided in
            mid-air, etc.)
        </label>
        <textarea
            class="form-control"
            rows="5"
            id="textarea-auto"
            bind:value="{autoComment}"
        ></textarea>
        <!-- </div> -->
    </div>
    <div class="row">
        <button class="btn btn-success btn-lg w-100" on:click="{submit}"
            >Submit Match</button
        >
    </div>
    <div class="row p-0 m-0">
        <canvas bind:this="{canvas}"></canvas>
        <div id="slider" class="mt-1"></div>
    </div>
</div>
