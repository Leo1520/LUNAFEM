/**
 * LunaFem - cycle.js
 * Motor matemático de cálculo y predicción del ciclo menstrual y fertilidad
 */

const LunaCycle = (() => {
  /**
   * Parsea un string YYYY-MM-DD a objeto Date local a medianoche sin desfaces de zona horaria UTC
   */
  function parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) {
      return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
    }
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  /**
   * Formatea un Date a 'YYYY-MM-DD'
   */
  function formatDate(d) {
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Suma días a una fecha
   */
  function addDays(date, days) {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Diferencia en días enteros entre dos fechas (date2 - date1)
   */
  function diffDays(date1, date2) {
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    if (!d1 || !d2) return 0;
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((d2 - d1) / oneDay);
  }

  /**
   * Calcula la duración media del ciclo y de la menstruación según registros reales.
   * Si no hay suficientes datos registrados, usa los valores del perfil.
   */
  function getCycleAverages(periods, profile) {
    const defaultCycle = (profile && profile.cycleLength) ? Number(profile.cycleLength) : 28;
    const defaultPeriod = (profile && profile.periodLength) ? Number(profile.periodLength) : 5;

    if (!periods || periods.length < 2) {
      return {
        avgCycleLength: defaultCycle,
        avgPeriodLength: defaultPeriod,
        isCalculatedFromHistory: false,
        totalCyclesRecorded: periods ? periods.length : 0
      };
    }

    // Ordenar de más antiguo a más reciente para calcular diferencias entre consecutivos
    const sortedAsc = [...periods].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    const cycleLengths = [];
    const periodLengths = [];

    for (let i = 0; i < sortedAsc.length - 1; i++) {
      const currentStart = sortedAsc[i].startDate;
      const nextStart = sortedAsc[i + 1].startDate;
      const diff = diffDays(currentStart, nextStart);
      // Filtramos ciclos fisiológicamente plausibles (entre 18 y 60 días)
      if (diff >= 18 && diff <= 60) {
        cycleLengths.push(diff);
      }
    }

    // Duraciones de sangrado (inicio a fin)
    sortedAsc.forEach(p => {
      if (p.startDate && p.endDate) {
        const days = diffDays(p.startDate, p.endDate) + 1; // inclusivo
        if (days >= 2 && days <= 12) {
          periodLengths.push(days);
        }
      }
    });

    const avgCycle = cycleLengths.length > 0
      ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
      : defaultCycle;

    const avgPeriod = periodLengths.length > 0
      ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
      : defaultPeriod;

    return {
      avgCycleLength: avgCycle,
      avgPeriodLength: avgPeriod,
      isCalculatedFromHistory: cycleLengths.length > 0,
      totalCyclesRecorded: cycleLengths.length
    };
  }

  /**
   * Obtiene la fecha del período más reciente
   */
  function getLatestPeriod(periods) {
    if (!periods || periods.length === 0) return null;
    return [...periods].sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
  }

  /**
   * Genera el ciclo actual y las predicciones futuras (hasta 3 ciclos a futuro)
   */
  function calculateCurrentCycleStatus(todayDate = new Date()) {
    const profile = LunaStorage.getProfile();
    const periods = LunaStorage.getPeriods();
    const today = parseDate(todayDate);
    const todayStr = formatDate(today);

    const latestPeriod = getLatestPeriod(periods);

    if (!latestPeriod) {
      return {
        hasData: false,
        message: 'Aún no has registrado ningún periodo menstrual.',
        profile
      };
    }

    const averages = getCycleAverages(periods, profile);
    const cycleLength = averages.avgCycleLength;
    const periodDuration = averages.avgPeriodLength;

    const lastStart = parseDate(latestPeriod.startDate);
    
    // Si el último periodo tiene fin registrado o usamos el promedio
    let lastEnd = latestPeriod.endDate ? parseDate(latestPeriod.endDate) : addDays(lastStart, periodDuration - 1);
    
    // Día actual del ciclo
    const daysSinceLastStart = diffDays(lastStart, today);
    const cycleDay = daysSinceLastStart >= 0 ? daysSinceLastStart + 1 : 1;

    // Próxima menstruación estimada
    // Si hoy ya pasó el día del ciclo habitual, calculamos con base a la fecha real
    let nextPeriodStart = addDays(lastStart, cycleLength);
    // Si ya estamos pasadas de la fecha estimada, proyectamos hacia el próximo ciclo si es muy tardío
    let daysUntilNextPeriod = diffDays(today, nextPeriodStart);

    // Si la fecha estimada quedó en el pasado por más de 10 días y el usuario no registró nuevo periodo
    let isDelayed = false;
    if (daysUntilNextPeriod < 0) {
      isDelayed = true;
    }

    // Ovulación estimada: ~14 días antes del próximo periodo estimado
    const nextOvulation = addDays(nextPeriodStart, -14);
    
    // Ventana fértil estimada: 5 días previos a la ovulación + el día de la ovulación (6 días en total)
    const fertileWindowStart = addDays(nextOvulation, -5);
    const fertileWindowEnd = nextOvulation;

    // Determinar fase actual
    let phase = {
      name: 'Fase Folicular',
      key: 'follicular',
      description: 'Tu cuerpo se prepara para el crecimiento del folículo y aumentan tus niveles de energía.',
      color: '#8B5CF6',
      icon: 'bi-flower1'
    };

    // Verificar si hoy es menstruación (registrada o estimada)
    const isTodayInPeriod = (latestPeriod.endDate
      ? (today >= lastStart && today <= lastEnd)
      : (today >= lastStart && today <= addDays(lastStart, periodDuration - 1))) || (todayStr === latestPeriod.startDate);

    if (isTodayInPeriod) {
      phase = {
        name: 'Fase Menstrual',
        key: 'menstrual',
        description: 'Días de sangrado y descanso. Momento ideal para mimarte y recargar energía.',
        color: '#EC4899',
        icon: 'bi-droplet-half'
      };
    } else if (today >= fertileWindowStart && today <= fertileWindowEnd) {
      if (formatDate(today) === formatDate(nextOvulation)) {
        phase = {
          name: 'Día de Ovulación',
          key: 'ovulation',
          description: 'Momento de máxima fertilidad estimada en este ciclo.',
          color: '#8B5CF6',
          icon: 'bi-heart-fill'
        };
      } else {
        phase = {
          name: 'Ventana Fértil',
          key: 'fertile',
          description: 'Probabilidad alta de concepción. Tu cuerpo experimenta mayor vitalidad.',
          color: '#A855F7',
          icon: 'bi-heart'
        };
      }
    } else if (today > nextOvulation && today < nextPeriodStart) {
      phase = {
        name: 'Fase Lútea',
        key: 'luteal',
        description: 'Aumenta la progesterona. Puedes notar cambios en tu humor o sensibilidad corporal.',
        color: '#D8B4FE',
        icon: 'bi-moon-stars'
      };
    }

    // Progreso del ciclo (porcentaje 0 - 100)
    let progressPercentage = Math.min(100, Math.max(0, Math.round((cycleDay / cycleLength) * 100)));
    if (cycleDay > cycleLength) progressPercentage = 100;

    return {
      hasData: true,
      profile,
      latestPeriod,
      cycleLength,
      periodDuration,
      cycleDay,
      daysUntilNextPeriod,
      isDelayed,
      nextPeriodStartStr: formatDate(nextPeriodStart),
      nextOvulationStr: formatDate(nextOvulation),
      fertileWindowStartStr: formatDate(fertileWindowStart),
      fertileWindowEndStr: formatDate(fertileWindowEnd),
      phase,
      progressPercentage,
      averages
    };
  }

  /**
   * Determina el estado exacto de cualquier fecha dada (para el calendario)
   * Devuelve flags:
   *  - isPeriodRecorded: true si cae en un periodo registrado
   *  - isPeriodPredicted: true si cae en un periodo futuro proyectado
   *  - isOvulationPredicted: true si cae en el día de ovulación proyectado
   *  - isFertilePredicted: true si cae en la ventana fértil proyectada
   *  - hasSymptoms: true si hay síntomas ese día
   *  - hasMood: true si hay estado de ánimo ese día
   */
  function getDayInfo(dateStr) {
    const targetDate = parseDate(dateStr);
    const periods = LunaStorage.getPeriods();
    const profile = LunaStorage.getProfile();
    const averages = getCycleAverages(periods, profile);
    const cycleLength = averages.avgCycleLength;
    const periodDuration = averages.avgPeriodLength;

    const result = {
      dateStr,
      isPeriodRecorded: false,
      periodRecord: null,
      isPeriodPredicted: false,
      isOvulationPredicted: false,
      isFertilePredicted: false,
      hasSymptoms: !!LunaStorage.getSymptomsForDate(dateStr),
      hasMood: !!LunaStorage.getMoodForDate(dateStr)
    };

    if (periods.length === 0) return result;

    // 1. Verificar si coincide con algún periodo registrado
    for (const p of periods) {
      const pStart = parseDate(p.startDate);
      // Si no tiene fecha fin, asumimos la duración promedio o hasta hoy
      const pEnd = p.endDate ? parseDate(p.endDate) : addDays(pStart, periodDuration - 1);
      if (targetDate >= pStart && targetDate <= pEnd) {
        result.isPeriodRecorded = true;
        result.periodRecord = p;
        break;
      }
    }

    // 2. Proyecciones futuras y de ciclo actual
    // Tomamos el último periodo registrado
    const latest = getLatestPeriod(periods);
    if (latest) {
      const latestStart = parseDate(latest.startDate);
      
      // Proyectamos hasta 6 ciclos hacia adelante desde el último periodo
      for (let i = 1; i <= 6; i++) {
        const projCycleStart = addDays(latestStart, cycleLength * i);
        const projPeriodEnd = addDays(projCycleStart, periodDuration - 1);

        // Si la fecha cae en el sangrado proyectado
        if (targetDate >= projCycleStart && targetDate <= projPeriodEnd) {
          result.isPeriodPredicted = true;
        }

        // Ovulación proyectada: ~14 días antes del inicio del ciclo i
        // Y para el ciclo actual (i = 1), la ovulación ocurre entre el inicio actual y el projCycleStart
        const cycleStartBase = addDays(latestStart, cycleLength * (i - 1));
        const nextCycleStart = addDays(latestStart, cycleLength * i);
        const projOvulation = addDays(nextCycleStart, -14);
        const projFertileStart = addDays(projOvulation, -5);

        // Ventana fértil (5 días antes de ovulación y el día de ovulación)
        if (targetDate >= projFertileStart && targetDate < projOvulation) {
          result.isFertilePredicted = true;
        } else if (formatDate(targetDate) === formatDate(projOvulation)) {
          result.isOvulationPredicted = true;
        }
      }
    }

    return result;
  }

  return {
    parseDate,
    formatDate,
    addDays,
    diffDays,
    getCycleAverages,
    getLatestPeriod,
    calculateCurrentCycleStatus,
    getDayInfo
  };
})();

window.LunaCycle = LunaCycle;
