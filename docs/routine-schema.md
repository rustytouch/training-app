# Routine schema

**Purpose:** a single JSON format that describes both mobility routines and strength sessions, so the app has one runner and one importer.

**Status:** v1 draft. Fix this before writing app code.

---

## Design rules

1. One schema for both session types. A mobility step and a strength step differ only in field values, not in structure.
2. The app runs routines. It does not generate or progress them. Progression means a new version of the routine file.
3. The app logs what the routine tells it to log, per step. Mobility steps usually log nothing beyond completion.
4. Unknown fields are ignored rather than rejected, so an older app build still runs a newer routine.

---

## Routine object

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Stable across versions. Kebab case. |
| `version` | integer | Increments when the prescription changes. |
| `name` | string | Display name. |
| `type` | `mobility` \| `strength` | Affects default UI only. |
| `equipment` | string[] | Shown before you start. |
| `estimatedMinutes` | integer | Shown in the routine list. |
| `steps` | Step[] | Ordered. |
| `variants` | Variant[] | Optional. Named alternatives, for example short on time. |
| `notes` | string | Optional. Free text shown on the routine screen. |

## Step object

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Unique within the routine. Variants reference these. |
| `name` | string | Display name. |
| `cue` | string | One or two sentences. Shown during the step. |
| `sides` | `none` \| `leftRight` \| `alternating` | `leftRight` runs all sets on one side, then the other. `alternating` switches within the set. |
| `sets` | integer | Defaults to 1. |
| `extraSets` | object | Optional. For example `{"right": 1}` for an asymmetric extra set. |
| `work` | Work | See below. |
| `restSeconds` | integer | Rest between sets. 0 means no rest screen. |
| `load` | Load | Optional. Omit for bodyweight. |
| `log` | string[] | What the runner asks you to record. Empty means tick complete only. |

### Work object

Either a timed step:

```json
{ "mode": "time", "seconds": 30 }
```

Or a counted step:

```json
{ "mode": "reps", "reps": 8, "tempo": "3-1-1", "label": "slow breaths" }
```

`tempo` and `label` are optional. `label` overrides the word "reps" in the display.

### Load object

```json
{ "equipment": "dumbbell", "prescribed": "2 x 12kg" }
```

`equipment` is one of `bodyweight`, `dumbbell`, `kettlebell`, `band`.

### Log values

`weight`, `reps`, `rpe`, `seconds`, `note`. The runner shows one input per value after each set.

### Variant object

```json
{
  "id": "short",
  "name": "Short on time",
  "includeSteps": ["breathing", "hip-switches", "deep-squat"],
  "overrides": { "adductor-lift": { "sets": 1, "work": { "mode": "reps", "reps": 4 } } }
}
```

`includeSteps` filters the step list. `overrides` merges into the named steps. Use either or both.

---

## Worked example: daily mobility routine

