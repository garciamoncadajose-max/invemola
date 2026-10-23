// ==========================================================================
// CONFIGURACIÓN DE TU BASE DE DATOS EN LA NUBE (CONEXIÓN OFICIAL EN LÍNEA)
// ==========================================================================
const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlamV5a25tbGZpbWdsYXB5dnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NDU4NDAsImV4cCI6MjEwODMyMTg0MH0.DM-n-O5RMuelAFZyxQJsuB9LQSZHDyNkhKSqydZNujw";

// Inicializador blindado compatible con cualquier navegador móvil
let clienteSupabase = null;
if (typeof supabase !== 'undefined' && supabase.createClient) {
    clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else if (typeof createClient !== 'undefined') {
    clienteSupabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Arreglo global de datos
let productos = [];
let usuarioActivo = null;

// BASE DE DATOS DE LOS 7 EMPLEADOS CON PIN INDIVIDUAL
const nominaEmpleados = {
    "1234": { nombre: "María (Encargada)", rol: "encargada" },
    "8881": { nombre: "Carlos (Almacenista)", rol: "almacenista" },
    "2001": { nombre: "Juan (Cocinero 1)", rol: "cocinero" },
    "2002": { nombre: "Pedro (Cocinero 2)", rol: "cocinero" },
    "2003": { nombre: "Luis (Cocinero 3)", rol: "cocinero" },
    "2004": { nombre: "Andrés (Cocinero 4)", rol: "cocinero" },
    "2005": { nombre: "José (Cocinero 5)", rol: "cocinero" }
};

let paginaActual = 1;
const productosPorPagina = 5;

// Captura de elementos del DOM
const pantallaLogin = document.getElementById('pantalla-login');
const appPrincipal = document.getElementById('app-principal');
const btnEntrar = document.getElementById('btn-entrar');
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
const formulario = document.getElementById('formulario-producto');
const listaProductos = document.getElementById('lista-productos');
const mensajeVacio = document.getElementById('mensaje-vacio');
const btnExportar = document.getElementById('btn-exportar');
const buscador = document.getElementById('buscador');

const controlesPaginacion = document.getElementById('controles-paginacion');
const btnAnterior = document.getElementById('btn-anterior');
const btnSiguiente = document.getElementById('btn-siguiente');
const infoPagina = document.getElementById('info-pagina');

const totalProductosTxt = document.getElementById('total-productos');
const stockBajoTxt = document.getElementById('stock-bajo');
const porCaducarTxt = document.getElementById('por-caducar');

async function consultarDatosDeInternet() {
    if (!clienteSupabase) return;
    const { data, error } = await clienteSupabase.from('productos').select('*');
    if (!error && data) {
        productos = data;
        actualizarInterfaz();
    }
}

// CONTROL DE LOGIN CORREGIDO PARA PROCESAR EL PIN EN EL ACTO
if (btnEntrar) {
    btnEntrar.addEventListener('click', function() {
        const pinIngresado = document.getElementById('pin-acceso').value;

        if (nominaEmpleados[pinIngresado]) {
            usuarioActivo = nominaEmpleados[pinIngresado];
            
            pantallaLogin.style.display = 'none';
            appPrincipal.style.display = 'block';
            document.getElementById('pin-acceso').value = "";
            
            const parrafoEncabezado = document.querySelector('.encabezado p');
            if (parrafoEncabezado) {
                parrafoEncabezado.textContent = `Operario: ${usuarioActivo.nombre} | Rol: ${usuarioActivo.rol.toUpperCase()}`;
            }
            
            configurarPermisosPorRol();
            consultarDatosDeInternet();
        } else {
            alert("❌ PIN Inválido. No corresponde a ningún empleado registrado.");
        }
    });
}

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', function() {
        usuarioActivo = null;
        appPrincipal.style.display = 'none';
        pantallaLogin.style.display = 'block';
    });
}

if (formulario) {
    formulario.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!clienteSupabase) return;

        const nuevoProd = {
            nombre: document.getElementById('nombre').value,
            cantidad: parseFloat(document.getElementById('cantidad').value),
            unidad: document.getElementById('unidad').value,
            categoria: document.getElementById('categoria').value,
            stockMinimo: parseFloat(document.getElementById('stock-minimo').value),
            caducidad: document.getElementById('caducidad').value,
            usuario: usuarioActivo ? usuarioActivo.nombre : "Desconocido" // Guarda quién lo registró
        };

        const { error } = await clienteSupabase.from('productos').insert([nuevoProd]);
        if (!error) {
            formulario.reset();
            document.getElementById('stock-minimo').value = "1";
            consultarDatosDeInternet();
        }
    });
}

