import { $, $$, bus, debounce, formatMoney, formatDate, escapeHtml } from "./utils.js";
import { session, SS_KEYS, iniciarSesion, prefers } from "./storage.js";
import { cargarMenu, catalogo } from "./data.js";
import {
  iniciarConexion,
  estadoConexion,
  contarPendientes,
  sincronizar,
  ultimaSincronizacion,
} from "./connection.js";
import { carrito, favoritos } from "./cart.js";
import { guardarPedido, guardarReserva, listarPedidos, listarReservas } from "./orders.js";
import { activarBorrador, validarFormulario, limpiarErroresAlEscribir } from "./forms.js";

const ui = {
  vista: session.get(SS_KEYS.vistaActiva, "menu"),
  categoria: session.get(SS_KEYS.categoria, "todas"),
  busqueda: session.get(SS_KEYS.busqueda, ""),
  orden: prefers.get().orden || "relevancia",
  soloPopulares: false,
};

let promptInstalacion = null;
let borradorCheckout = null;
let borradorReserva = null;

/* ------------------------- Utilidades de UI ------------------------- */
function toast(mensaje, tipo = "info", duracion = 4000) {
  const contenedor = $("#toasts");
  const el = document.createElement("div");
  el.className = `toast ${tipo}`;
  el.textContent = mensaje;
  contenedor.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .25s ease, transform .25s ease";
    el.style.opacity = "0";
    el.style.transform = "translateX(30px)";
    setTimeout(() => el.remove(), 250);
  }, duracion);
}

