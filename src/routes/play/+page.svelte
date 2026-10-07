<script lang="ts">
    import ArrowLeft from "lucide-svelte/icons/arrow-left";
    import ArrowRight from "lucide-svelte/icons/arrow-right";
    import CheckCircleIcon from "lucide-svelte/icons/circle-check";
    import CircleXIcon from "lucide-svelte/icons/circle-x";
    import List from "lucide-svelte/icons/list";
    import Lock from "lucide-svelte/icons/lock";
    import {Doc,api} from "$lib/backend";
    import Coin from "@tabler/icons-svelte/IconCoin.svelte";
    import Affiliate from "@tabler/icons-svelte/IconAffiliate.svelte";
    import {Input} from "@/components/ui/SignupForm";
    import {sendErrorToast, sendSuccessToast} from "@/toast_utils";
    import {onMount} from "svelte";
    import { browser } from '$app/environment';
    import { invalidateAll } from '$app/navigation';

    let loading = false;
    let answer = "";

    export let data;
    // only the levels this team has reached; the last one is the current level
    $: questions = data.questions;

    let currQuestion = data.questions.length - 1;
    $: currQuestionData = questions[currQuestion];




    const submitAnswer = async () => {
        loading = true;
        const r = await api(`/api/submit`,{
            method: "POST",
            body: JSON.stringify({
                answer,
                userId: data.locals.userId,
                questionId: currQuestionData.uid
            })
        });
        if(r.ok){
            const rdata = await r.json();
            if(rdata.correct){
                sendSuccessToast("level cleared","your answer was correct");
                answer = "";
                // fetch the level that just unlocked and move to it
                await invalidateAll();
                currQuestion = data.questions.length - 1;
            } else {
                sendErrorToast("wrong answer","give it another shot")
            }
        } else if(r.status === 429){
            sendErrorToast("slow down","too many guesses. wait a minute and try again.");
        } else if(r.status === 403){
            sendErrorToast("answers are closed", (await r.json().catch(() => null))?.message || "");
        } else {
            sendErrorToast("error submitting","something went wrong");
        }
        loading = false;
    };


        const updateComment = ()=>{
            if(currQuestionData === null || currQuestionData === undefined) return;
            if(browser){
                const e = document.getElementById(";)");
                e.innerHTML="";
                e.appendChild(document.createComment(currQuestionData.comment))
            }

        }
        $: currQuestionData, updateComment();

</script>

<Doc ref={`/teams/${data.locals.userTeam}`} let:data={teamData}>
    <p slot="loading" class="loading"></p>
    {#if !currQuestionData}
        <center><p class="mt-10 text-xl">no levels yet. check back soon.</p></center>
    {:else}
    <div class="navbar">
        <button class="btn btn-square" disabled={currQuestion === 0} on:click={()=>{
            if(!(currQuestion <= 0)) currQuestion--;
        }}>
            <ArrowLeft/>
        </button>
        <a class="btn btn-ghost text-xl" class:text-success={(teamData.completed_levels || []).includes(currQuestionData.uid)}>
            level {currQuestionData.level+1}/{data.total}
        </a>
        <button class="btn btn-square mr-4"   on:click={()=>{
            if(!(currQuestion >= questions.length-1)) currQuestion++;
        }}
                disabled={currQuestion === questions.length - 1 || !(teamData.completed_levels || []).includes(currQuestionData.uid)}
        >
            {#if !(teamData.completed_levels || []).includes(currQuestionData.uid)}
                <Lock/>
                {:else}
            <ArrowRight/>
                {/if}
        </button>
        <button class="btn mr-4">
            <Affiliate/>
            {teamData.teamName}
        </button>
        <button class="btn mr-4">
            <Coin/>
            {((teamData.level || 1) - 1) * 100} points
        </button>
        <button class="btn " on:click={()=>document.getElementById("logsModal").showModal()}>
            <List/>
            Prev Answers
        </button>
    </div>


<center>
    {#if data.ended}<p class="mb-4 text-secondary">the game is over. answers are closed.</p>{/if}
    <p class="text-sm">question by <b class="text-primary">{currQuestionData.creator}</b></p>
    <p class="text-4xl mb-4">{currQuestionData.prompt}</p>
    {#if currQuestionData.files.length !== 0}
    <div>
        <p class="text-lg font-medium">files</p>
        {#each currQuestionData.files as f}
            <span class="link link-primary" on:click={()=>open(f.url)}>{f.name}</span>
            {/each}
    </div>
        {/if}
    {#if currQuestionData.images.length !== 0}
        <p class="text-lg font-medium mt-4 mb-2">images</p>
    <center class="mb-4">
        <div class="flex justify-center flex-row h-60">
            {#each currQuestionData.images as i}
                <img class="mr-2 ml-2 rounded-lg " src={i} />

            {/each}
        </div>
    </center>
        {/if}

    {#if !(teamData.completed_levels || []).includes(currQuestionData.uid)}
        <div class="w-[50%] mb-4"><Input id="answer" placeholder="piedpiper" type="text" onInput={(e)=>{
                            answer = e.target.value.replace(/\s/g,"");
                            e.target.value = answer;
                      }}/>
            </div>
    <button class="btn btn-wide btn-primary" disabled={loading} on:click={submitAnswer}>
        {#if loading}
            <span class="loading loading-ring text-primary loading-lg"></span>
            {:else}
        Submit
            {/if}
            </button>
    {:else}
        <button class="btn btn-wide btn-success"  >
            <CheckCircleIcon color="#000000"/>
        </button>
        {/if}
</center>
    {/if}

</Doc>


<dialog id="logsModal" class="modal">
    <div class="modal-box">
        <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        <Doc ref={`/logs/${data.locals.userTeam}`} let:data={logData}>
            <p slot="loading" class="loading"></p>
            {#each logData.logs as log}
                {#if log.type === "correct_answer"}
                <button class="btn btn-ghost"><CheckCircleIcon class="text-success"/> {log.entered}  </button><br/>
                    {:else}
                    <button class="btn btn-ghost"><CircleXIcon class="text-secondary"/> {log.entered} </button><br/>
                    {/if}
                {/each}
        </Doc>
    </div>
</dialog>