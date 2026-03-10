# Design - Gorillas (QBasic) with Random Banana Physics

## Concept
A deterministic artillery duel where two rooftop gorillas throw bananas across a skyline. The twist randomizes banana spin/wind perturbation by round using a seeded RNG, so runs are reproducible while each round feels different.

## Core Loop
1. Active gorilla adjusts angle and power.
2. Throw banana.
3. Banana follows ballistic arc with seeded perturbations.
4. Resolve hit on building/opponent or out-of-bounds.
5. Update score and swap turn.

## MVP Scope
- One-screen city skyline
- Two gorillas with alternating turns
- Angle/power controls + throw
- Collision against buildings/opponents
- Scoring to target score
- Pause/reset/restart support
- Deterministic testing hooks for automation
