DESIGN_DOC
game_name: decisive-moment
display_name: Decisive Moment

---

## Identity

**Game Name:** Decisive Moment
**Tagline:** *The world moves without you. Your job is to see the frame before it exists.*

**Protagonist:** Mara — a 34-year-old street photographer with a battered Leica M6 and a brown leather strap worn pale at the shoulder. She moves through cities the way water finds cracks: invisible, patient, already there. She is not the story. She is the eye.

**Backstory:** Mara has been shooting the same street corner for seven years — Rue de la Paix, Osaka, a fish market in Lisbon. She's never missed a decisive moment she recognised. She has missed thousands she didn't. This is the year she stops missing.

**World:** Five real-feeling urban locations: a golden-hour Lisbon square, a Tokyo covered market, a Paris side street in rain, a New York rooftop at dusk, a Rome piazza at noon. Each location has its own light character, subject type, and ambient rhythm. These places breathe — pigeons land without being called, shadows rotate with the sun, strangers stop to talk and move on.

**Feel:** Stillness charged with potential. The quiet before. Like watching a jazz musician set up: nothing is happening, and everything is about to.

**Emotional Experience:** The satisfaction is not reaction speed — it is *recognition*. You feel the triple alignment approaching like a chord resolving. When you press at the exact right moment, something loosens in your chest. When you press a beat early, the sound tells you exactly how wrong you were.

**Reference Games:** Thumper (rhythm as physical violence), Inside (world indifferent to your presence), Monument Valley (geometric beauty, deliberate pace), Rez (feedback that rewards precision with sensation).

---

## Visual Spec

- **Background:** `#E8D5B0` — warm golden-hour parchment tan. Feels like a sun-faded photo. All levels use this as base warmth, with location-specific tinting applied as overlays.
- **Primary (Shadows/Subjects):** `#2C5F4A` — deep teal. Used for subject silhouettes, architectural shadows, and crowd depth.
- **Secondary (Midtones):** `#8B6B47` — aged leather. Used for building facades, street textures, and background figures.
- **Accent (Light Events):** `#F4A822` — amber. Used for the light quality indicator, alignment flash, and the "perfect shot" bloom burst.
- **Danger Accent:** `#C8392B` — dark red. Used for the score-penalty shutter misfire flash and the composition breakdown indicator.

**Bloom:** Yes. Strength 0.6, threshold 0.75. Bloom fires only on the amber light-quality element when it peaks — the scene visibly breathes in that moment, like a lens flare caught in film.

**Vignette:** Yes. Persistent. 40% opacity at edges, radius 65% of screen. Simulates the viewfinder frame. Slightly heavier (55% opacity) during rain levels.

**Camera Angle:** First-person, fixed. The viewfinder occupies 80% of the screen — slightly letterboxed. A faint rule-of-thirds grid overlays the viewfinder at 8% opacity (white lines, always visible). The remaining 20% is the camera body — suggested by a slim dark border at the bottom edge with a faint grip texture.

**Player Silhouette:** *Rectangular viewfinder with rounded corners.* This IS the player — Mara's eye and the camera are one. You never see her. You are her. The "silhouette" is the frame itself: the four corners of the viewfinder that tighten slightly when all three elements align.

---

## Sound Spec

**Music Identity:**
- Genre/vibe: Late-night West Coast jazz. Sparse, unhurried. The kind of music playing in the back of a film camera shop at closing time.
- Character personality sentence: "A musician who knows when not to play."
- **The Hook:** The trumpet plays a 4-note ascending motif (E♭–G–B♭–D♭) on every perfect shot. It doesn't play during gameplay — it only resolves when you earn it. The first time you hear it complete, you understand the whole game.

**BPM:** 78
**Bar Length:** 4/4
**Loop Length:** 32 bars (base loop); 8-bar extension on state changes

**Arrangement:**

