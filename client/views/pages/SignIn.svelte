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
                bind:this="{form}"
                action="/sign-in"
                method="POST"
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
                        id="pin"
                        name="pin"
                        class="form-control"
                        required
                        type="password"
                    />
                </div>

                <button
                    class="btn btn-primary"
                    type="submit">Submit</button>
            </form>
        </div>
    </div>
</main>
