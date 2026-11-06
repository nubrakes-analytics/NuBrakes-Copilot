---
name: nubrakes-cx-weekly-deck
description: Build the NuBrakes Weekly CX Conversion Review — the 7-slide weekly deck (cover, exec summary, channels, markets, funnel, rep output, cancellations) reviewed weekly by Jose (CX Lead) with Walker; data owned by Jonathan (Business Analyst). Use for "the CX deck", "the weekly conversion review", or to refresh this week's conversion deck.
---

# NuBrakes Weekly CX Conversion Review

A fixed-format weekly operating deck for the CX team (Sales, Sales Support, Parts). The format
does not change week to week: effort goes into reading the numbers, not rebuilding slides.
Output is a Claude **Slides** artifact of 7 slides. The appendix deep dives in the original
mockup are not part of the weekly build.

| # | Slide id | What it answers | Data |
|---|---|---|---|
| 1 | `cover` | Week, scope | — |
| 2 | `exec` | Are we on target? 5 KPI tiles (value, WoW, vs. 8-wk avg, 13-wk spark), monthly conversion vs. 23.1% target, booking + conversion cohort heat maps | channel feed, technician feed, cohort feed |
| 3 | `channel-trends` | Is lead volume driving channel performance? 4 panels (All, Core, GBL, Referral): leads bars + conversion / booking / cancel lines, 12 wks vs. 6-month avg | channel feed |
| 4 | `channel-market` | Which markets convert worse, and is it the market or the channel? | channel feed |
| 5 | `funnel` | Which funnel step moved? 13 lead weeks × 8 step rates | sales event feed |
| 6 | `rep-volume` | Inside sales agents: volume vs. efficiency, 13 weeks + owner boxes | sales leaderboard feed |
| 7 | `sales-support` | Cancellations: lost vs. rescheduled trend, reason × channel, markets + owner boxes | cancellation feed, technician + channel feeds |

Cadence: report week runs **Monday–Sunday**; build Monday or Tuesday once Sunday has landed.

## Inputs

1. **Six public feeds**, fetched by the script (no login):
   `https://raw.githubusercontent.com/nubrakes-analytics/NuBrakes-Copilot/main/data/<file>`
   (same files as `https://nubrakes-analytics.github.io/NuBrakes-Copilot/data/<file>`; use the raw
   GitHub URL from the cloud, github.io is blocked there):
   - `fact_nubrakes_channel_market_kpi_daily.json`: leads, booked, canceled, completed, revenue by day × market × channel
   - `fact_technician_operations_daily.json`: assigned jobs, booked revenue, invoiced jobs
   - `fact_nubrakes_sales_event_daily.json`: funnel events by lead date × market × channel × rep
   - `fact_nubrakes_cancellation_daily.json`: one row per canceled job
   - `fact_nubrakes_sales_leaderboard_weekly.json`: inside sales agent metrics by week × agent
   - `fact_nubrakes_cohort_funnel_daily.json`: one row per lead with first booked / first completed time (cohort grids)
   Weekly / monthly versions of the sales event and leaderboard feeds exist too (`references/sources.md`);
   the build does not need them.
2. **Cohort fallback (only if needed).** The script builds the cohort grids from the cohort feed.
   If the feed does not yet cover the last 9 lead weeks, `compute` prints a warning. Then ask the
   user for the cohort sheet (Google Sheets connector, CSV export or screenshot) and write
   `cohort.csv` in the format of `references/cohort_template.csv` (`metric` = `book` or `conv`,
   `lead_week` = the Monday, `p0`…`p9` = percent, blank where not yet reached), and re-run with
   `--cohort cohort.csv`. With neither, the exec slide shows a "cohort tables missing" panel; say so.

## Steps

