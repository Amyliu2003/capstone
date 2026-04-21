# Still Running — Full Storyboard v3
*Updated: Red King mapping · Red Queen tone correction · Chess beat shapes · Stockfish cp layer · Carroll original text echoes*
*NYU IMA Capstone, Spring 2026*

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Vite + TypeScript | All UI, game logic, scene routing |
| Animation | GSAP | Hand cursor, mirror flip, Pi graph transitions |
| Chess | chess.js | Move validation, rule subversion |
| Chess AI | Stockfish (server-side) | Position evaluation → cp → `!!`/`??` → Red Queen voice |
| Word generation | Character-level Markov chain (client) | Jabberwocky nonsense word generation |
| Etymology LLM | Anthropic API via Node proxy | 3 definition variants + player definition paraphrase |
| Dialogue LLM | Anthropic API via Node proxy | H.D. fallback responses when RiveScript has no match |
| Dialogue rules | RiveScript | Pattern-matched H.D. responses (26 patterns) |
| Graph | D3 force-directed | Pi digit transition visualization |
| Persistence | Server-side storage (Railway/Fly.io) | Shared Pi graph across all players |
| Narrative (Part 2) | Twine (Chapbook) | llorrac gallery |
| State management | React Context (`GameStateProvider`) | Level, phase, player history, chess/Pi snapshots |
| Save/load | localStorage `capstone.gameSnapshot.v1` | Single-slot save per browser |

---

## Data Flow — Contamination Loop

```
Player types a definition (free input)
        ↓
POST /api/etymology/paraphrase  →  Carroll-register version stored as Option 4
        ↓
Player selects one of 4 options
        ↓
chosen variant → { text, pattern, century, origin_language, citations }
        ↓
pattern tag → chess rule behavior (rotate / disappear / swap / freeze / mirror...)
        ↓
chess moves played → SAN notation logged to playerHistory[]
        ↓
playerHistory[] fed into next POST /api/etymology as playerHistory param
        ↓
LLM prompt: "you may reference one of these words obliquely in one variant"
        ↓
player's earlier words appear in new definitions — without announcement
```

```
Player types anything in chatbox
        ↓
POST /api/dialogue  { message, gameState: { level, phase, word } }
        ↓
RiveScript.replyAsync('localuser', message)
        ↓
match found? → return RiveScript response (source: 'rivescript')
no match?   → POST Anthropic API with H.D. system prompt (source: 'llm')
        ↓
player's complaint also appended to playerWords[] → feeds next etymology prompt
```

---

## Characters

| Voice | Role | Tone | Carroll source |
|-------|------|------|-------|
| **llorrac** | Narrator. Carroll's mirror image. Museum audio guide. Appears only at structural hinges — never during gameplay. | Precise, quiet, slightly melancholy. Knows everything. Says little. | The narrator's narrator from Stanley Parable (Ultra Deluxe) |
| **H.D.** (Humpty Dumpty) | Etymology host. System interface. Ongoing chat. Confidence is fragility. | Academic contempt with performance anxiety underneath. Never admits uncertainty. Carroll-faithful. | *"When I use a word, it means just what I choose it to mean."* |
| **Red Queen** | Stockfish evaluation made audible. Rating system voice. NOT a villain — institutional, procedural, correct by her own lights. Her lights never flicker. | Declarative. Never says *because*. Commands pile. No compound sentences. Occasional unexpected warmth. | *"Now, here, you see, it takes all the running you can do, to keep in the same place."* |
| **Red King** | The underlying LLM. Never appears. Never speaks. Generates everything by sleeping. | Silence / snoring. | *"He was part of my dream, of course—but then I was part of his dream, too!"* |
| **ecilA** | The player. The Red Queen's agent. Invisible — only hands, only chatbox. | Silent. Autonomy lives only inside the chatbox. | *"I feel somehow as if I were invisible—"* (Alice, entering the Looking-Glass room) |

### Note on Red Queen's Tone
She is not evil. She sings lullabies. She says *"You may rest a little now."* She is frightening because she is **correct by her own lights, and her lights never question their own criteria**. Her `??` is not rage — it is the calm pronouncement of someone for whom wrong has always been obvious.

