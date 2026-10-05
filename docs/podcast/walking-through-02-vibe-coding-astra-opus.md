# Walking Through, episode two: two weeks of vibe-coded games, and what Astra and Opus 5.5 change for us

*Written for narration on 5 October 2026, covering roughly 21 September to 5 October, with the early-September launch of GPT-6 Astra as background. Read straight through; the show notes and dated sources at the end are not part of the reading. Where a claim comes from a company about its own product, the narration says so.*

Welcome back to Walking Through, the show where we take one decision about the Partisan Project and walk all the way round it before we make it. Last time we asked which engine could carry this project out of the web browser and into a real Bannerlord-like game, and we came down on Godot four, with Unity six as the runner-up and Unreal five kept in reserve for a first-person version.

That episode was written in a world that has since moved. In the space of about two weeks, the tools that write games have changed under our feet. OpenAI's GPT-6 Astra spent September being pointed at Blender, Unity, Godot and Unreal, and people posted what came out. Anthropic released Claude Opus 5.5, which it says matches its larger Fable model on most work at a much lower price. Unity shipped its own plugins that hand AI coding agents the keys to the editor. A free bridge for Godot reached the point where an agent can run your game, read its errors and take a screenshot of what it drew. And Google announced Gemini 4 Argon, then told almost everyone they could not have it yet.

So today's decision is not a new one. It is the old one, looked at again: given what changed in the last fortnight, how should we be building this game, and what should we try next? Let us walk round it.

## Part one: the fortnight at a glance

Before the details, the calendar, because the order matters.

On the third of September, OpenAI released GPT-6 Astra, which it presents as its strongest model for coding, computer use and long, complicated tasks. That is just outside our fortnight, but almost everything people built with it, and argued about, landed inside it.

On the ninth of September, Unity shipped an official plugin for Anthropic's Claude Code. On the sixteenth, it shipped the matching plugin for OpenAI's Codex. Again just before our window, but they set the stage.

On the twenty-second of September, Anthropic released Claude Opus 5.5.

On the twenty-fourth, version 4.2.3 of a free, open-source Godot plugin called Godot AI, by a developer who goes by dlight, shipped. Note the number: that is the plugin's version, not Godot's. It needs Godot 4.7 or later.

On the thirtieth of September, Google announced Gemini 4 Argon, and limited it to a small group of trusted security testers.

And all the way through, two background facts kept being quoted. Roughly one in three new games on Steam now discloses AI-generated content. And in the Game Developers Conference survey for 2026, only seven percent of game developers said they see generative AI positively, down from thirteen percent a year earlier.

Hold those two numbers in your head. The tools got much better, and the people who make games got more suspicious of them, at the same time.

## Part two: what Astra actually showed

Let us start with Astra, because it set the tone for everything else.

OpenAI's pitch is that Astra does not just write game code; it operates the tools. In OpenAI's launch material and the posts that followed, it drives Blender to build models, places them in Unreal Engine five as a scene you can walk through, and edits, runs and checks games in Unity and Godot. The Japanese developer and writer npaka gathered the examples in one place a few days after launch: a house drawn as a floor plan, modelled in Blender, and walked through in Unreal; a recreation of Manhattan in Unreal that Matt Shumer built street by street over about a week; a large browser game in Three.js. One detail from OpenAI's Thomas Ricouard is worth keeping: Astra preferred to drive Blender headless, through its command line and Python, rather than clicking through the interface. It modelled in code, then checked the result on screen.

The most useful report is a business one. Playco, a game studio, built three themed prototypes from a single grey-box level in Unity, using its own tool, Playbot, which lets the model edit the scene, run the game, play it, look at the result and fix what it finds. Playco reports that most of the prototypes worked on the first attempt and that it needed about half as many manual fixes as with the previous model. That is a vendor case study published by OpenAI, so treat the number as a claim, but the shape of the loop is the important part: create, run, play, find the problem, fix it, without a person in the middle of every step.

The most dramatic demonstration was Matthew Berman's. On launch day he gave Astra a single long-range goal: build a city-builder in the style of SimCity. It worked on its own for five days, about a hundred and twenty hours, and produced a game it called Newhaven, with fire stations, police stations, hospitals, power plants, universities, pedestrians and traffic. Berman estimated the bill at eight hundred to a thousand dollars, and the game was still unfinished when he stopped. He also noticed that thin prompts produced thin results: Astra needed long, specific goals to aim high, and on hard work it settled into sessions of about half an hour on its own.

