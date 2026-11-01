/**
 * LunaFem - calendar.js
 * Calendario interactivo premium con indicadores visuales:
 * - Punto rosa para menstruación (real vs prevista)
 * - Corazón lila delineado para ventana fértil estimada
 * - Corazón morado relleno para ovulación estimada
 * - Punto discreto secundario para síntomas y notas
 */

const LunaCalendar = (() => {
  let currentYear;
  let currentMonth; // 0-indexed (0 = Enero, 11 = Diciembre)
  let selectedDateStr = null;

  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  function init() {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    selectedDateStr = LunaCycle.formatDate(today);

    bindEvents();
    render();
  }

  function bindEvents() {
    const prevBtn = document.getElementById('calPrevMonth');
    const nextBtn = document.getElementById('calNextMonth');
    const todayBtn = document.getElementById('calTodayBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        changeMonth(-1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        changeMonth(1);
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        const now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth();
        selectedDateStr = LunaCycle.formatDate(now);
        render();
        openDayDetails(selectedDateStr);
      });
    }

    // Escuchar eventos globales de cambios de datos
    window.addEventListener('lunafem:dataUpdated', () => {
      render();
      if (selectedDateStr) {
        updateDayDetailsModal(selectedDateStr);
      }
    });
  }

  function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear -= 1;
    } else if (currentMonth > 11) {
      currentMonth = 0;
      currentYear += 1;
    }
    render();
  }

  function goToDate(dateStr) {
    const d = LunaCycle.parseDate(dateStr);
    if (!d) return;
    currentYear = d.getFullYear();
    currentMonth = d.getMonth();
    selectedDateStr = dateStr;
    render();
    openDayDetails(dateStr);
  }

  /**
   * Renderiza la grilla del calendario del mes actual
   */
  function render() {
    const calMonthTitle = document.getElementById('calMonthTitle');
    const calGrid = document.getElementById('calGrid');
    if (!calGrid) return;

    if (calMonthTitle) {
      calMonthTitle.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    }

    calGrid.innerHTML = '';

    // Encabezados Lun - Dom
    const headerRow = document.createElement('div');
    headerRow.className = 'cal-weekdays';
    DAY_NAMES.forEach(day => {
      const col = document.createElement('div');
      col.className = 'cal-weekday';
      col.textContent = day;
      headerRow.appendChild(col);
    });
    calGrid.appendChild(headerRow);

    // Días del mes
    const daysContainer = document.createElement('div');
    daysContainer.className = 'cal-days';

    // Primer día del mes (0 = domingo, 1 = lunes...)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // Convertir para que Lunes sea 0 y Domingo sea 6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    // Días en el mes actual
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Días del mes anterior para relleno
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const todayStr = LunaCycle.formatDate(new Date());

    // 1. Días del mes anterior (padding inicial)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDayNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, prevDayNum);
      const dateStr = LunaCycle.formatDate(prevDate);
      daysContainer.appendChild(createDayCell(prevDayNum, dateStr, true));
    }

    // 2. Días del mes actual
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dateStr = LunaCycle.formatDate(d);
      const isToday = (dateStr === todayStr);
      const isSelected = (dateStr === selectedDateStr);
      daysContainer.appendChild(createDayCell(day, dateStr, false, isToday, isSelected));
    }

    // 3. Días del mes siguiente (padding final para completar semanas)
    const totalCells = startDayOfWeek + daysInCurrentMonth;
    const remainingCells = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
    for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
      const nextDate = new Date(currentYear, currentMonth + 1, nextDay);
      const dateStr = LunaCycle.formatDate(nextDate);
      daysContainer.appendChild(createDayCell(nextDay, dateStr, true));
    }

    calGrid.appendChild(daysContainer);
  }

  /**
   * Crea la celda individual de un día con sus indicadores
   */
  function createDayCell(dayNumber, dateStr, isOtherMonth, isToday = false, isSelected = false) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cal-day-cell';
    cell.setAttribute('data-date', dateStr);
    cell.setAttribute('aria-label', `Día ${dayNumber}, ${dateStr}`);

    if (isOtherMonth) cell.classList.add('other-month');
    if (isToday) cell.classList.add('is-today');
    if (isSelected) cell.classList.add('is-selected');

    // Número del día
    const numberSpan = document.createElement('span');
    numberSpan.className = 'cal-day-number';
    numberSpan.textContent = dayNumber;
    cell.appendChild(numberSpan);

    // Contenedor de indicadores
    const indicatorsBox = document.createElement('div');
    indicatorsBox.className = 'cal-day-indicators';

    // Obtener información del ciclo para esta fecha
    const dayInfo = LunaCycle.getDayInfo(dateStr);

    // Indicador 1: Menstruación (Punto rosa)
    if (dayInfo.isPeriodRecorded) {
      cell.classList.add('has-period-real');
      const dot = document.createElement('span');
      dot.className = 'cal-indicator cal-dot-period-real';
      dot.title = 'Menstruación confirmada';
      indicatorsBox.appendChild(dot);
    } else if (dayInfo.isPeriodPredicted) {
      cell.classList.add('has-period-pred');
      const dot = document.createElement('span');
      dot.className = 'cal-indicator cal-dot-period-pred';
      dot.title = 'Menstruación estimada';
      indicatorsBox.appendChild(dot);
    }

    // Indicador 2: Fertilidad y Ovulación (Corazones con Bootstrap Icons)
    if (dayInfo.isOvulationPredicted) {
      cell.classList.add('has-ovulation');
      const heartFilled = document.createElement('span');
      heartFilled.className = 'cal-indicator cal-heart-ovulation';
      heartFilled.innerHTML = '<i class="bi bi-heart-fill"></i>';
      heartFilled.title = 'Ovulación estimada';
      indicatorsBox.appendChild(heartFilled);
    } else if (dayInfo.isFertilePredicted) {
      cell.classList.add('has-fertile');
      const heartOutline = document.createElement('span');
      heartOutline.className = 'cal-indicator cal-heart-fertile';
      heartOutline.innerHTML = '<i class="bi bi-heart"></i>';
      heartOutline.title = 'Ventana fértil estimada';
      indicatorsBox.appendChild(heartOutline);
    }

    // Indicador 3: Síntomas o notas (Punto secundario discreto)
    if (dayInfo.hasSymptoms || dayInfo.hasMood) {
      const noteDot = document.createElement('span');
      noteDot.className = 'cal-indicator cal-dot-notes';
      noteDot.title = 'Síntomas / Notas registradas';
      indicatorsBox.appendChild(noteDot);
    }

    cell.appendChild(indicatorsBox);

    // Evento de clic para seleccionar y abrir detalle
    cell.addEventListener('click', () => {
      // Remover selección previa
      document.querySelectorAll('.cal-day-cell.is-selected').forEach(c => c.classList.remove('is-selected'));
      cell.classList.add('is-selected');
      selectedDateStr = dateStr;
      openDayDetails(dateStr);
    });

    return cell;
  }

  /**
   * Abre o actualiza el modal/tarjeta de detalle del día
   */
  function openDayDetails(dateStr) {
    selectedDateStr = dateStr;
    updateDayDetailsModal(dateStr);

    const modalEl = document.getElementById('dayDetailsModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  }

  function updateDayDetailsModal(dateStr) {
    const modalEl = document.getElementById('dayDetailsModal');
    if (!modalEl) return;

    const d = LunaCycle.parseDate(dateStr);
    if (!d) return;

    // Formato legible en español: "Viernes, 14 de Noviembre de 2026"
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateFormatted = d.toLocaleDateString('es-ES', options);
    const capitalizedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

    document.getElementById('modalDayDateTitle').textContent = capitalizedDate;
    document.getElementById('modalDayDateSubtitle').textContent = dateStr;

    const dayInfo = LunaCycle.getDayInfo(dateStr);
    const symptoms = LunaStorage.getSymptomsForDate(dateStr);
    const mood = LunaStorage.getMoodForDate(dateStr);

    // Contenedor de estado de ciclo
    const cycleStatusBadge = document.getElementById('modalCycleStatusBadge');
    let statusHtml = '';

    if (dayInfo.isPeriodRecorded) {
      statusHtml = `<div class="badge-status badge-period-real">
        <i class="bi bi-droplet-fill me-1 text-pink"></i> Menstruación Registrada (${dayInfo.periodRecord.flow === 'heavy' ? 'Flujo abundante' : dayInfo.periodRecord.flow === 'light' ? 'Flujo ligero' : 'Flujo moderado'})
      </div>`;
    } else if (dayInfo.isPeriodPredicted) {
      statusHtml = `<div class="badge-status badge-period-pred">
        <i class="bi bi-droplet me-1 text-pink"></i> Menstruación Estimada (Aproximada)
      </div>`;
    } else if (dayInfo.isOvulationPredicted) {
      statusHtml = `<div class="badge-status badge-ovulation">
        <i class="bi bi-heart-fill me-1 text-purple"></i> Día Estimado de Ovulación (Máxima fertilidad)
      </div>`;
    } else if (dayInfo.isFertilePredicted) {
      statusHtml = `<div class="badge-status badge-fertile">
        <i class="bi bi-heart me-1 text-lavender-dark"></i> Ventana Fértil Estimada
      </div>`;
    } else {
      statusHtml = `<div class="badge-status badge-neutral">
        <i class="bi bi-flower1 me-1 text-muted"></i> Fase Folicular / Lútea (Fertilidad baja estimada)
      </div>`;
    }
    cycleStatusBadge.innerHTML = statusHtml;

    // Síntomas
    const symptomsContainer = document.getElementById('modalSymptomsContainer');
    if (symptoms && symptoms.types && symptoms.types.length > 0) {
      const symptomLabels = {
        cramps: 'Cólicos',
        headache: 'Dolor de cabeza',
        bloating: 'Hinchazón',
        breast_tenderness: 'Sensibilidad en senos',
        fatigue: 'Cansancio',
        acne: 'Acné',
        lower_back_pain: 'Dolor lumbar',
        nausea: 'Náuseas',
        mood_swings: 'Cambios de humor',
        anxiety: 'Ansiedad o irritabilidad',
        cravings: 'Antojos'
      };

      let starsHtml = '';
      for (let star = 1; star <= 5; star++) {
        starsHtml += star <= symptoms.intensity 
          ? '<i class="bi bi-star-fill text-warning me-1"></i>' 
          : '<i class="bi bi-star text-muted me-1"></i>';
      }

      const tags = symptoms.types.map(t => `<span class="symptom-tag">${symptomLabels[t] || t}</span>`).join(' ');
      symptomsContainer.innerHTML = `
        <div class="mb-2">
          <strong>Síntomas:</strong>
          <div class="d-flex flex-wrap gap-1 mt-1">${tags}</div>
        </div>
        <div class="small text-muted mb-1 d-flex align-items-center">
          <span class="me-2">Intensidad:</span>
          <span>${starsHtml}</span>
          <span class="ms-1">(${symptoms.intensity}/5)</span>
        </div>
        ${symptoms.notes ? `<div class="small fst-italic p-2 bg-light rounded text-secondary">"${symptoms.notes}"</div>` : ''}
      `;
    } else {
      symptomsContainer.innerHTML = '<span class="text-muted small">No se registraron síntomas en este día.</span>';
    }

    // Estado de ánimo y bienestar
    const moodContainer = document.getElementById('modalMoodContainer');
    if (mood) {
      const moodIcons = {
        happy: '<i class="bi bi-emoji-smile text-success me-1"></i> Feliz',
        calm: '<i class="bi bi-emoji-sunglasses text-primary me-1"></i> Tranquila',
        neutral: '<i class="bi bi-emoji-neutral text-secondary me-1"></i> Neutral',
        sad: '<i class="bi bi-emoji-frown text-info me-1"></i> Triste',
        anxious: '<i class="bi bi-emoji-dizzy text-warning me-1"></i> Ansiosa',
        irritable: '<i class="bi bi-emoji-angry text-danger me-1"></i> Irritable',
        sensitive: '<i class="bi bi-emoji-tear text-purple me-1"></i> Sensible'
      };
      const sleepLabels = {
        good: 'Sueño reparador',
        average: 'Sueño normal',
        poor: 'Dificultad para dormir'
      };

      moodContainer.innerHTML = `
        <div class="d-flex align-items-center gap-2 mb-1">
          <span class="fw-semibold">${moodIcons[mood.mood] || mood.mood}</span>
          <span class="badge bg-light text-dark border">Energía: ${mood.energy}/5</span>
        </div>
        <div class="small text-muted">${sleepLabels[mood.sleepQuality] || ''}</div>
        ${mood.notes ? `<div class="small fst-italic p-2 bg-light rounded text-secondary mt-1">"${mood.notes}"</div>` : ''}
      `;
    } else {
      moodContainer.innerHTML = '<span class="text-muted small">No hay registro de estado de ánimo.</span>';
    }

    // Configurar botones de acción del modal
    const editBtn = document.getElementById('modalEditDayBtn');
    if (editBtn) {
      editBtn.onclick = () => {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        // Abrir pestaña de registro con esta fecha precargada
        if (window.LunaApp && window.LunaApp.openLogForDate) {
          window.LunaApp.openLogForDate(dateStr);
        }
      };
    }

    // Botón eliminar datos del día si existen registros reales
    const deleteBtn = document.getElementById('modalDeleteDayBtn');
    const hasAnyRecord = dayInfo.isPeriodRecorded || !!symptoms || !!mood;

    if (deleteBtn) {
      if (hasAnyRecord) {
        deleteBtn.style.display = 'inline-block';
        deleteBtn.onclick = () => {
          if (confirm(`¿Deseas eliminar todos los registros de menstruación, síntomas y notas del día ${dateStr}?`)) {
            if (dayInfo.isPeriodRecorded && dayInfo.periodRecord) {
              LunaStorage.deletePeriod(dayInfo.periodRecord.id);
            }
            LunaStorage.deleteSymptomsForDate(dateStr);
            LunaStorage.deleteMoodForDate(dateStr);
            
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            render();
            if (window.LunaApp && window.LunaApp.showToast) {
              window.LunaApp.showToast('Registros del día eliminados correctamente.', 'info');
            }
          }
        };
      } else {
        deleteBtn.style.display = 'none';
      }
    }
  }

  return {
    init,
    render,
    changeMonth,
    goToDate,
    openDayDetails
  };
})();

window.LunaCalendar = LunaCalendar;
