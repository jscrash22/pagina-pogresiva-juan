# Prompt para Claude — Informe técnico de la PWA "Burger Juan"

> **Cómo usar este documento:** pega todo el contenido de este archivo como mensaje inicial para Claude.
> Claude debe leerlo completo y, en base a la información aquí descrita, **redactar el informe técnico**
> con la estructura exacta solicitada en la sección 11.

---

## Instrucción para Claude

Actúa como **redactor técnico especializado en desarrollo web y Aplicaciones Web Progresivas (PWA)**.
A continuación te entrego la documentación completa de un proyecto real llamado **"Burger Juan"**.
Con esta información, redacta un **informe técnico-académico** en **español**, con tono formal, claro y bien
argumentado, dirigido a un contexto universitario (materia de desarrollo web / ingeniería de software).

El informe **debe usar exactamente la siguiente estructura de secciones, en este orden**:

1. Título
2. Objetivo general
3. Objetivos específicos
4. Resumen
5. Introducción
6. Metodología
7. Resultados
8. Conclusiones
9. Bibliografía

No inventes funciones, tecnologías ni métricas que no aparezcan en esta documentación. Si algún dato no
está especificado, descríbelo de forma general sin afirmar cifras falsas.

---

## 1. Ficha del proyecto

| Campo | Valor |
|---|---|
| Nombre del proyecto | Burger Juan |
| Tipo de aplicación | Aplicación Web Progresiva (PWA) de restaurante / pedidos de comida rápida |
| Dominio de negocio | Restaurante de comida rápida (hamburguesas, pizzas, salchipapas, alitas, bebidas y postres) |
| URL pública (desplegada) | https://jscrash22.github.io/pagina-pogresiva-juan/ |
| Repositorio | https://github.com/jscrash22/pagina-pogresiva-juan |
| Autor | Paola Sánchez |
| Usuario GitHub | Jscrash22 |
| Año | 2026 |
| Idioma de la interfaz | Español |
| Moneda | USD (formato localizado `es-EC`) |
| Impuesto aplicado | IVA 15 % |
| Costo de envío | USD 2,50 (solo cuando el servicio es "Delivery a domicilio") |

---

## 2. Objetivo del proyecto

Construir un restaurante de comida rápida como **Aplicación Web Progresiva** que:

- funcione como una aplicación nativa cuando se instala en el dispositivo;
- siga siendo **usable sin conexión a Internet** (modo offline);
- **no pierda información de los formularios** (checkout y reservas) cuando el usuario está sin conexión;
- implemente un **carrito de pedido** completo y funcional, con tipo de servicio (local, para llevar o delivery);
- gestione los datos desde un **archivo JSON** (aún sin base de datos en servidor);
- utilice **localStorage, sessionStorage e IndexedDB** como capas de persistencia en el cliente.

---

## 3. Stack tecnológico

- **HTML5** semántico (una sola página, tipo *single-page application* con vistas intercambiables).
- **CSS3** con variables (`custom properties`), *Grid* y *Flexbox*, diseño responsivo y una identidad visual
  propia (tema oscuro *charcoal* con acentos rojo y queso).
- **JavaScript moderno (ES Modules)** — se usan `import`/`export`, `async/await`, `Promise`, `Intl`, `FormData`, `EventTarget`/bus de eventos propio.
- **APIs del navegador empleadas:** `localStorage`, `sessionStorage`, `IndexedDB`, `Fetch API`, `Service Workers`, `Cache API`, e instalación mediante el evento `beforeinstallprompt`.
- **Sin frameworks ni librerías externas** (JavaScript "vanilla") y **sin backend**.
- **Despliegue:** GitHub Pages (hosting estático con HTTPS).

---

## 4. Arquitectura y estructura de archivos

```
Pagina pogresiva Juan/
├── index.html                 → Estructura (app shell) y las 4 vistas de la app
├── manifest.webmanifest       → Metadatos PWA (nombre, iconos, color, standalone)
├── service-worker.js          → Estrategias de caché y funcionamiento offline
├── .nojekyll                  → Evita el procesamiento de Jekyll en GitHub Pages
├── css/
│   └── styles.css             → Estilos, variables, responsivo y tema oscuro
├── js/
│   ├── app.js                 → Orquestador principal (arranque, render, eventos)
│   ├── utils.js               → Utilidades ($ , debounce, formatos, bus de eventos)
│   ├── storage.js             → Envoltorios de localStorage y sessionStorage
│   ├── db.js                  → Capa de acceso a IndexedDB (promesas)
│   ├── data.js                → Carga del menú JSON y caché en IndexedDB
│   ├── connection.js          → Detección de conexión, pendientes y sincronización
│   ├── cart.js                → Lógica del pedido (carrito) y de populares
│   ├── orders.js              → Persistencia de pedidos y reservas
│   └── forms.js               → Autoguardado de borradores y validación de formularios
├── data/
│   └── menu.json              → "Base de datos" en JSON (productos y categorías)
└── icons/
    ├── icon.svg               → Ícono vectorial (hamburguesa)
    ├── icon-192.png           → Ícono PWA 192×192
    ├── icon-512.png           → Ícono PWA 512×512
    ├── icon-maskable-512.png  → Ícono adaptativo (maskable)
    └── icon-maskable.svg      → Fuente vectorial del maskable
```