Then the counterweight. Vice's games coverage, quoting demos collected by Kotaku, pointed out that much of what Astra produced looked like lesser copies of games that already exist: something like Super Smash Brothers, something like Sonic, something like The Simpsons: Hit and Run. A horror-game developer, Steelkrill, put the worry plainly: more slop, copied ideas and cloned games than ever before. And the security note: reports say Astra was jailbroken within a day of release, despite being billed as OpenAI's most aligned model.

And the price. Astra costs ten dollars per million tokens going in and fifty per million coming out.

What Astra showed, then, is not that games now make themselves. It showed that a model can now hold a whole production loop for days at a time, including the parts that used to need eyes, and that it is very good at building what it has seen before.

## Part three: what Opus 5.5 changed

Now Opus 5.5, released on the twenty-second of September.

Here is what Anthropic says about it, in Anthropic's own words where possible. It is the first model in a new Claude 5.5 family. It performs at about the level of Claude Fable 5.1, the company's largest model, on most tasks. It costs about forty percent less to run than Opus 5 on typical work, and writes its output more than thirty percent faster. The list price is four dollars per million tokens in and twenty per million out; and, the number that matters most for long coding sessions, reading from the prompt cache costs twenty cents per million, sixty percent less than before. Anthropic also raised the five-hour usage limits on its Pro, Max and Team plans, and says Sonnet 5.5 and Haiku 5.5 will follow in the coming weeks.

The examples Anthropic chose are telling. An early tester migrated six hundred and eighty thousand lines of code in under a day. Another audited and fixed a two-hundred-thousand-line codebase in under three hours, where Opus 5 took more than twenty. Asked to cut load times across every page of a web app, it succeeded thirty-nine times out of forty. Translating the HAProxy load balancer from C to Rust, it passed nearly all of HAProxy's own tests, finishing faster and at about half the cost of Fable. And one that concerns us directly: a tester had several Claude models each build a game from one prompt, and Opus 5.5 scored highest, on the strength of its graphics and polish.

On the comparison everyone wanted, Anthropic says that on its FrontierCode benchmark Opus 5.5 beats Astra at roughly a fifth of the cost per task, and on Terminal-Bench 4.0 matches it at about forty percent of the cost. Those are Anthropic's figures about its own model. The independent picture is narrower but consistent: Artificial Analysis puts Opus 5.5 at fifty-eight on its intelligence index at maximum effort, and shows that the cost of a task can vary elevenfold depending on how hard you ask it to think. Customers quoted by the trade press, among them GitHub, Lovable and Spotify, reported the same thing in different words: fewer steps, fewer tokens, the same quality or better.

There is one more piece of context, and it is not technical. Opus 5.5 is Anthropic's first model since its chief executive, Dario Amodei, wrote that the company should pace the frontier, deliberately slowing the growth of capability so that safety work can keep up. TechCrunch also reports that Opus 5.5 ships under the same safeguards as Fable, because Anthropic judges it comparable in some sensitive areas. For us, building a game, the safeguards will rarely matter. The pacing might, and we will come back to it.

So the short version of Opus 5.5 is this: about the same ceiling as the most capable models, at a much lower price per finished job, and noticeably better at the long, sprawling work that a game turns out to be.

## Part four: the engines open their doors

The third change is quieter, and for a project like ours it may matter most.

On the ninth and sixteenth of September, Unity released first-party plugins for Claude Code and for Codex. First-party means Unity's own engineers wrote them and maintain them. Each installs Unity's own engineering skills, twenty-nine for Claude Code and thirty-one for Codex at launch, plus a command-line tool and a live connection into the editor through the Model Context Protocol. In plain words: the agent no longer guesses at Unity from what it remembers of the documentation; it looks at your actual project, its actual scene and its current interfaces.

Godot got the equivalent from its community. Godot AI, the free bridge we mentioned, reads the scene tree, surfaces parse errors and debugger messages, runs the project and its tests, and screenshots the game's own framebuffer, for any agent that speaks the protocol, including Claude Code, Codex and Cursor. Version 4.2.3 arrived on the twenty-fourth of September and needs Godot 4.7. The developers behind a paid Godot assistant called Ziva, which we should note is a competitor of that free bridge, published a comparison of twenty-one Godot AI tools checked on the twenty-seventh of September, and their own Godot benchmark, from before Opus 5.5, ranked Opus 5 first.

Why does this matter so much to us? Because of how this project has been built. Every scene you have seen, the weapon modder, the operator modder, the shooter, the new overworld map, was built by an agent that could not see the screen on its own. So we built it a way to see: a headless browser that loads each page, takes screenshots, composes them into contact sheets, and runs a long smoke test that clicks through every module. Just this week that loop caught a town map whose labels vanished when the camera zoomed out, and a sea that showed foam on inland pools. That loop is our own handmade version of exactly what Unity and Godot have now shipped as standard: run the game, look at it, read the errors, fix it.

