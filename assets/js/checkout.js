// ============================================================
// LÓGICA DE CHECKOUT
// ============================================================

let comprobanteArchivo = null;

function renderizarResumen() {
  const items = Carrito.obtener();
  const contenedor = document.getElementById("resumenItems");
  const vacioMsg = document.getElementById("checkoutVacio");
  const form = document.getElementById("formPedido");

  if (items.length === 0) {
    vacioMsg.style.display = "block";
    form.style.display = "none";
    document.querySelector(".checkout__resumen").style.display = "none";
    return;
  }

  contenedor.innerHTML = items
    .map(
      (item) => `
    <div class="resumen-item">
      <div class="resumen-item__img">${item.imagen_url ? `<img src="${item.imagen_url}" alt="">` : ""}</div>
      <div class="resumen-item__info">
        <div>${item.nombre}</div>
        <div class="resumen-item__cant">${item.cantidad} × ${formatoMoneda(item.precio)}</div>
      </div>
      <div>${formatoMoneda(item.precio * item.cantidad)}</div>
    </div>
  `
    )
    .join("");

  document.getElementById("resSubtotal").textContent = formatoMoneda(Carrito.calcularSubtotal());
  document.getElementById("resEnvio").textContent = formatoMoneda(Carrito.calcularEnvio());
  document.getElementById("resTotal").textContent = formatoMoneda(Carrito.calcularTotal());
}

// ============================================================
// PANEL DINÁMICO SEGÚN MÉTODO DE PAGO ELEGIDO
// ============================================================
function renderizarPanelMetodo(metodo) {
  const panel = document.getElementById("panelMetodo");
  const btnConfirmar = document.getElementById("btnConfirmar");

  if (metodo === "transferencia") {
    panel.innerHTML = `
      <div class="panel-banco">
        <label for="selectBanco">Elige tu banco</label>
        <select id="selectBanco" required>
          ${NEGOCIO.cuentasBancarias
            .map((c) => `<option value="${c.banco}">${c.banco}</option>`)
            .join("")}
        </select>
        <div class="cuenta-detalle" id="detalleCuenta"></div>

        <div class="subida-comprobante">
          <label for="comprobante">Sube tu comprobante de transferencia (imagen o PDF)</label>
          <input type="file" id="comprobante" accept="image/*,.pdf">
        </div>
      </div>
    `;
    const selectBanco = document.getElementById("selectBanco");
    function mostrarDetalleCuenta() {
      const cuenta = NEGOCIO.cuentasBancarias.find((c) => c.banco === selectBanco.value);
      document.getElementById("detalleCuenta").innerHTML = `
        <strong>${cuenta.banco}</strong><br>
        Tipo: ${cuenta.tipo}<br>
        N° de cuenta: ${cuenta.numero}<br>
        Titular: ${cuenta.titular}<br>
        Cédula/RUC: ${cuenta.cedulaRuc}
      `;
    }
    selectBanco.addEventListener("change", mostrarDetalleCuenta);
    mostrarDetalleCuenta();

    document.getElementById("comprobante").addEventListener("change", (e) => {
      comprobanteArchivo = e.target.files[0] || null;
    });

    btnConfirmar.style.display = "block";
    btnConfirmar.textContent = "Confirmar pedido";
  }

  if (metodo === "contra_reembolso") {
    panel.innerHTML = `
      <div class="panel-banco">
        <p style="color:var(--texto-suave); font-size:.88rem; margin:0;">
          Pagarás en efectivo al recibir tu pedido en la dirección indicada.
          Te contactaremos para confirmar la entrega.
        </p>
      </div>
    `;
    btnConfirmar.style.display = "block";
    btnConfirmar.textContent = "Confirmar pedido";
  }

  if (metodo === "paypal") {
    panel.innerHTML = `
      <div class="panel-banco">
        <p style="color:var(--texto-suave); font-size:.88rem; margin:0 0 1rem;">
          Completa tus datos arriba y luego paga con el botón de PayPal.
          Tu pedido se registrará automáticamente al confirmar el pago.
        </p>
        <div id="paypal-button-container"></div>
      </div>
    `;
    // Con PayPal, el pedido se crea DESPUÉS de que el pago se aprueba,
    // así que ocultamos el botón normal de "Confirmar pedido".
    btnConfirmar.style.display = "none";
    cargarBotonPaypal();
  }
}

// ============================================================
// INTEGRACIÓN DE PAYPAL
// ============================================================
function cargarBotonPaypal() {
  // Carga el SDK de PayPal dinámicamente si no está ya cargado
  if (window.paypal) {
    pintarBotonPaypal();
    return;
  }
  const script = document.createElement("script");
  script.src = `https://www.paypal.com/sdk/js?client-id=${NEGOCIO.paypalClientId}&currency=USD`;
  script.onload = pintarBotonPaypal;
  script.onerror = () => {
    document.getElementById("paypal-button-container").innerHTML =
      '<p style="color:var(--rosa-polvo); font-size:.85rem;">No se pudo cargar PayPal. Verifica tu conexión o intenta con otro método.</p>';
  };
  document.head.appendChild(script);
}

function pintarBotonPaypal() {
  if (!validarFormularioBasico(false)) {
    document.getElementById("paypal-button-container").innerHTML =
      '<p style="color:var(--rosa-polvo); font-size:.85rem;">Completa tus datos de contacto arriba para habilitar el pago.</p>';
    return;
  }

  window.paypal
    .Buttons({
      style: { color: "gold", shape: "pill", label: "paypal", height: 45 },
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [
            {
              amount: { value: Carrito.calcularTotal().toFixed(2) },
              description: "Pedido en Bisutería Tito",
            },
          ],
        });
      },
      onApprove: async (data, actions) => {
        const detalles = await actions.order.capture();
        await crearPedidoEnSupabase("paypal", null, detalles.id);
      },
      onError: (err) => {
        console.error("Error de PayPal:", err);
        document.getElementById("avisoEnvio").textContent =
          "Ocurrió un problema con el pago de PayPal. Intenta de nuevo.";
      },
    })
    .render("#paypal-button-container");
}

