# Walking Through, episode one: which engine carries the Partisan Project into a real Bannerlord-like game

*Written for narration. Read straight through; the show notes and sources at the end are not part of the reading.*

Welcome to Walking Through, the show where we take one decision about the Partisan Project and walk all the way round it before we make it. I am your narrator, and today's decision is the big one. Everything we have built so far runs in a web browser. There is an opening scene with a workbench, a rifle, a radio and an old Nokia phone lying on the table. There is a weapon modder where you swap optics, foregrips and drum magazines on eleven rifles. There is an operator modder where a hooded recon fighter wears whatever kit you give him and holds whatever rifle you build. There is a top-down shooter drawn in the style of RimWorld, with paper-doll rebels, rounds you can see in flight, a soundscape of gunfire and birdsong, and an army that acts on what it believes rather than on the truth. And as of this week there is a Rebel Band screen, where a leader stands in the middle and a band of fighters climbs set paths from village volunteer to shock trooper, each step paid for in stolen rifles and body armour.

All of that is a set of demos. The question for this episode is what it would take to turn those ideas into one standalone game, something in the family of Mount and Blade Two: Bannerlord. A campaign map you ride across with your band. Villages that give you volunteers and towns that sell you food. Patrols you can ambush and convoys you can raid. Battles where dozens or hundreds of soldiers fight at once while you lead from inside the fight. A band that grows, levels up and carries the equipment you took from the enemy. Which engine should carry that game, and what does each choice cost us?

Before we start, a word on how this episode was put together. It draws on everything in the project's own repository: the code, the design decision log, the roadmaps and the history of what worked and what did not. It also draws on the current public state of the engines as of the autumn of twenty twenty-six: their licences, their recent releases and what shipped games have shown they can do. Where a claim comes from marketing rather than from a shipped game, I will say so.

## Part one: what we are actually trying to build

Let us start by being honest about what "Bannerlord-like" means, because it is several games in one coat.

The first game inside Bannerlord is the campaign layer. It is a map where parties move in real time, where every lord, caravan, bandit group and army is an agent with goals, and where an economy ticks along underneath: food, wages, prices, prisoners, relations. This layer is mostly simulation and user interface. It needs very little graphics power, but it needs a lot of data, a lot of screens, and a simulation you can run fast and test.

The second game is the battle layer. Bannerlord's signature is that you are a person inside a battle of hundreds. TaleWorlds wrote their own engine largely so that hundreds of soldiers, each with an animated skeleton, a weapon, a shield and a decision to make every frame, could share the screen at a smooth frame rate. Their stated goals were smooth gameplay, big battles and good visuals, scaling with your hardware. Keep that in mind: the people who made the game we are borrowing from decided that no engine on the market in the twenty-tens could do what they wanted, and spent years building one.

The third game is the character and party layer: troop trees, skills, equipment, inventory, the party screen. Our Rebel Band demo is a small model of that layer, and it shows the shape of it. It is data-heavy and user-interface-heavy, and its rules are simple enough to test without any graphics at all.

Now add what makes our project different from Bannerlord. We are not medieval. We are partisans in a modern or near-modern conflict, inspired by Antistasi, with rifles, machine guns, rocket launchers, trucks and armoured cars. That changes the battle layer completely. Swords and shields are about animation and collision at arm's length. Guns are about line of sight, cover, suppression, projectiles crossing a hundred metres, and soldiers reasoning about where an enemy probably is. Our convoy simulation already does a lot of this: soldiers hear shots and form a blurred belief about the shooter, they shout callouts, a radio operator relays word to reinforcements, and squads bound forward under covering fire. That brain is the most valuable thing we have built, and any engine choice has to keep it alive.

And there is one more fact about this project that matters more than it first seems. Almost all of the code has been written by AI coding agents working through text: reading files, editing files, running tests, taking screenshots and reading them back. The owner directs; the agents build. So the engine we choose should not just be good for games. It should be good for a team that works almost entirely through text, version control and automated tests. Keep that in mind too; it will decide more than one round of this episode.

## Part two: what we have today, and what travels

