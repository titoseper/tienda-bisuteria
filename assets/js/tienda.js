// ============================================================
// LÓGICA DE LA TIENDA: cargar productos y categorías desde Supabase
// ============================================================

let TODOS_LOS_PRODUCTOS = [];
let CATEGORIA_ACTIVA = "todos";

async function cargarCategorias() {
  const { data, error } = await supabaseClient.from("categorias").select("*").order("nombre");
  if (error) {
    console.error("Error al cargar categorías:", error.message);
    return;
  }

  const contenedor = document.getElementById("filtros");
  data.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = cat.nombre;
    btn.dataset.filtro = cat.id;
    contenedor.appendChild(btn);
  });
}

async function cargarProductos() {
  const { data, error } = await supabaseClient
    .from("productos")
    .select("*, categorias(nombre)")
    .eq("activo", true)
    .order("creado_en", { ascending: false });

  const estadoCargando = document.getElementById("estadoCargando");

  if (error) {
    console.error("Error al cargar productos:", error.message);
    if (estadoCargando) estadoCargando.textContent = "No se pudieron cargar los productos. Intenta más tarde.";
    return;
  }

  TODOS_LOS_PRODUCTOS = data;
  if (estadoCargando) estadoCargando.remove();
  renderizarProductos();
}

function renderizarProductos() {
  const grid = document.getElementById("gridProductos");
  if (!grid) return;

  const productosFiltrados =
    CATEGORIA_ACTIVA === "todos"
      ? TODOS_LOS_PRODUCTOS
      : TODOS_LOS_PRODUCTOS.filter((p) => p.categoria_id === CATEGORIA_ACTIVA);

  if (productosFiltrados.length === 0) {
    grid.innerHTML = `<p class="estado-vacio">No hay productos en esta categoría todavía.</p>`;
    return;
  }

  grid.innerHTML = productosFiltrados
    .map((p) => {
      const sinStock = p.stock <= 0;
      return `
      <article class="producto-card">
        <div class="producto-card__img">
          ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${p.nombre}">` : "✦"}
        </div>
        <div class="producto-card__body">
          <span class="producto-card__cat">${p.categorias ? p.categorias.nombre : ""}</span>
          <h3 class="producto-card__nombre">${p.nombre}</h3>
          <p class="producto-card__desc">${p.descripcion || ""}</p>
          ${sinStock ? `<p class="producto-card__stock">Agotado por ahora</p>` : ""}
          <div class="producto-card__footer">
            <span class="producto-card__precio">${formatoMoneda(p.precio)}</span>
            <button
              class="producto-card__add"
              data-id="${p.id}"
              ${sinStock ? "disabled" : ""}
              aria-label="Agregar ${p.nombre} al carrito"
            >+</button>
          </div>
        </div>
      </article>
    `;
    })
    .join("");
}

document.addEventListener("click", (e) => {
  // Filtro de categoría
  const chip = e.target.closest(".chip");
  if (chip) {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("chip--activo"));
    chip.classList.add("chip--activo");
    CATEGORIA_ACTIVA = chip.dataset.filtro;
    renderizarProductos();
    return;
  }

  // Agregar al carrito
  const btnAdd = e.target.closest(".producto-card__add");
  if (btnAdd && !btnAdd.disabled) {
    const producto = TODOS_LOS_PRODUCTOS.find((p) => p.id === btnAdd.dataset.id);
    if (producto) {
      Carrito.agregar(producto, 1);
      renderizarCarritoUI();

      // pequeña confirmación visual
      const original = btnAdd.textContent;
      btnAdd.textContent = "✓";
      setTimeout(() => (btnAdd.textContent = original), 700);
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Datos de contacto en el footer, desde config.js
  const wa = document.getElementById("footerWhatsapp");
  const em = document.getElementById("footerEmail");
  if (wa) wa.textContent = "WhatsApp: +" + NEGOCIO.whatsapp;
  if (em) em.textContent = "Email: " + NEGOCIO.email;

  cargarCategorias();
  cargarProductos();
});
