// ============================================================
// LÓGICA DE GESTIÓN DE PRODUCTOS (ADMIN)
// ============================================================

let CATEGORIAS_DISPONIBLES = [];
let PRODUCTOS_ADMIN = [];
let nuevaImagenArchivo = null;

async function verificarSesion() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

async function cargarCategoriasAdmin() {
  const { data, error } = await supabaseClient.from("categorias").select("*").order("nombre");
  if (error) return;
  CATEGORIAS_DISPONIBLES = data;

  const select = document.getElementById("pCategoria");
  select.innerHTML = data.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join("");
}

async function cargarProductosAdmin() {
  const { data, error } = await supabaseClient
    .from("productos")
    .select("*, categorias(nombre)")
    .order("creado_en", { ascending: false });

  const lista = document.getElementById("listaProductosAdmin");

  if (error) {
    lista.innerHTML = `<p class="estado-vacio">Error: ${error.message}</p>`;
    return;
  }

  PRODUCTOS_ADMIN = data;
  renderizarProductosAdmin();
}

function renderizarProductosAdmin() {
  const lista = document.getElementById("listaProductosAdmin");

  if (PRODUCTOS_ADMIN.length === 0) {
    lista.innerHTML = `<p class="estado-vacio">Aún no has agregado productos.</p>`;
    return;
  }

  lista.innerHTML = PRODUCTOS_ADMIN.map(
    (p) => `
    <div class="producto-admin-row">
      <div class="producto-admin-row__img">${p.imagen_url ? `<img src="${p.imagen_url}" alt="">` : ""}</div>
      <div class="producto-admin-row__info">
        <strong>${p.nombre}</strong> ${!p.activo ? '<span class="estado-badge estado-cancelado">Oculto</span>' : ""}
        <p>${p.categorias ? p.categorias.nombre : "Sin categoría"} · $${Number(p.precio).toFixed(2)} · Stock: ${p.stock}</p>
      </div>
      <div class="producto-admin-row__acciones">
        <button data-accion="editar" data-id="${p.id}">Editar</button>
        <button data-accion="eliminar" data-id="${p.id}">Eliminar</button>
      </div>
    </div>
  `
  ).join("");
}

function abrirModalProducto(producto = null) {
  nuevaImagenArchivo = null;
  document.getElementById("formProducto").reset();
  document.getElementById("avisoProducto").textContent = "";

  if (producto) {
    document.getElementById("modalProductoTitulo").textContent = "Editar producto";
    document.getElementById("productoId").value = producto.id;
    document.getElementById("pNombre").value = producto.nombre;
    document.getElementById("pDescripcion").value = producto.descripcion || "";
    document.getElementById("pPrecio").value = producto.precio;
    document.getElementById("pStock").value = producto.stock;
    document.getElementById("pCategoria").value = producto.categoria_id || "";
    document.getElementById("pActivo").checked = producto.activo;
    document.getElementById("pImagenActual").textContent = producto.imagen_url ? "Ya tiene una imagen cargada." : "";
  } else {
    document.getElementById("modalProductoTitulo").textContent = "Nuevo producto";
    document.getElementById("productoId").value = "";
    document.getElementById("pImagenActual").textContent = "";
  }

  document.getElementById("overlayModal").classList.add("overlay--visible");
  document.getElementById("modalProducto").classList.add("modal-pedido--abierto");
}

function cerrarModalProducto() {
  document.getElementById("overlayModal").classList.remove("overlay--visible");
  document.getElementById("modalProducto").classList.remove("modal-pedido--abierto");
}

async function guardarProducto(e) {
  e.preventDefault();
  const aviso = document.getElementById("avisoProducto");
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = "Guardando…";

  try {
    const id = document.getElementById("productoId").value;
    let imagenUrl = null;

    if (nuevaImagenArchivo) {
      const nombreArchivo = `${Date.now()}_${nuevaImagenArchivo.name}`;
      const { error: errorSubida } = await supabaseClient.storage
        .from("productos")
        .upload(nombreArchivo, nuevaImagenArchivo);
      if (errorSubida) throw new Error("No se pudo subir la imagen: " + errorSubida.message);

      const { data: urlPublica } = supabaseClient.storage.from("productos").getPublicUrl(nombreArchivo);
      imagenUrl = urlPublica.publicUrl;
    }

    const datosProducto = {
      nombre: document.getElementById("pNombre").value.trim(),
      descripcion: document.getElementById("pDescripcion").value.trim(),
      precio: parseFloat(document.getElementById("pPrecio").value),
      stock: parseInt(document.getElementById("pStock").value, 10),
      categoria_id: document.getElementById("pCategoria").value,
      activo: document.getElementById("pActivo").checked,
    };
    if (imagenUrl) datosProducto.imagen_url = imagenUrl;

    let error;
    if (id) {
      ({ error } = await supabaseClient.from("productos").update(datosProducto).eq("id", id));
    } else {
      ({ error } = await supabaseClient.from("productos").insert(datosProducto));
    }

    if (error) throw new Error(error.message);

    cerrarModalProducto();
    cargarProductosAdmin();
  } catch (err) {
    aviso.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar producto";
  }
}

async function eliminarProducto(id) {
  if (!confirm("¿Seguro que quieres eliminar este producto? Esta acción no se puede deshacer.")) return;

  const { error } = await supabaseClient.from("productos").delete().eq("id", id);
  if (error) {
    alert("No se pudo eliminar: " + error.message);
    return;
  }
  cargarProductosAdmin();
}

// ============================================================
// EVENTOS
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const ok = await verificarSesion();
  if (!ok) return;

  await cargarCategoriasAdmin();
  cargarProductosAdmin();

  document.getElementById("btnLogout").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
  });

  document.getElementById("btnNuevoProducto").addEventListener("click", () => abrirModalProducto());
  document.getElementById("cerrarModalProducto").addEventListener("click", cerrarModalProducto);
  document.getElementById("overlayModal").addEventListener("click", cerrarModalProducto);

  document.getElementById("pImagen").addEventListener("change", (e) => {
    nuevaImagenArchivo = e.target.files[0] || null;
  });

  document.getElementById("formProducto").addEventListener("submit", guardarProducto);

  document.getElementById("listaProductosAdmin").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-accion]");
    if (!btn) return;
    const producto = PRODUCTOS_ADMIN.find((p) => p.id === btn.dataset.id);

    if (btn.dataset.accion === "editar") abrirModalProducto(producto);
    if (btn.dataset.accion === "eliminar") eliminarProducto(btn.dataset.id);
  });
});
