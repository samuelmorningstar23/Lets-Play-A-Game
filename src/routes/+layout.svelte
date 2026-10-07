<script lang="ts">
    import "../app.css"
    import {ToastContainer,BootstrapToast} from "svelte-toasts";
    import {BackendProvider} from "$lib/backend";
    // per-icon imports: the package barrel makes vite compile every icon in dev
    import ArrowUpRight from "lucide-svelte/icons/arrow-up-right";
    import Disc from "lucide-svelte/icons/disc";
    import {page} from '$app/stores';
    import {base} from '$app/paths';
    import {eventName} from '$lib/event';
    export let data;
</script>

<svelte:head>
    <title>{eventName}</title>
</svelte:head>

<BackendProvider>
    <ToastContainer let:data={data}>
        <BootstrapToast {data} />
</ToastContainer>

    {#if ["/","/leaderboard","/team"].includes($page.route.id)}
        <div class="navbar">
            <a class="btn btn-ghost text-md" class:text-primary={$page.route.id==="/"} href="{base}/"><ArrowUpRight/> home</a>
            <a class="btn btn-ghost text-md" class:text-primary={$page.route.id==="/leaderboard"} href="{base}/leaderboard"><ArrowUpRight/> leaderboard</a>
            {#if ![undefined,null].includes(data.userTeam)}<a class="btn btn-ghost text-md" class:text-primary={$page.route.id==="/team"} href="{base}/team"><ArrowUpRight/> team</a>{/if}
            {#if data.banned === false && ![undefined,null].includes(data.userTeam)}<a class="btn btn-ghost text-md" href="{base}/play"><Disc /> play</a>{/if}
        </div>
        {/if}
<slot />
</BackendProvider>
