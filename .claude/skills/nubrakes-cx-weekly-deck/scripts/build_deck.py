#!/usr/bin/env python3
"""NuBrakes Weekly CX Conversion Review — data + slide builder.

Two steps, run from a working folder:

  python3 build_deck.py compute [--week YYYY-MM-DD] [--cohort cohort.csv]
      -> fetches the feeds, computes every number, writes out/facts.json

  (Claude reads out/facts.json and writes out/bands.json: one short "bottom line"
   per slide, see SKILL.md for the rules)

  python3 build_deck.py render
      -> writes out/project/deck.json and out/project/slides/<id>.html (7 slides)

--week is the MONDAY of the report week (Mon–Sun). Default: the latest complete week.
Nothing here touches Claude or the deck; publishing is done by the skill.
"""
import argparse, collections, csv, datetime as dt, json, os, re, statistics as st, sys, urllib.request

RAW = "https://raw.githubusercontent.com/nubrakes-analytics/NuBrakes-Copilot/main/data/"
FEEDS = {
    "channel": "fact_nubrakes_channel_market_kpi_daily.json",   # leads/booked/cancels/revenue/completed by day x market x channel
    "tech": "fact_technician_operations_daily.json",            # assigned jobs, booked revenue, invoiced jobs by tech x day
    "sales": "fact_nubrakes_sales_event_daily.json",            # funnel events by lead date x market x channel x rep
    "cancel": "fact_nubrakes_cancellation_daily.json",          # one row per canceled job, reason + status
    "leaderboard": "fact_nubrakes_sales_leaderboard_weekly.json",  # inside sales agent metrics by week (Monday) x user
    "cohort": "fact_nubrakes_cohort_funnel_daily.json",         # one row per lead: lead time, first booked / completed time
}
OUT = "out"
MARKETS = ["Dallas", "Atlanta", "Houston", "Austin", "Nashville", "San Antonio", "Orlando", "Tampa", "Miami", "Louisville"]
NAMES = {"bj.berame": "BJ Berame"}          # display-name overrides; otherwise "first.last" -> "First Last"
MIN_EST = 150   # an agent appears on slide 6 with at least this many estimates in the 13-week window
rep_name = lambda u: NAMES.get(u, " ".join(p.capitalize() for p in u.replace("_", ".").split(".")))
nz = lambda v: v if isinstance(v, (int, float)) else 0   # leaderboard feed uses "" for zero
TARGET = 23.1  # FY27 conversion target, completed jobs / leads, period basis

# palette (VIOC)
NAVY, BLUE, RED, GRAY = "#00316D", "#078BC7", "#E51C24", "#999999"
GREEN_T, RED_T, MUT, INK = "#1E7B34", "#B3161C", "#5A6577", "#1B2333"
G_CELL, R_CELL, W_CELL, H_CELL, T_CELL = ("background:#D6EEDC;color:#14532D", "background:#F8D9DA;color:#7F1D1D",
                                           "background:#FCFDFE", "#EEF2F7", "#E6EDF6")

D = lambda s: dt.date.fromisoformat(str(s)[:10])
monday = lambda d: d - dt.timedelta(days=d.weekday())
fx = lambda s: "−" + s[1:] if s.startswith("-") else s


# ----------------------------------------------------------------------------- data
def fetch(name, optional=False):
    os.makedirs("data", exist_ok=True)
    path = os.path.join("data", FEEDS[name])
    try:
        with urllib.request.urlopen(RAW + FEEDS[name], timeout=180) as r:
            open(path, "wb").write(r.read())
    except Exception as e:
        if not os.path.exists(path):
            if optional:
                print(f"WARN: cannot fetch {FEEDS[name]} ({e})"); return []
            sys.exit(f"FATAL: cannot fetch {FEEDS[name]} ({e}) and no cached copy")
        print(f"WARN: using cached {FEEDS[name]} ({e})")
    return json.load(open(path))


