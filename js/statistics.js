/**
 * LunaFem - statistics.js
 * Visualización estadística y gráficos dinámicos utilizando Chart.js
 */

const LunaStats = (() => {
  let cycleChartInstance = null;
  let symptomChartInstance = null;
  let moodChartInstance = null;
  let flowChartInstance = null;

  const COLORS = {
    pinkDark: '#EC4899',
    pinkPastel: '#F8C8DC',
    pinkSoft: '#FCE7F3',
    lavender: '#E6E6FA',
    lila: '#D8B4FE',
    purple: '#8B5CF6',
    purpleDark: '#6D28D9',
    textMain: '#493B50',
    textMuted: '#8B7B91',
    tealPastel: '#A7F3D0',
    yellowPastel: '#FDE68A'
  };

  function init() {
    renderStats();
    window.addEventListener('lunafem:dataUpdated', () => {
      renderStats();
    });
  }

  function renderStats() {
    const periods = LunaStorage.getPeriods();
    const symptoms = LunaStorage.getSymptoms();
    const moods = LunaStorage.getMoods();
    const profile = LunaStorage.getProfile();

    renderSummaryCards(periods, profile);
    renderCycleDurationChart(periods, profile);
    renderSymptomsChart(symptoms);
    renderMoodDistributionChart(moods);
    renderFlowChart(periods);
  }

  /**
   * Tarjetas métricas superiores (promedios, regularidad, total)
   */
  function renderSummaryCards(periods, profile) {
    const averages = LunaCycle.getCycleAverages(periods, profile);

    const avgCycleEl = document.getElementById('statAvgCycle');
    const avgPeriodEl = document.getElementById('statAvgPeriod');
    const totalRecordedEl = document.getElementById('statTotalCycles');
    const regularityEl = document.getElementById('statRegularity');

    if (avgCycleEl) {
      avgCycleEl.textContent = `${averages.avgCycleLength} días`;
    }
    if (avgPeriodEl) {
      avgPeriodEl.textContent = `${averages.avgPeriodLength} días`;
    }
    if (totalRecordedEl) {
      totalRecordedEl.textContent = periods.length;
    }
    if (regularityEl) {
      if (periods.length >= 3) {
        regularityEl.textContent = profile.isRegular ? 'Regular' : 'Irregular';
      } else {
        regularityEl.textContent = profile.isRegular ? 'Estimada regular' : 'Estimada irregular';
      }
    }
  }

  /**
   * 1. Gráfico de evolución de duración de ciclos
   */
  function renderCycleDurationChart(periods, profile) {
    const ctx = document.getElementById('cycleDurationChart');
    const emptyState = document.getElementById('cycleChartEmpty');
    if (!ctx) return;

    if (cycleChartInstance) {
      cycleChartInstance.destroy();
    }

    if (!periods || periods.length < 2) {
      if (emptyState) emptyState.style.display = 'block';
      ctx.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    ctx.style.display = 'block';

    // Ordenar ascendente por fecha de inicio
    const sorted = [...periods].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const labels = [];
    const cycleDurations = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i].startDate;
      const nextStart = sorted[i + 1].startDate;
      const diff = LunaCycle.diffDays(start, nextStart);
      labels.push(`Ciclo ${i + 1} (${start.slice(5)})`);
      cycleDurations.push(diff);
    }

    if (labels.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      ctx.style.display = 'none';
      return;
    }

    cycleChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Duración del ciclo (días)',
          data: cycleDurations,
          borderColor: COLORS.purple,
          backgroundColor: 'rgba(216, 180, 254, 0.25)',
          tension: 0.35,
          fill: true,
          pointBackgroundColor: COLORS.pinkDark,
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} días de duración`
            }
          }
        },
        scales: {
          y: {
            min: Math.max(15, Math.min(...cycleDurations) - 3),
            max: Math.max(...cycleDurations) + 3,
            ticks: { stepSize: 2 }
          }
        }
      }
    });
  }

  /**
   * 2. Gráfico de frecuencia de síntomas más habituales
   */
  function renderSymptomsChart(symptoms) {
    const ctx = document.getElementById('symptomsChart');
    const emptyState = document.getElementById('symptomsChartEmpty');
    if (!ctx) return;

    if (symptomChartInstance) {
      symptomChartInstance.destroy();
    }

    if (!symptoms || symptoms.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      ctx.style.display = 'none';
      return;
    }

    const symptomLabelsMap = {
      cramps: 'Cólicos',
      headache: 'Dolor cabeza',
      bloating: 'Hinchazón',
      breast_tenderness: 'Sensib. senos',
      fatigue: 'Cansancio',
      acne: 'Acné',
      lower_back_pain: 'Dolor lumbar',
      nausea: 'Náuseas',
      mood_swings: 'Cambios humor',
      anxiety: 'Ansiedad',
      cravings: 'Antojos'
    };

    const counts = {};
    symptoms.forEach(entry => {
      if (Array.isArray(entry.types)) {
        entry.types.forEach(t => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);

    if (entries.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      ctx.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    ctx.style.display = 'block';

    const labels = entries.map(e => symptomLabelsMap[e[0]] || e[0]);
    const values = entries.map(e => e[1]);

    symptomChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Frecuencia',
          data: values,
          backgroundColor: [
            COLORS.pinkPastel,
            COLORS.lila,
            COLORS.pinkDark,
            COLORS.lavender,
            COLORS.yellowPastel,
            COLORS.tealPastel
          ],
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }

  /**
   * 3. Distribución de estados de ánimo
   */
  function renderMoodDistributionChart(moods) {
    const ctx = document.getElementById('moodChart');
    const emptyState = document.getElementById('moodChartEmpty');
    if (!ctx) return;

    if (moodChartInstance) {
      moodChartInstance.destroy();
    }

    if (!moods || moods.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      ctx.style.display = 'none';
      return;
    }

    const moodNames = {
      happy: 'Feliz',
      calm: 'Tranquila',
      neutral: 'Neutral',
      sad: 'Triste',
      anxious: 'Ansiosa',
      irritable: 'Irritable',
      sensitive: 'Sensible'
    };

    const counts = {};
    moods.forEach(m => {
      const key = m.mood || 'neutral';
      counts[key] = (counts[key] || 0) + 1;
    });

    const keys = Object.keys(counts);
    if (keys.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      ctx.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    ctx.style.display = 'block';

    const labels = keys.map(k => moodNames[k] || k);
    const dataValues = keys.map(k => counts[k]);

    moodChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: [
            '#FBCFE8', // rosa claro
            '#DDD6FE', // lavanda claro
            '#E2E8F0', // gris suave
            '#BAE6FD', // celeste pastel
            '#FED7AA', // durazno pastel
            '#FCA5A5', // rojo suave
            '#F5D0FE'  // fucsia pastel
          ],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } }
          }
        },
        cutout: '65%'
      }
    });
  }

  /**
   * 4. Distribución de intensidad del sangrado
   */
  function renderFlowChart(periods) {
    const ctx = document.getElementById('flowChart');
    const emptyState = document.getElementById('flowChartEmpty');
    if (!ctx) return;

    if (flowChartInstance) {
      flowChartInstance.destroy();
    }

    if (!periods || periods.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      ctx.style.display = 'none';
      return;
    }

    const counts = { light: 0, moderate: 0, heavy: 0 };
    periods.forEach(p => {
      const flow = p.flow || 'moderate';
      if (counts[flow] !== undefined) counts[flow]++;
    });

    const total = counts.light + counts.moderate + counts.heavy;
    if (total === 0) {
      if (emptyState) emptyState.style.display = 'block';
      ctx.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    ctx.style.display = 'block';

    flowChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Ligero', 'Moderado', 'Abundante'],
        datasets: [{
          data: [counts.light, counts.moderate, counts.heavy],
          backgroundColor: [COLORS.pinkSoft, COLORS.pinkPastel, COLORS.pinkDark],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } }
          }
        }
      }
    });
  }

  return {
    init,
    renderStats
  };
})();

window.LunaStats = LunaStats;