function cambiarVista(vista) {
  ui.vista = vista;
  session.set(SS_KEYS.vistaActiva, vista);
  $$(".view").forEach((v) => v.classList.toggle("is-active", v.id === `view-${vista}`));
  $$(".nav-item").forEach((b) => b.classList.toggle("is-active", b.dataset.view === vista));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function actualizarBadge() {
  const badge = $("#cartBadge");
  const total = carrito.contar();
  badge.textContent = total;
  badge.hidden = total === 0;
}

/* ------------------------- Menú ------------------------- */
function renderCategorias() {
  const contenedor = $("#categorias");
  const activa = ui.categoria;
  const botones = [
    `<button class="chip ${activa === "todas" ? "is-active" : ""}" data-cat="todas">⭐ Todo</button>`,
    ...catalogo.estado.categorias.map(
      (c) =>
        `<button class="chip ${activa === c.id ? "is-active" : ""}" data-cat="${c.id}">${c.icono} ${escapeHtml(
          c.nombre
        )}</button>`
    ),
  ];
  contenedor.innerHTML = botones.join("");
}

function productosFiltrados() {
  const termino = ui.busqueda.trim().toLowerCase();
  let lista = catalogo.estado.productos.slice();

  if (ui.categoria !== "todas") lista = lista.filter((p) => p.categoria === ui.categoria);

  if (termino) {
    lista = lista.filter(
      (p) => p.nombre.toLowerCase().includes(termino) || p.descripcion.toLowerCase().includes(termino)
    );
  }

  if (ui.soloPopulares) lista = lista.filter((p) => p.popular);

  switch (ui.orden) {
    case "precio-asc":
      lista.sort((a, b) => a.precio - b.precio);
      break;
    case "precio-desc":
      lista.sort((a, b) => b.precio - a.precio);
      break;
    case "rating":
      lista.sort((a, b) => b.rating - a.rating);
      break;
    case "preparacion":
      lista.sort((a, b) => a.preparacion - b.preparacion);
      break;
  }
  return lista;
}

function tarjetaProducto(p) {
  const stockBajo = p.stock <= 15;
  const categoria = catalogo.categoria(p.categoria);
  const badges = [
    p.popular ? '<span class="pill popular">★ Popular</span>' : "",
    p.picante ? '<span class="pill spicy">🌶 Picante</span>' : "",
    `<span class="pill time">⏱ ${p.preparacion} min</span>`,
  ].join("");

  return `
    <article class="product-card" data-id="${p.id}">
      <div class="product-thumb" aria-hidden="true">${p.emoji}</div>
      <div class="product-top">
        <span class="product-cat">${categoria ? escapeHtml(categoria.nombre) : p.categoria}</span>
      </div>
      <h3 class="product-name">${escapeHtml(p.nombre)}</h3>
      <p class="product-desc">${escapeHtml(p.descripcion)}</p>
      <div class="badges">${badges}</div>
      <div class="product-meta">
        <span class="product-price">${formatMoney(p.precio)}</span>
        <span class="product-rating">★ ${p.rating.toFixed(1)}</span>
      </div>
      <span class="stock-tag ${stockBajo ? "low" : ""}">${stockBajo ? "¡Quedan " + p.stock + "!" : p.stock + " disponibles"}</span>
      <div class="product-actions">
        <button class="btn btn-primary" data-action="add">Agregar 🛒</button>
      </div>
    </article>`;
}

function renderMenu() {
  const grid = $("#productGrid");
  const lista = productosFiltrados();

  if (!catalogo.estado.productos.length) {
    grid.innerHTML = `
      <div class="empty">
        <span class="big">📡</span>
        Aún no hay platillos guardados sin conexión.
        <br />Conéctate una vez para guardar el menú localmente.
        <div style="margin-top:1rem"><button class="btn btn-primary" id="reintentarMenu">Reintentar</button></div>
      </div>`;
    return;
  }

  if (!lista.length) {
    grid.innerHTML = `<div class="empty"><span class="big">🔎</span>No encontramos platillos con ese filtro.</div>`;
    return;
  }

  grid.innerHTML = lista.map(tarjetaProducto).join("");
  const origen = catalogo.estado.origen === "red" ? "actualizado" : "desde cache local";
  $("#menuResumen").textContent = `${lista.length} platillos · ${origen}`;
}

/* ------------------------- Pedido (carrito) ------------------------- */
function renderCarrito() {
  const contenedor = $("#cartItems");
  const { lineas, articulos, subtotal, iva, envio, total } = carrito.totales();

  $("#sumItems").textContent = articulos;
  $("#sumSubtotal").textContent = formatMoney(subtotal);
  $("#sumIva").textContent = formatMoney(iva);
  $("#sumEnvio").textContent = formatMoney(envio);
  $("#rowEnvio").hidden = envio <= 0;
  $("#sumTotal").textContent = formatMoney(total);
  $("#pedidoResumen").textContent =
    articulos > 0 ? `${articulos} artículo(s) en tu pedido.` : "Tu pedido está vacío.";

  if (!lineas.length) {
    contenedor.innerHTML = `<div class="empty"><span class="big">🧾</span>Agrega platillos para armar tu pedido.</div>`;
    return;
  }

  contenedor.innerHTML = lineas
    .map(
      (l) => `
    <div class="cart-item" data-id="${l.producto.id}">
      <div class="cart-item-emoji">${l.producto.emoji}</div>
      <div class="cart-item-info">
        <h3>${escapeHtml(l.producto.nombre)}</h3>
        <span class="muted">${formatMoney(l.producto.precio)} c/u</span>
      </div>
      <div class="qty">
        <button data-action="menos" aria-label="Quitar uno">−</button>
        <span>${l.cantidad}</span>
        <button data-action="mas" aria-label="Agregar uno">+</button>
      </div>
      <div class="cart-item-price">${formatMoney(l.subtotal)}</div>
    </div>`
    )
    .join("");
}

/* ------------------------- Pedidos y reservas ------------------------- */
function tagEstado(estado) {
  const texto = estado === "sincronizado" ? "Sincronizado" : "Pendiente de envío";
  return `<span class="tag ${estado}">${texto}</span>`;
}

async function renderPedidos() {
  const contenedor = $("#pedidosList");
  const pedidos = await listarPedidos();

  if (!pedidos.length) {
    contenedor.innerHTML = `<div class="empty"><span class="big">🛍️</span>Todavía no has hecho pedidos.</div>`;
    return;
  }

  contenedor.innerHTML = pedidos
    .map(
      (p) => `
    <article class="order-card">
      <div class="order-head">
        <div>
          <div class="order-id">${escapeHtml(p.codigo)}</div>
          <div class="muted">${formatDate(p.creado)} · ${escapeHtml(p.cliente?.nombre || "Cliente")} · ${escapeHtml(p.servicioTexto || "")}</div>
        </div>
        <div style="text-align:right">
          ${tagEstado(p.estado)}
          <div class="order-total">${formatMoney(p.total)}</div>
        </div>
      </div>
      <div class="order-items">
        ${p.lineas.map((l) => `${l.emoji} ${escapeHtml(l.nombre)} ×${l.cantidad}`).join(" · ")}
      </div>
    </article>`
    )
    .join("");
}

async function renderReservas() {
  const contenedor = $("#reservasList");
  const reservas = await listarReservas();

  if (!reservas.length) {
    contenedor.innerHTML = "";
    return;
  }

  contenedor.innerHTML =
    `<h2 style="margin-bottom:.25rem">Reservas enviadas</h2>` +
    reservas
      .map(
        (m) => `
    <article class="order-card">
      <div class="order-head">
        <div>
          <div class="order-id">📅 ${escapeHtml(m.fecha || "")} ${escapeHtml(m.hora || "")}</div>
          <div class="muted">${formatDate(m.creado)} · ${escapeHtml(m.nombre)} · ${escapeHtml(String(m.personas || ""))} personas</div>
        </div>
        <span class="tag ${m.estado === "sincronizado" ? "sincronizado" : "pendiente"}">
          ${m.estado === "sincronizado" ? "Sincronizado" : "En cola"}
        </span>
      </div>
      <div class="order-items">${escapeHtml(m.comentario)}</div>
    </article>`
      )
      .join("");
}

/* ------------------------- Conexión ------------------------- */
async function actualizarIndicadoresConexion() {
  const online = estadoConexion();
  const pill = $("#statusPill");
  const banner = $("#connectionBanner");
  const bannerTexto = $("#connectionBannerText");
  const pendientes = await contarPendientes();

  pill.classList.toggle("is-offline", !online);
  $("#statusText").textContent = online ? "En línea" : "Sin conexión";

  if (online) {
    banner.classList.add("is-online");
    banner.hidden = true;
  } else {
    banner.hidden = false;
    banner.classList.remove("is-online");
    bannerTexto.textContent = `⚠️ Sin conexión. Puedes seguir pidiendo: todo se guarda en tu dispositivo${
      pendientes ? ` (${pendientes} pendiente(s))` : ""
    }.`;
  }

  const ultima = ultimaSincronizacion();
  $("#pedidosResumen").textContent = ultima
    ? `Última sincronización: ${formatDate(ultima)}.${pendientes ? ` ${pendientes} pendiente(s).` : ""}`
    : `Aquí verás tus pedidos guardados localmente.${pendientes ? ` ${pendientes} pendiente(s).` : ""}`;
}

/* ------------------------- Servicio (delivery) ------------------------- */
function aplicarServicio(valor) {
  const esDelivery = valor === "delivery";
  const campo = $("#campoDireccion");
  const direccion = $("#coDireccion");
  campo.hidden = !esDelivery;
  direccion.required = esDelivery;
  carrito.setEnvio(esDelivery);
}

/* ------------------------- Formularios ------------------------- */
async function manejarCheckout(evento) {
  evento.preventDefault();
  const form = evento.currentTarget;

  if (!carrito.contar()) {
    toast("Tu pedido está vacío. Agrega platillos primero.", "warning");
    return;
  }
  if (!validarFormulario(form)) {
    toast("Revisa los datos de tu pedido.", "error");
    return;
  }

  const cliente = {};
  new FormData(form).forEach((valor, name) => (cliente[name] = valor));
  const totales = carrito.totales();

  const pedido = await guardarPedido({ cliente, lineas: totales.lineas, totales });

  carrito.vaciar();
  carrito.setEnvio(false);
  form.reset();
  $("#campoDireccion").hidden = true;
  $("#coDireccion").required = false;
  await borradorCheckout.limpiar();

  if (estadoConexion()) {
    toast(`Pedido ${pedido.codigo} confirmado.`, "success");
    await sincronizar({ silencioso: true });
  } else {
    toast(`Pedido ${pedido.codigo} guardado sin conexión. Se enviará al reconectar.`, "warning");
  }

  await renderPedidos();
  await actualizarIndicadoresConexion();
  cambiarVista("pedidos");
}

async function manejarReserva(evento) {
  evento.preventDefault();
  const form = evento.currentTarget;

  if (!validarFormulario(form)) {
    toast("Revisa el formulario de reserva.", "error");
    return;
  }

  const datos = {};
  new FormData(form).forEach((valor, name) => (datos[name] = valor));

  await guardarReserva(datos);
  form.reset();
  await borradorReserva.limpiar();

  if (estadoConexion()) {
    toast("Reserva enviada correctamente.", "success");
    await sincronizar({ silencioso: true });
  } else {
    toast("Reserva guardada sin conexión. Se enviará al reconectar.", "warning");
  }

  await renderReservas();
  await actualizarIndicadoresConexion();
}

/* ------------------------- Service Worker / PWA ------------------------- */
async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registro = await navigator.serviceWorker.register("service-worker.js");
    registro.addEventListener("updatefound", () => {
      const nuevo = registro.installing;
      if (!nuevo) return;
      nuevo.addEventListener("statechange", () => {
        if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
          toast("Nueva versión disponible. Recarga para actualizar.", "info", 6000);
        }
      });
    });
  } catch (err) {
    console.warn("Service Worker no registrado:", err);
  }
}