def compute(args):
    ch, te, se, cx, lb = (fetch(k) for k in ("channel", "tech", "sales", "cancel", "leaderboard"))
    last_day = max(D(x["Day"]) for x in ch)
    week = D(args.week) if args.week else monday(last_day - dt.timedelta(days=6))
    if week.weekday():
        sys.exit("--week must be a Monday")
    wend = week + dt.timedelta(days=6)
    if wend > last_day:
        sys.exit(f"Week {week} not complete in the channel feed (last day {last_day})")
    F = {"week": week.isoformat(), "wend": wend.isoformat(), "feed_last_day": last_day.isoformat()}

    # --- channel feed aggregates (Fleet excluded everywhere)
    W = collections.defaultdict(collections.Counter)      # (channel|All, week) -> counts
    M = collections.defaultdict(collections.Counter)      # month -> counts (All)
    for x in ch:
        c = x["Channel Category"]
        if c == "Fleet":
            continue
        d = D(x["Day"])
        if d > wend:
            continue
        w = D(x["Week"])
        for k in ("leads", "jobs_booked", "canceled_jobs", "Revenue", "jobs_completed"):
            v = x[k] or 0
            W[(c, w)][k] += v; W[("All", w)][k] += v; M[d.strftime("%Y-%m")][k] += v
            W[("mk", x["market"], c, w)][k] += v; W[("mk", x["market"], "All", w)][k] += v
    weeks = sorted(k[1] for k in W if len(k) == 2 and k[0] == "All" and k[1] <= week)
    if weeks[-1] != week:
        sys.exit("report week missing from channel feed")

    # --- technician feed: booked ticket + assigned jobs (non-VIOC)
    T = collections.defaultdict(collections.Counter)
    for x in te:
        if x.get("is_vioc_inspection"):
            continue
        d = D(x["day"]); w = monday(d)
        T[w]["br"] += x["booked_revenue_amount"] or 0
        T[w]["inv"] += x["invoiced_jobs_count"] or 0
        T[w]["asg"] += x["assigned_jobs_count"] or 0
        T[(w, x["market_name"])]["asg"] += x["assigned_jobs_count"] or 0

    # ---------------- slide 2: exec tiles, monthly chart
    w13 = weeks[-13:]
    A = lambda w: W[("All", w)]
    ser = {"rev": [A(w)["Revenue"] for w in w13],
           "conv": [A(w)["jobs_completed"] / A(w)["leads"] * 100 for w in w13],
           "leads": [A(w)["leads"] for w in w13],
           "booked": [A(w)["jobs_booked"] for w in w13],
           "bt": [T[w]["br"] / T[w]["inv"] if T[w]["inv"] else None for w in w13]}
    tiles = {k: {"cur": s[-1], "prev": s[-2], "avg8": sum(s[-9:-1]) / 8, "series": s} for k, s in ser.items()}
    p8 = w13[-9:-1]
    canc = {"cur": A(week)["canceled_jobs"] / A(week)["jobs_booked"] * 100,
            "avg8": sum(A(w)["canceled_jobs"] for w in p8) / sum(A(w)["jobs_booked"] for w in p8) * 100}
    months = sorted(M)[-13:]
    monthly = [{"m": dt.date.fromisoformat(m + "-01").strftime("%b"), "conv": round(M[m]["jobs_completed"] / M[m]["leads"] * 100, 1),
                "partial": m == wend.strftime("%Y-%m")} for m in months]
    F["exec"] = {"tiles": tiles, "cancel_rate": canc, "monthly": monthly, "weeks": [w.isoformat() for w in w13]}

    # cohort grids: from the lead-level cohort feed when it covers the last 9 lead weeks, else the CSV fallback
    F["cohort"], F["cohort_source"] = cohort_from_feed(fetch("cohort", optional=True), week, wend), "cohort feed"
    if not F["cohort"]:
        F["cohort"], F["cohort_source"] = (read_cohort(args.cohort, week, wend), "cohort CSV") if args.cohort else (None, None)

    # ---------------- slide 3: channel trends (12 wks vs the 26 before)
    i = weeks.index(week); last12, prior = weeks[i - 11:i + 1], weeks[i - 37:i - 11]
    def rates(c, ws):
        s = collections.Counter()
        for w in ws: s.update(W[(c, w)])
        return {"leads": s["leads"] / len(ws), "conv": s["jobs_completed"] / s["leads"] * 100,
                "book": s["jobs_booked"] / s["leads"] * 100,
                "canc": s["canceled_jobs"] / s["jobs_booked"] * 100 if s["jobs_booked"] else 0}
    F["channels"] = {"weeks": [w.isoformat() for w in last12], "prior": [prior[0].isoformat(), prior[-1].isoformat()],
                     "ch": {c: {"ser": [rates(c, [w]) for w in last12], "avg": rates(c, prior)} for c in ("All", "Core", "GBL", "Referral")}}

    # ---------------- sales event feed by lead week (slide 5); rep field drives the replied-no-estimate row
    SW = collections.defaultdict(collections.Counter)
    has_rep = any("sales_user_email" in x for x in se[:50])
    for x in se:
        w = monday(D(x["lead_date"]))
        vals = {"L": x["service_opportunity_created"], "r": x["customer_message_sent"], "e": x["estimate_created"],
                "v": x["availability_requested"], "a": x["appointment_created"], "p": x["invoice_paid"]}
        for k, v in vals.items(): SW[w][k] += v or 0
        if has_rep and not x.get("sales_user_email"): SW[w]["rn"] += x["customer_message_sent"] or 0

    # slide 4: market x channel from the channel feed, last 8 weeks ending the report week (period basis)
    mk_weeks = weeks[-8:]
    def agg(m, c):
        s = collections.Counter()
        for w in mk_weeks: s.update(W[("mk", m, c, w)])
        return s
    def aggc(c):
        s = collections.Counter()
        for w in mk_weeks: s.update(W[(c, w)])
        return s
    rows = []
    for m in MARKETS:
        a = agg(m, "All")
        if not a["leads"]: continue
        r = {"m": m, "leads": a["leads"], "cr": a["jobs_completed"] / a["leads"] * 100}
        for c in ("Core", "GBL"):
            b = agg(m, c); r[c] = [b["leads"], b["jobs_booked"] / b["leads"] * 100 if b["leads"] else None, b["jobs_completed"] / b["leads"] * 100 if b["leads"] else None]
        rows.append(r)
    rows.sort(key=lambda r: -r["leads"])
    co = aggc("All")
    chavg = {c: [aggc(c)["jobs_booked"] / aggc(c)["leads"] * 100, aggc(c)["jobs_completed"] / aggc(c)["leads"] * 100] for c in ("Core", "GBL")}
    F["market"] = {"from": mk_weeks[0].isoformat(), "to": (mk_weeks[-1] + dt.timedelta(days=6)).isoformat(),
                   "co_cr": co["jobs_completed"] / co["leads"] * 100, "co_leads": co["leads"], "chavg": chavg, "rows": rows}

    # slide 5: funnel, 13 lead weeks ending the report week
    fw = [w for w in sorted(k for k in SW if isinstance(k, dt.date)) if w <= week][-13:]
    defs = [("Leads", "L", None, None), ("1 Replied", "r", "L", 0), ("2 Estimate", "e", "L", 0), ("3 Est → avail", "v", "e", 1),
            ("4 Avail → appt", "a", "v", 1), ("5 Appt → completed", "p", "a", 2), ("Booking rate", "a", "L", 1),
            ("Completed conv.", "p", "L", 2)] + ([("Replied, no est.", "rn", "L", 0)] if has_rep else [])
    frows = []
    for name, num, den, mature in defs:
        vals = [SW[w][num] if den is None else (SW[w][num] / SW[w][den] * 100 if SW[w][den] else 0) for w in fw]
        frows.append({"name": name, "vals": vals, "mature_lag": mature})
    F["funnel"] = {"weeks": [w.isoformat() for w in fw], "rows": frows}

    # slide 6: inside sales agents from the weekly leaderboard feed, 13 weeks ending the report week (activity date)
    rw = weeks[-13:]
    agg6 = collections.defaultdict(collections.Counter)
    keys6 = ("estimate_owner_completed_revenue", "appointment_owner_completed_revenue", "appointment_owner_completed_jobs",
             "estimates_created", "estimate_owner_booked_job", "estimate_owner_completed_jobs", "inbound_calls_answered",
             "appointment_owner_booked_job_same_day")
    for r in lb:
        w = D(r["interval"]); u = r.get("user") or ""
        if not (rw[0] <= w <= rw[-1]) or not u.endswith("@nubrakes.com"): continue
        for k in keys6: agg6[u.split("@")[0]][k] += nz(r.get(k))
    vol = {}
    for u, v in agg6.items():
        if v["estimates_created"] < MIN_EST: continue
        rev = (v["estimate_owner_completed_revenue"] + v["appointment_owner_completed_revenue"]) / 2
        vol[u] = {"name": rep_name(u), "rev": rev, "jobs": v["appointment_owner_completed_jobs"], "est": v["estimates_created"],
                  "ib": v["inbound_calls_answered"], "sd": v["appointment_owner_booked_job_same_day"],
                  "tkt": v["appointment_owner_completed_revenue"] / v["appointment_owner_completed_jobs"] if v["appointment_owner_completed_jobs"] else 0,
                  "ebr": v["estimate_owner_booked_job"] / v["estimates_created"] * 100,
                  "pc": v["estimate_owner_completed_jobs"] / v["estimates_created"] * 100,
                  "rpe": rev / v["estimates_created"],
                  "_arev": v["appointment_owner_completed_revenue"], "_eb": v["estimate_owner_booked_job"], "_ec": v["estimate_owner_completed_jobs"]}
    lb_last = max(D(r["interval"]) for r in lb)
    F["reps"] = {"from": rw[0].isoformat(), "to": (rw[-1] + dt.timedelta(days=6)).isoformat(), "volume": vol or None,
                 "leaderboard_last_week": lb_last.isoformat()}
    if lb_last < week: print(f"WARN: leaderboard feed ends week of {lb_last}; report week {week} not in it yet")

    # ---------------- slide 7: cancellations
    def grp(r):
        r = r or ""
        if "Price" in r or "alternative" in r: return "price"
        if "Schedule conflict" in r or "Rebooked" in r or "Not available during" in r: return "timing"
        if "No show" in r or "Did not provide reason" in r: return "silent"
        if r.startswith("HQ"): return "ops"          # includes parts, tech availability, Schedule Optimization (Unserved)
        return "other"
    C = collections.Counter()
    for x in cx:
        w = monday(D(x["appointment_date"])); g = grp(x["cancelation reason"]); lost = x["status"] == "Withdrawn"; c = x["channel_category"]
        C[(w, "all")] += 1; C[(w, "lost" if lost else "resch")] += 1; C[(w, "m", x["market"])] += 1
        C[(w, "mlost", x["market"])] += lost; C[(w, "g", g)] += 1; C[(w, "cg", c, g)] += 1; C[(w, "cg", "All", g)] += 1
        C[(w, "c", c)] += 1; C[(w, "c", "All")] += 1; C[(w, "glost", g)] += lost
    cw = [week - dt.timedelta(weeks=k) for k in range(12, -1, -1)]
    L4 = cw[-4:]; N13 = [week - dt.timedelta(weeks=k) for k in range(16, 3, -1)]; P8 = cw[-9:-1]
    def rate(ws, num, den):
        a = sum(num(w) for w in ws); b = sum(den(w) for w in ws); return a / b * 100 if b else None
    weekly = [{"w": w.isoformat(), "lost": C[(w, "lost")] / T[w]["asg"] * 100, "resch": C[(w, "resch")] / T[w]["asg"] * 100,
               "n": C[(w, "all")]} for w in cw]
    mkt = []
    for m in MARKETS:
        n4 = sum(C[(w, "m", m)] for w in L4)
        mkt.append({"m": m, "r4": rate(L4, lambda w: C[(w, "m", m)], lambda w: T[(w, m)]["asg"]),
                    "rn": rate(N13, lambda w: C[(w, "m", m)], lambda w: T[(w, m)]["asg"]), "n4": n4,
                    "lost_share": sum(C[(w, "mlost", m)] for w in L4) / n4 * 100 if n4 else 0})
    BK = lambda c: (lambda w: W[(c, w)]["jobs_booked"])
    grid = {}
    for c in ("Core", "GBL", "Referral", "All"):
        for g in ("price", "timing", "silent", "ops"):
            grid[f"{c}|{g}"] = [rate(L4, lambda w: C[(w, "cg", c, g)], BK(c)), rate(N13, lambda w: C[(w, "cg", c, g)], BK(c))]
        grid[f"{c}|total"] = [rate(L4, lambda w: C[(w, "c", c)], BK(c)), rate(N13, lambda w: C[(w, "c", c)], BK(c))]
    F["cancel"] = {"weekly": weekly, "markets": mkt, "grid": grid,
                   "last_week": {"per100": C[(week, "all")] / T[week]["asg"] * 100,
                                 "per100_avg8": sum(C[(w, "all")] for w in P8) / sum(T[w]["asg"] for w in P8) * 100,
                                 "n": C[(week, "all")], "lost": C[(week, "lost")],
                                 "by_reason": {g: [C[(week, "g", g)], sum(C[(w, "g", g)] for w in P8) / 8] for g in ("price", "timing", "silent", "ops")},
                                 "by_market": {m: [C[(week, "m", m)], sum(C[(w, "m", m)] for w in P8) / 8] for m in MARKETS}},
                   "lost_share_by_reason_13w": {g: sum(C[(w, "glost", g)] for w in cw) / max(1, sum(C[(w, "g", g)] for w in cw)) * 100 for g in ("price", "timing", "silent", "ops")}}

    os.makedirs(OUT, exist_ok=True)
    json.dump(F, open(os.path.join(OUT, "facts.json"), "w"), indent=1, default=str)
    print(f"Report week {week}–{wend} · feed through {last_day}")
    print(f"facts -> {OUT}/facts.json  · cohort: {F['cohort_source'] or 'MISSING'} · agents: {len(F['reps']['volume'] or {})}")