Today the project runs on a deliberately simple stack. It is plain JavaScript modules with no build step, a vendored copy of the three dot js rendering library for the three-dimensional pages, and a flat two-dimensional canvas for the RimWorld-style view. It deploys as a static website. Tests run under Node, and browser tests drive a headless Chromium.

The question to ask of any port is: what is engine-specific, and what is just ideas and data? The good news is that a surprising amount is just ideas and data.

The levels are data: lists of cover, patrol routes, waves, objectives and lights. The weapons are data: magazine size, reload time, spread, range, suppression and now projectile speed. The troop tree is data: tiers, paths, experience costs and the equipment each step needs. The poses for the operator are data in a JSON file. The rifles are glTF models with sockets described as numbers. glTF is the closest thing the industry has to a universal model format, and every engine in this episode can import it.

The simulation is code, but it is code with no rendering inside it. The convoy simulation, the AI that drives it and the objectives that judge it are pure logic that takes a time step and some input and returns a new world. That means it can be ported line by line to any language, and it means we can prove the port is right. Run the same mission with the same random seed in the old JavaScript and in the new engine, and compare who ended up where and who survived. If the numbers match, the brain survived the trip.

What does not travel is the presentation: the canvas drawing code, the three dot js scenes, the browser audio graph, the user interface written in HTML. Those get rebuilt in whatever engine we choose. That is normal, and it is the cheaper half of the work, because we already know exactly what each screen should look like.

## Part three: the contenders

Let us meet the candidates. I will take each one in turn: what it is, what it costs, what it is good at for a game like ours, and where it would hurt.

### Unreal Engine five

Unreal is the heavyweight. It renders the most convincing three-dimensional worlds of anything you can license, with Lumen for global illumination, Nanite for enormous geometric detail, World Partition for streaming big open maps, and a mature animation system with motion matching and control rigs. For crowds it has a framework called Mass, an entity system built for many lightweight agents. A third-party plugin built on Mass advertises tens of thousands of soldiers fighting at sixty frames a second. Treat that as marketing until you have run it yourself, but the underlying framework is real and Epic uses it for city crowds.

The licence is simple and, for a project like ours, generous. Unreal is free until a single product earns one million US dollars in lifetime gross revenue, and then Epic takes five percent of revenue above that line. Since January twenty twenty-five that drops to three and a half percent if the game also launches on the Epic Games Store, and Epic has kept its promise not to change those terms for game developers. The threshold is per product, so a small project that never crosses a million dollars pays nothing at all.

The evidence that small teams can ship large-battle games in Unreal is strong. Manor Lords, a medieval city builder with tactical battles of formations, morale, flanking and fatigue, was built almost entirely by one developer in Unreal Engine four. Hell Let Loose, from a small independent team, puts up to a hundred players into combined-arms Second World War battles in Unreal. Squad, the modern infantry game closest in spirit to our partisans, is Unreal as well.

So why not just pick Unreal and stop the episode here? Three reasons.

First, Unreal's natural language is a mix of C++ and Blueprints, and Blueprints are visual graphs stored in binary asset files. Our builders are AI agents that work through text. An agent can write C++ comfortably, but a Blueprint is close to invisible to it: it cannot read it in a diff, cannot review it, and cannot safely edit it. An Unreal project built by agents would need a strict rule that all gameplay lives in C++, which is possible but works against the grain of the engine and its documentation.

Second, weight. Unreal's editor is a large download, it compiles shaders for a long time, and a headless continuous-integration build needs a serious machine. Our current tests run in seconds in a cheap container. An Unreal pipeline would turn that into a heavy infrastructure project for a team of one human.

Third, and this one matters for taste, the owner has already told us that the RimWorld-style two-and-a-half-dimensional view works better than our three-dimensional top-down view. If the standalone game leans into that look, Unreal's greatest strength, photoreal three dimensions, is largely wasted. You would be renting a cathedral to hold a card game.

Unreal is the right answer if the standalone game is a first-person or third-person Bannerlord with guns: you in the body of the leader, inside a firefight of a hundred soldiers, under real lighting. It is the wrong answer if the game is a RimWorld-looking strategy game with a campaign map.

### Unity six

