/**
 * LunaFem - storage.js
 * Módulo de almacenamiento y persistencia de datos en LocalStorage
 */

const LunaStorage = (() => {
  const STORAGE_KEY = 'lunafem_data_v1';

  // Estructura por defecto
  const defaultData = {
    profile: {
      name: '',
      cycleLength: 28,      // duración media habitual en días
      periodLength: 5,       // duración media habitual de menstruación en días
      isRegular: true,       // regular o irregular
      onboardingCompleted: false,
      notificationsEnabled: false,
      theme: 'light',
      createdAt: new Date().toISOString()
    },
    periods: [
      /*
        {
          id: 'p_169...',
          startDate: 'YYYY-MM-DD',
          endDate: 'YYYY-MM-DD' | null, // null si está en curso
          flow: 'light' | 'moderate' | 'heavy',
          notes: ''
        }
      */
    ],
    symptoms: [
      /*
        {
          id: 's_169...',
          date: 'YYYY-MM-DD',
          types: ['cramps', 'headache', ...],
          intensity: 1..5,
          notes: ''
        }
      */
    ],
    moods: [
      /*
        {
          id: 'm_169...',
          date: 'YYYY-MM-DD',
          mood: 'happy' | 'calm' | 'neutral' | 'sad' | 'anxious' | 'irritable' | 'sensitive',
          energy: 1..5,
          sleepQuality: 'good' | 'average' | 'poor',
          notes: ''
        }
      */
    ]
  };

  /**
   * Obtiene todos los datos almacenados
   */
  function getAllData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultData));
      
      const parsed = JSON.parse(raw);
      return {
        profile: { ...defaultData.profile, ...(parsed.profile || {}) },
        periods: Array.isArray(parsed.periods) ? parsed.periods : [],
        symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
        moods: Array.isArray(parsed.moods) ? parsed.moods : []
      };
    } catch (e) {
      console.error('Error al leer de LocalStorage:', e);
      return JSON.parse(JSON.stringify(defaultData));
    }
  }

  /**
   * Guarda todos los datos en LocalStorage
   */
  function saveAllData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('lunafem:dataUpdated', { detail: data }));
      return true;
    } catch (e) {
      console.error('Error al guardar en LocalStorage:', e);
      return false;
    }
  }

  /* ================== PERFIL ================== */
  function getProfile() {
    return getAllData().profile;
  }

  function saveProfile(profileUpdates) {
    const data = getAllData();
    data.profile = { ...data.profile, ...profileUpdates };
    saveAllData(data);
    return data.profile;
  }

  /* ================== PERIODOS ================== */
  function getPeriods() {
    const data = getAllData();
    // Ordenados de más reciente a más antiguo por fecha de inicio
    return data.periods.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }

  function addPeriod(period) {
    const data = getAllData();
    const newPeriod = {
      id: period.id || 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      startDate: period.startDate,
      endDate: period.endDate || null,
      flow: period.flow || 'moderate',
      notes: period.notes ? period.notes.trim() : ''
    };

    // Validar si ya existe un periodo exactamente con la misma fecha de inicio
    const existingIndex = data.periods.findIndex(p => p.startDate === newPeriod.startDate);
    if (existingIndex >= 0) {
      data.periods[existingIndex] = { ...data.periods[existingIndex], ...newPeriod };
    } else {
      data.periods.push(newPeriod);
    }

    saveAllData(data);
    return newPeriod;
  }

  function updatePeriod(id, updates) {
    const data = getAllData();
    const index = data.periods.findIndex(p => p.id === id);
    if (index >= 0) {
      data.periods[index] = { ...data.periods[index], ...updates };
      saveAllData(data);
      return data.periods[index];
    }
    return null;
  }

  function deletePeriod(id) {
    const data = getAllData();
    const filtered = data.periods.filter(p => p.id !== id);
    if (filtered.length !== data.periods.length) {
      data.periods = filtered;
      saveAllData(data);
      return true;
    }
    return false;
  }

  /* ================== SÍNTOMAS ================== */
  function getSymptoms() {
    const data = getAllData();
    return data.symptoms.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function getSymptomsForDate(dateStr) {
    const data = getAllData();
    return data.symptoms.find(s => s.date === dateStr) || null;
  }

  function saveSymptomsForDate(dateStr, types = [], intensity = 1, notes = '') {
    const data = getAllData();
    const index = data.symptoms.findIndex(s => s.date === dateStr);
    
    if (types.length === 0 && !notes.trim()) {
      // Si se deseleccionan todos y no hay notas, eliminar registro de ese día
      if (index >= 0) {
        data.symptoms.splice(index, 1);
        saveAllData(data);
      }
      return null;
    }

    const symptomEntry = {
      id: index >= 0 ? data.symptoms[index].id : 's_' + Date.now(),
      date: dateStr,
      types: Array.isArray(types) ? types : [],
      intensity: Math.max(1, Math.min(5, Number(intensity) || 1)),
      notes: notes ? notes.trim() : ''
    };

    if (index >= 0) {
      data.symptoms[index] = symptomEntry;
    } else {
      data.symptoms.push(symptomEntry);
    }

    saveAllData(data);
    return symptomEntry;
  }

  function deleteSymptomsForDate(dateStr) {
    const data = getAllData();
    const filtered = data.symptoms.filter(s => s.date !== dateStr);
    if (filtered.length !== data.symptoms.length) {
      data.symptoms = filtered;
      saveAllData(data);
      return true;
    }
    return false;
  }

  /* ================== ESTADOS DE ÁNIMO Y BIENESTAR ================== */
  function getMoods() {
    const data = getAllData();
    return data.moods.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function getMoodForDate(dateStr) {
    const data = getAllData();
    return data.moods.find(m => m.date === dateStr) || null;
  }

  function saveMoodForDate(dateStr, mood, energy = 3, sleepQuality = 'good', notes = '') {
    const data = getAllData();
    const index = data.moods.findIndex(m => m.date === dateStr);

    if (!mood && !notes.trim()) {
      if (index >= 0) {
        data.moods.splice(index, 1);
        saveAllData(data);
      }
      return null;
    }

    const moodEntry = {
      id: index >= 0 ? data.moods[index].id : 'm_' + Date.now(),
      date: dateStr,
      mood: mood || 'neutral',
      energy: Math.max(1, Math.min(5, Number(energy) || 3)),
      sleepQuality: sleepQuality || 'good',
      notes: notes ? notes.trim() : ''
    };

    if (index >= 0) {
      data.moods[index] = moodEntry;
    } else {
      data.moods.push(moodEntry);
    }

    saveAllData(data);
    return moodEntry;
  }

  function deleteMoodForDate(dateStr) {
    const data = getAllData();
    const filtered = data.moods.filter(m => m.date !== dateStr);
    if (filtered.length !== data.moods.length) {
      data.moods = filtered;
      saveAllData(data);
      return true;
    }
    return false;
  }

  /* ================== EXPORTACIÓN E IMPORTACIÓN ================== */
  function exportDataAsJSON() {
    const data = getAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lunafem_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importDataFromJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Formato inválido.');
      }
      // Validar estructura básica
      if (!parsed.profile && !parsed.periods) {
        throw new Error('El archivo no parece ser una copia de seguridad válida de LunaFem.');
      }

      const validData = {
        profile: { ...defaultData.profile, ...(parsed.profile || {}) },
        periods: Array.isArray(parsed.periods) ? parsed.periods : [],
        symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
        moods: Array.isArray(parsed.moods) ? parsed.moods : []
      };

      saveAllData(validData);
      return { success: true, message: 'Datos importados correctamente.' };
    } catch (err) {
      console.error('Error al importar:', err);
      return { success: false, message: 'Error al importar datos: ' + err.message };
    }
  }

  /**
   * Elimina todos los datos y resetea a valores iniciales
   */
  function clearAllData() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('lunafem:dataCleared'));
      return true;
    } catch (e) {
      console.error('Error al limpiar LocalStorage:', e);
      return false;
    }
  }

  return {
    getAllData,
    getProfile,
    saveProfile,
    getPeriods,
    addPeriod,
    updatePeriod,
    deletePeriod,
    getSymptoms,
    getSymptomsForDate,
    saveSymptomsForDate,
    deleteSymptomsForDate,
    getMoods,
    getMoodForDate,
    saveMoodForDate,
    deleteMoodForDate,
    exportDataAsJSON,
    importDataFromJSON,
    clearAllData
  };
})();

// Exportar globalmente para scripts vanilla
window.LunaStorage = LunaStorage;
