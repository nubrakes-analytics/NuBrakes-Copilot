# Data sources

All feeds are public JSON in the `nubrakes-analytics/NuBrakes-Copilot` repo:
- Browser: `https://nubrakes-analytics.github.io/NuBrakes-Copilot/data/<file>`
- Cloud / scripts: `https://raw.githubusercontent.com/nubrakes-analytics/NuBrakes-Copilot/main/data/<file>` (github.io is blocked from the cloud shell)

| Feed | Grain | Used on |
|---|---|---|
| `fact_nubrakes_channel_market_kpi_daily.json` | day × market × channel: leads, booked, canceled, completed, revenue | 2, 3, 4, 7 |
| `fact_technician_operations_daily.json` | technician × day: assigned jobs, booked revenue, invoiced jobs | 2 (booked ticket), 7 (assigned jobs) |
| `fact_nubrakes_sales_event_daily.json` | lead date × market × channel × rep: leads, replies, estimates, availability, appointments, completed | 5 |
| `fact_nubrakes_sales_event_weekly.json` | lead week × market (same fields) | not used by the build |
| `fact_nubrakes_sales_event_monthly.json` | lead month × market (+ valid phone number) | not used by the build |
| `fact_nubrakes_sales_leaderboard_daily.json` | day × agent: inside sales metrics (≈29 MB) | not used by the build |
| `fact_nubrakes_sales_leaderboard_weekly.json` | week (Monday) × agent | 6 |
| `fact_nubrakes_sales_leaderboard_monthly.json` | month × agent (+ VIOC inspections) | not used by the build |
| `fact_nubrakes_cancellation_daily.json` | one row per canceled job: market, channel, reason, status, appointment date | 7 |
| `fact_nubrakes_cohort_funnel_daily.json` | one row per lead, weekly cohorts (≈6 months, ≈33 MB): cohort week, market, channel, ISA, weeks-since-cohort of first booking and first completed job | 2 (cohort grids) |

The leaderboard feeds replace Redash queries 1450–1452, with the same fields. Blank values (`""`) mean zero.

Fallback only: the cohort sheet (booking / conversion by weeks since lead week), used if the cohort feed does not cover the last 9 lead weeks. Save it as `cohort.csv` (see `cohort_template.csv`).

The weekly build no longer uses Redash. Earlier references: 1649 lead-level cohort, 1442 / 1500 funnel, 1453 sales hours, 1304 cancellations. If anyone shared a Redash API key in a link, rotate it.

## Feed history worth knowing
- The cohort feed was switched to weekly grain on Nov 2, 2026 (lead weeks from May 2026). Weeks 1+ match the old cohort sheet within 0.3 pts; **week 0 reads 1.5–3 pts lower** than the sheet (the feed counts week 0 as the calendar lead week). Confirm with the analyst which week-0 definition is right.
- The daily sales event feed carries rep (`sales_user_email`) and channel (`channel_category`); it briefly dropped them in late Oct 2026 and they were restored on Nov 2. The weekly and monthly sales event files are market-level only. The script still checks for the rep field: without it, the funnel's "replied, no estimate" row is left out rather than shown wrong.