Unity is the engine RimWorld itself is built in, and the engine of countless strategy and management games. It speaks C sharp, which happens to be the same language Bannerlord's game logic is written in. TaleWorlds wrote their own native engine, but the campaign, the party screens and the troop logic sit on top of it in C sharp, which is why Bannerlord's modding community writes C sharp.

For scale, Unity has its Data-Oriented Technology Stack: the Entities package, the Jobs system and the Burst compiler. By twenty twenty-six this is mature and widely used for exactly what we need: crowds, bullets and simulation running across every core in tight, cache-friendly loops. Thousands of independently acting soldiers are a known quantity in Unity's data-oriented stack.

On licensing, the story has calmed down. In twenty twenty-three Unity announced a fee per install that enraged the industry; in September twenty twenty-four it cancelled that runtime fee entirely and went back to seats. Unity Personal is free for organisations under two hundred thousand US dollars of yearly revenue from Unity work, and from Unity six the splash screen is optional. Unity also wrote into its terms that if it changes the editor terms in a way that hurts you, you may keep using your current version under the old terms. Trust was damaged, and some studios left for good, but the terms in force today are fair for a project our size.

Unity has one more card that matters to us specifically. Its web builds have improved. WebGPU became a supported graphics backend in the Unity six point one cycle, and later releases have moved it out of experimental status, alongside larger memory limits and assets that load per scene. In plain words: a Unity game can still ship a browser demo, which would keep the habit this project has built of putting everything on a web page the owner can open on any machine.

Where does Unity hurt? Its scenes and prefabs are text files, a format called YAML, which agents can read, but they are verbose and full of numeric references that are easy to break by hand. In practice an agent working in Unity writes C sharp and leaves scene editing to small, deliberate changes or to code that builds scenes at runtime. Running Unity headless for tests is well supported through batch mode, but it needs a licence activation in continuous integration, which is one more piece of plumbing. And the data-oriented stack, powerful as it is, is a different way of programming from ordinary Unity; mixing the two takes discipline.

Unity is the right answer if we want the safest commercial path for a strategy-and-tactics game with large simulated battles, written in the same language as Bannerlord's logic, with a browser demo still possible.

### Godot four

Godot is the open-source contender. It is MIT licensed, which means no fees, no royalties, no seats and no company that can change the terms: you own your copy of the engine outright, source and all. The four point six release in January twenty twenty-six made Jolt the default physics engine for new three-dimensional projects, overhauled screen-space reflections, and shipped a modular inverse-kinematics framework with five solver types. Our operator modder had to write its own hand-to-rifle inverse kinematics, so this is directly relevant.

Godot is famously good at two-dimensional and two-and-a-half-dimensional games, and its three-dimensional renderer has grown up a great deal. Its scenes are a readable text format, and its main scripting language, GDScript, looks a lot like Python. For a team of AI agents this is close to ideal. A scene file is plain, short and diffable. A script is plain text. The editor runs headless for exports and tests. An agent can build a scene, write the script, run the game headless, take a screenshot and read it back, which is exactly the loop this project already runs every day.

The web story is mixed in an interesting way. Godot exports to the web, and projects written in GDScript run in the browser today. Projects written in C sharp still cannot export to the web reliably as of late twenty twenty-six; that support is being worked on but is not finished. So if we want browser demos, we write in GDScript, or we write the heavy simulation in C++ through GDExtension and keep the glue in GDScript.

Where would Godot hurt us? Scale in three dimensions. Godot does not have a mature, built-in equivalent of Unity's data-oriented stack or Unreal's Mass. A battle of hundreds of fully animated, individually reasoning soldiers in three dimensions would need us to build our own crowd system: the simulation in C++ through GDExtension, with soldiers drawn through instancing and baked vertex animation. That is real engineering. In a two-and-a-half-dimensional RimWorld-style view, though, the problem shrinks dramatically. Drawing three hundred sprite soldiers is trivial, and the simulation we already have would run at that scale on the CPU once it is written in a compiled language.

Godot is the right answer if the standalone game follows the owner's stated taste, RimWorld-style presentation with a campaign map and tactical battles, and if we value an engine nobody can take away from us and a workflow that suits a team of agents.

### Bevy

