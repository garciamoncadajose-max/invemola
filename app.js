// CORRECCIÓN FINAL DE LA URL (Se eliminó "/rest/v1/")
const SUPABASE_URL = "https://pejeyknmlfimglapyvxw.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlamV5a25tbGZpbWdsYXB5dnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NDU4NDAsImV4cCI6MjEwODMyMTg0MH0.DM-n-O5RMuelAFZyxQJsuB9LQSZHDyNkhKSqydZNujw";

// El resto de tu código de app.js sigue exactamente igual abajo...
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Arreglo local que se sincronizará con internet
let productos = [];
let rolActivo = null;

const usuariosValidos = {
    "encargada": "1234",
    "almacenista": "5555",
    "cocinero": "0000"
};

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

const totalProductosTxt = document.getElementById('total-productos');
const stockBajoTxt = document.getElementById('stock-bajo');
const porCaducarTxt = document.getElementById('por-caducar');

// Función para descargar los datos reales desde internet (Reemplaza a LocalStorage)
async function consultarDatosDeInternet() {
    const { data, error } = await supabase.from('productos').select('*');
    if (!error && data) {
        productos = data;
        actualizarInterfaz();
    }
}

// Control del Login
if (btnEntrar) {
    btnEntrar.addEventListener('click', function() {
        const rolSeleccionado = document.getElementById('select-rol').value;
        const pinIngresado = document.getElementById('pin-acceso').value;

        if (usuariosValidos[rolSeleccionado] === pinIngresado) {
            rolActivo = rolSeleccionado;
            pantallaLogin.style.display = 'none';
            appPrincipal.style.display = 'block';
            document.getElementById('pin-acceso').value = "";
            
            configurarPermisosPorRol();
            consultarDatosDeInternet(); // Descarga los datos frescos de la nube al entrar
        } else {
            alert("❌ PIN de seguridad incorrecto.");
        }
    });
}

// Guardar producto nuevo en la nube (Almacenista / Encargada)
if (formulario) {
    formulario.addEventListener('submit', async function(e) {
        e.preventDefault();

        const nuevoProd = {
            nombre: document.getElementById('nombre').value,
            cantidad: parseFloat(document.getElementById('cantidad').value),
            unidad: document.getElementById('unidad').value,
            categoria: document.getElementById('categoria').value,
            stockMinimo: parseFloat(document.getElementById('stock-minimo').value),
            caducidad: document.getElementById('caducidad').value
        };

        // Inserta el producto en la base de datos de internet
        const { error } = await supabase.from('productos').insert([nuevoProd]);
        if (!error) {
            formulario.reset();
            document.getElementById('stock-minimo').value = "1";
            consultarDatosDeInternet(); // Refresca la pantalla
        }
    });
}

// Operaciones en la nube mediante los botones del teléfono
async function sumarStock(id) {
    const producto = productos.find(p => p.id === id);
    if (producto) {
        const cantidadASumar = parseFloat(prompt(`¿Cuánto vas a añadir al stock de ${producto.nombre}?`));
        if (!isNaN(cantidadASumar) && cantidadASumar > 0) {
            const nuevaCantidad = parseFloat((producto.cantidad + cantidadASumar).toFixed(2));
            
            // Actualiza la nube
            await supabase.from('productos').update({ cantidad: nuevaCantidad }).eq('id', id);
            consultarDatosDeInternet();
        }
    }
}

async function restarStock(id) {
    const producto = productos.find(p => p.id === id);
    if (producto) {
        const cantidadARestar = parseFloat(prompt(`¿Cuánto vas a sacar de ${producto.nombre}?`));
        if (!isNaN(cantidadARestar) && cantidadARestar > 0) {
            if (producto.cantidad >= cantidadARestar) {
                const nuevaCantidad = parseFloat((producto.cantidad - cantidadARestar).toFixed(2));
                
                // Actualiza la nube
                await supabase.from('productos').update({ cantidad: nuevaCantidad }).eq('id', id);
                consultarDatosDeInternet();
            } else {
                alert("No hay suficiente stock en el local.");
            }
        }
    }
}

async function eliminarProducto(id) {
    if (confirm("¿Eliminar este artículo permanentemente de la nube?")) {
        await supabase.from('productos').delete().eq('id', id);
        consultarDatosDeInternet();
    }
}

// Configuración de visualización por roles
function configurarPermisosPorRol() {
    const seccionFormulario = document.querySelector('.formulario');
    const seccionResumen = document.querySelector('.resumen');
    const botonExcel = document.getElementById('btn-exportar');

    if (rolActivo === 'cocinero') {
        if (seccionFormulario) seccionFormulario.style.display = 'none';
        if (seccionResumen) seccionResumen.style.display = 'none';
        if (botonExcel) botonExcel.style.display = 'none';
    } else if (rolActivo === 'almacenista') {
        if (seccionFormulario) seccionFormulario.style.display = 'block';
        if (seccionResumen) seccionResumen.style.display = 'none';
        if (botonExcel) botonExcel.style.display = 'none';
    } else if (rolActivo === 'encargada') {
        if (seccionFormulario) seccionFormulario.style.display = 'block';
        if (seccionResumen) seccionResumen.style.display = 'block';
        if (botonExcel) botonExcel.style.display = 'block';
    }
}

// Renderizado de la lista
function actualizarInterfaz() {
    if (!listaProductos) return;
    listaProductos.innerHTML = '';

    if (productos.length === 0) {
        mensajeVacio.style.display = 'block';
        btnExportar.style.display = 'none';
        return;
    } else {
        mensajeVacio.style.display = 'none';
    }

    const terminoBusqueda = buscador ? buscador.value.toLowerCase() : "";
    const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(terminoBusqueda));

    const hoy = new Date();
    filtrados.forEach(prod => {
        const li = document.createElement('li');
        li.className = `producto-item cat-${prod.categoria || 'otros'}`;

        const esBajo = prod.cantidad <= prod.stockMinimo;

        let botonesHtml = "";
        if (rolActivo === 'encargada') {
            botonesHtml = `
                <button onclick="sumarStock(${prod.id})" style="background:#2ecc71; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">➕</button>
                <button onclick="restarStock(${prod.id})" style="background:#f39c12; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">➖</button>
                <button onclick="eliminarProducto(${prod.id})" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">🗑️</button>
            `;
        } else if (rolActivo === 'almacenista') {
            botonesHtml = `<button onclick="sumarStock(${prod.id})" style="background:#2ecc71; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">➕ Recibir</button>`;
        } else if (rolActivo === 'cocinero') {
            botonesHtml = `<button onclick="restarStock(${prod.id})" style="background:#f39c12; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">➖ Sacar</button>`;
        }

        li.innerHTML = `
            <div class="producto-info">
                <h4>${prod.nombre}</h4>
                <p style="font-size:0.8rem; color:#888; text-transform: uppercase; margin:0;">🏷️ ${prod.categoria || 'otros'}</p>
            </div>
            <div class="producto-acciones">
                <span style="font-size: 1.1rem; font-weight:bold;">${prod.cantidad} ${prod.unidad}</span>
                <div class="grupo-botones" style="display:flex; gap:5px; margin-top:5px;">${botonesHtml}</div>
            </div>
        `;
        listaProductos.appendChild(li);
    });

    // Contadores del panel superior
    let totalBajoGlobal = productos.filter(p => p.cantidad <= p.stockMinimo).length;
    totalProductosTxt.textContent = productos.length;
    stockBajoTxt.textContent = totalBajoGlobal;
}
