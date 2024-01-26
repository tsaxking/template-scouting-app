<script lang="ts">
import { App } from '../../models/app/app';
import Checkboxes from '../components/app/Checkboxes.svelte';
import type { BootstrapColor } from '../../submodules/colors/color';

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
    problemsDriving: {
        value: false,
        color: 'danger',
        comments: true,
        comment: ''
    }
};

const open = active => {
    if (active !== 'Post') return;
    console.log('Post opened');
    app.drawRecap(canvas);

    data.autoMobility.value = app.parsed.mobility;
    data = data;
};

let commentsSections: string[] = [];
$: {
    open(active);
    commentsSections = Object.entries(data)
        .filter(([_, data]) => data.comments && data.value)
        .map(([key]) => key);
}
</script>

<div class="container">
    <div class="container">
        <div class="row d-flex justify-content-center w-100 p-0">
            <Checkboxes bind:data />
        </div>
        {#if commentsSections.length > 0}
            <div class="row">
                <div class="container">
                    #{#each commentsSections as section}
                        <div class="row">
                            <div class="col">
                                <h3>{section}</h3>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col">
                                <textarea
                                    class="form-control"
                                    rows="3"
                                    on:change={e => {
                                        data[section].comment = e.currentTarget.value;
                                        data = data;
                                    }}
                                ></textarea>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
        <div class="row">
            <button
                class="btn btn-success btn-lg w-100"
                on:click="{() =>
                    app.submit({
                        checks: Object.entries(data)
                            .map(([key, value]) => (value ? key : null))
                            .filter(Boolean),
                        comments: {
                            defensive: '',
                            tippy: '',
                            easilyDefended: '',
                            robotDied: '',
                            problemsDriving: ''
                        }
                    })}">Submit Match</button
            >
        </div>
        <div class="row p-0 m-0">
            <canvas bind:this="{canvas}"></canvas>
        </div>
    </div>
</div>
