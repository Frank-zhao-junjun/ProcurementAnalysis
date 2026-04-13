# Ralph progress

| Iteration | US | Verification |
|-----------|-----|----------------|
| 1 | US-001 | Removed `dashboard-init` auto `initDashboard`; single caller remains `index.html` → `DashboardInit.init()` |
| 2 | US-002–004 | `emitKpiSnapshot` + `pi-dashboard-kpi-sync` + `stateBus.update(kpiSnapshot)` in both index entrypoints |
| 3 | US-005 | `npm test` in `project_20260411_000342/projects/server` — `buildRuntimeContext` kpi test |
