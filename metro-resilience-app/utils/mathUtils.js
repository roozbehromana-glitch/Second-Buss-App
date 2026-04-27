function trapezoidalIntegral(x, y) {
  if (x.length !== y.length || x.length < 2) return 0;
  let area = 0;
  for (let i = 1; i < x.length; i += 1) {
    area += ((y[i - 1] + y[i]) / 2) * (x[i] - x[i - 1]);
  }
  return area;
}

function normalizeSeries(series) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  if (max === min) return series.map(() => 1);
  return series.map((v) => (v - min) / (max - min));
}

function average(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function clamp(num, min = 0, max = 1) {
  return Math.max(min, Math.min(max, num));
}

module.exports = {
  trapezoidalIntegral,
  normalizeSeries,
  average,
  clamp
};
