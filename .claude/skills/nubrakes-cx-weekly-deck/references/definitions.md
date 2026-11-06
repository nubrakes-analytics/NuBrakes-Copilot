# Definitions and method

## Agreed definitions
- **Lead**: every brake repair request, Referral included, **Fleet excluded**.
- **Booked**: an appointment on a brake repair job. Inspection-only (VIOC) bookings are tracked separately and excluded from technician-feed metrics.
- **Completed**: the job was completed (invoice paid). Use "completed", never "paid", on slides.
- **Conversion rate (period, the FY27 target basis, 23.1%)**: completed jobs in the period ÷ leads in the period, from the channel feed. Used on the exec tiles, monthly chart and channel panels.
- **Cohort rates**: everything is attributed to the week the lead came in (`cohort_start_date`, a Monday). Booking % at week p = leads with `booking_period_index` ≤ p ÷ leads in that cohort; conversion % uses `conversion_period_index` (the first completed job). Source: cohort feed, one row per lead, so outcomes follow the lead to any later job. Fleet excluded.
- **BR% / CR%** (slide 4): booked ÷ leads, completed ÷ leads, by market and channel, period basis (same weeks), from the channel feed.
- **Est. → booked / Est. → completed** (slide 6): estimate-owner booked jobs and estimate-owner completed jobs ÷ estimates created, from the leaderboard feed by activity week. Per estimate, not per lead.
- **Revenue (slide 6)**: average of estimate-owner and appointment-owner completed revenue, as on the sales leaderboard sheet (leaderboard feed). Avg ticket = appointment-owner revenue ÷ appointment-owner completed jobs. Revenue per estimate = revenue ÷ estimates created.
- **Booked ticket (exec)**: booked revenue ÷ completed jobs with an invoice, technician feed, as in the OBR.
- **Cancels**: one row per withdrawn job in the cancellation feed, by appointment date. **Lost** = status `Withdrawn`; **Rescheduled** = `Withdrawn: Reschedule` (may still complete).
- **Cancel reason groups**: Price / alternative (price too high, decided on alternative option) · Timing / rebooked (schedule conflict, rebooked, not available in window) · Silent / no-show (no reason, no show / no response) · NuBrakes ops (every `HQ:` reason incl. parts, tech availability and `Schedule Optimization (Unserved)`, which replaced tech availability in Aug 2026) · other customer reasons are counted in totals only.
- **Cancel rates**: per 100 assigned jobs (technician feed, by market and total) or per 100 booked jobs (channel feed, by channel — the technician feed has no channel).

## Windows
- Report week: Monday–Sunday. Tiles compare with the previous week and the trailing 8 weeks before the report week.
- Exec sparks: 13 weeks. Channel panels: 12 weeks vs. the 26 weeks before them.
- Slide 4: the 8 weeks ending the report week (period basis). Slide 6: the 13 weeks ending the report week (leaderboard activity weeks); agents with 150+ estimates in that window.
- Funnel: 13 lead weeks ending the report week; later steps of the newest 1–2 weeks are italic (still maturing) and excluded from shading and the 4-vs-8 comparison.
- Cancels: 13 appointment weeks; grid and market strip = last 4 weeks vs. the 13 weeks before.
- Cohort grids: last 9 lead weeks, weeks 0–4 since lead week, only weeks fully elapsed by the report week; each column heat-shaded red → green.

## Shading conventions
- Green/red text on tiles and tile top border: vs. the 8-week average.
- Funnel: ±2 pts vs. the row's 13-week median.
- Slide 4: conversion bars red/navy at ±2 pts vs. all markets; channel cells ±2 pts vs. that channel's all-market rate.
- Slide 6: best of the reps green, lowest red, per column.
- Slide 7 grid: red/green when up/down 25%+ and 1+ per 100; market strip ±2 per 100 vs. its 13-week norm.

## Known data caveats (keep in footers / notes)
- Funnel reply rate runs ~2 pts above Redash 1442 (sales event feed definition).
- "Replied, no est." (funnel) = leads with a customer reply and no rep on the row (no estimate yet), ÷ leads. It needs the rep field in the daily sales event feed; if that field is missing the row is left out.
- Slide 4 channel columns show Core and GBL; Referral and Brand are in the market totals only.
- Cancellation feed: `cancelation_time_frame_hours` stopped populating in July 2026; no customer ID, so whether rescheduled jobs complete is unknown. Louisville cancel counts disagree with the technician feed.
- Lead counts differ by source: channel feed (all requests) > funnel (excludes Referral) > Redash 1649 (new customers only).
