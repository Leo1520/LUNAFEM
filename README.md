# LunaFem — Seguimiento Menstrual y Bienestar Femenino

LunaFem es una aplicación web progresiva (PWA) moderna, delicada y privada diseñada para que las mujeres puedan registrar, comprender y seguir su ciclo menstrual, estimar su ventana fértil y ovulación, monitorear síntomas corporales, registrar su bienestar emocional y consultar estadísticas personales.

---

## Características Principales

1. **Dashboard y Anillo Interactivo del Ciclo**:
   - Saludo personalizado según la hora del día.
   - Indicador circular dinámico del día del ciclo y fase actual (Menstrual, Folicular, Ovulatoria, Lútea).
   - Cálculo en tiempo real de días restantes para la próxima menstruación y fechas clave.
   - Accesos directos y resumen de actividad reciente.

2. **Calendario Menstrual con Indicadores Visuales**:
   - **Punto rosa relleno**: Menstruación confirmada y registrada.
   - **Punto rosa delineado**: Menstruación futura estimada.
   - **Corazón lila delineado (Bootstrap Icons bi-heart)**: Días estimados de la ventana fértil.
   - **Corazón morado relleno (Bootstrap Icons bi-heart-fill)**: Día estimado de ovulación (con animación sutil).
   - **Punto ámbar secundario**: Síntomas y notas guardadas ese día.
   - Navegación mes a mes, botón "Ir a hoy" y modal de detalle para consultar, editar o eliminar registros de cualquier fecha.

3. **Registro Diario Multifunción (+)**:
   - **Menstruación**: Fecha de inicio, fecha de fin opcional (admite períodos en curso), intensidad de flujo (ligero, moderado, abundante) y notas.
   - **Síntomas Corporales**: Selector múltiple con iconos de Bootstrap (cólicos, dolor de cabeza, hinchazón, sensibilidad en senos, cansancio, acné, dolor lumbar, náuseas, etc.), escala de intensidad de 1 a 5 y notas.
   - **Estado de Ánimo y Bienestar**: Selección intuitiva de estado emocional con iconos de Bootstrap (Feliz, Tranquila, Neutral, Triste, Ansiosa, Irritable, Sensible), nivel de energía (1 a 5), calidad del descanso nocturno y reflexiones personales.

4. **Historial de Ciclos**:
   - Registro cronológico de todos los ciclos anteriores con fecha de inicio, fin y duración total de sangrado.
   - Cálculo automático del intervalo de días entre períodos consecutivos.
   - Menú de opciones para eliminar o gestionar registros.

5. **Estadísticas y Gráficos Dinámicos con Chart.js**:
   - Evolución de la duración de los ciclos a lo largo del tiempo.
   - Frecuencia de los síntomas más habituales.
   - Distribución de estados de ánimo.
   - Proporción de intensidad del flujo menstrual.
   - Indicadores de media de ciclo, duración media de menstruación y regularidad.

6. **100% Privada y Sin Servidores Externos**:
   - Los datos se almacenan exclusivamente de forma local en tu navegador mediante `LocalStorage`.
   - No requiere cuentas, correos ni contraseñas.
   - Opción para **Exportar copia de seguridad en JSON** y **Restaurar/Importar JSON** en cualquier momento.
   - Opción de borrado total y reinicio con doble confirmación.

7. **Instalable como PWA (Progressive Web App)**:
   - Incluye `manifest.json` y `service-worker.js`.
   - Se puede añadir a la pantalla de inicio en Android (Chrome) o iOS (Safari: "Compartir" > "Añadir a pantalla de inicio") para usarse como una app nativa incluso sin conexión a internet.

---

## Tecnologías Empleadas

- **HTML5** semántico.
- **CSS3** puro con sistema de diseño pastel y diseño adaptable (Mobile-First y Desktop).
- **JavaScript Vanilla (ES6+)** sin frameworks (código modular organizado).
- **Bootstrap 5.3** y **Bootstrap Icons** (vía CDN seguro).
- **Chart.js 4.4** para visualizaciones interactivas.
- **LocalStorage API** para persistencia local de datos.
- **Service Worker API** y **Web App Manifest** para capacidades PWA y soporte offline.

