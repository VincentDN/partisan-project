# Weapon foley replacement plan

The inbound weapon-sounds-package.zip contains 723 indexed reference cuts. The 42 takes used by the game also appear in that bank. Generate one accepted replacement per distinct cut and reuse it wherever the source appears.

| Cue family | Distinct references |
| --- | ---: |
| Click | 120 |
| Clunk | 53 |
| Handle | 93 |
| Hit | 103 |
| Long | 31 |
| Ratchet | 36 |
| Slide | 106 |
| Candidate UI sounds | 181 |
| **Total** | **723** |

1. Build a manifest from the package CSV. Record cue ID, source timing, duplicate mappings, contact peaks, decay, runtime filename and intended action. Audition the 181 uncertain UI cues and label each before prompting. Identify which 42 files feed the seven runtime pools.
2. Pilot one representative of each family. Describe the mechanism, material, force, contacts and room in plain language. For a magazine seat, for example, ask for a close, dry polymer-on-metal slide ending in a short steel latch click. Use the ElevenLabs sound-generation endpoint with `eleven_text_to_sound_v3`, explicit duration and output format. Its input is text. Prompt influence controls adherence to the description. Compare results to the reference locally. [API reference](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert)
3. Target **90/100 for each replacement**. In a level-matched, randomized A/B, score identity of the action and material (40 points), attack and contact timing (25), weight and tonal character (20), and decay and space (15). Treat this as an editorial listening score. Reject clipped takes, extra contacts, voices and audible music. Review the eight pilot pairs with Vincent before scaling.
4. Generate the 42 runtime takes next, counting accepted pilots toward the total. Generate the remaining unique cues by family. Use an explicit duration of at least 0.5 seconds, then trim leading silence and align the primary contact to the original cue. Keep masters in the highest lossless format the account supports. Match runtime format, headroom and trim to the existing bank.
5. Stage each accepted file under its existing name. Retain the lazy loading and synthesis fallback in shared/mech.js. Audition repeated rail clicks, magazine seating, charging and multi-part attachment changes in the workbench, and check the intro separately. Ship the runtime files after all 42 pass. Keep the rest of the replacements in the sound bank and provide a reference-to-replacement manifest and level-matched audition reel.
6. Before generation, check the account rate and quote a hard limit for the pilot, including retries, and obtain explicit approval. A pilot of eight cues, three attempts each and two seconds per request caps output at 48 generated seconds. Recalculate the production ceiling from actual durations and the remaining cue count after the pilot. Record every billable attempt, including timed-out requests, before retrying. [ElevenLabs API pricing](https://elevenlabs.io/pricing/api)
