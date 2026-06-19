// ============================================================
// CONFIGURACIÓN GENERAL DEL PROYECTO
// ============================================================
// IMPORTANTE: Reemplaza estos valores con los de TU proyecto de Supabase.
// Los encuentras en: Supabase Dashboard > Project Settings > API
//
// SUPABASE_URL   -> "Project URL"
// SUPABASE_ANON_KEY -> "anon public" key (esta SÍ es segura de exponer en el frontend)
//
// NUNCA pongas aquí la "service_role key" - esa es secreta y NO va en el frontend.
// ============================================================

const SUPABASE_URL = "https://qrvwbpmnbieemnuhcspe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydndicG1uYmllZW1udWhjc3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzMyMTMsImV4cCI6MjA5NzQwOTIxM30.ktw0Y37Jk8IQzxZPOMwlXWNV-NgyaGizMzmzrDgvuas";

// Cliente de Supabase (se usa en todas las páginas)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// DATOS DEL NEGOCIO - personaliza esto
// ============================================================
const NEGOCIO = {
  nombre: "Bisutería Fanny Solórzano", // cambia por el nombre real de tu tienda
  whatsapp: "+593 99 695 7447", // tu número con código de país, sin + ni espacios
  email: "Fanny@hotmail.com",
  costoEnvioFijo: 3.00, // costo de envío estándar
  envioGratisDesde: 50.00, // pedidos sobre este monto, envío gratis

  // PayPal: tu email de PayPal (Business) o Client ID si usas el SDK de botones
  paypalClientId: "TU-PAYPAL-CLIENT-ID",

  // Cuentas bancarias para transferencia (Ecuador)
  cuentasBancarias: [
    {
      banco: "Banco Pichincha",
      tipo: "Cuenta de Ahorros",
      numero: "0000000000",
      titular: "Fanny Solórzano",
      cedulaRuc: "0000000000",
    },
    {
      banco: "Banco de Guayaquil",
      tipo: "Cuenta de Ahorros",
      numero: "0000000000",
      titular: "Fanny Solórzano",
      cedulaRuc: "0000000000",
    },
    {
      banco: "Banco Bolivariano",
      tipo: "Cuenta de Ahorros",
      numero: "0000000000",
      titular: "Fanny Solórzano",
      cedulaRuc: "0000000000",
    },
    {
      banco: "Banco del Pacífico",
      tipo: "Cuenta de Ahorros",
      numero: "0000000000",
      titular: "Fanny Solórzano",
      cedulaRuc: "0000000000",
    },
    {
      banco: "Banco Internacional",
      tipo: "Cuenta de Ahorros",
      numero: "0000000000",
      titular: "Fanny Solórzano",
      cedulaRuc: "0000000000",
    },
    {
      banco: "Produbanco",
      tipo: "Cuenta de Ahorros",
      numero: "0000000000",
      titular: "Fanny Solórzano",
      cedulaRuc: "0000000000",
    },
  ],
};