### Descripción de los módulos JavaScript

- **utils.js**: selectores `$` y `$$`; `debounce`; generación de identificadores; `formatMoney` (con `Intl.NumberFormat('es-EC', USD)`); `formatDate`; `escapeHtml` (seguridad frente a inyección de HTML); y un **bus de eventos** (*publish/subscribe*) que desacopla los módulos.
- **storage.js**: envoltorios con manejo de errores para `localStorage` y `sessionStorage`. Define las claves usadas (prefijo `burgerjuan.`) y funciones como `iniciarSesion()` y `prefers` (preferencias del usuario, p. ej. el orden del menú).
- **db.js**: capa basada en promesas sobre **IndexedDB**; abre la base `burger-juan` (versión 1) y expone operaciones CRUD (`guardar`, `agregar`, `obtener`, `obtenerTodos`, `eliminar`, `limpiar`, `contar`, `obtenerPorIndice`, `guardarLote`, `setMeta`, `getMeta`).
- **data.js**: obtiene el menú desde `data/menu.json` con **estrategia red-primero**; lo guarda en IndexedDB; si no hay red, lo lee de la caché local (IndexedDB). Devuelve el origen de los datos ("red" o "cache") y expone el catálogo (`catalogo`) con el IVA y el costo de envío.
- **connection.js**: escucha los eventos `online`/`offline` del navegador y `visibilitychange`; cuenta registros pendientes; implementa `sincronizar()` que marca pedidos y reservas como "sincronizado".
- **cart.js**: el pedido vive en `localStorage`; expone agregar, cambiar cantidad, eliminar, vaciar, contar, detalle y totales (subtotal, IVA 15 %, envío opcional y total). También gestiona **populares** (favoritos) y el estado de envío.
- **orders.js**: guarda **pedidos** (creados desde el checkout) y **reservas** (desde el formulario de reservas) en IndexedDB, con estado `pendiente` (sin conexión) o `sincronizado`.
- **forms.js**: **autoguardado de borradores** de formularios con `debounce`, respaldo síncrono en localStorage y restauración al recargar; además, validación de campos con `ValidityState`.
- **app.js**: punto de entrada; registra el Service Worker, gestiona el evento de instalación, renderiza menú/carrito/pedidos/reservas, controla la navegación entre vistas, la búsqueda, el filtrado por categoría, el orden, el filtro "solo populares" y el indicador de conexión.

---

## 5. Funcionalidades implementadas

1. **Menú de productos**
   - 20 productos distribuidos en 6 categorías (Hamburguesas, Pizzas, Salchipapas, Alitas, Bebidas, Postres).
   - Búsqueda por nombre/descripción (`debounce`), filtro por categoría, orden por relevancia/precio/valoración/tiempo de preparación y filtro "solo populares".
   - Cada tarjeta muestra emoji representativo, categoría, precio, valoración, tiempo de preparación, etiquetas ("Popular", "Picante") y estado de stock.

2. **Carrito de pedido**
   - Agregar, aumentar/disminuir cantidad, eliminar y vaciar.
   - Cálculo de subtotal, IVA (15 %), envío (si el servicio es delivery) y total en tiempo real.
   - Persistencia del pedido en `localStorage` (sobrevive al cierre del navegador).
   - Insignia (badge) con el número de artículos en el encabezado.

3. **Formulario de checkout (datos del pedido)**
   - Nombre, teléfono, **tipo de servicio** (comer en el local, para llevar o delivery), dirección de entrega (solo si es delivery), hora y notas para la cocina.
   - El campo de dirección se exige dinámicamente y el costo de envío se suma al total solo cuando corresponde.
   - Al confirmar se genera un **pedido** en IndexedDB y se vacía el carrito.

4. **Formulario de reservas**
   - Nombre, teléfono, número de personas, fecha, hora y comentario; al enviar se guarda como **reserva** en IndexedDB.