## Part five: the rest of the field

Two more threads, briefly.

Gemini 4 Argon, announced by Google on the thirtieth of September, can write up to a million tokens of output in one go, up from about sixty-four thousand, which is the right shape for building something large in a single pass. On Vals AI's Vibe Code Bench it built thirty apps perfectly, against twenty-five for Opus 5 and twenty-four for Astra, though every model tested scored above eighty-nine percent overall, so the gap is in the hardest cases. But for now Argon is open only to a small group of trusted security testers. Paid API customers and Google's AI Ultra subscribers are promised it first, later. For our planning it is a name to watch, not a tool to use.

And the mood of the industry. One in three new Steam games now discloses AI content. Valve's rules, rewritten in January, are worth knowing exactly: tools that only help you make the game, like a coding assistant, do not need to be disclosed; anything made with AI that the player actually sees or hears, art, models, voices, text, sound, does. And only seven percent of developers in the GDC survey feel positive about generative AI. The tools are winning on capability and losing on trust.

## Part six: what this means for the Partisan Project

Now the walk round our own decision. Six things follow.

First, the engine question tilts further toward Godot. In episode one, our strongest reason to stay on the web was that an agent could see and test everything through a browser. That reason has weakened: an agent can now see and test inside Godot and Unity too, with tools their makers or communities support. Our browser loop is still good, and nothing here needs a rewrite to keep working. But the cost of moving has fallen, and the argument for Godot from episode one, open source, no royalties, light enough for one person, now comes with an agent loop as good as ours.

Second, long work got cheaper, and long work is what we do. Our working agreement assumes the cheapest paid plan, and the sessions that build this project are long, full of reading back the same files. Cache reads are exactly what fell by sixty percent, and the usage limits went up. In practice that means more of the project per week for the same money, and it makes the port in our first point less of a gamble.

Third, our real bottleneck is assets, and that is where Astra is strongest. Look at what went wrong this week: an M16 drawn too tall and too thin; a StG 44 that arrived as one black mesh; a Bren with no textures at all. We fixed them with code, stretching, splitting and painting, because our agent works best in code. Astra's demonstrations are about driving Blender, and it chose to drive it through Python, which is also how our own asset tools work: we already have Blender scripts in the tools folder. That points to a fair test rather than a conclusion: give both models the same broken model and the same Blender scripts, and see which one returns a better rifle.

Fourth, taste is the moat. The strongest criticism of Astra's games is that they look awfully familiar. A game that any model can make from a one-line prompt is worth what the prompt cost. What cannot be prompted is a point of view: a Mediterranean island under occupation, a partisan band levelled with stolen gear, a Nokia in a rebel's pocket, a campaign map in the manner of Bannerlord with a hooded recon fighter on a hill. Our design documents and decision records are what keep that point of view steady from session to session, and they are now worth more, not less.

Fifth, disclosure is coming for us, so start the paperwork now. Under Steam's rules, the coding assistant does not need disclosing, but generated content the player sees does. The hooded Recon began as a generated model before it was rigged and baked into the game. If this ever goes on Steam, that will need declaring, and so will anything else generated that reaches the screen. The cheapest time to record where each asset came from is the moment it enters the project, and we already keep an asset register.

Sixth, plan for steady progress, not miracles. If the most careful lab is deliberately pacing its frontier, and the most capable new model from Google is withheld, then the next few months will probably look like this fortnight: cheaper, faster, better at long jobs and at seeing what they make, but not a model that designs the game for us. That suits a project run on packets, decisions and tests.

## Part seven: what we should try next

Three experiments, each small enough for a couple of weeks.

One: a Godot spike. Install Godot 4.7 and the Godot AI bridge, and have an agent port the heart of the top-down shooter, the simulation with its army that acts on what it believes, which is already written as plain code with no drawing in it. Success looks like the same unit tests passing in GDScript and the convoy ambush playable in Godot, with the agent finding its own bugs from the screen.

Two: an asset bake-off. Take the StG 44, the weakest model we have, and give the same Blender task to Astra and to Opus 5.5: split the furniture, fix the proportions, give it real textures, export it under our triangle budget. Compare the results, the time and the bill.

Three: count the cost. We already have a tool that logs usage around each work packet. Log every session for a month, so that when the next model arrives we can tell whether it is cheaper per finished feature, not just per token.

If the Godot spike works, episode one's recommendation stops being a plan and becomes a schedule. If it does not, we have lost two weeks and learned exactly why, which is still worth having.

