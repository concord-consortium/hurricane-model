# Wider pressure system ranges

Date: 2026-09-15
Branch: `hurr-58-pressure-range`

## Goal

The project team wants pressure systems to become more powerful, reflecting a changing
climate. The requested user-facing ranges are:

- High pressure: 1015 → 1030 mb (currently 1015 → 1028)
- Low pressure: 1010 → 990 mb (currently 1010 → 997)

The team confirmed this is a **physics** change, not a relabeling: the strongest setting
must actually produce stronger winds. The weak ends of both ranges stay where they are, so
this extends the top of the range rather than shifting the whole range up. Existing default
systems and saved student work keep their current behavior.

## Current state

`strength` (m/s) is the only quantity the simulation uses. The mb value is a display label
derived from it in `src/utils/pressure-systems.ts`:

```ts
export const minStrength = 3;
export const maxStrength = 20;
export const mbLabelRange = 13;

strengthToMb = high ? 1015 + norm * 13   // 1015 → 1028
                    : 1010 - norm * 13   // 1010 →  997
```

One shared strength range and one shared mb span serve both types. The requested ranges are
asymmetric — high spans 15 mb, low spans 20 mb — so the constants have to split per type.

## Approach: per-type strength ranges

Each type gets its own strength maximum, chosen so the mb-per-m/s slope is unchanged:

| type | strength (m/s) | mb |
| --- | --- | --- |
| high | 3 → 22.6 (was 20) | 1015 → 1030 |
| low  | 3 → 29.2 (was 20) | 1010 → 990  |

Holding the slope constant is what makes the change safe. Every preset in `config.ts` keeps
its exact current label:

| type | strength | label before | label after |
| --- | --- | --- | --- |
| high | 13.6 | 1023 | 1023 |
| high | 19.5 | 1028 | 1028 |
| high | 15.5 | 1025 | 1025 |
| high | 9.54 | 1020 | 1020 |
| low  | 7    | 1007 | 1007 |
| low  | 6    | 1008 | 1008 |
| low  | 15   | 1001 | 1001 |

The maxima are not the exact-slope values (22.615 / 29.154), because those are unreadable
constants. They are the tidiest values that still preserve every label a saved run can
actually hold. That set is larger than the presets: the strength slider has no `step` prop,
so MUI defaults to 1 and student-saved strengths are the integers 3..20 plus whichever
non-integer preset a student never touched.

The obvious round choices, 22.5 and 29, fail that test — both flip strength 18 by 1 mb
(high 1026 → 1027, low 999 → 998). 22.6 and 29.2 preserve all 18 integer positions and all
presets exactly, while still landing on 1030 and 990. The residual drift is confined to
arbitrary non-integer strengths the slider cannot produce.

## Changes

`src/utils/pressure-systems.ts` — replace the three flat constants with per-type ranges:

```ts
export const strengthRange = { high: { min: 3, max: 22.5 }, low: { min: 3, max: 29 } };
export const mbRange = { high: { min: 1015, max: 1030 }, low: { min: 1010, max: 990 } };
```

`strengthToMb` normalizes over the type's strength range and interpolates its mb range. One
expression covers both types — the sign flip for lows falls out of `mbRange.low` being
descending, so the explicit `high ? … : …` branch goes away.

`src/components/pressure-system-icon.tsx` — four places read the shared constants and each
becomes per-type:

- `strengthNorm`, which drives the letter scaling
- the slider's `value`, `min` and `max`
- the low-type inversion in `handleStrengthChange`

Tests — `src/utils/pressure-systems.test.ts` (endpoints and mid-range cases) and
`src/components/pressure-system-icon.test.tsx`, which imports `mbLabelRange` directly.

## Deliberately unchanged

- `config.pressureSystemStrength: 15` is still inside both ranges.
- Preset strengths in `config.ts` keep their m/s values.
- No `interactive-state` migration. `strength` is persisted raw and every previously saved
  value remains within the new, wider range.
- `LOGGED-EVENTS.md`. `PressureSystemStrengthUpdated` logs the mb string; only the range of
  possible values widens.

## Risk: range of influence grows faster than expected

`PressureSystem.range` is derived from strength (`strength * 200000`), so a max-strength low's
radius of influence grows from 4000 km to 5840 km. The visible region is only about 5000 km
tall.

`SimulationModel.wind` blends overlapping systems with a `1 - dist / range` weight rather than
summing them. A max-strength low therefore does not merely become stronger — it out-weights
every other system across nearly the whole map.

That may be the intended "climate change" effect, or it may flatten the interplay between
systems that the activity depends on. Plan: build as specified, then playtest. If it reads
wrong, decouple `range` from `strength` — a cap or a gentler exponent — rather than walking
back the mb numbers.