| Instrument | Tone.js Synth | Role | Entry/Exit |
|---|---|---|---|
| Upright Bass | `Synth` with triangle oscillator, attack 0.01, release 0.8, low-pass filter cutoff 400Hz | Walking bass line, rhythmic anchor, plays every bar | Always present from first downbeat |
| Brushed Snare | `NoiseSynth` with bandpass filter 1800Hz, decay 0.15 | Whisper rhythm on beats 2 and 4; louder on misfire (see SFX) | Always present |
| Solo Trumpet | `Synth` with sawtooth oscillator, attack 0.12, release 1.2, slight vibrato LFO 5Hz | Plays the Hook only on perfect-shot trigger | Absent during gameplay; fires on shot confirm only |
| Piano (comping) | `PolySynth` with sine oscillator, attack 0.04 | Sparse chord stabs on off-beats (bars 2, 4, 6) — never on the downbeat | Enters at Level 2 |
| Muted Trumpet (background) | `Synth` with triangle, attack 0.08, heavy reverb send 0.7 | Counter-melody fragments, 1–2 notes per 4 bars, never resolves | Enters at Level 3 |
| Rain Texture (Level 4 only) | `NoiseSynth` low-pass cutoff 200Hz, sustained | Ambient under-layer, weather bed | Enters on Level 4 load, fades out on level exit |

**Dynamic Music — State Changes:**

1. **Normal (idle, watching):** Full arrangement at volume 0.6. Bass walking, snare whispering, piano comping. The muted trumpet floats unresolved.
2. **Near Alignment (2 of 3 elements peaked):** Piano drops out. Bass continues. Snare stops on 2 and 4 and moves to a single tick on beat 1 only. Silence where the chord was — pressure by subtraction. Arrangement volume drops to 0.45.
3. **Perfect Shot Fired:** All rhythm stops instantly. 0.3s of pure silence. Then the full solo trumpet Hook plays the 4-note motif once, clean, with slight cathedral reverb (reverb decay 2.8s). Then music resumes from next bar 1.
4. **Misfire (shot taken, poor alignment):** Snare fires a single loud crack (NoiseSynth decay 0.4, volume 0.9) on the wrong beat — like a snare hit where there should be a rest. Music continues but the piano comping skips the next 2 bars as if flinching.
5. **Level Complete:** Arrangement swells to volume 0.9, all instruments together for 8 bars. Trumpet plays the Hook twice — second time with piano harmonising below it.
6. **Death/Fail (ran out of shots, no qualifying image):** All instruments cut. A single sustained bass note (low E♭) fades in over 2s and fades out over 3s. Like the last note of a session.

**Start Screen Music:** The bass walks alone for 8 bars. Piano enters with two sparse chord stabs. The muted trumpet plays 3 notes of the Hook — but stops before the 4th. The silence where the last note should be is the entire pitch of the game.

**Sound Effects (minimum 8):**

1. **Perfect Shutter** — `Synth` triangle wave, very short: attack 0.001s, release 0.06s, pitch D5. Followed by a reverb tail (decay 1.8s, wet 0.4). Sounds like a mechanical click inside a cathedral. This is the most important sound in the game. It must feel clean, analogue, irreplaceable.

2. **Misfire Shutter** — Same `Synth` triangle but pitch B♭4 (slightly flat), attack 0.001s, release 0.04s, no reverb. Dry. Wrong. The absence of reverb tells you everything.

3. **Near-Alignment Hum** — `Synth` sine wave, pitch A3, fade in over 0.4s, fade out over 0.2s. Barely audible (volume 0.12). Plays when 2 of 3 elements are aligned simultaneously. Subconscious signal — players notice it after 20 minutes of play, not before.

4. **Element Peak Tick** — `MetalSynth` with high harmonic ratio, decay 0.05s, frequency 800Hz. One tick per element as it crosses its peak. Subject pose peak = one tick. Light peak = one tick. Background event peak = one tick. Never all three ticks at once unless it's a triple alignment.

5. **Film Advance** — `NoiseSynth` bandpass 3000Hz, decay 0.08s. The mechanical winding sound after every shot (successful or misfire). Confirms the shot was registered. One shot used.

6. **Viewfinder Corner Tighten** — `Synth` pure sine, very high: 2400Hz, attack 0.001s, release 0.02s, volume 0.08. Four rapid pings (one per corner) as the viewfinder frame physically tightens on triple alignment. Players learn this means: *now.*

7. **Gallery Applause (Level 3 Gallery Moment)** — `NoiseSynth` broadband, slow fade in over 1.5s, peak volume at 0.7, fade out over 3s. Layered with 3 distinct crowd murmur samples (each a short NoiseSynth burst at different filter frequencies: 400Hz, 800Hz, 1200Hz) randomised at 0.2–0.8s intervals.

