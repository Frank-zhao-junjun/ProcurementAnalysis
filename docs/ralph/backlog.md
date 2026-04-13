# Ralph backlog — ProcurementAnalysis

Ralph-style: one user story → implement → verify → next (no batch scope creep).

| US ID | Title | Acceptance | Status |
|-------|--------|--------------|--------|
| US-001 | Single DashboardInit entry | `initDashboard` runs at most once per full page load (no auto-init + delayed init double fire) | Done |
| US-002 | KPI snapshot event | After KPI DOM update (API, fallback, refresh, manual refresh), emit `pi-dashboard-kpi-sync` with `{ kpis, source, updatedAt }` | Done |
| US-003 | AI runtime context carries KPIs | `buildRuntimeContext` exposes `kpiSnapshot`; state bus holds `ui.kpiSnapshot` | Done |
| US-004 | Wire index to state bus | Root + nested `index.html` listen for `pi-dashboard-kpi-sync` and `stateBus.update` | Done |
| US-005 | Regression test | Node test asserts `buildRuntimeContext` includes `kpiSnapshot` | Done |
