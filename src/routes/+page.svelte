<script lang="ts">
    import { BackgroundBeams } from '@/components/ui/BackgroundBeams';
    import {Button} from '@/components/ui/MovingBorder'
    import {base} from '$app/paths';
    import {onMount} from 'svelte';
    import {eventEnd, eventName, eventStart} from '$lib/event';

    // time left until the game opens, ticking every second
    let now = Date.now();
    onMount(() => {
        const timer = setInterval(() => (now = Date.now()), 1000);
        return () => clearInterval(timer);
    });
    $: left = eventStart ? Math.max(0, eventStart.getTime() - now) : 0;
    $: remaining = {
        days: Math.floor(left / 86_400_000),
        hours: Math.floor(left / 3_600_000) % 24,
        minutes: Math.floor(left / 60_000) % 60,
        seconds: Math.floor(left / 1000) % 60,
    };
</script>

<div
        class="relative flex  h-screen  w-full flex-col items-center justify-center rounded-md  px-4 md:px-32 antialiased"
>
    <div class="mx-auto max-w-2xl p-4">
        <p class="relative z-10 mx-auto my-2 max-w-lg text-center font-mono text-sm text-neutral-500">
            {#if left > 0}
                {remaining.days} days, {remaining.hours} hours, {remaining.minutes} minutes, {remaining.seconds} seconds
            {:else if eventEnd && now >= eventEnd.getTime()}
                the game is over
            {:else if eventStart}
                the game is live
            {/if}
        </p>
        <h2
                class="relative z-10 bg-gradient-to-b from-neutral-200 to-neutral-600 bg-clip-text text-center font-sans text-5xl md:text-7xl font-bold text-transparent"
        >
           {eventName}
        </h2>
        <p class="relative z-10 mx-auto my-2 max-w-lg text-center text-sm text-neutral-500">
           riddles, references and rabbit holes. form a team of up to three, crack each level before anyone else, and climb the leaderboard.
        </p>

    </div>
    <BackgroundBeams />
    <div style="align-items: center;justify-content: center;display: flex;" class="mt-6">
        <div>
            <Button
                    borderRadius="0.75rem"
                    className="bg-white-300 text-white border-slate-800 text-sm font-bold"
                    onClick={()=>window.location.href = `${base}/ready`}
            >
                let's go
            </Button>
        </div>
    </div>
</div>
