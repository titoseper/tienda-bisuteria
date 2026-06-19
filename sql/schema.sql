-- ============================================================
-- ESQUEMA DE BASE DE DATOS - TIENDA DE BISUTERÍA
-- Ejecutar esto en: Supabase > SQL Editor > New Query
-- ============================================================

-- 1. TABLA DE CATEGORÍAS
create table categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  creado_en timestamptz default now()
);

-- 2. TABLA DE PRODUCTOS
create table productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio numeric(10,2) not null check (precio >= 0),
  stock integer not null default 0 check (stock >= 0),
  categoria_id uuid references categorias(id) on delete set null,
  imagen_url text,
  activo boolean default true,
  creado_en timestamptz default now()
);

-- 3. TABLA DE PEDIDOS
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  codigo_pedido text not null unique,          -- ej: PED-0001
  cliente_nombre text not null,
  cliente_email text not null,
  cliente_telefono text not null,
  cliente_direccion text not null,
  cliente_ciudad text not null,
  metodo_pago text not null check (
    metodo_pago in ('paypal','transferencia','contra_reembolso','tarjeta')
  ),
  banco text,                                   -- solo si metodo_pago = transferencia
  estado text not null default 'pendiente' check (
    estado in ('pendiente','pago_verificado','en_preparacion','enviado','entregado','cancelado')
  ),
  subtotal numeric(10,2) not null,
  envio numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  comprobante_url text,                         -- URL del comprobante subido (Supabase Storage)
  notas text,
  creado_en timestamptz default now(),
  actualizado_en timestamptz default now()
);

-- 4. DETALLE DE CADA PEDIDO (items del carrito)
create table pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  producto_id uuid references productos(id),
  nombre_producto text not null,                -- copia del nombre al momento de comprar
  precio_unitario numeric(10,2) not null,
  cantidad integer not null check (cantidad > 0),
  subtotal numeric(10,2) not null
);

-- ============================================================
-- FUNCIÓN: generar código de pedido automático (PED-0001, PED-0002...)
-- ============================================================
create sequence pedido_codigo_seq start 1;

create or replace function generar_codigo_pedido()
returns trigger as $$
begin
  new.codigo_pedido := 'PED-' || lpad(nextval('pedido_codigo_seq')::text, 5, '0');
  return new;
end;
$$ language plpgsql;

create trigger trigger_codigo_pedido
before insert on pedidos
for each row
when (new.codigo_pedido is null)
execute function generar_codigo_pedido();

-- ============================================================
-- SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table productos enable row level security;
alter table categorias enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;

-- Cualquiera (clientes anónimos) puede VER productos activos y categorías
create policy "Productos visibles a todos"
  on productos for select
  using (activo = true);

create policy "Categorias visibles a todos"
  on categorias for select
  using (true);

-- Cualquiera puede CREAR un pedido (es el checkout público)
create policy "Cualquiera puede crear pedidos"
  on pedidos for insert
  with check (true);

create policy "Cualquiera puede crear items de pedido"
  on pedido_items for insert
  with check (true);

-- Solo usuarios AUTENTICADOS (tú, el admin) pueden ver/editar pedidos
create policy "Admin puede ver pedidos"
  on pedidos for select
  using (auth.role() = 'authenticated');

create policy "Admin puede actualizar pedidos"
  on pedidos for update
  using (auth.role() = 'authenticated');

create policy "Admin puede ver items"
  on pedido_items for select
  using (auth.role() = 'authenticated');

-- Solo admin puede crear/editar/borrar productos
create policy "Admin puede insertar productos"
  on productos for insert
  with check (auth.role() = 'authenticated');

create policy "Admin puede actualizar productos"
  on productos for update
  using (auth.role() = 'authenticated');

create policy "Admin puede borrar productos"
  on productos for delete
  using (auth.role() = 'authenticated');

create policy "Admin puede insertar categorias"
  on categorias for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- DATOS DE EJEMPLO (puedes borrar esto después)
-- ============================================================
insert into categorias (nombre, slug) values
  ('Aretes', 'aretes'),
  ('Collares', 'collares'),
  ('Pulseras', 'pulseras'),
  ('Anillos', 'anillos');

insert into productos (nombre, descripcion, precio, stock, categoria_id, imagen_url)
select 'Aretes de perla', 'Aretes elegantes con perla sintética', 8.50, 15, id, null
from categorias where slug = 'aretes';

insert into productos (nombre, descripcion, precio, stock, categoria_id, imagen_url)
select 'Collar dorado fino', 'Collar bañado en oro 18k, ajustable', 12.99, 10, id, null
from categorias where slug = 'collares';