// ============================================================
// VALIDACIÓN
// ============================================================
function validarFormularioBasico(mostrarError = true) {
  const campos = ["nombre", "email", "telefono", "direccion", "ciudad"];
  for (const id of campos) {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      if (mostrarError) {
        el.focus();
        document.getElementById("avisoEnvio").textContent = "Por favor completa todos tus datos de contacto.";
      }
      return false;
    }
  }
  return true;
}

// ============================================================
// GUARDAR PEDIDO EN SUPABASE
// ============================================================
async function crearPedidoEnSupabase(metodoPago, bancoElegido, referenciaPaypal) {
  const btnConfirmar = document.getElementById("btnConfirmar");
  const aviso = document.getElementById("avisoEnvio");
  if (btnConfirmar) {
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Procesando…";
  }

  try {
    const items = Carrito.obtener();
    const subtotal = Carrito.calcularSubtotal();
    const envio = Carrito.calcularEnvio();
    const total = Carrito.calcularTotal();

    let comprobanteUrl = null;

    // Si hay comprobante de transferencia, subirlo primero a Supabase Storage
    if (metodoPago === "transferencia" && comprobanteArchivo) {
      const nombreArchivo = `${Date.now()}_${comprobanteArchivo.name}`;
      const { data: archivoSubido, error: errorSubida } = await supabaseClient.storage
        .from("comprobantes")
        .upload(nombreArchivo, comprobanteArchivo);

      if (errorSubida) throw new Error("No se pudo subir el comprobante: " + errorSubida.message);

      const { data: urlPublica } = supabaseClient.storage.from("comprobantes").getPublicUrl(nombreArchivo);
      comprobanteUrl = urlPublica.publicUrl;
    }

    // Insertar el pedido
    const { data: pedido, error: errorPedido } = await supabaseClient
      .from("pedidos")
      .insert({
        cliente_nombre: document.getElementById("nombre").value.trim(),
        cliente_email: document.getElementById("email").value.trim(),
        cliente_telefono: document.getElementById("telefono").value.trim(),
        cliente_direccion: document.getElementById("direccion").value.trim(),
        cliente_ciudad: document.getElementById("ciudad").value.trim(),
        metodo_pago: metodoPago,
        banco: bancoElegido,
        estado: metodoPago === "paypal" ? "pago_verificado" : "pendiente",
        subtotal: subtotal,
        envio: envio,
        total: total,
        comprobante_url: comprobanteUrl,
        notas:
          (document.getElementById("notas").value.trim() || "") +
          (referenciaPaypal ? ` [PayPal ref: ${referenciaPaypal}]` : ""),
      })
      .select()
      .single();

    if (errorPedido) throw new Error("No se pudo crear el pedido: " + errorPedido.message);

    // Insertar los items del pedido
    const itemsParaInsertar = items.map((item) => ({
      pedido_id: pedido.id,
      producto_id: item.id,
      nombre_producto: item.nombre,
      precio_unitario: item.precio,
      cantidad: item.cantidad,
      subtotal: item.precio * item.cantidad,
    }));

    const { error: errorItems } = await supabaseClient.from("pedido_items").insert(itemsParaInsertar);
    if (errorItems) throw new Error("No se pudieron guardar los productos del pedido: " + errorItems.message);

    // Éxito: mostrar confirmación
    mostrarConfirmacion(pedido.codigo_pedido, metodoPago);
    Carrito.vaciar();
  } catch (err) {
    console.error(err);
    aviso.textContent = err.message || "Ocurrió un error al procesar tu pedido. Intenta nuevamente.";
    if (btnConfirmar) {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = "Confirmar pedido";
    }
  }
}

function mostrarConfirmacion(codigo, metodo) {
  document.getElementById("formPedido").style.display = "none";
  document.querySelector(".checkout__resumen").style.display = "none";
  const confirmacion = document.getElementById("confirmacionPedido");
  confirmacion.style.display = "block";
  document.getElementById("codigoPedidoMostrado").textContent = codigo;

  const mensajes = {
    paypal: "Tu pago fue confirmado. Te escribiremos pronto para coordinar el envío.",
    transferencia:
      "Hemos recibido tu comprobante y lo verificaremos en breve. Te avisaremos por correo o WhatsApp cuando esté confirmado.",
    contra_reembolso: "Coordinaremos contigo la entrega y el pago en efectivo. ¡Gracias por tu compra!",
  };
  document.getElementById("mensajeSegunMetodo").textContent = mensajes[metodo] || "";
}

// ============================================================
// EVENTOS
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  renderizarResumen();
  renderizarPanelMetodo("paypal"); // método por defecto

  document.querySelectorAll('input[name="metodoPago"]').forEach((radio) => {
    radio.addEventListener("change", (e) => renderizarPanelMetodo(e.target.value));
  });

  document.getElementById("formPedido").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validarFormularioBasico()) return;

    const metodo = document.querySelector('input[name="metodoPago"]:checked').value;

    if (metodo === "transferencia") {
      if (!comprobanteArchivo) {
        document.getElementById("avisoEnvio").textContent =
          "Por favor sube tu comprobante de transferencia antes de confirmar.";
        return;
      }
      const banco = document.getElementById("selectBanco").value;
      await crearPedidoEnSupabase("transferencia", banco, null);
    }

    if (metodo === "contra_reembolso") {
      await crearPedidoEnSupabase("contra_reembolso", null, null);
    }
  });
});
