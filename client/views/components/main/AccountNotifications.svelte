<script lang="ts">
import { date } from "../../../../shared/clock";
    import { AccountNotification } from "../../../models/account-notifications";

    export let notifications: AccountNotification[] = [];

    export let show = false;
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
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</div>