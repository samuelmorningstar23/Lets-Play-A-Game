<script lang="ts">
    import {auth,db,storage} from '$lib/firebase';
    import {FirebaseApp} from "sveltefire";
</script>

<FirebaseApp {auth} firestore={db} {storage}>
    <slot />
</FirebaseApp>