Bevy is the wild card: an open-source engine written in Rust and built from the ground up around an entity component system. Every soldier is an entity, every property is a component, every rule is a system, and the scheduler runs those systems in parallel. That is precisely the shape of a big simulation, and Rust gives you speed and memory safety without a garbage collector stuttering in the middle of a battle.

Bevy has moved fast. Version zero point seventeen arrived at the end of September twenty twenty-five, zero point eighteen in January twenty twenty-six with a first editor preview, and zero point nineteen was announced in June twenty twenty-six. Observers describe those releases as the biggest jump in production readiness in the engine's history.

And yet the version numbers still begin with a zero, for a reason. Each release can break your code. The editor is still marked experimental. For a content-heavy game with screens of inventory, a campaign map, dialogue and hundreds of art assets, you would be building tools Unity and Godot give you for free. An agent writes Rust well, and Bevy's everything-in-code approach is perfectly suited to text-based work; but every engine upgrade would be a small migration project.

Bevy is the right answer for a simulation-first prototype, or for the battle simulation alone. It is a risky answer for the whole game today.

### The quieter engines

Three more deserve a sentence each.

Flax is a compact engine with C++ and C sharp, a modern renderer and an approachable editor. It is free until a game earns two hundred and fifty thousand dollars in a quarter, then takes four percent. It is good technology with a small community, which means fewer answers when something breaks.

Stride is a fully open-source C sharp engine under the dot NET Foundation, current with recent versions of dot NET. It is pleasant to code in, but its community and its stream of shipped games are small.

O3DE, the Open 3D Engine descended from Amazon's Lumberyard and Crytek's CryEngine, is Apache licensed and growing. Downloads rose sharply through twenty twenty-five, and the twenty-six point oh five release added a new particle system and automatic level-of-detail generation. It is heavy, closer to Unreal in size and complexity than to Godot, and still a less trodden path for a small team.

None of these is wrong, but none offers enough over the big three to justify being the unusual choice.

### Two routes that are not engines

Before the comparison, two honest alternatives that are not engines at all.

The first is to make the game as a mod. Bannerlord itself ships a modding kit with terrain tools, navigation mesh tools, editors for materials, meshes, cloth, skeletons, particles and atmosphere, and a full scene editor. A total conversion would give us Bannerlord's battles, campaign map and party screens on day one. The catches are serious. The modding community has complained in an open letter that much of the game's code is locked away from modders, which is the main reason so few total conversions exist. The game is built around melee and horses, and turning it into a modern firefight fights the design at every turn. And a mod cannot be sold as a standalone game. The same is true, with a better fit for guns, of Arma Reforger and its Enfusion tools, the family Antistasi comes from: modern weapons, vehicles and huge maps are native there, but it is still someone else's game.

The second route is to keep going on the web. Our current stack is not a toy. With WebGPU arriving in browsers, instanced drawing and vertex-animated crowds are possible in three dot js, and the simulation could move into web workers. We would keep the instant sharing, the tests that run in seconds and the workflow the agents are fluent in. But there is no editor, no asset pipeline beyond what we write ourselves, and selling and distributing a browser game as a premium standalone title is harder than shipping on a store. The web is a superb laboratory and a poor factory.

## Part four: weighing them against this project

Now let us set the contenders against the things this project actually cares about.

Start with the look. The owner has said the RimWorld style works better than the three-dimensional top-down view, and has made the RimWorld view the default. A two-and-a-half-dimensional strategy game with a campaign map favours Godot and Unity. RimWorld is Unity, and Godot is the natural home of modern two-dimensional games. It makes Unreal's renderer a luxury. If the owner later wants first-person Bannerlord battles, that flips toward Unreal and Unity.

Next, scale. Our battles today have tens of soldiers. A Bannerlord-like campaign would want hundreds. In two and a half dimensions, any of the big three can draw hundreds of soldiers; the question is the simulation, which needs a compiled language and data-oriented code at that size. Unity has that built in. Unreal has it built in. Godot needs us to write it ourselves in C++. Bevy is built from it.

Then the workflow. Our builders are agents working through text, and this may be the most decisive factor of all. Godot is the friendliest: text scenes, text scripts, a headless editor. Bevy is equally friendly but immature. Unity is workable if we keep logic in C sharp and keep scene edits small. Unreal is the least friendly, because so much of an Unreal project lives in binary assets and visual graphs.

