const express = require('express');
const {
  buildAdjacency,
  computeDegrees,
  betweennessCentrality,
  largestConnectedComponent,
  removalSequence
} = require('../utils/graphUtils');
const { trapezoidalIntegral, average, clamp } = require('../utils/mathUtils');

const router = express.Router();

function validateNetwork(network) {
  if (!network || !Array.isArray(network.nodes) || !Array.isArray(network.edges)) {
    throw new Error('Network must include nodes and edges arrays.');
  }
  if (network.nodes.length < 2 || network.edges.length < 1) {
    throw new Error('Network must have at least 2 nodes and 1 edge.');
  }
}

function analyzeNetwork(network) {
  const { nodes, edges } = network;
  const { matrix, adjacency } = buildAdjacency(nodes, edges);
  const degree = computeDegrees(adjacency);
  const betweenness = betweennessCentrality(adjacency);
  const lcc = largestConnectedComponent(adjacency);
  return { matrix, degree, betweenness, lcc, adjacency };
}

router.post('/network/analyze', (req, res, next) => {
  try {
    validateNetwork(req.body.network);
    const analysis = analyzeNetwork(req.body.network);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

router.post('/robustness/run', (req, res, next) => {
  try {
    const { network, monteCarloRuns = 100, userCritical = [] } = req.body;
    validateNetwork(network);
    const { nodes } = network;
    const { degree, betweenness, adjacency } = analyzeNetwork(network);
    const total = nodes.length;

    function runCurve(mode, scoreMap) {
      let accum = Array.from({ length: total + 1 }, () => 0);
      const runs = mode === 'random' ? monteCarloRuns : 1;
      for (let r = 0; r < runs; r += 1) {
        const seq = removalSequence(nodes, scoreMap, mode, userCritical);
        const removed = new Set();
        for (let i = 0; i <= total; i += 1) {
          if (i > 0) removed.add(seq[i - 1]);
          const lcc = largestConnectedComponent(adjacency, removed);
          accum[i] += lcc / total;
        }
      }
      const y = accum.map((v) => v / runs);
      const x = y.map((_, i) => i / total);
      const f90 = x.find((f, i) => y[i] < 0.9) ?? 1;
      const fc = x.find((f, i) => y[i] <= 1 / total) ?? 1;
      return { x, y, f90, fc };
    }

    const random = runCurve('random');
    const degreeTargeted = runCurve('degree', degree);
    const betweennessTargeted = runCurve('betweenness', betweenness);
    const userCriticalTargeted = runCurve('user-critical');

    res.json({
      curves: {
        random,
        degreeTargeted,
        betweennessTargeted,
        userCriticalTargeted
      },
      summary: [
        ['Random', random.f90, random.fc],
        ['Targeted (Degree)', degreeTargeted.f90, degreeTargeted.fc],
        ['Targeted (Betweenness)', betweennessTargeted.f90, betweennessTargeted.fc],
        ['Targeted (User Critical)', userCriticalTargeted.f90, userCriticalTargeted.fc]
      ]
    });
  } catch (error) {
    next(error);
  }
});

router.post('/resilience/run', (req, res, next) => {
  try {
    const { scenario, weights = { w1: 0.33, w2: 0.34, w3: 0.33 } } = req.body;
    const { w1, w2, w3 } = weights;
    if (Math.abs(w1 + w2 + w3 - 1) > 0.001) throw new Error('Weights w1 + w2 + w3 must sum to 1.');
    if (!scenario || scenario.disruptionDuration <= 0) throw new Error('Disruption duration must be positive.');

    const duration = Number(scenario.disruptionDuration);
    const recovery = Number(scenario.recoveryDuration || duration);
    const totalTime = duration + recovery;
    const points = Math.max(10, Number(scenario.timeSteps || 30));
    const step = totalTime / points;
    const t = Array.from({ length: points + 1 }, (_, i) => Number((i * step).toFixed(2)));

    const scheduled = Number(scenario.scheduledHeadway || 4);
    const disrupted = Number(scenario.disruptedHeadway || scheduled * 2);
    const nominalStations = Number(scenario.nominalStations || 10);
    const unavailableStations = Number(scenario.unavailableStations || 2);
    const altPathFactor = Number(scenario.altPathFactor || 0.5);

    const mhdSeries = [];
    const sarSeries = [];
    const sriSeries = [];
    const qSeries = [];

    t.forEach((time) => {
      const disruptionShare = clamp((duration - time) / duration);
      const recoveryShare = time > duration ? clamp((time - duration) / recovery) : 0;
      const currentHeadway = disrupted * disruptionShare + scheduled * recoveryShare + scheduled * (1 - disruptionShare - recoveryShare);
      const mhd = Math.abs(currentHeadway - scheduled);
      const availableStations = nominalStations - unavailableStations * disruptionShare;
      const sar = clamp(availableStations / nominalStations);
      const sri = clamp(altPathFactor + 0.5 * recoveryShare);

      const mhdComponent = clamp(1 - mhd / Math.max(disrupted, scheduled, 1));
      const score = w1 * mhdComponent + w2 * sar + w3 * sri;

      mhdSeries.push(Number(mhd.toFixed(3)));
      sarSeries.push(Number(sar.toFixed(3)));
      sriSeries.push(Number(sri.toFixed(3)));
      qSeries.push(Number(score.toFixed(3)));
    });

    const area = trapezoidalIntegral(t, qSeries);
    const cumulativeR = totalTime > 0 ? area / totalTime : 0;
    const degradationDepth = 1 - Math.min(...qSeries);
    const recoveryTime = t.find((time, idx) => time >= duration && qSeries[idx] >= 0.95) ?? totalTime;
    const lossArea = trapezoidalIntegral(t, t.map(() => 1)) - area;

    res.json({
      t,
      mhdSeries,
      sarSeries,
      sriSeries,
      qSeries,
      indicators: {
        MHD: Number(average(mhdSeries).toFixed(3)),
        SAR: Number(average(sarSeries).toFixed(3)),
        SRI: Number(average(sriSeries).toFixed(3)),
        R_T: Number(cumulativeR.toFixed(3)),
        recoveryTime: Number(recoveryTime.toFixed(2)),
        degradationDepth: Number(degradationDepth.toFixed(3)),
        resilienceLossArea: Number(lossArea.toFixed(3))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/bridging/recommend', (req, res, next) => {
  try {
    const { scenario, metrics = {} } = req.body;
    if (!scenario) throw new Error('Scenario is required.');
    if (Number(scenario.busCapacity) <= 0) throw new Error('Bus capacity must be positive.');
    if (Number(scenario.availableBusFleet) < 0) throw new Error('Fleet size cannot be negative.');

    const demand = Number(scenario.customDemand || 0) || ({ low: 1200, medium: 4000, high: 8000 }[scenario.demandLevel] || 3000);
    const cap = Number(scenario.busCapacity);
    const rtt = Number(scenario.busRoundTripTime || 40);
    const delay = Number(scenario.busDeploymentDelay || 10);
    const duration = Number(scenario.disruptionDuration || 0);
    const availability = Number(metrics.SAR || 0.8);
    const transferAffected = Boolean(scenario.transferAffected);
    const longCorridor = Number(scenario.affectedStationsCount || 1) >= 3;

    const minFrequency = demand / cap;
    const requiredBuses = (minFrequency * rtt) / 60;

    const strategies = [
      { key: 'A', name: 'No bridging / metro-only control' },
      { key: 'B', name: 'Standard segment bus bridging' },
      { key: 'C', name: 'Extended bus bridging' },
      { key: 'D', name: 'Parallel bus bridging' },
      { key: 'E', name: 'Hybrid extended + parallel bridging' }
    ].map((s) => {
      let gain = 0.1;
      if (s.key === 'B') gain = 0.35;
      if (s.key === 'C') gain = 0.5;
      if (s.key === 'D') gain = 0.58;
      if (s.key === 'E') gain = 0.68;
      const feasibility = clamp((Number(scenario.availableBusFleet || 0) / Math.max(requiredBuses, 1)) - delay / 120);
      const score =
        0.35 * gain +
        0.25 * clamp((metrics.SAR || 0.75) + gain * 0.25) +
        0.2 * clamp((metrics.SRI || 0.6) + gain * 0.3) +
        0.1 * clamp(1 - (metrics.MHD || 2) / 10 + gain * 0.2) +
        0.1 * feasibility;
      return { ...s, expected_resilience_gain: gain, feasibility, score: Number(score.toFixed(3)) };
    });

    let ruleBased = 'B';
    if (duration < 30 && availability > 0.85) ruleBased = 'A';
    else if (duration >= 30 && duration <= 90 && !transferAffected && !longCorridor) ruleBased = 'B';
    else if (transferAffected && !longCorridor) ruleBased = 'C';
    else if (duration > 90 || (longCorridor && demand > 5000)) ruleBased = 'D';
    if (transferAffected && longCorridor && duration > 60) ruleBased = 'E';

    strategies.forEach((s) => {
      if (s.key === ruleBased) s.score = Number((s.score + 0.08).toFixed(3));
    });

    const best = strategies.sort((a, b) => b.score - a.score)[0];
    const warning = requiredBuses > Number(scenario.availableBusFleet || 0)
      ? 'Operational warning: demand exceeds bus fleet capacity for full replacement.'
      : null;

    res.json({
      bestStrategy: best,
      reason: `Rule trigger selected ${ruleBased}, with final weighted score prioritizing resilience gain and feasibility.`,
      expectedImprovementRatio: Number((best.expected_resilience_gain * 100).toFixed(1)),
      requiredBuses: Number(requiredBuses.toFixed(2)),
      expectedFrequency: Number(minFrequency.toFixed(2)),
      warning,
      allStrategies: strategies
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