---

## Estructura del Proyecto

```text
LunaFem/
├── index.html            # Estructura principal y vistas SPA
├── manifest.json         # Manifiesto PWA para instalación en móviles
├── service-worker.js     # Manejador de caché offline
├── README.md             # Documentación del proyecto
├── css/
│   └── styles.css        # Paleta de colores, tipografía, componentes y animaciones
├── js/
│   ├── app.js            # Inicialización, navegación SPA, Onboarding y Dashboard
│   ├── storage.js        # Módulo de persistencia en LocalStorage, exportación e importación
│   ├── cycle.js          # Motor matemático de cálculo del ciclo y proyecciones
│   ├── calendar.js       # Calendario interactivo con puntitos y corazones
│   └── statistics.js     # Gráficos dinámicos con Chart.js
└── assets/
    └── icon.svg          # Logotipo vectorial e icono de la aplicación
```

---

## Cómo Ejecutar Localmente

### Opción 1: Abrir directamente el archivo
Haz doble clic sobre el archivo `index.html` en tu explorador de archivos para abrirlo en cualquier navegador web moderno (Google Chrome, Mozilla Firefox, Edge, Safari, etc.).

### Opción 2: Usar un servidor local estático (Laragon, VS Code Live Server o Python)
Si cuentas con Python instalado, abre una terminal en la carpeta del proyecto y ejecuta:
```bash
# Python 3
python -m http.server 8000
```
Luego ingresa a `http://localhost:8000` en tu navegador.

Si usas Laragon o XAMPP, simplemente ubica la carpeta en `laragon/www/LUNAFEM` y accede desde `http://lunafem.test` o `http://localhost/LUNAFEM`.

---

## Guía para Publicar Gratuitamente en GitHub Pages

1. **Crear una cuenta o iniciar sesión en GitHub**:
   Ingresa a [github.com](https://github.com/).

2. **Crear un nuevo repositorio**:
   - Haz clic en el botón verde **"New"** (Nuevo repositorio).
   - Nómbralo por ejemplo: `lunafem`.
   - Asegúrate de marcarlo como **Público** (Public).
   - Haz clic en **"Create repository"**.

3. **Subir los archivos del proyecto**:
   Puedes hacerlo desde la interfaz web de GitHub haciendo clic en **"uploading an existing file"** y arrastrando todos los archivos de LunaFem (`index.html`, `manifest.json`, `service-worker.js`, carpetas `css/`, `js/`, `assets/`, etc.), o mediante la terminal de Git:
   ```bash
   git init
   git add .
   git commit -m "Lanzamiento de LunaFem v1.0"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/lunafem.git
   git push -u origin main
   ```

4. **Activar GitHub Pages**:
   - Dentro de tu repositorio en GitHub, ve a la pestaña **Settings** (Ajustes).
   - En el menú lateral izquierdo, haz clic en **Pages**.
   - En la sección **Build and deployment > Branch**, selecciona la rama `main` y la carpeta `/(root)`.
   - Haz clic en **Save**.

5. **Abrir tu aplicación publicada**:
   En 1 a 2 minutos, GitHub Pages generará una URL pública gratuita similar a:
   `https://TU-USUARIO.github.io/lunafem/`
   ¡Listo! Podrás abrirla desde cualquier celular o computadora y compartirla.

---

## Aviso de Privacidad y Responsabilidad Médica

- **Privacidad absoluta**: Todos los datos ingresados se quedan únicamente en el navegador del dispositivo donde se utiliza la aplicación. LunaFem no recopila, no rastrea ni transmite ningún tipo de información personal o biométrica.
- **Aviso de salud**: Las estimaciones de días fértiles, ovulación y próximas menstruaciones son cálculos matemáticos y aproximaciones informativas. No son un método anticonceptivo ni sustituyen la consulta, evaluación o criterio de un profesional de la salud o ginecología.
