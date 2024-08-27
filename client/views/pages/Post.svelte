<script lang="ts">
  import { App } from '../../models/app/app';
  import type { BootstrapColor } from '../../submodules/colors/color';
  import { capitalize, fromCamelCase } from '../../../shared/text';
  import { Trace } from '../../../shared/submodules/tatorscout-calculations/trace';
  import { choose, confirm, notify } from '../../utilities/notifications';
  import { createEventDispatcher } from 'svelte';
  import { Canvas } from '../../models/canvas/canvas';
  import Summary from '../components/Summary.svelte';
  import { Modal } from '../../utilities/modals';
  import AutoCommenter from '../components/AutoCommenter.svelte';
  import type { PostDataMap } from '../../utilities/general-types';
  import ChecksRow from '../components/app/ChecksRow.svelte';

  const d = createEventDispatcher();

  export let app: App;
  export let active: string;
  let canvas: HTMLCanvasElement;

  let success: PostDataMap = {
    autoMobility: {
      value: false,
      comments: false,
      comment: ''
    },
    parked: {
      value: false,
      comments: false,
      comment: ''
    }
  };

  let primary: PostDataMap = {
    playedDefense: {
      value: false,
      comments: true,
      comment: ''
    },
    groundPicks: {
      value: false,
      comments: true,
      comment: ''
    },
    lobbedNotes: {
      value: false,
      comments: true,
      comment: ''
    }
  };

  let warning: PostDataMap = {
    tippy: {
      value: false,
      comments: true,
      comment: ''
    },
    easilyDefended: {
      value: false,
      comments: true,
      comment: ''
    },
    slow: {
      value: false,
      comments: true,
      comment: ''
    }
  };

  let danger: PostDataMap = {
    robotDied: {
      value: false,
      comments: true,
      comment: ''
    },
    problemsDriving: {
      value: false,
      comments: true,
      comment: ''
    },
    penalized: {
      value: false,
      comments: true,
      comment: ''
    },
    spectator: {
      value: false,
      comments: true,
      comment: ''
    }
  };

  // this does not need to use $ because all dependencies are kept.
  let all: PostDataMap = {
    ...success,
    ...primary,
    ...warning,
    ...danger
  };

  let c: Canvas;
  let stop = () => {};

  const setCheckView = () => {
    success = success;
    primary = primary;
    warning = warning;
    danger = danger;
  };

  const resetChecks = () => {
    for (const key in all) {
      all[key].value = false;
      all[key].comment = '';
    }

    setCheckView();
  };

  const open = async (active: string) => {
    if (active !== 'Post') return;
    stop();

    resetChecks();

    const traceArray = app.pull();

    const averageVelocity = Trace.velocity.average(traceArray);
    if (averageVelocity < 5) {
      warning.slow.value = true;
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

    success.autoMobility.value = !!app.parsed.mobility;
    success.parked.value = !!app.parsed.parked;
    primary.groundPicks.value = app.parsed.groundPicks;
  };

  let commentsSections: string[] = [];
  $: open(active);

  $: commentsSections = Object.entries({
    ...success,
    ...primary,
    ...warning,
    ...danger
  })
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
      // TODO: make this year by year based
      !success.groundPicks.value &&
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
      checks: Object.entries({
        ...success,
        ...primary,
        ...warning,
        ...danger
      })
        .map(([key, value]) => (value.value ? key : null))
        .filter(Boolean),
      comments: {
        ...Object.entries({
          ...success,
          ...primary,
          ...warning,
          ...danger
        }).reduce(
          (acc, [key, value]) => {
            if (value.value && value.comment.length > 0) {
              acc[key] = value.comment;
            }
            return acc;
          },
          {} as { [key: string]: string }
        ),
        general: teleopComment,
        auto: autoComment,
        endgame: endComment
      }
    });

    await App.matchData.next();
    d('submit');

    resetChecks();

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
  <ChecksRow
    name="Info"
    color="primary"
    bind:checks="{primary}" />
  <ChecksRow
    name="Good"
    color="success"
    bind:checks="{success}" />
  <ChecksRow
    name="Bad"
    color="warning"
    bind:checks="{warning}" />
  <ChecksRow
    name="Ugly"
    color="danger"
    bind:checks="{danger}" />
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
              id="textarea-{i}"
              class="form-control"
              rows="3"
              on:input="{event => {
                all[section].comment =
                  event.currentTarget.value;
                setCheckView();
              }}"
            />
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
        id="textarea-auto"
        class="form-control"
        rows="5"
        bind:value="{autoComment}"
      />
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
        id="textarea-general"
        class="form-control"
        rows="5"
        bind:value="{teleopComment}"
      />
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
        id="textarea-end"
        class="form-control"
        rows="5"
        bind:value="{endComment}"
      />
    </div>
  </div>

  <div class="row mb-3">
    <div class="btn-group">
      <button
        class="btn btn-success btn-lg"
        on:click="{() => submit()}">
        Submit Match
      </button>
      <button
        class="btn btn-danger btn-lg"
        on:click="{() =>
          choose(
            'Are you sure you want to delete this match?',
            'Yes, delete this match',
            'No, don\'t delete this match'
          ).then(res => {
            if (res?.toLowerCase().includes('yes')) {
              App.abort();
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
    <canvas bind:this="{canvas}" />
    <div
      id="slider"
      class="mt-1" />
  </div>
</div>