1. Work in a scratch folder. Copy `scripts/build_deck.py` there.
2. Nothing else to gather unless step 3 warns about the cohort feed (input 2).
3. `python3 build_deck.py compute`
   (add `--week YYYY-MM-DD` = a Monday to build a past week; default = latest complete week).
   It prints the report week, which cohort source was used (feed, CSV or missing) and how many agents qualified,
   and writes `out/facts.json`. A warning that the leaderboard feed does not yet include the
   report week means slide 6 would be a week short: wait for the feed or tell the user.
4. Read `out/facts.json` and write `out/bands.json` — one bottom line per slide, keys
   `exec`, `channel-trends`, `channel-market`, `funnel`, `rep-volume`, `sales-support`
   (rules below). This is the only writing Claude does; the script draws everything else.
5. `python3 build_deck.py render` → `out/project/deck.json` + `out/project/slides/*.html`.
6. Optional check if playwright is available: `python3 scripts/render_check.py` and look at
   `out/render/*.png` for overflow. Fix by shortening the band text, never by restyling.
7. Publish as a Slides artifact:
   - **New deck each week (default):** create it from the Slides artifact type (Artifact tool:
     quickstart / list types, then publish with that `type_url`, `title` = the title in
     `out/project/deck.json`, `auto_open: "after_first_write"`), then publish to the returned
     `url` with `root` = the `out` folder, `file_path` = `out/project/deck.json`, and `files`
     mapping each `project/slides/<id>.html` to itself.
   - **Standing deck:** if the user gives a deck URL they can edit, `read` its
     `project/deck.json` first, then publish the same files to that `url`. Keep any slides the
     deck has beyond these 7 (appendix) in its `order` after `sales-support`.
8. Reply in 3–6 lines: what moved this week (one line per flag), anything missing, link.

## Writing the bottom lines (bands.json)

- Each is 1–2 sentences, at most ~230 characters so it fits on two lines. Lead with the finding,
  then the number. Short declarative sentences, signed numbers (`+5%`, `−1.7 pts`), `vs.`.
- Say what moved and where; name what is unexplained rather than inventing a cause. Never
  invent a number that is not in facts.json.
- `exec`: the week in one breath: conversion vs. 8-wk avg, the input that explains it (leads,
  booked jobs, cancels), revenue. Period conversion falls mechanically when leads surge
  (bookings have not completed yet) — say so when leads are 10%+ above average.
- `channel-trends`: which channel's volume moved and whether its rates held vs. its 6-month avg.
- `channel-market`: the market with the largest leads × gap to the all-market rate; whether it
  is weak on both channels (market problem) or one (channel problem).
- `funnel`: the step with the largest 4-vs-8-week move (green/red in the last column), and the
  latest week of reply rate.
- `rep-volume`: who produces most (revenue), who is most efficient (revenue per estimate), and
  the biggest gap between the two halves. Agents come from the feed automatically (150+ estimates
  in the window); name new or departed agents if the list changed.
- `sales-support` (label "What moved"): last week's cancels per 100 jobs vs. the 8-week
  average, the reason group and market that moved most (`last_week.by_reason`/`by_market` vs.
  their 8-week averages), and the 4-week price trend if red in the grid.

## Rules — do not change without the owners

- Fixed format and order. Never restyle, reorder or add views because one week looks unusual.
- **Never fill the owner boxes** (Key takeaways, Current priorities, Actions underway,
  Support / decisions needed). The owners write them. Blank is a legitimate answer.
- Definitions (see `references/definitions.md`): Fleet excluded everywhere; conversion =
  completed jobs ÷ leads; "completed", not "paid"; BR% = booked ÷ leads, CR% = completed ÷ leads;
  cohort views by lead week; trailing averages are the prior 8 weeks unless the slide says
  otherwise; rep rates are per estimate, not per lead.
- Small samples: markets under 100 leads (slide 4) or under 30 cancels (slide 7) are italic and
  not shaded. Louisville cancels disagree between feeds — keep it flagged.
- Fonts ≥ 24px except the exec cohort grids (20px). ≤ 200 elements per slide; the script warns.
- If a feed fails to load or the report week is incomplete, stop and tell the user; do not
  build a partial week.