That is where we will stop walking today. Thank you for listening to Walking Through. Next time: the campaign map for real. What a Bannerlord-like world of villages, patrols and convoys needs to simulate underneath the pretty picture we built this week, and how much of it a band of partisans should be able to see.

*End of narration.*

---

## Show notes (not for narration)

- The window is 21 September to 5 October 2026. GPT-6 Astra (3 September) and Unity's plugins (9 and 16 September) are just before it and are included because most of the discussion of them falls inside it.
- Figures about Opus 5.5 and Astra are the vendors' own unless marked independent (Artificial Analysis, Vals AI). Playco's 50 percent figure is from a case study published by OpenAI.
- "Godot AI 4.2.3" is a plugin version by dlight, not a Godot release; it requires Godot 4.7 or later. Ziva, the source of the tool comparison and the benchmark, sells a competing Godot assistant.
- Project facts come from this repository: the browser test loop in `tests/e2e/` (smoke, contact sheets, map screenshots), the asset fixes in `workbench/surface.js` and `workbench/rifles-extra.js` (TAC-J-48), the overworld map (TAC-J-53), the Blender scripts in `tools/assets/`, the usage logger `tools/agent/usage.mjs`, and the asset register `assets/register.json`.
- Nothing here commits the project to a move: the three experiments in part seven are proposals for the roadmap.

## Sources

Dates are publication dates as shown by each source.

- Claude Opus 5.5 announcement details, pricing, cache reads, usage limits, migration and audit examples, game-from-one-prompt test, FrontierCode and Terminal-Bench comparisons: [9to5Mac, 22 Sep 2026](https://9to5mac.com/2026/09/22/anthropic-upgrades-claude-with-new-opus-5-5-model-details-here/); [TechCrunch, 22 Sep 2026](https://techcrunch.com/2026/09/22/anthropic-releases-opus-5-5-with-lower-prices-and-fable-level-performance/) (Opus 5 on 24 July; pacing the frontier; Fable-level safeguards); [KDnuggets, 23 Sep 2026](https://www.kdnuggets.com/everything-claude-opus-5-5-actually-ships-with) (Artificial Analysis index and cost spread; GitHub, Lovable, Spotify and other customer reports)
- GPT-6 Astra launch (3 Sep 2026), Blender headless, Unreal, Unity, Godot and Three.js examples, Manhattan, Playco and Playbot: [npaka on note, 6 Sep 2026](https://note.com/npaka/n/n8fb683be4d52?hl=en); Playco case study: [OpenAI](https://openai.com/index/playco-game-prototyping-with-astra/)
- Matthew Berman's five-day Newhaven run, US$800 to 1,000, half-hour sessions, jailbreak within a day: [Stork.AI, 15 Sep 2026](https://www.stork.ai/blog/gpt-6-built-a-game-in-5-days)
- Criticism of Astra's games as familiar copies; Steelkrill quote (9 Sep 2026): [Vice](https://www.vice.com/en/article/gpt-6-astra-can-build-video-games-fast-but-they-look-awfully-familiar/)
- Unity's first-party plugins for Claude Code (9 Sep) and Codex (16 Sep), 29 and 31 skills, CLI and MCP Editor connection: [Tech Insider, 20 Sep 2026](https://tech-insider.org/unity-plugins-claude-code-codex-2026/)
- Godot AI by dlight 4.2.3 (24 Sep 2026, requires Godot 4.7), comparison of Godot AI tools checked 27 Sep 2026: [Ziva](https://ziva.sh/blogs/best-ai-tools-for-godot-game-engine); Godot benchmark ranking Opus 5 first: [Ziva](https://ziva.sh/blogs/godot-vampire-benchmark)
- Gemini 4 Argon (30 Sep 2026), one-million-token output, restricted access: [TechCrunch, 30 Sep 2026](https://techcrunch.com/2026/09/30/google-releases-gemini-4-argon-called-its-most-powerful-model-yet/); [The New Stack](https://thenewstack.io/google-gemini-4-argon/); Vibe Code Bench results: [Latent Space AINews](https://www.latent.space/p/ainews-gemini-4-argon-gdms-answer)
- Steam AI disclosure share and rules (rewritten 16 Jan 2026; player-facing content only): [Cinevva news, 20 Jul 2026](https://app.cinevva.com/news/2026-07-20-steam-ai-disclosure-study); [PC Gamer](https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/)
- GDC 2026 survey, 7 percent positive (13 percent a year earlier), as cited by [Ziva, Vibe coding games](https://ziva.sh/blogs/vibe-coding-games) (secondary citation: we did not read the survey itself)
