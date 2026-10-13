import { local, LS_KEYS } from "./storage.js";
import { bus } from "./utils.js";
import { catalogo } from "./data.js";

let envioActivo = false;

function leer() {
  const items = local.get(LS_KEYS.carrito, []);
  return Array.isArray(items) ? items : [];
}

function escribir(items) {
  local.set(LS_KEYS.carrito, items);
  bus.emit("cart:change", { items });
}

export const carrito = {
  obtener: leer,

  setEnvio(activo) {
    const cambio = envioActivo !== Boolean(activo);
    envioActivo = Boolean(activo);
    if (cambio) bus.emit("cart:change", { items: leer() });
  },

  agregar(id, cantidad = 1) {
    const items = leer();
    const existente = items.find((i) => i.id === id);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      items.push({ id, cantidad });
    }
    escribir(items);
    return items;
  },

  cambiarCantidad(id, delta) {
    const items = leer();
    const item = items.find((i) => i.id === id);
    if (!item) return items;
    item.cantidad += delta;
    const siguiente = item.cantidad <= 0 ? items.filter((i) => i.id !== id) : items;
    escribir(siguiente);
    return siguiente;
  },

  eliminar(id) {
    const items = leer().filter((i) => i.id !== id);
    escribir(items);
    return items;
  },

  vaciar() {
    escribir([]);
  },

  contar() {
    return leer().reduce((acc, i) => acc + i.cantidad, 0);
  },

  detalle() {
    return leer()
      .map((item) => {
        const producto = catalogo.producto(item.id);
        if (!producto) return null;
        return { ...item, producto, subtotal: producto.precio * item.cantidad };
      })
      .filter(Boolean);
  },

  totales() {
    const lineas = this.detalle();
    const subtotal = lineas.reduce((acc, l) => acc + l.subtotal, 0);
    const iva = subtotal * catalogo.iva;
    const envio = envioActivo && lineas.length ? catalogo.costoEnvio : 0;
    return {
      lineas,
      articulos: lineas.reduce((acc, l) => acc + l.cantidad, 0),
      subtotal,
      iva,
      envio,
      total: subtotal + iva + envio,
      tasa: catalogo.iva,
      envioActivo,
    };
  },
};

function leerPopulares() {
  const favs = local.get(LS_KEYS.favoritos, []);
  return Array.isArray(favs) ? favs : [];
}

export const favoritos = {
  obtener: leerPopulares,
  esFavorito: (id) => leerPopulares().includes(id),
  alternar(id) {
    const favs = leerPopulares();
    const siguiente = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    local.set(LS_KEYS.favoritos, siguiente);
    bus.emit("fav:change", { favoritos: siguiente, id });
    return siguiente;
  },
};