8. **Portrait Tear (Level 3, perfect shot only)** — A single high piano note (C6, `PolySynth`, decay 2s) played pianissimo (volume 0.15), perfectly timed with the visual tear appearing on the painted portrait. This note is not in the base musical key. It's slightly out of place. That's the point.

9. **Rain Ambience (Level 4)** — `NoiseSynth` low-pass 250Hz, sustained at volume 0.3, with occasional `NoiseSynth` bursts (100ms, higher cutoff 600Hz) for individual raindrops on glass.

10. **Lightning Strike (Level 4, climax background event)** — `NoiseSynth` full spectrum, attack 0.001s, decay 0.3s, volume 0.8, followed by low-frequency rumble (`Synth` sine 60Hz, decay 1.5s). The thunder is the background element peak for Level 4.

---

## Mechanic Spec

**Core Loop (one sentence):** Watch three independently-cycling elements — Subject Pose, Light Quality, and Background Event — and press the shutter at the exact moment all three simultaneously peak, earning score based on alignment precision.

**The Three Elements:**
- **Subject Pose (S):** The human subject moves through a natural behavior cycle. A pose score of 0–100 reflects how "photogenic" or emotionally expressive the pose is at any given moment. The cycle is sinusoidal with a flat top (the peak is held for a brief window).
- **Light Quality (L):** The light (sun angle, shadow movement, ambient warmth) cycles through quality states 0–100. Peaks when golden-hour light falls directly across the subject's face or when a shadow creates compositional contrast.
- **Background Event (B):** A third environmental element (pigeon landing, shadow crossing, lightning, second subject turning) moves on its own cycle 0–100. Peaks at the single most visually resonant moment of its animation.

**Input:**
- **Pointerdown:** Fires the shutter. One shot consumed. Score is calculated instantly based on current S, L, B values. No hold. No release timing. The decision is made in the press. This is photography.
- **Pointerup:** No effect.
- **Pointermove:** No effect. There is no aiming. The viewfinder is fixed. You compose by waiting.

**Alignment Score Calculation:**
- Score per shot = `(S/100) × (L/100) × (B/100) × 1000`
- Maximum score per shot: 1000 points
- Triple alignment (all three ≥ 85) = "Decisive Moment" — bonus +500 points, trumpet Hook fires
- Two-element alignment (any two ≥ 85, third < 60) = "Near Miss" — score as calculated, no bonus, misfire shutter sound
- One or zero elements at peak = "Blown Frame" — score below 200, misfire sound, score displayed in red

