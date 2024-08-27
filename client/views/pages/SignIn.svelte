<script lang="ts">
import { ServerRequest } from '../../utilities/requests';

let form: HTMLFormElement;
</script>

<main>
    <div class="container">
        <div class="row">
            <h1>Sign In</h1>
        </div>
        <div class="row">
            <form
                action="/sign-in"
                method="POST"
                bind:this="{form}"
                on:submit|preventDefault="{() => {
                    ServerRequest.post('/sign-in', {
                        pin: form.pin.value
                    })
                        .then(() => {
                            window.location.href = '/';
                        })
                        .catch(error => {
                            console.error(error);
                        });
                }}"
            >
                <div class="form-group">
                    <label for="pin">Pin</label>
                    <input
                        type="password"
                        class="form-control"
                        id="pin"
                        name="pin"
                        required
                    />
                </div>

                <button type="submit" class="btn btn-primary">Submit</button>
            </form>
        </div>
    </div>
</main>