Then cost and control. Godot costs nothing and cannot change its terms. Unreal costs nothing until a million dollars per product, then a five percent royalty. Unity costs nothing under two hundred thousand dollars a year, then seats. All three are affordable for us. Only one is beyond the reach of a pricing announcement, and the industry learned in twenty twenty-three why that matters.

Then the web habit. Every demo in this project lives on a web page the owner can open from a phone, a laptop or the Nokia index. Godot with GDScript and Unity with WebGPU can both keep that habit for at least some builds. Unreal cannot in any practical sense; its browser streaming is a server rendering video, not a game in the page.

And finally, the brain. Whichever engine we choose, the convoy simulation, the AI beliefs and callouts, the objectives and the troop rules all port as ordinary code. In Unity that is C sharp, which is close to JavaScript in spirit. In Godot it is GDScript for the rules and C++ for the hot paths. In Bevy it is Rust. In Unreal it is C++. None of these is hard for an agent. The seeded comparison test, the same mission run in both worlds with the same numbers coming out, works in all of them.

## Part five: the recommendation

So, where does the walk end?

If the standalone game follows the direction this project has already chosen, RimWorld-style presentation, a band you level along set paths, a campaign map of villages, patrols and convoys, and tactical battles of tens to a few hundred soldiers, then the recommendation is Godot four. Write the rules in GDScript so the web demos keep working, move the battle simulation into C++ through GDExtension when the soldier count climbs, and lean on its text scenes so the agents can build and test the game as fluently as they build the web demos today. It is the engine that best fits how this project is made, it costs nothing, and nobody can change that.

The runner-up, and the right choice if the owner wants the safest commercial road or large battles sooner rather than later, is Unity six with its data-oriented stack for the battles and ordinary C sharp for everything else. It is the engine RimWorld was built in, its logic language matches Bannerlord's, and it still ships to the web.

Unreal Engine five is the answer for a different game: a first-person or third-person Bannerlord with guns, where you stand inside a firefight under real lighting. If the owner ever chooses that game, choose Unreal, keep every line of gameplay in C++, and accept heavier tooling as the price of the best renderer you can license.

Bevy is worth a weekend. Port the convoy simulation to Rust and Bevy, run a thousand-soldier battle headless, and see what the numbers say. It may become the battle engine inside a Godot game, or it may simply teach us how to write the C++ version. It should not be the whole game yet.

And whatever we choose, keep the website. It is the laboratory where ideas get tried in an afternoon and shown to the owner in a link. The standalone game is the factory, and the factory should be built from the laboratory's notes.

## Part six: how the port would actually begin

Let me close with what the first month would look like, because a recommendation without a first step is just an opinion.

Week one: freeze the contract. Export the levels, weapons, troop tree and poses as plain data files that both the website and the new engine read. The website keeps working, and the new engine has the same numbers from day one.

Week two: port the brain. Write the convoy simulation in the new engine with no graphics at all, just a headless program that steps the world. Then build the golden test: the same mission, the same seed, run in the browser and in the engine, with the same survivors, the same callouts and the same outcome. When that test passes, the hardest and most valuable thing we own has crossed safely.

Week three: put a face on it. Draw the RimWorld-style view in the new engine with the same placeholder art, the paper-doll rebels, the bullets in flight and the dust on the ground, and wire up the controls. Bring across the soundscape's ideas, though in a native engine we can finally use recorded gunfire instead of synthesising it.

Week four: the band. Rebuild the Rebel Band screen against the same troop data, and connect it to the battle, so soldiers who fight gain experience, rifles taken from the convoy land in the stash, and casualties leave the band. That loop, from fight to loot to upgrade and back to the next fight, is the heart of a Bannerlord-like game. Once it runs in a standalone build, the project has stopped being a set of demos and started being a game.

That is where we will stop walking today. Thank you for listening to Walking Through. Next time, we will walk round the campaign map: what a Bannerlord-like world of villages, patrols and convoys needs to simulate, and how much of it a band of partisans can see.

*End of narration.*

---

## Show notes (not for narration)

