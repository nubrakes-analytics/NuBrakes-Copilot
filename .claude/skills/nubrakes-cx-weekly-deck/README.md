# NuBrakes Weekly CX Conversion Review: setup guide

This package builds the 7-slide weekly CX conversion deck in Claude. Install it once, then each week ask Claude to build "the CX deck".

## What's in the package
- `SKILL.md`: the instructions Claude follows each week.
- `scripts/build_deck.py`: fetches the data, computes every number and draws the slides.
- `scripts/render_check.py` (optional): screenshots each slide so you can check nothing overflows.
- `references/definitions.md`: the metric definitions, time windows and shading rules agreed with Walker.
- `references/sources.md`: every data source and how to get access to it.
- `references/cohort_template.csv`: the fallback format for cohort data, used only if the cohort feed is incomplete.

## One-time setup (about 15 minutes)

1. **Install the skill.** In the Claude app, open Settings, find the Skills section and upload `nubrakes-cx-weekly-deck.zip`. Make sure code execution is on, because the skill runs a Python script.
2. **Optional: get edit access to the weekly deck** if you want to update one standing deck rather than create a new one each week.

   Every data source is a public feed, so no logins are needed.

## Every week (Monday or Tuesday)

Ask Claude:

> Build this week's CX conversion deck.

Claude then:
1. fetches the six data feeds,
2. writes the six bottom lines,
3. publishes a new Slides deck and links it.

To rebuild an earlier week, name the Monday, for example "Build the CX deck for the week of Oct 19".

After Claude publishes the deck, the owners fill in their four boxes on slides 6 and 7. Claude never writes those.

## If something is missing
- **Cohort feed incomplete:** Claude asks for the cohort sheet as a fallback. Without it, the deck still builds, with a clear "data missing" panel in that spot.
- **A data feed is down, or the week isn't finished yet:** Claude stops and tells you rather than building a partial week.

## Owners and contacts
- **Jose (CX Lead):** owns the weekly review, the deck format, and the owner boxes on slides 6 and 7 (with the Sales and Sales Support leads).
- **Jonathan (Business Analyst):** owns the data feeds in the `NuBrakes-Copilot` repo and the metric definitions in `references/definitions.md`.
- **Walker:** sponsor; agreed the original format and definitions.

## Open data questions (Jonathan)
- Cohort tables, week 0: the feed reads 1.5–3 pts lower than the old cohort sheet. Confirm which week-0 definition is right.
- Cancellation feed: the "hours before appointment" field has been blank since July 2026. Add a lead or customer ID so the deck can show whether rescheduled jobs complete. Louisville cancel counts disagree with the technician feed.