5. **Persistencia de formularios (clave de la PWA)**
   - Mientras el usuario escribe, el borrador se guarda automáticamente en IndexedDB (y en localStorage como respaldo síncrono).
   - Si el usuario recarga o cierra la página, el formulario se **restaura** con lo que había escrito.
   - Si está sin conexión, el envío se **encola** y queda como pendiente hasta recuperar la conexión.

6. **Indicador de conexión**
   - "Pastilla" de estado en el encabezado (En línea / Sin conexión).
   - **Banner** rojo fijo cuando se pierde la conexión, indicando cuántos registros están pendientes.
   - Al reconectar: notificación, sincronización automática y actualización del menú si estaba vacío.

7. **Vistas "Pedidos" y "Reservas"**
   - Lista de pedidos con código, fecha, cliente, tipo de servicio, detalle de artículos, total y estado (Pendiente de envío / Sincronizado).
   - Lista de reservas enviadas con su estado.

8. **Instalación como aplicación (PWA)**
   - Botón "Instalar app" que usa el evento `beforeinstallprompt`.
   - Funciona en modo `standalone` una vez instalada.

---

## 6. Estrategia de almacenamiento en el cliente

| API | Qué guarda | Justificación |
|---|---|---|
| **localStorage** | Pedido (`burgerjuan.pedido`), populares (`burgerjuan.populares`), última sincronización (`burgerjuan.ultimaSync`), preferencias (`burgerjuan.preferencias`) | Datos persistentes simples que deben sobrevivir al cierre del navegador. |
| **sessionStorage** | Vista activa, categoría seleccionada, término de búsqueda, id de sesión (`burgerjuan.sesionId`) | Estado temporal de la sesión; se limpia al cerrar la pestaña. |
| **IndexedDB** | Almacenes: `productos` (menú en caché), `pedidos`, `reservas`, `borradores` (borradores de formularios), `meta` (metadatos del menú) | Estructura asíncrona y con mayor capacidad, ideal para el menú, las colas de envío y los borradores. |

### Modelo de datos

- **Menú (`data/menu.json`)**: objeto con `restaurante` (nombre, eslogan, moneda, iva, costoEnvio, actualizado), `categorias[]` y `productos[]`. Cada producto tiene `id`, `nombre`, `categoria`, `precio`, `stock`, `rating`, `preparacion`, `picante`, `popular`, `emoji` y `descripcion`.
- **IndexedDB** (base `burger-juan`):
  - `productos`: clave `id`.
  - `pedidos`: clave autoincremental `id`; índices `estado` y `creado`; guarda `codigo`, `cliente`, `servicio`, `servicioTexto`, `lineas[]`, subtotal, iva, envio, total, `estado`, `creado`, `sincronizadoEn`, `origen`.
  - `reservas`: clave autoincremental `id`; índice `estado`.
  - `borradores`: clave `clave` (nombre del formulario) + `datos` + `actualizado`.
  - `meta`: clave/valor para metadatos del menú.

---

## 7. Comportamiento PWA y offline

- **manifest.webmanifest**: `name`, `short_name`, `start_url`, `scope`, `display: standalone`, `theme_color` (`#e4002b`), `background_color` (`#17150f`), iconos 192/512 y un icono **maskable**; accesos directos (*shortcuts*).
- **service-worker.js** — estrategias de caché:
  1. **Precache del app shell** al instalar (HTML, CSS, todos los módulos JS, manifest, menú JSON e iconos).
  2. **Navegación:** red-primero con respaldo a `index.html` en caché (para abrir la app sin conexión).
  3. **Datos JSON (`data/menu.json`):** red-primero con respaldo a caché.
  4. **Recursos estáticos (CSS/JS/iconos):** caché-primero con actualización en segundo plano.
  5. **Activación:** borra cachés de versiones anteriores y toma control de las pestañas (`clients.claim`).
- **Versionado de caché:** constante `VERSION = "burger-juan-v1.0.0"` para invalidar cachés obsoletas.
- **Sincronización:** al recuperar la conexión se marcan como sincronizados los pedidos y reservas pendientes (simulación de envío al servidor, ya que aún no existe backend).

---

## 8. Flujo de usuario (casos de uso)

1. El usuario abre la PWA (con o sin conexión).
2. Explora el menú, busca, filtra por categoría y marca productos populares.
3. Agrega platillos al pedido (persistente) y elige el tipo de servicio.
4. **Sin conexión:** aparece el banner; el usuario puede seguir pidiendo; llena el checkout y/o el formulario de reservas; los datos se guardan localmente y no se borran.
5. Confirma el pedido → se crea un registro "pendiente" en IndexedDB.
6. Al **recuperar la conexión**: notificación + sincronización automática (estado pasa a "sincronizado").
7. El usuario revisa sus "Pedidos" y sus "Reservas".