```json
{
  "id": "daily-mobility",
  "version": 1,
  "name": "Daily mobility routine",
  "type": "mobility",
  "equipment": ["yoga mat"],
  "estimatedMinutes": 10,
  "notes": "Barefoot, before breakfast. Change nothing for the first two weeks.",
  "steps": [
    {
      "id": "breathing",
      "name": "Crook-lying breathing with posterior tilt",
      "cue": "Knees bent, feet flat. Exhale fully, let the ribs drop and the lower back flatten towards the mat. Hold empty for 2 seconds, then inhale without losing it.",
      "sides": "none",
      "sets": 1,
      "work": { "mode": "reps", "reps": 6, "label": "slow breaths" },
      "restSeconds": 0,
      "log": []
    },
    {
      "id": "cat-cow",
      "name": "Cat-cow",
      "cue": "Move one segment at a time rather than hinging at one spot.",
      "sides": "none",
      "sets": 1,
      "work": { "mode": "reps", "reps": 8 },
      "restSeconds": 0,
      "log": []
    },
    {
      "id": "hip-switches",
      "name": "90/90 hip switches",
      "cue": "Both knees at 90 degrees, one leg front, one to the side. Rotate the knees across without using your hands. Pause 1 second at each end.",
      "sides": "alternating",
      "sets": 1,
      "work": { "mode": "reps", "reps": 8, "label": "switches per side" },
      "restSeconds": 0,
      "log": []
    },
    {
      "id": "adductor-lift",
      "name": "Side-lying adductor lift",
      "cue": "Top leg bent, foot planted in front. Lift the bottom leg towards the ceiling, squeeze at the top, lower over 3 seconds.",
      "sides": "leftRight",
      "sets": 1,
      "extraSets": { "right": 1 },
      "work": { "mode": "reps", "reps": 6, "tempo": "1-3-3" },
      "restSeconds": 0,
      "log": []
    },
    {
      "id": "hip-extension",
      "name": "Half-kneeling hip extension",
      "cue": "Ribs down, squeeze the back glute. Do not let the lower back arch to create the range.",
      "sides": "leftRight",
      "sets": 1,
      "work": { "mode": "time", "seconds": 30 },
      "restSeconds": 0,
      "log": []
    },
    {
      "id": "deep-squat",
      "name": "Deep squat hold",
      "cue": "Heels down if you can, elbows inside the knees, press the knees out gently. Stand up between rounds.",
      "sides": "none",
      "sets": 3,
      "work": { "mode": "time", "seconds": 30 },
      "restSeconds": 15,
      "log": []
    }
  ],
  "variants": [
    {
      "id": "short",
      "name": "Short on time",
      "includeSteps": ["breathing", "hip-switches", "deep-squat"]
    },
    {
      "id": "stiff",
      "name": "Stiff or tired",
      "overrides": {
        "adductor-lift": {
          "extraSets": {},
          "work": { "mode": "reps", "reps": 4, "tempo": "1-3-3" }
        }
      }
    }
  ]
}
```

## Worked example: a strength step

Shows the fields a mobility step leaves empty.

```json
{
  "id": "goblet-squat",
  "name": "Dumbbell goblet squat",
  "cue": "Hold one dumbbell at chest height. Sit between the hips, keep the ribs down.",
  "sides": "none",
  "sets": 3,
  "work": { "mode": "reps", "reps": 8, "tempo": "3-1-1" },
  "restSeconds": 90,
  "load": { "equipment": "dumbbell", "prescribed": "1 x 20kg" },
  "log": ["weight", "reps", "rpe"]
}
```

---

## Runner behaviour

The runner flattens a routine into a queue before it starts. Each queue item is one set of one step on one side.

1. Expand each step into `sets` items, plus any `extraSets` on the named side.
2. For `sides: "leftRight"`, run all sets on the left, then all sets on the right. Append extra sets to the relevant side.
3. For `work.mode: "time"`, run a countdown automatically and advance on a cue. For `work.mode: "reps"`, wait for a tap.
4. Insert a rest screen after a set when `restSeconds` is above 0 and another set follows.
5. After each set, show one input per entry in `log`. Skip the screen entirely when `log` is empty.
6. On finish, write one session record and return to the routine list.

## Session record

```json
{
  "sessionId": "2026-08-30T07:12:00Z",
  "routineId": "daily-mobility",
  "routineVersion": 1,
  "variantId": null,
  "completedAt": "2026-08-30T07:22:41Z",
  "entries": [],
  "note": ""
}
```

`entries` holds one object per logged set: `stepId`, `side`, `setNumber`, and the recorded values.

---

## Build order

1. Write the schema as a TypeScript type and a Zod validator. Commit the two example routines as fixtures.
2. Build the runner against a hardcoded routine. No storage, no list screen. This is the part you use daily, so get it right first.
3. Add the routine list and import. Import accepts a pasted JSON string or a picked file, validates it, and rejects with a readable error.
4. Add the session log in IndexedDB, plus a plain JSON export button.
5. Add the service worker and web app manifest last, once the app is worth installing.

The export button in step 4 is how weekly check-ins work: you export, paste the JSON into the project, I read the sessions.

## Stack

Vite, React, TypeScript. No backend, no database server, no accounts. Zod for import validation. Host on GitHub Pages so the installed version runs over HTTPS, which the service worker requires.

During development, run `vite dev --host` on your laptop and open the LAN address on your phone. Installing to the home screen only works from the hosted HTTPS build or localhost.

## Deliberately out of scope for v1

Charts, streaks, progression rules, cloud sync, notifications, an exercise library, video demonstrations, and editing routines in the app. Routines are authored as JSON and imported.
