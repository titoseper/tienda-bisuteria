// ============================================================
// CARRITO DE COMPRAS
// Se guarda en localStorage para persistir entre index.html y checkout.html
// ============================================================

const Carrito = {
  CLAVE: "bisuteria_carrito",

  obtener() {
    const datos = localStorage.getItem(this.CLAVE);
    return datos ? JSON.parse(datos) : [];
  },

  guardar(items) {
    localStorage.setItem(this.CLAVE, JSON.stringify(items));
  },

  agregar(producto, cantidad = 1) {
    const items = this.obtener();
    const existente = items.find((i) => i.id === producto.id);

    if (existente) {
      existente.cantidad += cantidad;
    } else {
      items.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen_url: producto.imagen_url,
        cantidad: cantidad,
        stockDisponible: producto.stock,
      });
    }
    this.guardar(items);
  },

  actualizarCantidad(id, nuevaCantidad) {
    let items = this.obtener();
    if (nuevaCantidad <= 0) {
      items = items.filter((i) => i.id !== id);
    } else {
      const item = items.find((i) => i.id === id);
      if (item) item.cantidad = nuevaCantidad;
    }
    this.guardar(items);
  },

  quitar(id) {
    const items = this.obtener().filter((i) => i.id !== id);
    this.guardar(items);
  },

  vaciar() {
    localStorage.removeItem(this.CLAVE);
  },

  contarItems() {
    return this.obtener().reduce((total, i) => total + i.cantidad, 0);
  },

  calcularSubtotal() {
    return this.obtener().reduce((total, i) => total + i.precio * i.cantidad, 0);
  },

  calcularEnvio() {
    const subtotal = this.calcularSubtotal();
    if (subtotal === 0) return 0;
    if (typeof NEGOCIO !== "undefined" && subtotal >= NEGOCIO.envioGratisDesde) return 0;
    return typeof NEGOCIO !== "undefined" ? NEGOCIO.costoEnvioFijo : 0;
  },

  calcularTotal() {
    return this.calcularSubtotal() + this.calcularEnvio();
  },
};

// ============================================================
// UI DEL CARRITO LATERAL (usado en index.html)
// ============================================================
function formatoMoneda(valor) {
  return "$" + Number(valor).toFixed(2);
}

function renderizarCarritoUI() {
  const items = Carrito.obtener();
  const contenedor = document.getElementById("cartItems");
  const contador = document.getElementById("cartCount");

  if (!contenedor) return; // esta página no tiene panel de carrito

  contador.textContent = Carrito.contarItems();

  if (items.length === 0) {
    contenedor.innerHTML = `<p class="estado-vacio">Tu carrito está vacío.</p>`;
  } else {
    contenedor.innerHTML = items
      .map(
        (item) => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item__img">
          ${item.imagen_url ? `<img src="${item.imagen_url}" alt="${item.nombre}">` : ""}
        </div>
        <div class="cart-item__info">
          <p class="cart-item__nombre">${item.nombre}</p>
          <p class="cart-item__precio">${formatoMoneda(item.precio)} c/u</p>
          <div class="cart-item__qty">
            <button data-accion="restar" aria-label="Quitar uno">−</button>
            <span>${item.cantidad}</span>
            <button data-accion="sumar" aria-label="Agregar uno">+</button>
          </div>
          <button class="cart-item__remove" data-accion="quitar">Quitar</button>
        </div>
      </div>
    `
      )
      .join("");
  }

  document.getElementById("cartSubtotal").textContent = formatoMoneda(Carrito.calcularSubtotal());
  document.getElementById("cartEnvio").textContent = formatoMoneda(Carrito.calcularEnvio());
  document.getElementById("cartTotal").textContent = formatoMoneda(Carrito.calcularTotal());

  const btnCheckout = document.getElementById("goCheckout");
  if (btnCheckout) btnCheckout.disabled = items.length === 0;
}

document.addEventListener("click", (e) => {
  const fila = e.target.closest(".cart-item");
  if (!fila) return;
  const id = fila.dataset.id;
  const items = Carrito.obtener();
  const item = items.find((i) => i.id === id);
  if (!item) return;

  if (e.target.dataset.accion === "sumar") {
    Carrito.actualizarCantidad(id, item.cantidad + 1);
    renderizarCarritoUI();
  }
  if (e.target.dataset.accion === "restar") {
    Carrito.actualizarCantidad(id, item.cantidad - 1);
    renderizarCarritoUI();
  }
  if (e.target.dataset.accion === "quitar") {
    Carrito.quitar(id);
    renderizarCarritoUI();
  }
});

// Apertura/cierre del panel lateral
document.addEventListener("DOMContentLoaded", () => {
  const cartBtn = document.getElementById("cartBtn");
  const closeCart = document.getElementById("closeCart");
  const overlay = document.getElementById("overlay");
  const cartPanel = document.getElementById("cartPanel");
  const goCheckout = document.getElementById("goCheckout");

  function abrirCarrito() {
    cartPanel.classList.add("cart-panel--abierto");
    overlay.classList.add("overlay--visible");
  }
  function cerrarCarrito() {
    cartPanel.classList.remove("cart-panel--abierto");
    overlay.classList.remove("overlay--visible");
  }

  if (cartBtn) cartBtn.addEventListener("click", abrirCarrito);
  if (closeCart) closeCart.addEventListener("click", cerrarCarrito);
  if (overlay) overlay.addEventListener("click", cerrarCarrito);
  if (goCheckout) goCheckout.addEventListener("click", () => (window.location.href = "checkout.html"));

  renderizarCarritoUI();
});