async function sumarStock(id, accionTexto = "añadir al stock") {
    if (!clienteSupabase) return;
    const producto = productos.find(p => p.id === id);
    if (producto) {
        const cantidadASumar = parseFloat(prompt(`¿Cuánto vas a ${accionTexto} de ${producto.nombre}?`));
        if (!isNaN(cantidadASumar) && cantidadASumar > 0) {
            const nuevaCantidad = parseFloat((producto.cantidad + cantidadASumar).toFixed(2));
            await clienteSupabase.from('productos').update({ cantidad: nuevaCantidad }).eq('id', id);
            consultarDatosDeInternet();
        }
    }
}

async function restarStock(id, accionTexto = "usar o sacar") {
    if (!clienteSupabase) return;
    const producto = productos.find(p => p.id === id);
    if (producto) {
        const cantidadARestar = parseFloat(prompt(`¿Cuánto vas a ${accionTexto} de ${producto.nombre}?`));
        if (!isNaN(cantidadARestar) && cantidadARestar > 0) {
            if (producto.cantidad >= cantidadARestar) {
                const nuevaCantidad = parseFloat((producto.cantidad - cantidadARestar).toFixed(2));
                await clienteSupabase.from('productos').update({ cantidad: nuevaCantidad }).eq('id', id);
                consultarDatosDeInternet();
            } else {
                alert("Error: No hay suficiente cantidad en el inventario.");
            }
        }
    }
}

async function eliminarProducto(id) {
    if (!clienteSupabase) return;
    if (confirm("¿Eliminar este artículo de la nube?")) {
        await clienteSupabase.from('productos').delete().eq('id', id);
        consultarDatosDeInternet();
    }
}

if (buscador) {
    buscador.addEventListener('input', function() {
        paginaActual = 1;
        actualizarInterfaz(); 
    });
}

if (btnAnterior) {
    btnAnterior.addEventListener('click', function() {
        if (paginaActual > 1) {
            paginaActual--;
            actualizarInterfaz();
        }
    });
}

function avanzarPagina(totalPaginas) {
    if (paginaActual < totalPaginas) {
        paginaActual++;
        actualizarInterfaz();
    }
}

if (btnExportar) {
    btnExportar.addEventListener('click', exportarAExcel);
}

function exportarAExcel() {
    if (productos.length === 0) return;
    const datosExcel = productos.map(p => ({
        "Nombre": p.nombre, "Categoría": (p.categoria || "").toUpperCase(), "Cantidad": p.cantidad, "Unidad": p.unidad, "Mínimo": p.stockMinimo, "Vence": p.caducidad || "No registra"
    }));
    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Inventario");
    XLSX.writeFile(libro, `Inventario_Molarepa.xlsx`);
}

function configurarPermisosPorRol() {
    const seccionFormulario = document.querySelector('.formulario');
    const seccionResumen = document.querySelector('.resumen');
    const botonExcel = document.getElementById('btn-exportar');

    if (usuarioActivo.rol === 'encargada') {
        if (seccionFormulario) seccionFormulario.style.display = 'block';
        if (seccionResumen) seccionResumen.style.display = 'block';
        if (botonExcel) botonExcel.style.display = 'block';
    } else {
        if (seccionFormulario) seccionFormulario.style.display = 'none';
        if (seccionResumen) seccionResumen.style.display = 'none';
        if (botonExcel) botonExcel.style.display = 'none';
    }
}

function actualizarInterfaz() {
    if (!listaProductos) return;
    listaProductos.innerHTML = '';

    let contenedorAlarmas = document.getElementById('panel-alarmas');
    if (!contenedorAlarmas) {
        contenedorAlarmas = document.createElement('div');
        contenedorAlarmas.id = 'panel-alarmas';
        contenedorAlarmas.style.marginTop = '1rem';
        const seccionResumen = document.querySelector('.resumen');
        if (seccionResumen) seccionResumen.appendChild(contenedorAlarmas);
    }
    contenedorAlarmas.innerHTML = ''; 

    if (productos.length === 0) {
        mensajeVacio.style.display = 'block';
        btnExportar.style.display = 'none';
        if (buscador) buscador.style.display = 'none';
        if (controlesPaginacion) controlesPaginacion.style.display = 'none';
        
        totalProductosTxt.textContent = "0";
        stockBajoTxt.textContent = "0";
        porCaducarTxt.textContent = "0";
        return;
    } else {
        mensajeVacio.style.display = 'none';
        if (buscador) buscador.style.display = 'block';
        if (controlesPaginacion) controlesPaginacion.style.display = 'flex';
    }

    const terminoBusqueda = buscador ? buscador.value.toLowerCase() : "";
    const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(terminoBusqueda));

    const totalPaginas = Math.ceil(filtrados.length / productosPorPagina) || 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const idxIni = (paginaActual - 1) * productosPorPagina;
