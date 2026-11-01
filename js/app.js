/**
 * LunaFem - app.js
 * Orquestador principal de la aplicación, navegación SPA, Onboarding y Dashboard
 */

const LunaApp = (() => {
  let activeView = 'home';

  function init() {
    initNavigation();
    initOnboarding();
    initDashboard();
    initLogForms();
    initHistory();
    initProfile();
    initPWA();

    // Inicializar submódulos
    if (window.LunaCalendar) LunaCalendar.init();
    if (window.LunaStats) LunaStats.init();

    // Comprobar onboarding
    const profile = LunaStorage.getProfile();
    if (!profile.onboardingCompleted) {
      showOnboardingModal();
    } else {
      updateDashboard();
    }

    // Escuchar actualizaciones de datos
    window.addEventListener('lunafem:dataUpdated', () => {
      updateDashboard();
      renderHistoryList();
    });
  }

  /* ========================================================
     1. NAVEGACIÓN ENTRE VISTAS (SPA)
     ======================================================== */
  function initNavigation() {
    const navButtons = document.querySelectorAll('[data-nav-view]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = btn.getAttribute('data-nav-view');
        switchView(targetView);
      });
    });
  }

  function switchView(viewName) {
    activeView = viewName;

    // Actualizar botones de navegación activa
    document.querySelectorAll('[data-nav-view]').forEach(b => {
      if (b.getAttribute('data-nav-view') === viewName) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // Cambiar contenedor visible
    document.querySelectorAll('.app-view').forEach(viewEl => {
      if (viewEl.id === `view-${viewName}`) {
        viewEl.classList.add('active');
      } else {
        viewEl.classList.remove('active');
      }
    });

    // Actualizaciones según pantalla
    if (viewName === 'calendar' && window.LunaCalendar) {
      LunaCalendar.render();
    } else if (viewName === 'stats' && window.LunaStats) {
      LunaStats.renderStats();
    } else if (viewName === 'home') {
      updateDashboard();
    } else if (viewName === 'history') {
      renderHistoryList();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ========================================================
     2. ASISTENTE ONBOARDING
     ======================================================== */
  let currentStep = 1;

  function initOnboarding() {
    const nextBtn1 = document.getElementById('onboardNext1');
    const nextBtn2 = document.getElementById('onboardNext2');
    const prevBtn2 = document.getElementById('onboardPrev2');
    const prevBtn3 = document.getElementById('onboardPrev3');
    const finishBtn = document.getElementById('onboardFinish');

    // Inicializar fecha sugerida de última menstruación (hace 14 días)
    const defaultLastDate = new Date();
    defaultLastDate.setDate(defaultLastDate.getDate() - 14);
    const dateInput = document.getElementById('onboardLastPeriodDate');
    if (dateInput) {
      dateInput.value = LunaCycle.formatDate(defaultLastDate);
      dateInput.max = LunaCycle.formatDate(new Date());
    }

    if (nextBtn1) {
      nextBtn1.addEventListener('click', () => {
        goToStep(2);
      });
    }

    if (nextBtn2) {
      nextBtn2.addEventListener('click', () => {
        const dateVal = document.getElementById('onboardLastPeriodDate').value;
        if (!dateVal) {
          showToast('Por favor selecciona la fecha de inicio de tu última menstruación.', 'warning');
          return;
        }
        goToStep(3);
      });
    }

    if (prevBtn2) prevBtn2.addEventListener('click', () => goToStep(1));
    if (prevBtn3) prevBtn3.addEventListener('click', () => goToStep(2));

    if (finishBtn) {
      finishBtn.addEventListener('click', finishOnboarding);
    }
  }

  function goToStep(step) {
    currentStep = step;
    document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.step-dot').forEach(d => d.classList.remove('active'));

    const stepEl = document.getElementById(`onboardStep${step}`);
    const dotEl = document.getElementById(`stepDot${step}`);
    if (stepEl) stepEl.classList.add('active');
    if (dotEl) dotEl.classList.add('active');
  }

  function showOnboardingModal() {
    const modalEl = document.getElementById('onboardingModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
      goToStep(1);
      modal.show();
    }
  }

  function finishOnboarding() {
    const name = document.getElementById('onboardName').value.trim();
    const lastDate = document.getElementById('onboardLastPeriodDate').value;
    const cycleLength = parseInt(document.getElementById('onboardCycleLength').value, 10) || 28;
    const periodLength = parseInt(document.getElementById('onboardPeriodLength').value, 10) || 5;
    const isRegular = document.getElementById('onboardRegularity').value === 'true';

    // 1. Guardar perfil
    LunaStorage.saveProfile({
      name: name,
      cycleLength: cycleLength,
      periodLength: periodLength,
      isRegular: isRegular,
      onboardingCompleted: true
    });

    // 2. Registrar el periodo inicial
    if (lastDate) {
      // Calculamos fecha de fin por defecto según periodLength
      const pStart = LunaCycle.parseDate(lastDate);
      const pEnd = LunaCycle.addDays(pStart, periodLength - 1);
      
      LunaStorage.addPeriod({
        startDate: lastDate,
        endDate: LunaCycle.formatDate(pEnd),
        flow: 'moderate',
        notes: 'Registro inicial de configuración'
      });
    }

    const modalEl = document.getElementById('onboardingModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    showToast(`¡Bienvenida a LunaFem${name ? ', ' + name : ''}! Todo listo para acompañarte.`, 'success');
    updateDashboard();
  }

  /* ========================================================
     3. DASHBOARD PRINCIPAL DE INICIO
     ======================================================== */
  function initDashboard() {
    const quickLogPeriodBtn = document.getElementById('quickLogPeriodBtn');
    const quickLogSymptomsBtn = document.getElementById('quickLogSymptomsBtn');
    const quickCalendarBtn = document.getElementById('quickCalendarBtn');

    if (quickLogPeriodBtn) {
      quickLogPeriodBtn.addEventListener('click', () => {
        openLogForDate(LunaCycle.formatDate(new Date()), 'period');
      });
    }

    if (quickLogSymptomsBtn) {
      quickLogSymptomsBtn.addEventListener('click', () => {
        openLogForDate(LunaCycle.formatDate(new Date()), 'symptoms');
      });
    }

    if (quickCalendarBtn) {
      quickCalendarBtn.addEventListener('click', () => {
        switchView('calendar');
      });
    }
  }

  function updateDashboard() {
    const profile = LunaStorage.getProfile();
    const cycleStatus = LunaCycle.calculateCurrentCycleStatus(new Date());

    // 1. Saludo personalizado según hora del día
    const greetingEl = document.getElementById('userGreeting');
    const dateTodayEl = document.getElementById('dashboardDateToday');

    if (greetingEl) {
      const hour = new Date().getHours();
      let greeting = 'Hola';
      if (hour >= 5 && hour < 12) greeting = 'Buenos días';
      else if (hour >= 12 && hour < 19) greeting = 'Buenas tardes';
      else greeting = 'Buenas noches';

      const userName = profile.name ? `, ${profile.name}` : '';
      greetingEl.textContent = `${greeting}${userName}`;
    }

    if (dateTodayEl) {
      const options = { weekday: 'long', day: 'numeric', month: 'long' };
      const todayFormatted = new Date().toLocaleDateString('es-ES', options);
      dateTodayEl.textContent = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);
    }

    // 2. Anillo de progreso del ciclo
    const ringEl = document.getElementById('cycleRingProgress');
    const dayNumberEl = document.getElementById('dashboardCycleDayNum');
    const phaseTagEl = document.getElementById('dashboardPhaseTag');
    const phaseDescEl = document.getElementById('dashboardPhaseDesc');

    // Circunferencia del anillo SVG (radio r = 98 -> 2 * PI * 98 ≈ 615.75)
    const circumference = 2 * Math.PI * 98;

    if (cycleStatus.hasData) {
      if (dayNumberEl) dayNumberEl.textContent = cycleStatus.cycleDay;
      if (phaseTagEl) {
        phaseTagEl.innerHTML = `<i class="bi ${cycleStatus.phase.icon}"></i> ${cycleStatus.phase.name}`;
        phaseTagEl.style.backgroundColor = `${cycleStatus.phase.color}22`;
        phaseTagEl.style.color = cycleStatus.phase.color;
      }
      if (phaseDescEl) {
        phaseDescEl.textContent = cycleStatus.phase.description;
      }

      // Animación suave del stroke SVG
      if (ringEl) {
        ringEl.style.strokeDasharray = `${circumference}`;
        const offset = circumference - (cycleStatus.progressPercentage / 100) * circumference;
        ringEl.style.strokeDashoffset = offset;
      }

      // Tarjetas de predicciones
      const nextDateEl = document.getElementById('dashNextPeriodDate');
      const daysLeftEl = document.getElementById('dashDaysUntilNext');
      const fertileEl = document.getElementById('dashFertileWindow');

      if (nextDateEl) {
        const nextDate = LunaCycle.parseDate(cycleStatus.nextPeriodStartStr);
        nextDateEl.textContent = nextDate ? nextDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '--';
      }

      if (daysLeftEl) {
        if (cycleStatus.daysUntilNextPeriod > 0) {
          daysLeftEl.textContent = `En ${cycleStatus.daysUntilNextPeriod} días`;
        } else if (cycleStatus.daysUntilNextPeriod === 0) {
          daysLeftEl.textContent = 'Hoy (estimada)';
        } else {
          daysLeftEl.textContent = `Retraso de ${Math.abs(cycleStatus.daysUntilNextPeriod)} días`;
        }
      }

      if (fertileEl) {
        const fertStart = LunaCycle.parseDate(cycleStatus.fertileWindowStartStr);
        const fertEnd = LunaCycle.parseDate(cycleStatus.fertileWindowEndStr);
        if (fertStart && fertEnd) {
          fertileEl.textContent = `${fertStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${fertEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
        }
      }
    } else {
      // Estado sin datos
      if (dayNumberEl) dayNumberEl.textContent = '-';
      if (phaseTagEl) phaseTagEl.innerHTML = '<i class="bi bi-info-circle"></i> Sin datos aún';
      if (phaseDescEl) phaseDescEl.textContent = 'Registra tu primera menstruación para activar las predicciones.';
      if (ringEl) ringEl.style.strokeDashoffset = circumference;
    }

    // 3. Resumen de síntomas recientes
    renderRecentSymptomsList();
  }

  function renderRecentSymptomsList() {
    const listEl = document.getElementById('dashboardRecentSymptoms');
    if (!listEl) return;

    const symptoms = LunaStorage.getSymptoms().slice(0, 3);

    if (symptoms.length === 0) {
      listEl.innerHTML = `
        <div class="text-center text-muted py-3 small">
          <i class="bi bi-journal-text fs-4 d-block mb-1 text-lila"></i>
          No has registrado síntomas recientemente.<br>
          <a href="#" class="text-pink fw-semibold" id="linkLogSymptomsNow">Registrar síntomas de hoy</a>
        </div>
      `;
      const link = document.getElementById('linkLogSymptomsNow');
      if (link) {
        link.onclick = (e) => {
          e.preventDefault();
          openLogForDate(LunaCycle.formatDate(new Date()), 'symptoms');
        };
      }
      return;
    }

    const symptomLabels = {
      cramps: 'Cólicos',
      headache: 'Dolor de cabeza',
      bloating: 'Hinchazón',
      breast_tenderness: 'Sensibilidad senos',
      fatigue: 'Cansancio',
      acne: 'Acné',
      lower_back_pain: 'Dolor lumbar',
      nausea: 'Náuseas',
      mood_swings: 'Cambios de humor',
      anxiety: 'Ansiedad',
      cravings: 'Antojos'
    };

    let html = '<div class="list-group list-group-flush">';
    symptoms.forEach(s => {
      const d = LunaCycle.parseDate(s.date);
      const dateText = d ? d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : s.date;
      const tags = s.types.map(t => `<span class="symptom-tag me-1 mb-1">${symptomLabels[t] || t}</span>`).join('');

      html += `
        <div class="list-group-item px-0 py-2 border-bottom">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="fw-semibold text-capitalize small text-dark">${dateText}</span>
            <span class="badge bg-soft-pink text-pink small">Intensidad: ${s.intensity}/5</span>
          </div>
          <div class="d-flex flex-wrap">${tags}</div>
          ${s.notes ? `<div class="small fst-italic text-muted mt-1">"${s.notes}"</div>` : ''}
        </div>
      `;
    });
    html += '</div>';
    listEl.innerHTML = html;
  }

  /* ========================================================
     4. FORMULARIO DE REGISTRO (+)
     ======================================================== */
  function initLogForms() {
    // Configurar fechas por defecto a hoy
    const todayStr = LunaCycle.formatDate(new Date());
    const periodStartInput = document.getElementById('logPeriodStartDate');
    const periodEndInput = document.getElementById('logPeriodEndDate');
    const symptomDateInput = document.getElementById('logSymptomDate');
    const moodDateInput = document.getElementById('logMoodDate');

    if (periodStartInput) {
      periodStartInput.value = todayStr;
      periodStartInput.max = todayStr;
    }
    if (periodEndInput) {
      periodEndInput.max = LunaCycle.formatDate(LunaCycle.addDays(new Date(), 30));
    }
    if (symptomDateInput) {
      symptomDateInput.value = todayStr;
      symptomDateInput.max = todayStr;
      symptomDateInput.addEventListener('change', () => loadExistingSymptomData(symptomDateInput.value));
    }
    if (moodDateInput) {
      moodDateInput.value = todayStr;
      moodDateInput.max = todayStr;
      moodDateInput.addEventListener('change', () => loadExistingMoodData(moodDateInput.value));
    }

    // Toggle de Chips de Síntomas
    document.querySelectorAll('.symptom-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
      });
    });

    // Selector de Estado de Ánimo
    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // Envío del Formulario de Período
    const formPeriod = document.getElementById('formLogPeriod');
    if (formPeriod) {
      formPeriod.addEventListener('submit', (e) => {
        e.preventDefault();
        savePeriodFromForm();
      });
    }

    // Envío del Formulario de Síntomas
    const formSymptoms = document.getElementById('formLogSymptoms');
    if (formSymptoms) {
      formSymptoms.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSymptomsFromForm();
      });
    }

    // Envío del Formulario de Ánimo y Bienestar
    const formMood = document.getElementById('formLogMood');
    if (formMood) {
      formMood.addEventListener('submit', (e) => {
        e.preventDefault();
        saveMoodFromForm();
      });
    }
  }

  function openLogForDate(dateStr, tab = 'period') {
    switchView('log');

    const periodStartInput = document.getElementById('logPeriodStartDate');
    const symptomDateInput = document.getElementById('logSymptomDate');
    const moodDateInput = document.getElementById('logMoodDate');

    if (periodStartInput) periodStartInput.value = dateStr;
    if (symptomDateInput) {
      symptomDateInput.value = dateStr;
      loadExistingSymptomData(dateStr);
    }
    if (moodDateInput) {
      moodDateInput.value = dateStr;
      loadExistingMoodData(dateStr);
    }

    // Activar pestaña solicitada
    if (tab === 'symptoms') {
      const tabTrigger = document.querySelector('#log-tabs button[data-bs-target="#tab-log-symptoms"]');
      if (tabTrigger && typeof bootstrap !== 'undefined') new bootstrap.Tab(tabTrigger).show();
    } else if (tab === 'mood') {
      const tabTrigger = document.querySelector('#log-tabs button[data-bs-target="#tab-log-mood"]');
      if (tabTrigger && typeof bootstrap !== 'undefined') new bootstrap.Tab(tabTrigger).show();
    } else {
      const tabTrigger = document.querySelector('#log-tabs button[data-bs-target="#tab-log-period"]');
      if (tabTrigger && typeof bootstrap !== 'undefined') new bootstrap.Tab(tabTrigger).show();
    }
  }

  function savePeriodFromForm() {
    const startDate = document.getElementById('logPeriodStartDate').value;
    const endDate = document.getElementById('logPeriodEndDate').value || null;
    const flow = document.querySelector('input[name="logFlowIntensity"]:checked')?.value || 'moderate';
    const notes = document.getElementById('logPeriodNotes').value.trim();

    if (!startDate) {
      showToast('Por favor indica la fecha de inicio del período.', 'warning');
      return;
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      showToast('La fecha de fin no puede ser anterior a la fecha de inicio.', 'error');
      return;
    }

    LunaStorage.addPeriod({
      startDate,
      endDate,
      flow,
      notes
    });

    showToast('¡Período registrado correctamente!', 'success');
    switchView('home');
  }

  function saveSymptomsFromForm() {
    const dateStr = document.getElementById('logSymptomDate').value;
    const selectedTypes = [];
    document.querySelectorAll('.symptom-chip.selected').forEach(c => {
      selectedTypes.push(c.getAttribute('data-symptom'));
    });
    const intensity = document.getElementById('logSymptomIntensity').value;
    const notes = document.getElementById('logSymptomNotes').value.trim();

    if (!dateStr) {
      showToast('Por favor selecciona una fecha.', 'warning');
      return;
    }

    if (selectedTypes.length === 0 && !notes) {
      showToast('Selecciona al menos un síntoma o agrega una nota.', 'warning');
      return;
    }

    LunaStorage.saveSymptomsForDate(dateStr, selectedTypes, intensity, notes);
    showToast('¡Síntomas guardados correctamente!', 'success');
    switchView('home');
  }

  function loadExistingSymptomData(dateStr) {
    // Limpiar selección previa
    document.querySelectorAll('.symptom-chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('logSymptomNotes').value = '';
    document.getElementById('logSymptomIntensity').value = 2;
    document.getElementById('intensityDisplay').textContent = '2';

    const existing = LunaStorage.getSymptomsForDate(dateStr);
    if (existing) {
      if (Array.isArray(existing.types)) {
        existing.types.forEach(t => {
          const chip = document.querySelector(`.symptom-chip[data-symptom="${t}"]`);
          if (chip) chip.classList.add('selected');
        });
      }
      if (existing.intensity) {
        document.getElementById('logSymptomIntensity').value = existing.intensity;
        document.getElementById('intensityDisplay').textContent = existing.intensity;
      }
      if (existing.notes) {
        document.getElementById('logSymptomNotes').value = existing.notes;
      }
    }
  }

  function saveMoodFromForm() {
    const dateStr = document.getElementById('logMoodDate').value;
    const selectedMoodBtn = document.querySelector('.mood-btn.selected');
    const mood = selectedMoodBtn ? selectedMoodBtn.getAttribute('data-mood') : 'neutral';
    const energy = document.getElementById('logEnergyLevel').value;
    const sleepQuality = document.getElementById('logSleepQuality').value;
    const notes = document.getElementById('logMoodNotes').value.trim();

    if (!dateStr) {
      showToast('Por favor selecciona una fecha.', 'warning');
      return;
    }

    LunaStorage.saveMoodForDate(dateStr, mood, energy, sleepQuality, notes);
    showToast('¡Estado de bienestar guardado con éxito!', 'success');
    switchView('home');
  }

  function loadExistingMoodData(dateStr) {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('logMoodNotes').value = '';
    document.getElementById('logEnergyLevel').value = 3;
    document.getElementById('energyDisplay').textContent = '3';

    const existing = LunaStorage.getMoodForDate(dateStr);
    if (existing) {
      const btn = document.querySelector(`.mood-btn[data-mood="${existing.mood}"]`);
      if (btn) btn.classList.add('selected');
      if (existing.energy) {
        document.getElementById('logEnergyLevel').value = existing.energy;
        document.getElementById('energyDisplay').textContent = existing.energy;
      }
      if (existing.sleepQuality) {
        document.getElementById('logSleepQuality').value = existing.sleepQuality;
      }
      if (existing.notes) {
        document.getElementById('logMoodNotes').value = existing.notes;
      }
    }
  }

  /* ========================================================
     5. HISTORIAL DE CICLOS Y MENSTRUACIONES
     ======================================================== */
  function initHistory() {
    renderHistoryList();
  }

  function renderHistoryList() {
    const listContainer = document.getElementById('historyListContainer');
    if (!listContainer) return;

    const periods = LunaStorage.getPeriods();

    if (periods.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-calendar2-heart text-pink fs-1 d-block mb-2"></i>
          <p class="text-muted">Aún no hay ciclos registrados en tu historial.</p>
          <button class="btn btn-luna-primary btn-sm" onclick="LunaApp.switchView('log')">
            <i class="bi bi-plus-lg"></i> Registrar primer período
          </button>
        </div>
      `;
      return;
    }

    let html = '<div class="d-flex flex-column gap-3">';

    // Calcular ciclo entre consecutivos
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const nextP = periods[i + 1]; // más antiguo cronológicamente

      const startDate = LunaCycle.parseDate(p.startDate);
      const startFormatted = startDate ? startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : p.startDate;

      let endFormatted = 'En curso';
      let bleedingDays = 'En curso';
      if (p.endDate) {
        const endDate = LunaCycle.parseDate(p.endDate);
        endFormatted = endDate ? endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : p.endDate;
        bleedingDays = `${LunaCycle.diffDays(p.startDate, p.endDate) + 1} días`;
      }

      let cycleDurationText = 'Ciclo inicial';
      if (nextP) {
        const cDays = LunaCycle.diffDays(nextP.startDate, p.startDate);
        cycleDurationText = `Ciclo de ${cDays} días`;
      }

      const flowLabels = {
        light: 'Ligero',
        moderate: 'Moderado',
        heavy: 'Abundante'
      };

      html += `
        <div class="luna-card p-3 mb-0">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <span class="badge bg-soft-pink text-pink mb-1">${cycleDurationText}</span>
              <h6 class="mb-0 fw-bold">${startFormatted}</h6>
              <span class="small text-muted">Fin: ${endFormatted} (${bleedingDays})</span>
            </div>
            <div class="dropdown">
              <button class="btn btn-sm btn-light border rounded-circle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                <li>
                  <a class="dropdown-item text-danger small" href="#" onclick="LunaApp.deletePeriodRecord('${p.id}'); return false;">
                    <i class="bi bi-trash me-2"></i> Eliminar registro
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div class="d-flex align-items-center gap-3 small text-secondary mt-2 pt-2 border-top">
            <span><i class="bi bi-droplet-half text-pink me-1"></i> Flujo: ${flowLabels[p.flow] || 'Moderado'}</span>
            ${p.notes ? `<span><i class="bi bi-chat-left-text me-1"></i> "${p.notes}"</span>` : ''}
          </div>
        </div>
      `;
    }

    html += '</div>';
    listContainer.innerHTML = html;
  }

  function deletePeriodRecord(id) {
    if (confirm('¿Estás segura de eliminar este registro de menstruación? Esto afectará los cálculos de tus próximos ciclos.')) {
      LunaStorage.deletePeriod(id);
      showToast('Registro eliminado con éxito.', 'info');
      renderHistoryList();
    }
  }

  /* ========================================================
     6. PERFIL, CONFIGURACIÓN Y PRIVACIDAD
     ======================================================== */
  function initProfile() {
    loadProfileIntoForm();

    const formProfile = document.getElementById('formProfileSettings');
    if (formProfile) {
      formProfile.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProfileFromForm();
      });
    }

    const exportBtn = document.getElementById('btnExportData');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        LunaStorage.exportDataAsJSON();
        showToast('Copia de seguridad descargada en tu dispositivo.', 'success');
      });
    }

    const importInput = document.getElementById('importFileInput');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const result = LunaStorage.importDataFromJSON(event.target.result);
          if (result.success) {
            showToast(result.message, 'success');
            loadProfileIntoForm();
            updateDashboard();
          } else {
            showToast(result.message, 'error');
          }
          importInput.value = '';
        };
        reader.readAsText(file);
      });
    }

    const clearBtn = document.getElementById('btnClearAllData');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('ATENCIÓN: Esta acción borrará permanentemente todos tus períodos, síntomas, notas y configuración en este navegador. ¿Deseas continuar?')) {
          if (confirm('¿Confirmas de manera definitiva el borrado total de tus datos?')) {
            LunaStorage.clearAllData();
            showToast('Todos los datos han sido eliminados.', 'info');
            setTimeout(() => {
              window.location.reload();
            }, 800);
          }
        }
      });
    }
  }

  function loadProfileIntoForm() {
    const profile = LunaStorage.getProfile();
    const nameInput = document.getElementById('profileNameInput');
    const cycleInput = document.getElementById('profileCycleLengthInput');
    const periodInput = document.getElementById('profilePeriodLengthInput');
    const regInput = document.getElementById('profileRegularityInput');

    if (nameInput) nameInput.value = profile.name || '';
    if (cycleInput) cycleInput.value = profile.cycleLength || 28;
    if (periodInput) periodInput.value = profile.periodLength || 5;
    if (regInput) regInput.value = profile.isRegular ? 'true' : 'false';
  }

  function saveProfileFromForm() {
    const name = document.getElementById('profileNameInput').value.trim();
    const cycleLength = parseInt(document.getElementById('profileCycleLengthInput').value, 10) || 28;
    const periodLength = parseInt(document.getElementById('profilePeriodLengthInput').value, 10) || 5;
    const isRegular = document.getElementById('profileRegularityInput').value === 'true';

    LunaStorage.saveProfile({
      name,
      cycleLength,
      periodLength,
      isRegular
    });

    showToast('Ajustes del perfil guardados con éxito.', 'success');
    updateDashboard();
  }

  /* ========================================================
     7. TOAST NOTIFICACIONES INTEGRADAS
     ======================================================== */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'luna-toast';

    let icon = 'bi-info-circle-fill text-purple';
    if (type === 'success') icon = 'bi-check-circle-fill text-success';
    if (type === 'warning') icon = 'bi-exclamation-triangle-fill text-warning';
    if (type === 'error') icon = 'bi-x-circle-fill text-danger';

    toast.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <i class="bi ${icon} fs-5"></i>
        <span class="small fw-semibold text-dark">${message}</span>
      </div>
      <button type="button" class="btn-close btn-sm ms-2" aria-label="Cerrar"></button>
    `;

    const closeBtn = toast.querySelector('.btn-close');
    closeBtn.onclick = () => toast.remove();

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 4000);
  }

  /* ========================================================
     8. PWA SERVICE WORKER
     ======================================================== */
  function initPWA() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(reg => {
            console.log('LunaFem PWA Service Worker registrado correctamente:', reg.scope);
          })
          .catch(err => {
            console.log('Error al registrar Service Worker (esperado en file://):', err);
          });
      });
    }
  }

  return {
    init,
    switchView,
    openLogForDate,
    showToast,
    deletePeriodRecord
  };
})();

// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  LunaApp.init();
});

window.LunaApp = LunaApp;