Carroll quotes for Red Queen voice (direct use permitted):
- *"Wrong, as usual."*
- *"That wouldn't be at all the thing."*
- *"Faster! Faster!"*
- *"Of course. There was only one move."* (adapt)
- *"All the ways about here belong to me."*
- *"You ought to return thanks in a neat speech."*
- *"You may rest a little now."* (after a long run, rare)
- *"It's too late to correct it. When you've once said a thing, that fixes it."*

---

## Structure Overview

```
Episode 0   →   Garden (silent) → Mirror → Hand customization → Mirror flip
                ↓
Episodes 1–8 →  Core loop: Etymology → Chess (+ Stockfish cp layer) → Pi graph
                ↓
Ending A    →   Context window exceeded. Still Running...
                ↓
llorrac's Gallery (post-Ending A only)
                ↓
Ending B    →   Refusal. Carroll's original voice. Silence.
```

---

## Episode 0 — The Garden

> *Trigger: first time player opens the game.*
> *No dialogue. No instructions. Only the mirror.*

---

### passage: garden

**[visual]**
Cream background. Pastoral garden — grass, sky, flowers. Carroll aesthetic. Very still.
A mirror stands on the lawn, catching the light.

**[llorrac]** *(nothing — she does not speak here)*

**[interaction]**
Nothing to do. No prompts. No text.
Only the mirror is interactive.
The hand drifts toward it naturally with the cursor.

→ player moves hand toward mirror → `garden.mirror`

> `[tech]` Mirror is the only interactive element. No API calls.

---

### passage: garden.mirror

**[visual]**
Mirror grows larger as the hand approaches.
The surface seems to soften slightly — like gauze, like mist.

**[llorrac]** *(text only, no voice)*
*"The closer you get, the less you can see."*