def cohort_from_feed(rows, week, wend, n_weeks=9, max_p=9):
    """Weekly lead cohorts from the lead-level cohort feed (cohort_grain = week).
    Cohort = cohort_start_date (the Monday). Booking % at week p = leads with booking_period_index <= p
    ÷ leads in the cohort; conversion % uses conversion_period_index (both are the feed's own
    weeks-since-cohort). Only weeks fully elapsed by the report week are shown. Fleet excluded.
    Returns None unless every one of the last n_weeks lead weeks has leads in the feed."""
    if not rows: return None
    leads = collections.defaultdict(list)
    for r in rows:
        if (r.get("channel") or "").upper() == "FLEET" or not r.get("cohort_start_date"): continue
        if r.get("cohort_grain") and r["cohort_grain"] != "week": continue
        bi = r.get("booking_period_index"); ci = r.get("conversion_period_index")
        leads[D(r["cohort_start_date"])].append((int(bi) if bi not in ("", None) else None, int(ci) if ci not in ("", None) else None))
    want = [week - dt.timedelta(weeks=k) for k in range(n_weeks - 1, -1, -1)]
    if any(len(leads.get(w, [])) < 50 for w in want):
        print(f"WARN: cohort feed covers {min(leads) if leads else '-'} to {max(leads) if leads else '-'}; "
              f"needs lead weeks {want[0]} to {want[-1]} — using the CSV fallback if given")
        return None
    out = {"book": [], "conv": []}
    for w in want:
        L = leads[w]; n = len(L); bv, cv = [], []
        for p in range(max_p + 1):
            if w + dt.timedelta(days=7 * (p + 1) - 1) > wend: break
            bv.append(round(sum(1 for b, _ in L if b is not None and b <= p) / n * 100, 1))
            cv.append(round(sum(1 for _, c in L if c is not None and c <= p) / n * 100, 1))
        out["book"].append({"lead_week": w.isoformat(), "vals": bv, "leads": n})
        out["conv"].append({"lead_week": w.isoformat(), "vals": cv, "leads": n})
    return out


def read_cohort(path, week, wend):
    """CSV columns: metric(book|conv), lead_week (YYYY-MM-DD Monday), p0..p9 (percent, blank = not yet)."""
    rows = collections.defaultdict(dict)
    for r in csv.DictReader(open(path)):
        lw = D(r["lead_week"])
        vals = []
        for p in range(10):
            v = (r.get(f"p{p}") or "").strip().rstrip("%")
            if not v: break
            if lw + dt.timedelta(days=7 * (p + 1) - 1) > wend: break      # only fully elapsed weeks
            vals.append(float(v))
        rows[r["metric"]][lw.isoformat()] = vals
    out = {}
    for m, d in rows.items():
        ks = sorted(k for k in d if D(k) <= week)[-9:]
        out[m] = [{"lead_week": k, "vals": d[k]} for k in ks]
    return out


# ----------------------------------------------------------------------------- render helpers
def section(sid, title, subtitle, band_label, band, body, footer, notes, gap=18):
    return (f'<section id="{sid}" style="background:#F5F7FA;color:{INK};font-family:Arial, Helvetica, sans-serif;padding:88px 112px 136px;display:flex;flex-direction:column;gap:{gap}px">\n'
            f'<div style="position:absolute;left:0;top:0;width:1920px;height:12px;background:{NAVY}"></div>\n'
            f'<div style="display:flex;justify-content:space-between;align-items:end">\n'
            f'<h2 style="font-size:56px;font-weight:700;color:{NAVY};line-height:1.1">{title}</h2>\n'
            f'<p style="font-size:24px;color:{MUT}">{subtitle}</p>\n</div>\n'
            f'<div style="background:{NAVY};border-radius:8px;padding:12px 24px">\n'
            f'<p style="font-size:26px;line-height:1.35;color:#F5F7FA"><b>{band_label}.</b> {band}</p>\n</div>\n'
            f'{body}\n'
            f'<p style="position:absolute;left:112px;bottom:56px;width:1696px;font-size:24px;color:{MUT}">{footer}</p>\n'
            f'<aside>{notes}</aside>\n</section>\n')


def owner_boxes(first="[Owner writes]"):
    items = [("Key takeaways", first), ("Current priorities", "[Changes ~monthly]"), ("Actions underway", "[Changes weekly]"), ("Support / decisions needed", "[Blank is fine]")]
    return '<div style="display:flex;gap:16px">' + "".join(
        f'<div style="flex:1;display:flex;flex-direction:column;gap:2px;background:#FCFDFE;border:1px solid #D5DCE6;border-top:6px solid {NAVY};border-radius:8px;padding:8px 18px">'
        f'<h3 style="font-size:26px;font-weight:700;color:{NAVY}">{h}</h3><p style="font-size:24px;color:{MUT}">{t}</p></div>' for h, t in items) + "</div>"