function configurarInstalacion() {
  const boton = $("#installBtn");
  const yaInstalada = window.matchMedia("(display-mode: standalone)").matches;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptInstalacion = e;
    if (!yaInstalada) boton.hidden = false;
  });

  boton.addEventListener("click", async () => {
    if (!promptInstalacion) return;
    promptInstalacion.prompt();
    await promptInstalacion.userChoice;
    promptInstalacion = null;
    boton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    boton.hidden = true;
    toast("¡App instalada! Ya puedes usarla sin conexión.", "success");
  });
}

/* ------------------------- Eventos ------------------------- */
function conectarEventos() {
  $$(".nav-item").forEach((boton) =>
    boton.addEventListener("click", () => cambiarVista(boton.dataset.view))
  );
  $("#cartButton").addEventListener("click", () => cambiarVista("pedido"));

  $("#buscador").addEventListener(
    "input",
    debounce((e) => {
      ui.busqueda = e.target.value;
      session.set(SS_KEYS.busqueda, ui.busqueda);
      renderMenu();
    }, 250)
  );

  $("#categorias").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    ui.categoria = chip.dataset.cat;
    session.set(SS_KEYS.categoria, ui.categoria);
    renderCategorias();
    renderMenu();
  });

  $("#ordenar").addEventListener("change", (e) => {
    ui.orden = e.target.value;
    prefers.set({ orden: ui.orden });
    renderMenu();
  });

  $("#soloPopulares").addEventListener("change", (e) => {
    ui.soloPopulares = e.target.checked;
    renderMenu();
  });

  $("#productGrid").addEventListener("click", (e) => {
    if (e.target.id === "reintentarMenu") {
      recargarMenu();
      return;
    }
    const accion = e.target.closest("[data-action]");
    if (!accion) return;
    const id = accion.closest(".product-card").dataset.id;

    if (accion.dataset.action === "add") {
      carrito.agregar(id, 1);
      toast("Agregado a tu pedido 🛒", "success", 1800);
    }
  });

  $("#cartItems").addEventListener("click", (e) => {
    const accion = e.target.closest("[data-action]");
    if (!accion) return;
    const id = accion.closest(".cart-item").dataset.id;
    if (accion.dataset.action === "mas") carrito.cambiarCantidad(id, 1);
    if (accion.dataset.action === "menos") carrito.cambiarCantidad(id, -1);
  });

  $("#vaciarCarrito").addEventListener("click", () => {
    if (!carrito.contar()) return;
    if (confirm("¿Vaciar todo tu pedido?")) carrito.vaciar();
  });

  $("#coServicio").addEventListener("change", (e) => {
    aplicarServicio(e.target.value);
    renderCarrito();
  });

  $("#sincronizarBtn").addEventListener("click", async () => {
    if (!estadoConexion()) {
      toast("No hay conexión para sincronizar.", "warning");
      return;
    }
    await sincronizar();
  });

  $("#checkoutForm").addEventListener("submit", manejarCheckout);
  $("#reservaForm").addEventListener("submit", manejarReserva);
  $("#reservaLimpiar").addEventListener("click", async () => {
    await borradorReserva.limpiar();
    toast("Formulario limpiado.", "info", 2000);
  });

  bus.on("cart:change", () => {
    actualizarBadge();
    if (ui.vista === "pedido") renderCarrito();
  });

  bus.on("connection:change", ({ online }) => {
    actualizarIndicadoresConexion();
    if (online) {
      toast("¡Volviste! Conexión restablecida.", "success", 2500);
      if (!catalogo.estado.productos.length) recargarMenu();
    } else {
      toast("Sin conexión. Modo offline: puedes seguir pidiendo.", "warning");
    }
  });

  bus.on("sync:fin", async ({ total, silencioso }) => {
    if (!silencioso && total) toast(`Sincronización completa (${total}).`, "success");
    await renderPedidos();
    await renderReservas();
    await actualizarIndicadoresConexion();
  });
}