- Project facts come from this repository: `convoy/` (simulation, AI, RimWorld-style view, soundscape), `band/` (Rebel Band), `operator/`, `workbench/`, `intro/`, and the decision log in `docs/design-decisions/` (TAC-J-32 to TAC-J-43, TAC-H-12).
- Version and licence details are as published by autumn 2026. Re-check before deciding; terms and releases move.
- The 80,000-soldier figure for Unreal's Mass framework comes from a third-party plugin listing and is a marketing claim, not a benchmark we ran.

## Sources

- Unity cancels the Runtime Fee, returns to seats; Personal under US$200,000; optional splash in Unity 6; right to keep prior terms: [Unity blog](https://unity.com/blog/unity-is-canceling-the-runtime-fee), [Unity Discussions](https://discussions.unity.com/t/a-message-to-our-community-unity-is-canceling-the-runtime-fee/1517714), [Game Developer](https://www.gamedeveloper.com/business/unity-is-killing-its-controversial-runtime-fee)
- Unity WebGPU and web builds: [Cinevva news, Unity 6.6 WebGPU](https://app.cinevva.com/news/2026-09-01-unity-6-6-webgpu-production), [Cinevva news, Unity 6.1 WebGPU](https://app.cinevva.com/news/2025-04-22-unity-6-1-webgpu)
- Unity DOTS for large simulations: [Wayline, Unity DOTS explained](https://wayline.io/blog/unity-dots-data-oriented-technology-stack-explained)
- Unreal licence (US$1 million per product, 5 percent, 3.5 percent with Epic Games Store launch): [Unreal Engine licensing](https://www.unrealengine.com/license), [Video Games Chronicle](https://www.videogameschronicle.com/news/epic-confirms-its-new-unreal-engine-pricing-keeps-its-promise-not-to-change-it-for-game-developers/)
- Unreal Mass crowd plugin (marketing claim): [Fab listing](https://www.fab.com/listings/191850b4-44d3-4455-aa76-874bc0196a10)
- Manor Lords on Unreal, solo developer: [Epic Games Store news](https://store.epicgames.com/news/manor-lords-solo-developer-s-highly-anticipated-medieval-strategy-game-hits-this-month?lang=en-US), [manorlords.com](https://manorlords.com)
- Hell Let Loose on Unreal, small team, up to 100 players: [TechRaptor](https://techraptor.net/content/hell-let-loose-hits-steam-early-access-on-july-6)
- Godot 4.6 (Jolt default, SSR, IK framework): [Phoronix](https://www.phoronix.com/news/Godot-4.6-Released), [Digital Production](https://digitalproduction.com/2026/01/28/godot-4-6-arrives-with-major-cg-friendly-updates/)
- Godot C# platform support and web export: [Godot blog, platform state in C#](https://godotengine.org/article/platform-state-in-csharp-for-godot-4-2/), [Godot forum](https://forum.godotengine.org/t/is-there-an-update-on-exporting-c-projects-to-web/128821)
- Bevy releases and production readiness: [Bevy news](https://bevy.org/news/), [Bevy's sixth birthday](https://bevy.org/news/bevys-sixth-birthday/), [StraySpark guide](https://www.strayspark.studio/blog/bevy-rust-game-engine-2026-indie-guide)
- Flax licence (4 percent above US$250,000 per quarter): [Flax FAQ](https://flaxengine.com/faq/)
- Stride: [Stride (xenko.com)](https://www.xenko.com), [.NET Foundation](https://old.dotnetfoundation.org/projects/stride)
- O3DE 2025 review and 26.05: [O3DE blog](https://o3de.org/o3de-2025-in-review-and-a-look-into-2026/), [CG Channel](https://www.cgchannel.com/tag/o3de-26-05/)
- Bannerlord's custom engine: [TaleWorlds news](https://www.taleworlds.com/en/News/186), [Worthplaying](https://worthplaying.com/article/2018/3/9/news/107650-mount-blade-ii-bannerlord-all-shows-off-new-custom-engine-features-trailer/)
- Bannerlord modding kit and total-conversion limits: [Nexus Mods news](https://www.nexusmods.com/news/14378), [TechRaptor](https://Techraptor.net/gaming/news/bannerlord-modders-criticize-taleworlds-over-mod-support)
