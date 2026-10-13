import { db, STORES } from "./db.js";

const META_MENU = "menu:info";
const RUTA_JSON = "data/menu.json";

const estado = {
  restaurante: { nombre: "Burger Juan", moneda: "USD", iva: 0.15, costoEnvio: 2.5, eslogan: "" },
  categorias: [],
  productos: [],
  origen: "sin-datos",
};

async function desdeJSON() {
  const respuesta = await fetch(RUTA_JSON, { cache: "no-store" });
  if (!respuesta.ok) throw new Error(`No se pudo leer el menú (HTTP ${respuesta.status})`);
  return respuesta.json();
}

async function persistir(menu) {
  if (Array.isArray(menu.productos)) {
    await db.guardarLote(STORES.productos, menu.productos);
  }
  await db.setMeta(META_MENU, {
    restaurante: menu.restaurante || estado.restaurante,
    categorias: menu.categorias || [],
    actualizado: menu.restaurante?.actualizado || new Date().toISOString(),
  });
}

async function desdeCache() {
  const productos = await db.obtenerTodos(STORES.productos);
  const meta = await db.getMeta(META_MENU, {});
  return {
    restaurante: meta.restaurante || estado.restaurante,
    categorias: meta.categorias || [],
    productos: productos || [],
  };
}

export async function cargarMenu({ forzarRed = false } = {}) {
  let menu;

  try {
    menu = await desdeJSON();
    estado.origen = "red";
    await persistir(menu);
  } catch (err) {
    if (forzarRed) throw err;
    console.warn("Menú desde cache local:", err.message);
    menu = await desdeCache();
    estado.origen = "cache";
  }

  estado.restaurante = menu.restaurante || estado.restaurante;
  estado.categorias = menu.categorias || [];
  estado.productos = menu.productos || [];
  return { ...estado };
}

export const catalogo = {
  get estado() {
    return estado;
  },
  producto: (id) => estado.productos.find((p) => p.id === id),
  categoria: (id) => estado.categorias.find((c) => c.id === id),
  get iva() {
    return estado.restaurante?.iva ?? 0.15;
  },
  get costoEnvio() {
    return estado.restaurante?.costoEnvio ?? 0;
  },
};