async function recargarMenu() {
  const previa = ui.categoria;
  try {
    await cargarMenu({ forzarRed: true });
    if (!catalogo.categoria(previa)) ui.categoria = "todas";
    renderCategorias();
    renderMenu();
    toast("Menú actualizado.", "success", 2500);
  } catch {
    toast("No se pudo actualizar el menú.", "error");
  }
}

/* ------------------------- Arranque ------------------------- */
async function init() {
  iniciarSesion();

  $("#buscador").value = ui.busqueda;
  $("#ordenar").value = ui.orden;

  iniciarConexion();
  conectarEventos();
  configurarInstalacion();
  registrarServiceWorker();

  try {
    await cargarMenu();
  } catch (err) {
    toast("No se pudo cargar el menú.", "error");
  }

  renderCategorias();
  renderMenu();
  renderCarrito();
  actualizarBadge();
  await renderPedidos();
  await renderReservas();
  await actualizarIndicadoresConexion();

  borradorCheckout = activarBorrador($("#checkoutForm"), {
    clave: "checkout",
    aviso: $("#checkoutDraftInfo"),
  });
  await borradorCheckout.restaurar();
  aplicarServicio($("#coServicio").value);
  renderCarrito();

  borradorReserva = activarBorrador($("#reservaForm"), {
    clave: "reserva",
    aviso: $("#reservaDraftInfo"),
  });
  await borradorReserva.restaurar();

  limpiarErroresAlEscribir($("#checkoutForm"));
  limpiarErroresAlEscribir($("#reservaForm"));

  cambiarVista(ui.vista);

  if (estadoConexion()) {
    setTimeout(() => sincronizar({ silencioso: true }), 1500);
  }
}

document.addEventListener("DOMContentLoaded", init);
