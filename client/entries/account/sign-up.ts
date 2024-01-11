import '../../utilities/imports';
import SignUp from '../../views/components/SignUp.svelte';

const app = new SignUp({
    target: document.body,
    props: {
        title: 'Team Tators',
    },
});
