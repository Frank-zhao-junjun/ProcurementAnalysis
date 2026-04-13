function compactObject(value) {
  return Object.entries(value).reduce((result, [key, current]) => {
    if (current !== undefined && current !== null) {
      result[key] = current;
    }
    return result;
  }, {});
}

export function buildRuntimeContext(snapshot) {
  return {
    userRole: snapshot.session.userRole,
    dateRange: snapshot.session.dateRange,
    activeTab: snapshot.ui.activeTab,
    activeModule: snapshot.ui.activeModule,
    selectedDimension: snapshot.ui.selectedDimension,
    activeFilters: snapshot.ui.activeFilters,
    selectedEntity: snapshot.ui.selectedEntity,
    highlightedChart: snapshot.ui.highlightedChart,
    kpiSnapshot: snapshot.ui.kpiSnapshot ?? null
  };
}

export function createContextBridge({
  stateBus,
  resolveModuleName = (tabId) => tabId,
  getChartDimension = () => null
} = {}) {
  if (!stateBus) {
    throw new Error('stateBus is required');
  }

  function syncTab(tabId) {
    return stateBus.update({
      ui: {
        activeTab: tabId,
        activeModule: resolveModuleName(tabId),
        selectedEntity: null,
        highlightedChart: null
      }
    });
  }

  function syncDimension({ chartId, dimName }) {
    return stateBus.update({
      ui: {
        selectedDimension: dimName,
        highlightedChart: chartId,
        selectedEntity: {
          type: 'dimension',
          id: chartId,
          name: dimName
        }
      }
    });
  }

  function syncChartSelection({ chartId, params = {} }) {
    const dimension = getChartDimension(chartId);

    return stateBus.update({
      ui: {
        highlightedChart: chartId,
        selectedDimension: dimension || stateBus.getSnapshot().ui.selectedDimension,
        selectedEntity: compactObject({
          type: 'chart',
          id: chartId,
          name: params.name || params.seriesName || chartId,
          seriesName: params.seriesName,
          value: params.value ?? params.data?.value,
          dimension
        })
      }
    });
  }

  function syncKpiSelection({ label, value }) {
    return stateBus.update({
      ui: {
        highlightedChart: null,
        selectedEntity: {
          type: 'kpi',
          id: label,
          name: label,
          value
        }
      }
    });
  }

  function syncFilters(activeFilters) {
    return stateBus.update({
      ui: {
        activeFilters
      }
    });
  }

  function getRuntimeContext() {
    return buildRuntimeContext(stateBus.getSnapshot());
  }

  return {
    syncTab,
    syncDimension,
    syncChartSelection,
    syncKpiSelection,
    syncFilters,
    getRuntimeContext
  };
}

if (typeof window !== 'undefined') {
  window.PIDashboardAI = {
    ...(window.PIDashboardAI || {}),
    createContextBridge
  };
}