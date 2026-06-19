// ============================================================
// LÓGICA DEL DASHBOARD DE PEDIDOS
// ============================================================

let TODOS_LOS_PEDIDOS = [];
let ESTADO_FILTRO = "todos";

const NOMBRES_ESTADO = {
  pendiente: "Pendiente",
  pago_verificado: "Pago verificado",
  en_preparacion: "En preparación",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const NOMBRES_METODO = {
  paypal: "PayPal",
  transferencia: "Transferencia",
  contra_reembolso: "Contra reembolso",
  tarjeta: "Tarjeta",
};

function formatoFecha(iso) {
  const f = new Date(iso);
  return f.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + f.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
}

async function verificarSesion() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

async function cargarPedidos() {
  const { data, error } = await supabaseClient
    .from("pedidos")
    .select("*, pedido_items(*)")
    .order("creado_en", { ascending: false });

  const lista = document.getElementById("listaPedidos");

  if (error) {
    lista.innerHTML = `<p class="estado-vacio">Error al cargar pedidos: ${error.message}</p>`;
    return;
  }

  TODOS_LOS_PEDIDOS = data;
  renderizarPedidos();
}

function renderizarPedidos() {
  const lista = document.getElementById("listaPedidos");
  const filtrados =
    ESTADO_FILTRO === "todos" ? TODOS_LOS_PEDIDOS : TODOS_LOS_PEDIDOS.filter((p) => p.estado === ESTADO_FILTRO);

  if (filtrados.length === 0) {
    lista.innerHTML = `<p class="estado-vacio">No hay pedidos en este estado.</p>`;
    return;
  }

  lista.innerHTML = filtrados
    .map(
      (p) => `
    <div class="pedido-row" data-id="${p.id}">
      <div class="pedido-row__info">
        <strong>${p.codigo_pedido}</strong> — ${p.cliente_nombre}
        <p>${NOMBRES_METODO[p.metodo_pago] || p.metodo_pago} · ${formatoFecha(p.creado_en)}</p>
      </div>
      <div class="pedido-row__derecha">
        <span class="estado-badge estado-${p.estado}">${NOMBRES_ESTADO[p.estado]}</span>
        <span class="pedido-row__total">$${Number(p.total).toFixed(2)}</span>
      </div>
    </div>
  `
    )
    .join("");
}

function abrirModalPedido(id) {
  const p = TODOS_LOS_PEDIDOS.find((x) => x.id === id);
  if (!p) return;

  document.getElementById("modalTitulo").textContent = p.codigo_pedido;

  const itemsHtml = p.pedido_items
    .map(
      (item) => `
    <div class="detalle-item-row">
      <span>${item.cantidad} × ${item.nombre_producto}</span>
      <span>$${Number(item.subtotal).toFixed(2)}</span>
    </div>
  `
    )
    .join("");

  let comprobanteHtml = "";
  if (p.comprobante_url) {
    const esImagen = /\.(jpg|jpeg|png|webp|gif)$/i.test(p.comprobante_url);
    comprobanteHtml = `
      <div class="detalle-grupo detalle-comprobante">
        <h3>Comprobante de transferencia</h3>
        ${esImagen ? `<img src="${p.comprobante_url}" alt="Comprobante">` : `<a href="${p.comprobante_url}" target="_blank">Ver comprobante (PDF)</a>`}
      </div>
    `;
  }

  document.getElementById("modalBody").innerHTML = `
    <div class="detalle-grupo">
      <h3>Cliente</h3>
      <p>${p.cliente_nombre}</p>
      <p>${p.cliente_email} · ${p.cliente_telefono}</p>
      <p>${p.cliente_direccion}, ${p.cliente_ciudad}</p>
    </div>

    <div class="detalle-grupo">
      <h3>Productos</h3>
      ${itemsHtml}
    </div>

    <div class="detalle-grupo">
      <h3>Pago</h3>
      <p>Método: ${NOMBRES_METODO[p.metodo_pago] || p.metodo_pago}${p.banco ? " — " + p.banco : ""}</p>
      <p>Subtotal: $${Number(p.subtotal).toFixed(2)} · Envío: $${Number(p.envio).toFixed(2)} · <strong>Total: $${Number(p.total).toFixed(2)}</strong></p>
    </div>

    ${comprobanteHtml}

    ${p.notas ? `<div class="detalle-grupo"><h3>Notas</h3><p>${p.notas}</p></div>` : ""}

    <div class="detalle-grupo cambiar-estado">
      <h3>Estado del pedido</h3>
      <select id="selectEstado" data-id="${p.id}">
        ${Object.keys(NOMBRES_ESTADO)
          .map((key) => `<option value="${key}" ${key === p.estado ? "selected" : ""}>${NOMBRES_ESTADO[key]}</option>`)
          .join("")}
      </select>
    </div>
  `;

  document.getElementById("overlayModal").classList.add("overlay--visible");
  document.getElementById("modalPedido").classList.add("modal-pedido--abierto");
}

function cerrarModal() {
  document.getElementById("overlayModal").classList.remove("overlay--visible");
  document.getElementById("modalPedido").classList.remove("modal-pedido--abierto");
}

async function actualizarEstadoPedido(id, nuevoEstado) {
  const { error } = await supabaseClient
    .from("pedidos")
    .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    alert("No se pudo actualizar el estado: " + error.message);
    return;
  }

  // Reflejar el cambio localmente sin recargar todo
  const pedido = TODOS_LOS_PEDIDOS.find((p) => p.id === id);
  if (pedido) pedido.estado = nuevoEstado;
  renderizarPedidos();
}

// ============================================================
// EVENTOS
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const ok = await verificarSesion();
  if (!ok) return;

  cargarPedidos();

  document.getElementById("btnLogout").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
  });

  document.querySelectorAll(".admin-filtros .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".admin-filtros .chip").forEach((c) => c.classList.remove("chip--activo"));
      chip.classList.add("chip--activo");
      ESTADO_FILTRO = chip.dataset.estado;
      renderizarPedidos();
    });
  });

  document.getElementById("listaPedidos").addEventListener("click", (e) => {
    const fila = e.target.closest(".pedido-row");
    if (fila) abrirModalPedido(fila.dataset.id);
  });

  document.getElementById("cerrarModal").addEventListener("click", cerrarModal);
  document.getElementById("overlayModal").addEventListener("click", cerrarModal);

  document.getElementById("modalBody").addEventListener("change", (e) => {
    if (e.target.id === "selectEstado") {
      actualizarEstadoPedido(e.target.dataset.id, e.target.value);
    }
  });
});
