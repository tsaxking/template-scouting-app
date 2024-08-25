<script lang="ts">
import { onMount } from "svelte";
import { date } from "../../../../shared/clock";
    import { AccountNotification } from "../../../models/account-notifications";

    export let notifications: AccountNotification[] = [];

    export let show = false;

    const update = () => {
        notifications = notifications;
    };

    const newNotif = (notif: AccountNotification) => {
        notifications = [notif, ...notifications];
    };

    const deleteNotif = (notif: AccountNotification) => {
        notifications = notifications.filter((n) => n.id !== notif.id);
    };

    onMount(() => {
        AccountNotification.on('new', newNotif);
        AccountNotification.on('read', update);
        AccountNotification.on('delete', update);
    });
</script>

<div class="offcanvas offcanvas-end" id="notifications">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title">Notifications</h5>
        <button
            type="button"
            class="btn-close text-reset"
            aria-label="Close"
            on:click={() => (show = false)}
        ></button>
    </div>
    <div class="offcanvas-body">
        {#if notifications.length === 0}
            <p class="text-center">No notifications</p>
        {:else}
            <ul class="list-group">
                {#each notifications as notification}
                    <li class="list-group">
                        <div class="d-flex justify-content-between">
                            <span>{notification.message}</span>
                            <span>{date(notification.created)}</span>
                            {#if notification.read}
                                <button class="btn" on:click={() => {
                                    notification.markRead(false);
                                }}>
                                    <i class="material-icons">
                                        mark_email_unread
                                    </i>
                                </button>
                            {:else}
                                <button class="btn" on:click={() => {
                                    notification.markRead(true);
                                }}>
                                    <i class="material-icons">
                                        mark_email_read
                                    </i>
                                </button>
                            {/if}
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</div>