def lab(d): d = D(d); return d.strftime("%b %-d")


def span(a, b):
    a, b = D(a), D(b)
    return f'{lab(a)}–{b.day}' if a.month == b.month else f'{lab(a)}–{lab(b)}'


def heat(t):
    stops = [(0, (230, 124, 115)), (0.5, (255, 214, 102)), (1, (87, 187, 138))]
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if t <= b:
            u = (t - a) / (b - a)
            return "#%02X%02X%02X" % tuple(round(ca[j] + (cb[j] - ca[j]) * u) for j in range(3))
    return "#57BB8A"


# ----------------------------------------------------------------------------- slides
def s_cover(F):
    return (f'<section id="cover" style="background:{NAVY};color:#F5F7FA;font-family:Arial, Helvetica, sans-serif;padding:128px;display:flex;flex-direction:column;justify-content:center;gap:32px">\n'
            f'<div style="position:absolute;left:0;top:0;width:24px;height:1080px;background:{BLUE}"></div>\n'
            f'<p style="font-size:28px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#9FD3EE">Weekly review</p>\n'
            f'<h1 style="font-size:104px;font-weight:700;line-height:1.05;color:#F5F7FA">CX Conversion Review</h1>\n'
            f'<p style="font-size:40px;color:#C9D6E8;line-height:1.3">Week of {lab(F["week"])}–{lab(F["wend"])}, {D(F["wend"]).year} · 6 slides, about 30 minutes</p>\n'
            f'<p style="font-size:28px;color:#C9D6E8">Leads captured through {D(F["wend"]).strftime("%a %b %-d, %Y")} · Fleet excluded</p>\n'
            f'<aside>Fixed format each week. Owners write the four boxes on the rep and cancellation slides; the bottom lines are drafted from the data.</aside>\n</section>\n')


def s_exec(F, band):
    E = F["exec"]
    def spark(vals, avg):
        Wd, Hd = 270, 50; vv = [v for v in vals if v is not None]
        lo, hi = min(vv + [avg]), max(vv + [avg]); pad = (hi - lo) * 0.15 or 1; lo -= pad; hi += pad
        X = lambda i: 4 + i * (Wd - 8) / (len(vals) - 1); Y = lambda v: Hd - 4 - (v - lo) / (hi - lo) * (Hd - 8)
        pts = " ".join(f"{X(i):.1f},{Y(v):.1f}" for i, v in enumerate(vals) if v is not None)
        end = GREEN_T if vals[-1] >= avg else RED_T
        return (f'<svg aria-label="13-week trend" width="{Wd}" height="{Hd}" viewBox="0 0 {Wd} {Hd}">'
                f'<polygon points="{X(0):.1f},{Hd} {pts} {X(len(vals)-1):.1f},{Hd}" fill="{BLUE}" fill-opacity="0.14"/>'
                f'<line x1="0" y1="{Y(avg):.1f}" x2="{Wd}" y2="{Y(avg):.1f}" stroke="{MUT}" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>'
                f'<polyline points="{pts}" fill="none" stroke="{BLUE}" stroke-width="3" stroke-linejoin="round"/>'
                f'<circle cx="{X(len(vals)-1):.1f}" cy="{Y(vals[-1]):.1f}" r="6" fill="{end}" stroke="#FCFDFE" stroke-width="2"/></svg>')
    defs = [("rev", "Completed revenue", lambda v: f"${v/1000:,.0f}k", "pct"), ("conv", "Conversion rate", lambda v: f"{v:.1f}%", "pts"),
            ("leads", "Leads", lambda v: f"{v:,.0f}", "pct"), ("booked", "Booked jobs", lambda v: f"{v:,.0f}", "pct"),
            ("bt", "Booked ticket", lambda v: f"${v:,.0f}", "pct")]
    col = lambda x: GREEN_T if x >= 0 else RED_T
    tiles = []
    for k, label, fmt, kind in defs:
        t = E["tiles"][k]; cur, prev, avg = t["cur"], t["prev"], t["avg8"]
        if kind == "pts": wow, v8 = cur - prev, cur - avg; wt, vt = f"{wow:+.1f} pts WoW", f"{v8:+.1f} pts vs. 8-wk avg"
        else: wow, v8 = (cur / prev - 1) * 100, (cur / avg - 1) * 100; wt, vt = f"{wow:+.1f}% WoW", f"{v8:+.1f}% vs. 8-wk avg"
        tiles.append(f'<div style="flex:1;display:flex;flex-direction:column;gap:2px;background:#FCFDFE;border:1px solid #D5DCE6;border-top:6px solid {col(v8)};border-radius:10px;padding:10px 18px 12px">'
                     f'<p style="font-size:24px;font-weight:700;color:{MUT}">{label}</p>'
                     f'<p style="font-size:48px;font-weight:700;color:{NAVY};line-height:1.05">{fmt(cur)}</p>'
                     f'<p style="font-size:24px;font-weight:700;line-height:1.3"><span style="color:{col(wow)}">{fx(wt)}</span><br><span style="color:{col(v8)}">{fx(vt)}</span></p>'
                     f'{spark(t["series"], avg)}</div>')
    # monthly chart
    mon = E["monthly"]; base = 18.0; CW, CH = 760, 230; slot = CW / len(mon); sc = CH / (max(x["conv"] for x in mon) + 0.8 - base)
    rects, vals = [], []
    for i, x in enumerate(mon):
        v = x["conv"]; last = x["partial"]; below = v < TARGET and not last; h = (v - base) * sc
        fill = "#BFD9EA" if last else (RED if below else BLUE)
        extra = f' stroke="{BLUE}" stroke-width="2" stroke-dasharray="6 4"' if last else ""
        rects.append(f'<rect x="{i*slot+slot*0.18:.1f}" y="{CH-h:.1f}" width="{slot*0.64:.1f}" height="{h:.1f}" fill="{fill}"{extra}/>')
        lc = f"color:{RED_T}" if below else (f"color:{MUT}" if last else "")
        vals.append(f'<p style="position:absolute;left:{i*slot:.0f}px;top:{CH-h+2:.0f}px;width:{slot:.0f}px;font-size:24px;text-align:center;{lc}">{v}</p>')
    ty = CH - (TARGET - base) * sc
    svg = (f'<svg aria-label="Monthly conversion vs. {TARGET}% target" style="position:absolute;left:0;top:34px;width:{CW}px;height:{CH}px" width="{CW}" height="{CH}" viewBox="0 0 {CW} {CH}">'
           + "".join(rects) + f'<line x1="0" y1="{ty:.1f}" x2="{CW}" y2="{ty:.1f}" stroke="{INK}" stroke-width="3"/><line x1="0" y1="{CH}" x2="{CW}" y2="{CH}" stroke="{GRAY}" stroke-width="2"/></svg>')
    labels = "".join(f'<p style="flex:1;font-size:24px;text-align:center;color:{MUT}">{x["m"]}</p>' for x in mon)
    chart = (f'<div style="flex:1;display:flex;flex-direction:column;gap:6px"><h3 style="font-size:28px;font-weight:700;color:{INK}">Conversion by month · red = below target</h3>'
             f'<div style="position:relative;width:{CW}px;height:{CH+34}px">{svg}{"".join(vals)}</div>'
             f'<div style="width:{CW}px;display:flex;flex-direction:row">{labels}</div>'
             f'<p style="font-size:24px;color:{MUT}">Line = {TARGET}% target · {mon[-1]["m"]} = month to date through {lab(F["wend"])}</p></div>')
    # cohort heat grids
    def grid(key, title):
        rows = (F["cohort"] or {}).get(key) or []
        NP = 5; cell = "font-size:20px;padding:4px 6px;text-align:right"
        out = [f'<p style="{cell};text-align:left;font-weight:700;color:{MUT};background:{H_CELL}">Week</p>'] + \
              [f'<p style="{cell};font-weight:700;color:{MUT};background:{H_CELL}">{p}</p>' for p in range(NP)]
        cols = [[r["vals"][p] for r in rows if len(r["vals"]) > p] for p in range(NP)]
        for r in rows:
            out.append(f'<p style="{cell};text-align:left;color:{MUT};background:#FCFDFE">{lab(r["lead_week"])}</p>')
            vs = r["vals"][:NP]
            for p, v in enumerate(vs):
                lo, hi = min(cols[p]), max(cols[p]); t = (v - lo) / (hi - lo) if hi > lo else 0.5
                out.append(f'<p style="{cell};color:{INK};background:{heat(t)}">{v:.1f}</p>')
            if NP - len(vs): out.append(f'<p style="grid-column:span {NP-len(vs)};{cell};background:#FCFDFE"> </p>')
        return (f'<div style="display:flex;flex-direction:column;gap:6px"><h3 style="font-size:28px;font-weight:700;color:{INK}">{title}</h3>'
                f'<div style="display:grid;grid-template-columns:104px repeat(5,58px);gap:2px;background:#D5DCE6;border:2px solid #D5DCE6">{"".join(out)}</div></div>')
    if F["cohort"]:
        coh = (f'<div style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;gap:20px">{grid("book", "Booking % by lead week")}{grid("conv", "Conversion % by lead week")}</div>'
               f'<p style="font-size:24px;color:{MUT}">0–4 = weeks since lead week · each column shaded red (low) to green (high)</p></div>')
    else:
        coh = f'<div style="width:840px;background:#FFF4E5;border:2px dashed #C26A00;border-radius:8px;padding:24px"><p style="font-size:26px;color:#7A4100"><b>Cohort tables missing.</b> The cohort feed does not cover the last 9 lead weeks and no cohort.csv was given.</p></div>'
    body = '<div style="display:flex;gap:18px">' + "".join(tiles) + f'</div>\n<div style="display:flex;gap:40px">{chart}{coh}</div>'
    return section("exec", "Conversion Executive Summary", f'Week of {span(F["week"], F["wend"])}, {D(F["wend"]).year} · all channels ex. Fleet',
                   "Bottom line", band, body,
                   f"Sources: channel feed (period), technician feed (booked ticket), {F.get('cohort_source') or 'cohort data missing'} · Trend = 13 weeks, dotted = 8-wk avg · 2",
                   "Tiles read left to right: revenue is the result, conversion the rate, then the inputs (leads, booked jobs, booked ticket). Each shows last week, the change from the week before, and the gap to the trailing 8-week average; the top border is green or red on that gap. Booked ticket = booked revenue ÷ completed jobs with an invoice, as in the OBR. The cohort grids show only weeks that have fully elapsed by the report week.", gap=20)


