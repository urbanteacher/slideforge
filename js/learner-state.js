/* A learner can open a utility panel without losing the latest live activity. */
(function (root) {
  function create() {
    var flow = { main: 'scJoin', panel: null };
    flow.show = function (id) {
      if (['scAsk', 'scPace', 'scSaved'].includes(id)) flow.panel = id;
      else {
        flow.main = id;
        if (['scJoin', 'scTeam', 'scHold', 'scOver'].includes(id)) flow.panel = null;
      }
      return flow.panel || flow.main;
    };
    flow.back = function () { flow.panel = null; return flow.main; };
    return flow;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = create;
  else root.createLearnerFlow = create;
})(typeof window === 'undefined' ? globalThis : window);
