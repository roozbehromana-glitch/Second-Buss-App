function buildAdjacency(nodes, edges) {
  const ids = nodes.map((n) => n.id);
  const index = Object.fromEntries(ids.map((id, i) => [id, i]));
  const matrix = Array.from({ length: ids.length }, () => Array(ids.length).fill(0));
  const adjacency = Object.fromEntries(ids.map((id) => [id, new Set()]));

  edges.forEach((edge) => {
    if (index[edge.source] === undefined || index[edge.target] === undefined) return;
    matrix[index[edge.source]][index[edge.target]] = 1;
    matrix[index[edge.target]][index[edge.source]] = 1;
    adjacency[edge.source].add(edge.target);
    adjacency[edge.target].add(edge.source);
  });

  return {
    matrix,
    adjacency: Object.fromEntries(Object.entries(adjacency).map(([k, v]) => [k, [...v]])),
    ids,
    index
  };
}

function computeDegrees(adjacency) {
  return Object.fromEntries(Object.entries(adjacency).map(([id, neighbors]) => [id, neighbors.length]));
}

function bfsShortestPaths(adjacency, start) {
  const queue = [start];
  const dist = { [start]: 0 };
  const pathsCount = { [start]: 1 };
  const predecessors = {};
  Object.keys(adjacency).forEach((id) => {
    predecessors[id] = [];
  });

  while (queue.length) {
    const v = queue.shift();
    adjacency[v].forEach((w) => {
      if (dist[w] === undefined) {
        dist[w] = dist[v] + 1;
        queue.push(w);
      }
      if (dist[w] === dist[v] + 1) {
        pathsCount[w] = (pathsCount[w] || 0) + (pathsCount[v] || 0);
        predecessors[w].push(v);
      }
    });
  }

  return { dist, pathsCount, predecessors };
}

function betweennessCentrality(adjacency) {
  const nodes = Object.keys(adjacency);
  const cb = Object.fromEntries(nodes.map((n) => [n, 0]));

  nodes.forEach((s) => {
    const stack = [];
    const queue = [s];
    const pred = Object.fromEntries(nodes.map((v) => [v, []]));
    const sigma = Object.fromEntries(nodes.map((v) => [v, 0]));
    const dist = Object.fromEntries(nodes.map((v) => [v, -1]));
    sigma[s] = 1;
    dist[s] = 0;

    while (queue.length) {
      const v = queue.shift();
      stack.push(v);
      adjacency[v].forEach((w) => {
        if (dist[w] < 0) {
          queue.push(w);
          dist[w] = dist[v] + 1;
        }
        if (dist[w] === dist[v] + 1) {
          sigma[w] += sigma[v];
          pred[w].push(v);
        }
      });
    }

    const delta = Object.fromEntries(nodes.map((v) => [v, 0]));
    while (stack.length) {
      const w = stack.pop();
      pred[w].forEach((v) => {
        if (sigma[w] > 0) {
          delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        }
      });
      if (w !== s) cb[w] += delta[w];
    }
  });

  const norm = nodes.length > 2 ? 1 / ((nodes.length - 1) * (nodes.length - 2)) : 1;
  return Object.fromEntries(Object.entries(cb).map(([k, v]) => [k, v * norm]));
}

function largestConnectedComponent(adjacency, removed = new Set()) {
  const nodes = Object.keys(adjacency).filter((n) => !removed.has(n));
  const visited = new Set();
  let maxSize = 0;

  nodes.forEach((node) => {
    if (visited.has(node)) return;
    const q = [node];
    visited.add(node);
    let size = 0;
    while (q.length) {
      const cur = q.shift();
      size += 1;
      adjacency[cur].forEach((n) => {
        if (!visited.has(n) && !removed.has(n)) {
          visited.add(n);
          q.push(n);
        }
      });
    }
    maxSize = Math.max(maxSize, size);
  });

  return maxSize;
}

function removalSequence(nodes, scores, mode, userCritical = []) {
  const ids = nodes.map((n) => n.id);
  if (mode === 'random') return [...ids].sort(() => Math.random() - 0.5);
  if (mode === 'user-critical') {
    const criticalSet = new Set(userCritical);
    const prioritized = ids.filter((id) => criticalSet.has(id));
    const rest = ids.filter((id) => !criticalSet.has(id));
    return [...prioritized, ...rest];
  }
  return [...ids].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
}

module.exports = {
  buildAdjacency,
  computeDegrees,
  betweennessCentrality,
  largestConnectedComponent,
  removalSequence,
  bfsShortestPaths
};