def s_channels(F, band):
    C = F["channels"]; wk = C["weeks"]
    LINES = [("conv", "Conv.", NAVY), ("book", "Booking", BLUE), ("canc", "Cancel", "#C26A00")]
    def panel(c, ymax):
        ser, avg = C["ch"][c]["ser"], C["ch"][c]["avg"]; Wd, Hd = 640, 186; n = len(ser); bw = Wd / n
        lmax = next(x for x in [200, 300, 400, 500, 1000, 1500, 2000, 2500, 3000, 4000] if x >= max(s["leads"] for s in ser + [avg]) * 1.1)
        cx = lambda i: i * bw + bw / 2; Y = lambda v: Hd - v / ymax * Hd
        g = [f'<line x1="0" y1="{Y(ymax*k/2):.1f}" x2="{Wd}" y2="{Y(ymax*k/2):.1f}" stroke="#D5DCE6" stroke-width="2"/>' for k in (1, 2)]
        bars = [f'<rect x="{i*bw+6:.1f}" y="{Hd-s["leads"]/lmax*Hd:.1f}" width="{bw-12:.1f}" height="{s["leads"]/lmax*Hd:.1f}" fill="#DCE3EC"/>' for i, s in enumerate(ser)]
        la = f'<line x1="0" y1="{Hd-avg["leads"]/lmax*Hd:.1f}" x2="{Wd}" y2="{Hd-avg["leads"]/lmax*Hd:.1f}" stroke="#A9B4C2" stroke-width="2" stroke-dasharray="8 6"/>'
        ln = []
        for k, _, cl in LINES:
            ln.append(f'<line x1="0" y1="{Y(avg[k]):.1f}" x2="{Wd}" y2="{Y(avg[k]):.1f}" stroke="{cl}" stroke-width="4" stroke-dasharray="1 9" stroke-linecap="round"/>')
            ln.append(f'<polyline points="{" ".join(f"{cx(i):.1f},{Y(s[k]):.1f}" for i, s in enumerate(ser))}" fill="none" stroke="{cl}" stroke-width="4" stroke-linejoin="round"/>')
            ln.append(f'<circle cx="{cx(n-1):.1f}" cy="{Y(ser[-1][k]):.1f}" r="6" fill="{cl}"/>')
        svg = (f'<svg aria-label="{c}: weekly leads with conversion, booking and cancellation rates vs. 6-month averages" style="position:absolute;left:60px;top:10px;width:{Wd}px;height:{Hd}px" width="{Wd}" height="{Hd}" viewBox="0 0 {Wd} {Hd}">'
               + "".join(g + bars + [la] + ln) + f'<line x1="0" y1="{Hd}" x2="{Wd}" y2="{Hd}" stroke="{GRAY}" stroke-width="2"/></svg>')
        pins = [f'<p style="position:absolute;left:0;top:{10+Y(ymax*k/2)-14:.0f}px;width:52px;font-size:24px;text-align:right;color:{MUT}">{ymax*k/2:.0f}%</p>' for k in (0, 1, 2)]
        pins += [f'<p style="position:absolute;left:{60+Wd+8}px;top:{10+Hd-lmax*k/2/lmax*Hd-14:.0f}px;width:70px;font-size:24px;color:#8A96A6">{lmax*k/2:,.0f}</p>' for k in (1, 2)]
        pins += [f'<p style="position:absolute;left:{60+cx(i)-45:.0f}px;top:{10+Hd+4}px;width:90px;font-size:24px;text-align:center;color:{MUT}">{lab(wk[i])}</p>' for i in (0, 4, 8, n - 1)]
        stat = " · ".join(f'<span style="color:{cl};font-weight:700">{nm} {ser[-1][k]:.1f}%</span> <span style="color:{MUT}">({avg[k]:.1f})</span>' for k, nm, cl in LINES)
        return (f'<div style="display:flex;flex-direction:column;gap:2px;background:#FCFDFE;border:1px solid #D5DCE6;border-radius:10px;padding:8px 16px 4px">'
                f'<div style="display:flex;justify-content:space-between;align-items:baseline"><h3 style="font-size:28px;font-weight:700;color:{NAVY}">{c}</h3>'
                f'<p style="font-size:24px">{ser[-1]["leads"]:,.0f} leads <span style="color:{MUT}">({avg["leads"]:,.0f})</span></p></div>'
                f'<p style="font-size:24px">{stat}</p><div style="position:relative;width:790px;height:230px">{svg}{"".join(pins)}</div></div>')
    def ymax(c):
        m = max(max(s[k] for s in C["ch"][c]["ser"] + [C["ch"][c]["avg"]]) for k in ("conv", "book", "canc"))
        return 40 if m <= 38 else 60 if m <= 57 else 80
    body = (f'<p style="font-size:24px;color:{MUT}"><span style="color:{NAVY};font-weight:700">— Conversion</span> · <span style="color:{BLUE};font-weight:700">— Booking</span> · '
            f'<span style="color:#C26A00;font-weight:700">— Cancellation</span> (of booked) · dotted = 6-mo avg · bars = leads, right axis · (n) = 6-mo avg</p>\n'
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' + "".join(panel(c, ymax(c)) for c in ("All", "Core", "GBL", "Referral")) + "</div>")
    return section("channel-trends", "Channel Performance · 12 Weeks", f'Weeks of {lab(wk[0])}–{lab(wk[-1])} · 6-month avg = {lab(C["prior"][0])}–{lab(C["prior"][1])}',
                   "Bottom line", band, body, "Source: channel feed, period basis, Fleet excluded · Brand omitted (under 30 leads a week) · 3",
                   "Read each panel as: did lead volume move (bars against the dashed grey average), and did the three rates move with it? Rates that hold while volume rises mean the channel scales cleanly; rates that fall as volume rises point to lead quality or capacity. Booking and conversion are per lead in the week; cancellation is per booked job.", gap=14)


def s_market(F, band):
    K = F["market"]; co = K["co_cr"]; CA = K["chavg"]
    P = "font-size:24px;text-align:center;padding:6px 2px;"; H = f"font-size:24px;font-weight:700;color:{MUT};text-align:center;padding:6px 2px;background:{H_CELL}"
    out = [f'<p style="font-size:24px;font-weight:700;color:{MUT};padding:6px 8px;background:{H_CELL}">Market</p>', f'<p style="{H}">Leads</p>',
           f'<p style="font-size:24px;font-weight:700;color:{NAVY};padding:6px 10px;background:{T_CELL}">Conversion Rate (All Market Avg: {co:.1f}%)</p>'] + \
          [f'<p style="{H}">{c}</p>' for c in ("Core BR%", "Core CR%", "GBL BR%", "GBL CR%")]
    for r in K["rows"]:
        p = r["cr"]; d = p - co
        bc = RED if d <= -2 else (NAVY if d >= 2 else BLUE)
        lb = (f'<p style="font-size:24px;font-weight:700;color:{RED_T}">{p:.1f}%</p>' if d <= -2 else
              f'<p style="font-size:24px;font-weight:700">{p:.1f}%</p>' if d >= 2 else f'<p style="font-size:24px">{p:.1f}%</p>')
        out.append(f'<p style="font-size:24px;font-weight:700;padding:6px 8px;background:#FCFDFE">{r["m"]}</p><p style="{P}{W_CELL}">{r["leads"]:,}</p>'
                   f'<div style="display:flex;align-items:center;gap:10px;background:#FCFDFE;padding:6px 10px"><div style="width:{round(p*18)}px;height:26px;background:{bc}"></div>{lb}</div>')
        for c in ("Core", "GBL"):
            n, a, pp = r[c]
            if n < 10: out.append(f'<p style="{P}{W_CELL};color:{MUT}">—</p>' * 2); continue
            for v, base in ((a, CA[c][0]), (pp, CA[c][1])):
                s_ = W_CELL + f";color:{MUT};font-style:italic" if n < 100 else (G_CELL if v - base >= 2 else R_CELL if v - base <= -2 else W_CELL)
                out.append(f'<p style="{P}{s_}">{v:.1f}</p>')
    TB = f"background:{T_CELL};font-weight:700"
    out.append(f'<p style="font-size:24px;font-weight:700;padding:6px 8px;background:{T_CELL};color:{NAVY}">All markets</p><p style="{P}{TB}">{K["co_leads"]:,}</p>'
               f'<p style="font-size:24px;padding:6px 10px;{TB}">{co:.1f}%</p>' + "".join(f'<p style="{P}{TB}">{v:.1f}</p>' for c in ("Core", "GBL") for v in CA[c]))
    body = ('<div style="display:grid;grid-template-columns:1fr 130px 640px 150px 150px 150px 150px;gap:2px;background:#D5DCE6;border:2px solid #D5DCE6">\n' + "\n".join(out) + "\n</div>\n"
            f'<p style="font-size:24px;color:{MUT};line-height:1.35">BR = booked ÷ leads, CR = completed ÷ leads, in the same weeks (period basis, as the 23.1% target). Conversion bars red/navy = 2+ pts below/above the all-market average. Channel cells are shaded against that channel’s all-market rate (bottom row), so Core is judged against Core and GBL against GBL. Italic = under 100 leads; — = no volume.</p>')
    return section("channel-market", "Conversion by Market and Channel", f'8 weeks, {lab(K["from"])}–{lab(K["to"])} · period basis · sorted by leads',
                   "Bottom line", band, body, "Source: channel feed, period basis, Fleet excluded · market totals include Referral and Brand · 4",
                   "Read down the conversion column for the market ranking, then across to the channel cells to see whether a weak market is weak on both channels (a market problem: price, coverage, slots) or on one (a channel problem). Each channel is compared with its own all-market rate because GBL and Core start from different baselines.", gap=24)


def s_funnel(F, band):
    U = F["funnel"]; weeks = U["weeks"]
    P = "font-size:24px;text-align:center;padding:7px 2px;"
    out = [f'<p style="font-size:24px;font-weight:700;color:{MUT};padding:7px 8px;background:{H_CELL}">Lead week</p>'] + \
          [f'<p style="{P}font-weight:700;color:{MUT};background:{H_CELL}">{D(w).month}/{D(w).day}</p>' for w in weeks] + [f'<p style="{P}font-weight:700;color:{MUT};background:{H_CELL}">4 vs 8 wk</p>']
    for r in U["rows"]:
        name, vals, mat = r["name"], r["vals"], r["mature_lag"]
        base = T_CELL if name in ("Booking rate", "Completed conv.") else ("#FFF4E5" if name.startswith("Replied,") else "#FCFDFE")
        tc = f";color:{NAVY}" if base == T_CELL else (";color:#7A4100" if base == "#FFF4E5" else "")
        out.append(f'<p style="font-size:24px;font-weight:700;padding:7px 8px;background:{base}{tc}">{name}</p>')
        if mat is None:
            out += [f'<p style="{P}background:{base}">{v:,.0f}</p>' for v in vals] + [f'<p style="{P}background:{base};color:{MUT}">—</p>']; continue
        matn = len(weeks) - mat; med = st.median(vals[:matn]); inv = name.startswith("Replied,")
        for i, v in enumerate(vals):
            if mat and i >= matn: out.append(f'<p style="{P}background:{base};color:{MUT};font-style:italic">{v:.1f}</p>'); continue
            dl = (v - med) * (-1 if inv else 1)
            out.append(f'<p style="{P}{G_CELL if dl >= 2 else R_CELL if dl <= -2 else "background:" + base}">{v:.1f}</p>')
        mv = vals[:matn]; dd = sum(mv[-4:]) / 4 - sum(mv[-12:-4]) / len(mv[-12:-4]); good = dd * (-1 if inv else 1)
        s_ = f"color:{MUT}" if abs(dd) < 2 else ((G_CELL if good > 0 else R_CELL) + ";font-weight:700")
        out.append(f'<p style="{P}background:{base};{s_}">{fx(f"{dd:+.1f}")}</p>')
    body = ('<div style="display:grid;grid-template-columns:1fr repeat(13, 93px) 150px;gap:2px;background:#D5DCE6;border:2px solid #D5DCE6">\n' + "\n".join(out) + "\n</div>\n"
            f'<p style="font-size:24px;color:{MUT}">Shaded ±2 pts vs. the row’s 13-week median{" (for “Replied, no est.”, red = higher)" if any(r["name"].startswith("Replied,") for r in U["rows"]) else ""}. Steps 1–2 ÷ leads; 3–5 ÷ the prior step. 4 vs 8 wk = last 4 mature weeks vs. the 8 before, pts. Italic = still maturing.</p>')
    return section("funnel", "Sales Funnel · All Channels", "Cohorted by lead week · step rates in order", "Bottom line", band, body,
                   "Source: sales event feed, cohorted by lead week (reply rate runs ~2 pts above Redash 1442) · 5",
                   "Counts collapse to leads and every step is a rate in sequence. Overall booking and completed rates are shown for reference. The replied-no-estimate row is leads with a customer reply but no estimate and therefore no rep.", gap=24)


def s_reps(F, band):
    R = F["reps"]; V = R["volume"]
    if not V:
        body = (f'<div style="background:#FFF4E5;border:2px dashed #C26A00;border-radius:8px;padding:32px"><p style="font-size:28px;color:#7A4100"><b>Leaderboard data missing.</b> '
                f'The sales leaderboard feed returned no agents for this window.</p></div>\n' + owner_boxes("[Sales lead writes]"))
        return section("rep-volume", "Rep Output: Volume and Efficiency", "13 weeks · data needed", "Bottom line", band, body, "Source: sales leaderboard feed · 6", "")
    rows = []
    for u, v in V.items():
        v = dict(v); v["rep"] = v["name"]; rows.append(v)
    rows.sort(key=lambda r: -r["rev"])
    T = {k: sum(r[k] for r in rows) for k in ("rev", "jobs", "est", "ib", "sd", "_arev", "_eb", "_ec")}
    T.update(tkt=T["_arev"] / T["jobs"], ebr=T["_eb"] / T["est"] * 100, pc=T["_ec"] / T["est"] * 100, rpe=T["rev"] / T["est"])
    cols = [("rev", "Completed revenue ▾", lambda v: f"${v/1000:,.0f}k"), ("jobs", "Completed jobs", lambda v: f"{v:,.0f}"), ("est", "Estimates", lambda v: f"{v:,.0f}"),
            ("ib", "Inbound answered", lambda v: f"{v:,.0f}"), ("sd", "Same-day booked", lambda v: f"{v:,.0f}"), ("tkt", "Avg ticket", lambda v: f"${v:,.0f}"),
            ("ebr", "Est. → booked", lambda v: f"{v:.1f}%"), ("pc", "Est. → completed", lambda v: f"{v:.1f}%"), ("rpe", "Rev. per estimate", lambda v: f"${v:,.0f}")]
    P = "font-size:24px;padding:3px 6px;text-align:center;"
    o = [f'<p style="font-size:24px;padding:6px 8px;background:{H_CELL}"></p>',
         f'<p style="grid-column:span 5;font-size:24px;font-weight:700;color:#F5F7FA;background:{NAVY};text-align:center;padding:4px">Volume · how much they produce</p>',
         f'<p style="grid-column:span 4;font-size:24px;font-weight:700;color:#F5F7FA;background:{BLUE};text-align:center;padding:4px">Efficiency · how well they convert</p>',
         f'<p style="font-size:24px;font-weight:700;color:{MUT};padding:6px 8px;background:{H_CELL}">Rep</p>']
    o += [f'<p style="{P}font-weight:700;color:{NAVY if k == "rev" else MUT};background:{T_CELL if k == "rev" else H_CELL};line-height:1.15">{l}</p>' for k, l, _ in cols]
    mx = max(r["rev"] for r in rows)
    for r in rows:
        o.append(f'<p style="font-size:24px;font-weight:700;padding:3px 8px;background:#FCFDFE">{r["rep"]}</p>')
        for k, _, f in cols:
            if k == "rev":
                o.append(f'<div style="display:flex;align-items:center;gap:10px;padding:3px 10px;background:#FCFDFE"><div style="width:{round(r["rev"]/mx*140)}px;height:24px;background:{NAVY};border-radius:3px"></div><p style="font-size:24px;font-weight:700">{f(r[k])}</p></div>')
                continue
            vs = [x[k] for x in rows]; hi, lo = r[k] == max(vs), r[k] == min(vs)
            s_ = (G_CELL + ";font-weight:700") if hi else ((R_CELL + ";font-weight:700") if lo else W_CELL + f";color:{INK}")
            o.append(f'<p style="{P}{s_}">{f(r[k])}</p>')
    o.append(f'<p style="font-size:24px;font-weight:700;padding:6px 8px;background:{T_CELL};color:{NAVY}">Team ({len(rows)})</p>')
    o += [f'<p style="{P}background:{T_CELL};font-weight:700">{f(T[k])}{" total" if k == "rev" else ""}</p>' for k, _, f in cols]
    body = ('<div style="display:grid;grid-template-columns:1fr 250px 156px 156px 140px 140px 120px 132px 162px 136px;gap:2px;background:#D5DCE6;border:2px solid #D5DCE6">\n' + "\n".join(o) + "\n</div>\n"
            f'<p style="font-size:24px;color:{MUT};line-height:1.35">Green = best of {len(rows)}, red = lowest · Revenue = avg of estimate- and appointment-owner credit · Rates are per estimate, not per lead</p>\n' + owner_boxes("[Sales lead writes]"))
    return section("rep-volume", "Rep Output: Volume and Efficiency", f'13 weeks, {lab(R["from"])}–{lab(R["to"])} · sorted by completed revenue', "Bottom line", band, body,
                   f"Source: sales leaderboard feed (weekly, activity date) · agents with {MIN_EST}+ estimates in the window · 6",
                   "Read the two halves together. High volume with low efficiency means a rate fix is worth the most jobs. High efficiency with low volume is a capacity or lead-routing question, not a skill one. Revenue per estimate combines booking rate × completion × ticket, so it is the fairest single comparison of what a rep gets out of each estimate.")


def s_cancel(F, band):
    X = F["cancel"]; wk = X["weekly"]; n = len(wk); CW, CH = 860, 200; slot = CW / n; ymax = max(26, max(x["lost"] + x["resch"] for x in wk) * 1.15)
    avg = sum(x["lost"] + x["resch"] for x in wk[:-1]) / (n - 1); Y = lambda v: CH - v / ymax * CH
    rects, pins = [], []
    for i, x in enumerate(wk):
        bx, bw, tl, tr = i * slot + slot * 0.17, slot * 0.66, x["lost"], x["resch"]
        rects.append(f'<rect x="{bx:.1f}" y="{Y(tl):.1f}" width="{bw:.1f}" height="{CH-Y(tl):.1f}" fill="{NAVY}"/><rect x="{bx:.1f}" y="{Y(tl+tr):.1f}" width="{bw:.1f}" height="{CH-Y(tr):.1f}" fill="{BLUE}"/>')
        pins.append(f'<p style="position:absolute;left:{i*slot:.0f}px;top:{Y(tl+tr)-32:.0f}px;width:{slot:.0f}px;font-size:24px;text-align:center;background:#F5F7FA;{"font-weight:700" if i == n-1 else ""}">{tl+tr:.0f}</p>')
    svg = (f'<svg aria-label="Weekly cancels per 100 assigned jobs, lost vs. rescheduled" style="position:absolute;left:0;top:0;width:{CW}px;height:{CH}px" width="{CW}" height="{CH}" viewBox="0 0 {CW} {CH}">' + "".join(rects)
           + f'<line x1="0" y1="{Y(avg):.1f}" x2="{CW}" y2="{Y(avg):.1f}" stroke="{INK}" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/><line x1="0" y1="{CH}" x2="{CW}" y2="{CH}" stroke="{GRAY}" stroke-width="2"/></svg>')
    labs = "".join(f'<p style="flex:1;font-size:24px;text-align:center;color:{MUT}">{D(x["w"]).month}/{D(x["w"]).day}</p>' for x in wk)
    chart = (f'<div style="width:{CW}px;display:flex;flex-direction:column;gap:4px"><h3 style="font-size:28px;font-weight:700">Cancels per 100 assigned jobs, by appointment week</h3>'
             f'<div style="position:relative;width:{CW}px;height:{CH}px">{svg}{"".join(pins)}</div><div style="width:{CW}px;display:flex;flex-direction:row">{labs}</div>'
             f'<p style="font-size:24px;color:{MUT}"><span style="color:{NAVY};font-weight:700">■ Lost</span> · <span style="color:{BLUE};font-weight:700">■ Rescheduled</span> · dotted = 12-wk avg {avg:.1f}</p></div>')
    GR = X["grid"]; P = "font-size:24px;text-align:center;padding:4px 2px;"
    cells = [f'<p style="font-size:24px;font-weight:700;color:{MUT};padding:4px 8px;background:{H_CELL}">Per 100 booked</p>'] + [f'<p style="{P}font-weight:700;color:{MUT};background:{H_CELL}">{c}</p>' for c in ("Core", "GBL", "Referral", "All", "All norm")]
    for g, lb in (("price", "Price / alternative"), ("timing", "Timing / rebooked"), ("silent", "Silent / no-show"), ("ops", "NuBrakes ops"), ("total", "All reasons")):
        tot = g == "total"; bg = T_CELL if tot else "#FCFDFE"
        cells.append(f'<p style="font-size:24px;font-weight:700;padding:4px 8px;background:{bg}{";color:" + NAVY if tot else ""}">{lb}</p>')
        for c in ("Core", "GBL", "Referral", "All"):
            v, nm = GR[f"{c}|{g}"]; d = v - nm
            s_ = R_CELL if (d >= 1 and v >= nm * 1.25) or (tot and d >= 2) else (G_CELL if (d <= -1 and v <= nm * 0.8) or (tot and d <= -2) else f"background:{bg}")
            cells.append(f'<p style="{P}{s_}{";font-weight:700" if tot else ""}">{v:.1f}</p>')
        cells.append(f'<p style="{P}background:{bg};color:{MUT}">{GR["All|" + g][1]:.1f}</p>')
    grid = (f'<div style="flex:1;display:flex;flex-direction:column;gap:6px"><h3 style="font-size:28px;font-weight:700">Reason × channel · last 4 weeks</h3>'
            f'<div style="display:grid;grid-template-columns:1fr 96px 96px 120px 96px 130px;gap:2px;background:#D5DCE6;border:2px solid #D5DCE6">{"".join(cells)}</div>'
            f'<p style="font-size:24px;color:{MUT}">Red / green = up / down 25%+ and 1+ per 100 vs. the 13 weeks before</p></div>')
    MK = X["markets"]; Q = "font-size:24px;text-align:center;padding:4px 2px;"
    m = [f'<p style="font-size:24px;font-weight:700;color:{MUT};padding:4px 8px;background:{H_CELL}">Market · last 4 wks</p>'] + [f'<p style="{Q}font-weight:700;color:{MUT};background:{H_CELL}">{x["m"].replace("San Antonio", "San Ant.")}</p>' for x in MK]
    m.append('<p style="font-size:24px;font-weight:700;padding:4px 8px;background:#FCFDFE">Per 100 jobs</p>')
    for x in MK:
        small = x["n4"] < 30 or x["m"] == "Louisville"; d = (x["r4"] or 0) - (x["rn"] or 0)
        s_ = f"{W_CELL};color:{MUT};font-style:italic" if small else (R_CELL if d >= 2 else G_CELL if d <= -2 else W_CELL)
        m.append(f'<p style="{Q}{s_};font-weight:700">{(x["r4"] or 0):.1f}</p>')
    m.append(f'<p style="font-size:24px;padding:4px 8px;background:#FCFDFE;color:{MUT}">13-wk norm</p>') ; m += [f'<p style="{Q}{W_CELL};color:{MUT}">{(x["rn"] or 0):.1f}</p>' for x in MK]
    m.append(f'<p style="font-size:24px;padding:4px 8px;background:#FCFDFE;color:{MUT}">Lost share</p>') ; m += [f'<p style="{Q}{W_CELL};color:{MUT}">{x["lost_share"]:.0f}%</p>' for x in MK]
    body = (f'<div style="display:flex;gap:40px">{chart}{grid}</div>\n'
            f'<div style="display:grid;grid-template-columns:1fr repeat({len(MK)},134px);gap:2px;background:#D5DCE6;border:2px solid #D5DCE6">{"".join(m)}</div>\n' + owner_boxes("[Sales Support lead writes]"))
    return section("sales-support", "Sales Support · Cancellations", f'Week of {span(F["week"], F["wend"])} · Fleet excluded', "What moved", band, body,
                   "Cancellation feed · per 100 assigned jobs (technician feed) or booked jobs (channel feed) · Italic = under 30 cancels; Louisville feeds disagree · 7",
                   "Lost = withdrawn and not rescheduled; rescheduled = Withdrawn: Reschedule, which may still complete. Reason owners: price and alternatives with Sales, timing and silent cancels with Sales Support, NuBrakes ops with Ops. Schedule Optimization (Unserved) and Technician availability are both NuBrakes ops.", gap=16)


def render(args):
    F = json.load(open(os.path.join(OUT, "facts.json")))
    bands = json.load(open(os.path.join(OUT, "bands.json")))
    need = ["exec", "channel-trends", "channel-market", "funnel", "rep-volume", "sales-support"]
    miss = [k for k in need if not bands.get(k)]
    if miss: sys.exit(f"bands.json missing: {miss}")
    slides = {"cover": s_cover(F), "exec": s_exec(F, bands["exec"]), "channel-trends": s_channels(F, bands["channel-trends"]),
              "channel-market": s_market(F, bands["channel-market"]), "funnel": s_funnel(F, bands["funnel"]),
              "rep-volume": s_reps(F, bands["rep-volume"]), "sales-support": s_cancel(F, bands["sales-support"])}
    sd = os.path.join(OUT, "project", "slides"); os.makedirs(sd, exist_ok=True)
    for k, html in slides.items():
        n_el = len(re.findall(r"<(p|div|svg|h1|h2|h3)\b", html))
        if n_el > 195: print(f"WARN {k}: {n_el} elements (limit 200)")
        open(os.path.join(sd, k + ".html"), "w").write(html)
    order = ["cover"] + need
    deck = {"v": 4, "createdOnFiles": {"v": 1, "at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "lists": "css",
            "title": f'NuBrakes CX Conversion Review — Week of {lab(F["week"])}, {D(F["week"]).year}', "order": order,
            "sections": {"s1": {"description": "Cover", "start": "cover"}, "s2": {"description": "Weekly review: summary, channels, markets, funnel, reps, cancels", "start": "exec"}},
            "faces": {}, "designSystems": []}
    json.dump(deck, open(os.path.join(OUT, "project", "deck.json"), "w"), indent=1)
    print("slides ->", sd)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("step", choices=["compute", "render"])
    ap.add_argument("--week"); ap.add_argument("--cohort")
    a = ap.parse_args()
    compute(a) if a.step == "compute" else render(a)
