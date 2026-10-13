import { db, STORES } from "./db.js";
import { estadoConexion } from "./connection.js";
import { uid } from "./utils.js";

const ETIQUETAS_SERVICIO = {
  comer_aqui: "Comer en el local",
  para_llevar: "Para llevar",
  delivery: "Delivery a domicilio",
};

export async function guardarPedido({ cliente, lineas, totales }) {
  const online = estadoConexion();
  const registro = {
    codigo: `BJ-${uid()}`.toUpperCase(),
    cliente,
    servicio: cliente.servicio || "comer_aqui",
    servicioTexto: ETIQUETAS_SERVICIO[cliente.servicio] || "Comer en el local",
    lineas: lineas.map((l) => ({
      id: l.producto.id,
      nombre: l.producto.nombre,
      emoji: l.producto.emoji,
      precio: l.producto.precio,
      cantidad: l.cantidad,
      subtotal: l.subtotal,
    })),
    articulos: totales.articulos,
    subtotal: totales.subtotal,
    iva: totales.iva,
    envio: totales.envio,
    total: totales.total,
    estado: "pendiente",
    creado: new Date().toISOString(),
    sincronizadoEn: null,
    origen: online ? "en-linea" : "sin-conexion",
  };
  const id = await db.agregar(STORES.pedidos, registro);
  return { ...registro, id };
}

export async function guardarReserva(datos) {
  const online = estadoConexion();
  const registro = {
    ...datos,
    estado: "pendiente",
    creado: new Date().toISOString(),
    sincronizadoEn: null,
    origen: online ? "en-linea" : "sin-conexion",
  };
  const id = await db.agregar(STORES.reservas, registro);
  return { ...registro, id };
}

export async function listarPedidos() {
  const pedidos = await db.obtenerTodos(STORES.pedidos);
  return pedidos.sort((a, b) => new Date(b.creado) - new Date(a.creado));
}

export async function listarReservas() {
  const reservas = await db.obtenerTodos(STORES.reservas);
  return reservas.sort((a, b) => new Date(b.creado) - new Date(a.creado));
}