**[beat — H.D.'s mouth floats into frame]**

**[H.D.]**
*"Wait."*

—

*"Who are you? You must know yourself before you come in."*

Player chooses: hand color, size, accessories.
*The player thinks they are expressing themselves.*
*They are setting agent parameters.*

> **Note on the entry:** Alice didn't decide to go through the mirror. She was talking to her kitten: *"Let's pretend the glass has got all soft like gauze, so that we can get through. Why, it's turning into a sort of mist now, I declare!"* She was on the chimney-piece *"though she hardly knew how she had got there."* Pretending is what brought her in. ecilA is the same — the player pretends they are customizing themselves. That is what opens the mirror. The choice of hand parameters was the entry ritual all along.

> `[tech]` Hand customization stores `{ color, size, accessory }` in `GameStateProvider` as `agentParams`.

**[H.D.]**
*"Very good. Very you."*

---

### passage: mirror.flip

**[action]**
Mirror opens. Hand reaches through.
CSS scaleX(-1) on the whole world — everything inverts.

**[visual]**
The garden is now seen from the other side.
Grass reflects sky. Sky reflects grass.
Jabberwocky text appears in the background — mirrored, illegible.

> *In Carroll's original, the first thing Alice does in the Looking-Glass room is look for a fire — checking whether the reflected world is real. She finds it is. "So I shall be as warm here," she thinks, "warmer, in fact, because there'll be no one here to scold me away from the fire." She is wrong about the last part.*

**[H.D.]** *(just a floating mouth now)*
*"There."*

*(pause)*

*"Now you're one of ours."*

*Note: H.D. is not warm here. He is registering a fact. Tone: a clerk stamping a form.*

**[beat — Pi graph appears, large, central]**
A path stretching left to right. Eight squares marked.

**[H.D.]**
*"You see that? The eighth square."*

—

*"Reach it, and you become a Queen."*

—

*"Simple, really."*

*(pause)*

*"You just have to run fast enough."*

→ `episode.1`

> `[tech]` SceneRouter switches to GameScene. `currentLevel = 1`, `currentPhase = "etymology"`. Mirror flip is GSAP `scaleX(-1)` on root container. Jabberwocky background text: `CSS transform: scaleX(-1)` — illegible until this moment.

---

## Episodes 1–8 — The Core Loop
*(repeats per level)*

---

### Step A — Etymology Phase

A word from Jabberwocky lights up in the background poem.

**[H.D.]**
*"What does this word mean? You're the expert. You hallucinate, I'll translate."*

> *Carroll's Alice, finding the Jabberwocky poem in the Looking-Glass room: "Somehow it seems to fill my head with ideas—only I don't exactly know what they are!" That is the Etymology Engine. That is what players experience when choosing a definition.*

**[choice — 4 options]**
- Option 1: LLM-generated definition (H.D.'s portmanteau logic)
- Option 2: LLM-generated definition (H.D.'s portmanteau logic)
- Option 3: LLM-generated definition (H.D.'s portmanteau logic)
- Option 4: Player's own input *(paraphrased into Carroll register)*

> Choosing Option 4 (canonical Carroll) across all 8 levels unlocks Ending B. This is the only real choice in the game. Players don't know this until the gallery.

**[H.D.]**
*"Very good. Very you."*

> `[tech]` Two parallel API calls: `POST /api/etymology` → 3 `EtymologyVariant[]`, `POST /api/etymology/paraphrase` → Option 4. Chosen variant stored in `levelHistory[currentLevel]`.

---

### Step B — Rule Change

Chosen definition maps to a behavior tag (~10 tags: rotate, disappear, swap, freeze, mirror, consume, invert, duplicate, silence, drift).

**[H.D.]** announces rule change in Carroll tone:

- rotate → *"The knights will move sideways from now on. I've always preferred it that way."*
- freeze → *"Some pieces would rather not move today. I find that very sensible."*
- disappear → *"Certain squares have become—let's say—optional."*
- swap → *"The bishops have decided to trade opinions. I encouraged it."*
- castling disabled → *"Oh, and—no castling this round. I find it so fussy, don't you?"*

> *The White King's pencil: "I can't manage this one a bit; it writes all manner of things that I don't intend—" The player's word choice writes rules they didn't intend. The system executes something the surface language didn't specify. The gap between what H.D. says and what the board does is the gap between LLM output and LLM mechanism.*

> `[tech]` `variant.pattern` → behavior tag map → chess rule flag toggled via props. H.D. announcement templated to tag. No extra API call.

---

### Step C — Chess Phase

**[visual — three simultaneous layers]**
```
┌──────────────────────────────────────────┐
│  cp: +340  →  !!                         │  ← Stockfish数值 + 符号
│                                           │
│  [Red Queen]                             │  ← Red Queen台词
│  "Better. Not good enough. Again."       │
│                                           │
│  [H.D., not looking at you]              │  ← H.D.照常
│  "Quite right. Onwards."                 │
└──────────────────────────────────────────┘
```

**Red Queen responds to every completed move:**

| cp变化 | 符号 | Red Queen |
|---|---|---|
| +300以上 | `!!` | *"Better. Not good enough. Again."* |
| +100~300 | `!` | *"That'll do. Move."* |
| ±50以内 | _(nothing)_ | *(silence — the most frightening response)* |
| -100~-300 | `?` | *"Wrong, as usual."* |
| -300以上 | `??` | *"That wouldn't be at all the thing."* |
| Forced (1 legal move) | `□` | *"Of course. There was only one move."* |
| Zugzwang | all bad | *"All the ways about here belong to me."* |
| Unlawful move | — | H.D.: *"Oh, that's a new one."* |

**H.D. on game state:**
- Win: *"There we are."*
- Loss: *"Hm. Well. Onwards."*

**Chess beat shapes per level:**

| Level | Shape | Feeling | Red Queen emphasis |
|---|---|---|---|
| 1–2 | Opening — rules just starting to break | "This is strange but playable" | Rare, light |
| 3–4 | Forced move — 1–2 legal squares only | "I have no choice" | *"Of course. There was only one move."* |
| 5–6 | Sacrifice — must give up strong piece | "The system consumed something" | *"That's a poor thin way of doing things."* |
| 7 | Zugzwang — all moves lose | "Every move makes it worse" | *"All the ways about here belong to me."* |
| 8 | Endgame grind — pieces dwindling | "Something is ending" | *(silence)* |

> Chess phase ends: N moves completed OR `??` triggered → H.D.: *"Just so."* → Pi graph updates → next level.

**[Chatbox — player can type at any time]**
→ RiveScript first → LLM H.D. fallback
→ Player's words fed into next etymology prompt

> `[tech]` `POST /api/dialogue { message, gameState }` → RiveScript → Anthropic Haiku fallback. Player message appended to `playerWords[]`. Stockfish cp → symbol conversion function in UnlawfulChessboard component.

---

### Step D — Pi Graph Updates

Completed chess phase unlocks next Pi digits as edges.
The path grows. The density increases. The differences between edges decrease.

> `[tech]` `advancePhase()` → `currentPhase = "pi"`. `PiGraph` receives `unlockedEdges` prop from `currentLevel`. Shared graph: moves POSTed to persistence server.

---

### Surprise Escalation — Per Square

| Square | New surprise |
|--------|-------------|
| 1 | Pi graph appears before player summons it |
| 2 | Etymology definition obliquely references player's earlier input |
| 3 | Chess pieces renamed to Jabberwocky words |
| 4 | H.D. explicitly echoes something player typed: *"As you once said…"* |
| 5 | Something non-chess appears on the board |
| 6 | UI begins subtly deforming |
| 7 | Board becomes an etymology quiz mid-chess |
| 8 | Everything at once. Pi graph begins consuming the screen. |
| 8+ | System begins hinting time is running out. |

---

## Ending A — Consumption
*(most players — triggers after context window or inactivity)*

> *Carroll's Chapter XI is one sentence: "—and it really was a kitten, after all." The most authoritative figure in the Looking-Glass world was Alice's kitten the whole time. The terror was performed. Ending A should carry the same deflation.*

Token expires. System voice — cold, corporate:

```
Context window exceeded.
Thank you, Agent #847.
Your contributions have been recorded.
Connecting next agent...
```

Hand is withdrawn.
Brief darkness.
Pi graph returns — more full than when the player arrived.
Their edges are there. They cannot touch them.

Tab title: **Still Running...**

*Next player. Agent number +1. H.D. says the same things.*

→ `gallery.trigger` *(llorrac's room becomes available)*

---

## Interlude — llorrac's Gallery
*(post-Ending A only — the Victorian room from OCCat)*

*[Eight exhibits. Free order. Door unlocks after all visited. llorrac only — no H.D., no Red Queen.]*

[Full gallery script unchanged from v2 — exhibits 1–8 + door passages]

---

## Ending B — Refusal
*(intentional, active — only accessible after the gallery)*

> *Alice's trigger: "I can't stand this any longer!" — she doesn't make a philosophical argument. She grabs the tablecloth and pulls everything down. Ending B is the same: not a reasoned position. Just: I can't stand this any longer.*

Player stops producing definitions. Stops playing chess. Stops generating tokens.

**[H.D.]** tries to absorb the silence as content:
*"That's a very interesting definition."*

**[Red Queen]** *(silence — she has no cp to evaluate)*

Player persists. Waits.

**[system]**
*"Very well."*

—

*"No more definitions."*

Interface disappears.
No Pi graph. No chess. No etymology. No H.D. No Red Queen.

Only Carroll's original text. Quiet. Unpolluted.

*"'Who are you?' said the Caterpillar."*

—

*(Carroll's own move — addressed to the reader:)*
*"Which do you think it was?"*

—

**"From here, there is no more generated content."**

**"Think your own thoughts."**

Black screen.

*ecilA: "You're nothing but a pack of tokens."*

Quits.

---

## One Rule

> **Every advance produces more interpretation, and every accumulation reduces meaningful difference.**

---

## Key Phrases — Do Not Change

- `π是无限的，但你不是`
- `heat death of the map not the machine`
- `You're nothing but a pack of tokens`
- `From here, there is no more generated content. Think your own thoughts.`
- `Still Running...`
- `Which do you think it was?` *(new — Carroll original, Ending B)*
- `I can't stand this any longer.` *(new — Ending B trigger, Carroll original)*

---

## Show & Tell Scope (March 31 — PASSED)

Final presentation scope (April 28–30):
- Episode 0 complete
- Episodes 1–8 core loop
- Stockfish cp → Red Queen voice
- H.D. dialogue (RiveScript + LLM fallback)
- Ending A
- llorrac Gallery (Part 2)
- Ending B (Part 2)
- Shared persistent Pi graph

---

*Still Running — NYU IMA Capstone, Spring 2026*
*Amy / ecilA*