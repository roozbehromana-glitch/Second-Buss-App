window.runBridgingRecommendation = async function runBridgingRecommendation() {
  const metrics = window.metroState.resilience?.indicators || {};
  const res = await fetch('/api/bridging/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: window.metroState.scenario, metrics })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Bridging recommendation failed');
  window.metroState.recommendation = await res.json();
  renderBridgingResult(window.metroState.recommendation);
  return window.metroState.recommendation;
};

window.renderBridgingResult = function renderBridgingResult(rec) {
  const el = document.getElementById('bridgingResult');
  el.innerHTML = `
    <h4>Best strategy: ${rec.bestStrategy.name}</h4>
    <p>${rec.reason}</p>
    <ul>
      <li>Expected resilience improvement: ${rec.expectedImprovementRatio}%</li>
      <li>Required buses: ${rec.requiredBuses}</li>
      <li>Minimum frequency: ${rec.expectedFrequency} buses/hour</li>
      <li>${rec.warning || 'No capacity warning.'}</li>
    </ul>
    <details><summary>All scenarios</summary><pre>${JSON.stringify(rec.allStrategies, null, 2)}</pre></details>
  `;
};
