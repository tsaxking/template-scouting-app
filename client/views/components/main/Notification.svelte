<script lang="ts">
import { onMount } from "svelte";
import { date } from "../../../../shared/clock";
import {  match } from "../../../../shared/match";
import { capitalize } from "../../../../shared/text";
    import { AccountNotification } from "../../../models/account-notifications";

    export let notification: AccountNotification;

    let color: string;

    $: color = match<string, string>(notification.type)
        .case("info", () => "info")
        .case("warning", () => "warning")
        .case("error", () => "danger")
        .default(() => "primary")
        .exec()
        .unwrap();

    let classes: string;

    $: {
        if (notification.read) {
            classes = `border-${color}`;
        } else {
            classes = `text-bg-${color}`;
        }
    }

    const update = () => {
        notification = notification;
    }

    onMount(() => {
        notification.on('read', update);
        () => {
            notification.off('read', update);
        }
    });
</script>

<div
    class="card {classes}"
>
    <div
        class="card-title p-1 m-0"
    >
        <h5>{capitalize(notification.title)}</h5>
        <p class="text-muted">{date(notification.created)}</p>
    </div>
    <div class="card-body p-1 m-0">
        <p>{capitalize(notification.message)}</p>
    </div>
</div>