window.charts = {};

window.renderRobustnessChart = function renderRobustnessChart(curves) {
  const ctx = document.getElementById('robustnessChart').getContext('2d');
  if (window.charts.robustness) window.charts.robustness.destroy();
  window.charts.robustness = new Chart(ctx, {
    type: 'line',
    data: {
      labels: curves.random.x,
      datasets: [
        { label: 'Random', data: curves.random.y, borderColor: '#1f7a8c' },
        { label: 'Targeted Degree', data: curves.degreeTargeted.y, borderColor: '#e76f51' },
        { label: 'Targeted Betweenness', data: curves.betweennessTargeted.y, borderColor: '#2a9d8f' },
        { label: 'User Critical', data: curves.userCriticalTargeted.y, borderColor: '#6d597a' }
      ]
    },
    options: {
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { title: { display: true, text: 'Fraction Removed' } },
        y: { title: { display: true, text: 'Normalized LCC/N' }, min: 0, max: 1 }
      }
    }
  });
};

window.renderResilienceChart = function renderResilienceChart(data) {
  const ctx = document.getElementById('resilienceChart').getContext('2d');
  if (window.charts.resilience) window.charts.resilience.destroy();
  window.charts.resilience = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.t,
      datasets: [
        { label: 'Q(t)', data: data.qSeries, borderColor: '#1f7a8c' },
        { label: 'MHD', data: data.mhdSeries, borderColor: '#e76f51' },
        { label: 'SAR', data: data.sarSeries, borderColor: '#2a9d8f' },
        { label: 'SRI', data: data.sriSeries, borderColor: '#264653' }
      ]
    },
    options: {
      plugins: { legend: { position: 'bottom' } },
      scales: { x: { title: { display: true, text: 'Time' } } }
    }
  });
};