---

## 9. Pruebas y resultados de verificación

- Verificación HTTP de todos los recursos publicados (página, CSS, JS, menú JSON e iconos).
- Comprobación del **manifest** con `Content-Type: application/manifest+json` (requisito de instalabilidad correcto).
- Comprobación del **service worker** con `Content-Type: application/javascript` (requisito para registrarse).
- Verificación funcional manual de: persistencia del pedido, autoguardado de formularios, indicador de conexión, cálculo del envío y cola de sincronización.

---

## 10. Limitaciones y trabajo futuro

- No existe backend ni base de datos en servidor: la "sincronización" es una **simulación local** (marca de estado).
- El menú es estático (JSON); a futuro podría conectarse a una API real.
- No hay autenticación de usuarios ni pasarela de pago real.
- Posibles mejoras: `Background Sync` real, notificaciones push, pruebas automatizadas (Lighthouse/unitarias), Workbox y menú dinámico.

---

## 11. Entregable solicitado: estructura del informe

Redacta el informe siguiendo **exactamente** este esquema. Para cada sección se indica qué incluir:

1. **Título**
   - Un título representativo, por ejemplo: *"Desarrollo de una Aplicación Web Progresiva para la gestión de pedidos de un restaurante de comida rápida: caso Burger Juan"*.

2. **Objetivo general**
   - Un único párrafo que exprese el propósito central del proyecto (desarrollar una PWA funcional, offline y con persistencia de datos para un restaurante de comida rápida).

3. **Objetivos específicos**
   - Lista de 4 a 6 objetivos medibles y concretos (implementar el carrito de pedido, garantizar funcionamiento offline y persistencia de formularios, desplegar en GitHub Pages, aplicar capas de almacenamiento, gestionar tipos de servicio y costo de envío, etc.).

4. **Resumen**
   - Síntesis de aproximadamente 150–200 palabras: qué se hizo, con qué tecnología y cuáles fueron los principales resultados.

5. **Introducción**
   - Contexto: qué son las PWA y por qué son relevantes; problemática (dependencia de conexión, pérdida de datos en formularios, experiencia de pedido en restaurantes); justificación del proyecto; objetivo del informe.

6. **Metodología**
   - Enfoque y tipo de desarrollo; stack (HTML, CSS, JavaScript/EcmaScript moderno, APIs de almacenamiento, Service Workers, manifest); diseño de la arquitectura modular y su estructura de archivos; estrategias de caché; proceso de despliegue en GitHub Pages; método de verificación.

7. **Resultados**
   - Descripción de lo obtenido: menú con 20 productos y 6 categorías; carrito funcional con IVA 15 % y costo de envío; formularios con autoguardado y restauración; detección de conexión con banner y sincronización; PWA instalable y offline. Incluir una tabla resumen de las capas de almacenamiento y las verificaciones técnicas. Puedes describir resultados cualitativos y de comportamiento.

8. **Conclusiones**
   - Cumplimiento de los objetivos; aprendizajes; aporte de las PWA; limitaciones actuales (sin backend) y recomendaciones / trabajo futuro.

9. **Bibliografía**
   - Referencias en formato APA (ver sugerencias en la sección 12).

---

## 12. Requisitos de estilo y bibliografía sugerida

- **Idioma:** español, registro formal y técnico.
- **Formato:** Markdown, con jerarquía de títulos, tablas cuando aporte claridad y viñetas para listas.
- **Extensión sugerida:** entre 1.500 y 2.500 palabras (sin contar la bibliografía).
- **Bibliografía (sugerencias, verifica/ajusta el formato APA):**
  - Mozilla Developer Network. (2026). *Progressive web apps (PWA)*. MDN Web Docs. https://developer.mozilla.org/es/docs/Web/Progressive_web_apps
  - Google. (2026). *Learn PWA*. web.dev. https://web.dev/learn/pwa
  - W3C. (2021). *Web App Manifest*. W3C Working Draft. https://www.w3.org/TR/appmanifest/
  - W3C Service Workers Working Group. (2024). *Service Workers*. https://www.w3.org/TR/service-workers/
  - Archibald, J. (2016). *The Service Worker Lifecycle*. web.dev. https://web.dev/articles/service-worker-lifecycle
  - Mozilla Developer Network. (2026). *IndexedDB API*. https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API
  - Mozilla Developer Network. (2026). *Web Storage API*. https://developer.mozilla.org/es/docs/Web/API/Web_Storage_API

> **Nota final para Claude:** usa toda la información anterior como única fuente de verdad. Genera el informe
> completo y listo para entregar, respetando el orden y los nombres exactos de las nueve secciones solicitadas.