**Anticipation Bonus:**
- If the player presses exactly within 50ms of the mathematically-computed triple-alignment peak (before the peak is visually obvious — i.e., the peak hasn't yet been held for more than 50ms), score +300 "Anticipation" bonus.
- This rewards players who have memorised cycle lengths and predicted the frame rather than reacted to it.
- Visual indicator: a small "◈ ANTICIPATED" badge appears in the corner of the developed photo.

**Cycle Parameters (per element, per level):**

| Level | Subject Cycle (ms) | Subject Peak Window (ms) | Light Cycle (ms) | Light Peak Window (ms) | BG Event Cycle (ms) | BG Peak Window (ms) |
|---|---|---|---|---|---|---|
| 1 | 4200 | 800 | 3100 | 1000 | — (no BG element) | — |
| 2 | 3800 | 600 | 2700 | 700 | 5500 | 500 |
| 3 | 3200 | 500 | 2300 | 500 | 4800 | 400 |
| 4 | 2600 | 350 | 1900 | 400 | 3800 | 350 |
| 5 | 2200 | 250 | 1700 | 280 | 3200 | 250 |

*Note: No two cycles share a common factor below 600ms — they will never sync predictably by accident. The 10x player must calculate, not feel.*

**Shots Per Level:** Each level gives Mara exactly 12 frames of film. No reloads. The level ends when all 12 shots are taken, or when the player presses the advance-to-develop button (bottom corner — only available after 6 shots minimum). The 3 highest-scoring shots are used to calculate the level score.

**Win/Lose:**
- **Level Complete:** Top-3 average score ≥ 450 points. (Achievable with consistent near-miss shots; requires at least one good alignment.)
- **Level Fail:** Top-3 average score < 200. The roll develops to mostly dark, blurry frames. Mara reloads. Replay from same level.
- **Perfect Roll:** Top-3 average ≥ 800. Unlocks a bonus gallery frame shown at level end — a wider, cinematic crop of the best shot with a location-specific caption in Mara's handwriting.

**Score System:**
- Per-shot score: 0–1800 (base 1000 + anticipation 300 + decisive bonus 500)
- Level score: sum of top 3 shot scores, max 5400
- Total game score: sum of all 5 level scores, max 27000
- Score is displayed in the corner of each developed photo, styled as a handwritten number with an underline — like a photographer's contact sheet markup.

---

## Level Design

### Level 1 — "Lisbon, 4pm"
**Location:** Sun-drenched Lisbon square. Terracotta tiles, a fountain, warm lateral afternoon light.
**Subject:** An old man, António, reading a newspaper on a bench. He looks up occasionally — that's his pose peak (face to camera, eyes crinkled, newspaper lowering). The peak lasts 800ms. There is no background element in Level 1.
**What's New:** Introduction. Two-element alignment only (Subject + Light). Light peaks as sunlight crosses his face fully (shadow off entirely). The game teaches that waiting is the mechanic.
**Exact Parameters:** Subject cycle 4200ms, peak 800ms. Light cycle 3100ms, peak 1000ms. 12 shots, 36 seconds of patience minimum to see 2 full S cycles.
**Duration/Goal:** Average 450 to pass. A first-time player will pass by shot 8. A skilled player will recognise the cycles by shot 4 and anticipate by shot 7.
**Emotional tone:** Tutorial as poetry. This should feel like the first sentence of a very good book.

---

### Level 2 — "Tokyo Market, Morning"
**Location:** Covered Tsukiji-adjacent market. Blue tarps, steel tracks, fish-mongers. Cooler light, more shadow contrast.
**Subjects:** Two fish vendors mid-argument — Kenji and his younger cousin. Their interaction cycle: calm → gesture → lean in → moment of laughter → look away → reset. The "laughter lean" is the pose peak for the subject element.
**Background Event:** A cat threads between their legs on a 5500ms cycle. Its peak: pausing mid-frame, sitting back on haunches for 500ms before moving on.
**Light:** Shaft of market skylight sweeps slowly across the frame, 2700ms cycle. Peak: direct overhead light creates harsh downward shadow under both men's chins — a dramatic look.
**What's New:** Third element introduced. The cat cannot be commanded. The market cannot be commanded. The player learns to hold.
**Goal:** Top-3 average ≥ 450. At least one decisive moment is achievable every ~28 seconds of triple-alignment opportunity. A skilled player times the cat.
**Emotional tone:** The world has gotten more complex. But it's beautiful complex.

---

### Level 3 — "Paris Side Street + Gallery Reveal"
**Location:** Rue du Faubourg, afternoon into early evening. A cobblestone side street. A couple arguing quietly near a doorway. A dog sitting in a doorway opposite.
**Subjects:** The couple (Elise and Thomas). Pose peak: Elise turns away, Thomas reaches toward her shoulder — the unclosed gesture, the tension between contact and space.
**Background Event:** A second-floor shutter swings open on a 4800ms cycle. Its peak: fully open, framing a silhouetted figure in the window directly behind the couple — unintentional depth.
**Light:** Long shadow from a passing truck sweeps the frame on a 2300ms cycle. Peak: shadow bisects the frame exactly on the rule-of-thirds vertical line, splitting warmth and cool.
**What's New:** Emotional content in the subject. The player is photographing something private. The world-is-ignoring-you feeling is at its height.
**Duration/Goal:** Same as Level 2 pass threshold (450). But the moment it matters is the Gallery Reveal.

**THE GALLERY REVEAL (Level 3 End Sequence):**
After the level ends, a cut to black. A single sound: film advancing through a projector. Then: a white gallery wall, lit from above. Three developed prints are pinned to the wall — Mara's three best shots from this level, rendered exactly as taken. Small, tasteful. Gallery-goers (5 silhouetted figures) stand below, backs to camera. They look at the photos.

- Top-3 average < 450: Polite, distant silence. One figure leans toward another and whispers something. Mild applause — 3 seconds, scattered.
- Top-3 average 450–700: Engaged murmur. A figure steps closer to one photo. Sustained applause — 6 seconds.
- Top-3 average 700–900: A collective exhale. Two figures turn toward each other with a visible reaction. Long applause — 9 seconds.
- Top-3 average > 900 (the Perfect Roll): The room goes quiet first. A beat of silence. Then one figure brings their hand to their mouth. Then the full room applauds — 12 seconds. And in the painted portrait on the wall behind the crowd (a 19th-century oil painting of a woman, always present but unremarkable until now) — a single tear appears beneath her eye. It's painted. It wasn't there before. The piano's out-of-key C6 note sounds once, pianissimo.

This sequence plays once per playthrough regardless of score. The tear is only for the perfect score.

---

### Level 4 — "Paris in Rain, Night"
**Location:** Same Rue du Faubourg — but it's raining. Night. The golden warmth is gone. Wet cobblestones reflect streetlamps in amber. A woman (Claudette) stands under an awning with a cigarette.
**Subject:** Claudette's pose peak — she tips her head back slightly, exhaling smoke, eyes closed, face fully open to the camera. Cycle 2600ms, peak 350ms. The window is genuinely short now.
**Background Event:** Lightning. A storm cycle: 3800ms of building (sky brightens incrementally through a blue-grey gradient), then a 350ms lightning strike peak (white flash behind the buildings), then reset to dark. The lightning is the most visually dramatic BG peak in the game.
**Light:** A bus passes on the street at 1900ms cycle. Its headlights sweep across Claudette's face at the peak — 400ms of golden headlight warmth against cold rain.
**What's New:** Difficulty escalates. Short peak windows. The emotional register shifts — this is not warmth, it's endurance. The rain ambience sounds throughout. The level is harder but the subject is more compelling.
**Goal:** Top-3 average ≥ 500 to pass (slightly raised threshold — this is the dramatic act).
**Emotional tone:** The groove is gone. This is work. Beautiful, dangerous work.

---

### Level 5 — "Rome Piazza, Noon"
**Location:** A wide Roman piazza. Harsh noon light — no golden hour mercy. Hard shadows, blown highlights, the kind of light photographers avoid. But Mara doesn't avoid. She adapts.
**Subject:** A nun (Sister Maria) crossing the piazza with a gelato, alone. Her peak: she stops, looks at the gelato with unexpected delight — a private moment of joy mid-crossing. Cycle 2200ms, peak 250ms. 250ms. A quarter second. This is the discipline the game has been building toward.
**Background Event:** A tourist (oblivious) wanders into the back of the frame on a 3200ms cycle. Their peak: pausing to check their phone, accidentally creating a perfect compositional counterpoint — focused religious figure in front, distracted tourist behind.
**Light:** The harsh noon light creates a moving circular spotlight from a reflection off a parked car's windshield. Cycle 1700ms, peak 280ms. When it hits, it hits hard — amber accent over Sister Maria's face, gone in an instant.
**What's New:** No forgiveness. The peaks are short. The cycles are fastest yet. But the player knows the game now. The anticipation bonus is now worth more because experienced players can calculate the triple alignment 4–6 seconds in advance and compose mentally before the frame arrives.
**Goal:** Top-3 average ≥ 550 to pass. Anticipation bonus is the margin between a good player and a great one.
**Emotional tone:** Mastery. This is why you learned to wait.

---

## The Moment

End of Level 3, perfect roll: the painted woman in the gallery cries. Not animated tears, not particles. A single brushstroke of watercolour blue appears beneath her eye — as if it was always there in the painting, as if it was always waiting for someone to take a photo worth weeping over. The piano note is wrong, and it is perfect.

---

## Emotional Arc

**First 30 seconds:** One subject. Obvious timing. The shutter clicks and echoes. *Oh. That's what this sounds like when it's right.* The player learns one truth: waiting is not passive.

**After 2 minutes:** The cat threads through the market. The subjects laugh. The light shaft moves. Three cycles running at three speeds. The player feels the pull of approaching alignment the way you feel a chord moving toward resolution. *I'm not reacting. I'm conducting.*

**Near win (final shots of Level 5):** 250ms windows. The cycles are almost too fast to consciously track. But the player has memorised the rhythms — they feel them now, not count them. They compose four seconds before the moment arrives. The shutter fires exactly on beat. The trumpet plays. The echo fades. There is no better feeling.

---

## Identity Line

*"This is the game where you learn that patience is a skill, timing is an art, and the right moment only happens once."*

---

## Start Screen

**Location:** Lisbon square, idle — the same setting as Level 1, but Mara hasn't pressed the button yet.

**Idle Animation (named objects, exact values):**

- **António** (the old man from Level 1): sits on his bench, reading. Every 4.0s, he lowers the newspaper 12px and looks up for 1.2s, then raises it again. Movement: sinusoidal ease in/out.
- **Fountain spray:** 3 water arcs, each oscillating ±6px amplitude on a 1.8s cycle. Slight spray particle effect: 8 small circles, opacity 0.3, radius 2px, rising 20px then fading.
- **Sun shadow (building edge):** Creeps across the background at 2px/s from left edge. At 600px it resets to 0px over a 0.5s fade transition (day cycling very slowly).
- **Pigeon (unnamed, city-standard):** Lands in the lower-right quadrant of the viewfinder every 9.0s. Sits for 2.5s (bobbing head animation: ±3px, 0.4s cycle). Takes off (exits frame upward right at 180px/s) then respawns after 6.5s wait. Landing and departure generate the Element Peak Tick SFX at low volume (0.15).
- **Viewfinder corners:** Pulse very gently — scale 1.0 → 1.008 → 1.0, every 3.2s. Barely noticeable. The game breathing.
- **Film counter:** Shows "36" in a small mechanical counter widget in the lower-right of the camera body border. The numbers are slightly worn, analogue.

**Title Text:** "DECISIVE MOMENT" displayed in the viewfinder center area, above the rule-of-thirds center.

**SVG Title (Option A — REQUIRED):**
```
<svg>
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <text
    x="50%" y="42%"
    text-anchor="middle"
    font-family="'Courier New', monospace"
    font-size="28px"
    font-weight="normal"
    letter-spacing="8px"
    fill="#2C5F4A"
    filter="url(#glow)"
    opacity="0.92"
  >DECISIVE MOMENT</text>
  <text
    x="50%" y="52%"
    text-anchor="middle"
    font-family="'Courier New', monospace"
    font-size="11px"
    letter-spacing="4px"
    fill="#8B6B47"
    opacity="0.7"
  >a game by mara</text>
</svg>
```
Animation: The title text fades in over 1.8s on load (opacity 0 → 0.92). After 6s of idle, it pulses once — opacity drops to 0.5 over 0.4s, returns to 0.92 over 0.6s — like a light source shifting. Repeats every 12s.

**SVG Iconic Silhouette (Option B — INCLUDED, game identity strongly benefits):**
A minimal camera body silhouette, 5 primitives, positioned below the title text:
- `<rect>` body: 48×32px, rx 3, stroke `#2C5F4A`, stroke-width 1.5, fill none
- `<circle>` lens: cx center, cy center-2, r 10, stroke `#2C5F4A`, stroke-width 1.5, fill none
- `<circle>` inner lens ring: same cx/cy, r 6, stroke `#F4A822`, stroke-width 1, fill none, opacity 0.6
- `<rect>` viewfinder: 8×6px, top-right corner of body, stroke `#2C5F4A`, stroke-width 1, fill none
- `<line>` shutter button: top-center of body, 4px wide, stroke `#2C5F4A`, stroke-width 2
Drop shadow: `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#2C5F4A" flood-opacity="0.3"/>`
This silhouette pulses on the start screen trumpet's 3-note incomplete Hook — it brightens (amber tint on the inner lens ring, opacity 0.6 → 1.0) on each of the 3 notes, then fades back as the 4th note doesn't come.

**"Press anywhere to begin" prompt:** Appears after 3.0s of start screen idle. Font: Courier New, 10px, letter-spacing 3px, color `#8B6B47`, opacity 0.0 → 0.6 over 0.8s. Blinks every 2.0s (opacity 0.6 → 0.2 → 0.6 over 0.5s per cycle).

---

## Closing Note for Programmer

The game's entire emotional architecture lives in three things: the silence before the perfect shutter click, the echo after it, and the trumpet that only resolves when you earn it. If those three things feel exactly right, the game feels exactly right. Everything else is set dressing.

Build the audio first. Test the shutter sound a hundred times. It must feel like a cathedral click.

END_DESIGN_DOC
