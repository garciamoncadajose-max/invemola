/* global createClient */
const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlamV5a25tbGZpbWdsYXB5dnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NDU4NDAsImV4cCI6MjEwODMyMTg0MH0.DM-n-O5RMuelAFZyxQJsuB9LQSZHDyNkhKSqydZNujw";
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let productos = [], usuarioActivo = null, paginaActual = 1;
const productosPorPagina = 5;

const nominaEmpleados = {
    "1234": { nombre: "Gaby (Encargada)", rol: "encargada" },
    "8881": { nombre: "Cheo (Almacenista)", rol: "almacenista" },
    "2001": { nombre: "Yenni (Cocinero 1)", rol: "cocinero" },
    "2002": { nombre: "Jhon (Cocinero 2)", rol: "cocinero" },
    "2003": { nombre: "Desi (Cocinero 3)", rol: "cocinero" },
    "2004": { nombre: "Cris (Cocinero 4)", rol: "cocinero" },
    "2005": { nombre: "Yasm (Cocinero 5)", rol: "cocinero" }
};

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
    if (!supabase) return;
    const { data, error } = await supabase.from('productos').select('*');
    if (!error && data) { productos = data; actualizarInterfaz(); }
}

if (document.getElementById('btn-entrar')) {
    document.getElementById('btn-entrar').addEventListener('click', function() {
        const pin = document.getElementById('pin-acceso').value;
        if (nominaEmpleados[pin]) {
            usuarioActivo = nominaEmpleados[pin];
            document.getElementById('pantalla-login').style.display = 'none';
            document.getElementById('app-principal').style.display = 'block';
            document.getElementById('pin-acceso').value = "";
            const hP = document.querySelector('.encabezado p');
            if (hP) hP.textContent = `Operario: ${usuarioActivo.nombre} | Rol: ${usuarioActivo.rol.toUpperCase()}`;
            configurarPermisosPorRol();
            consultarDatosDeInternet();
        } else { alert("❌ PIN Inválido."); }
    });
}

if (document.getElementById('btn-cerrar-sesion')) {
    document.getElementById('btn-cerrar-sesion').addEventListener('click', function() {
        usuarioActivo = null;
        document.getElementById('app-principal').style.display = 'none';
        document.getElementById('pantalla-login').style.display = 'block';
    });
}

if (formulario) {
    formulario.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!supabase) return;
        const nuevoProd = {
            nombre: document.getElementById('nombre').value,
            cantidad: parseFloat(document.getElementById('cantidad').value),
            unidad: document.getElementById('unidad').value,
            categoria: document.getElementById('categoria').value,
            stockMinimo: parseFloat(document.getElementById('stock-minimo').value),
            caducidad: document.getElementById('caducidad').value,
            usuario: usuarioActivo ? usuarioActivo.nombre : "Desconocido"
        };
        const { error } = await supabase.from('productos').insert([nuevoProd]);
        if (!error) { formulario.reset(); document.getElementById('stock-minimo').value = "1"; consultarDatosDeInternet(); }
    });
}

async function sumarStock(id, txt = "añadir") {
    if (!supabase) return;
    const p = productos.find(x => x.id === id);
    if (p) {
        const cant = parseFloat(prompt(`¿Cuánto vas a ${txt} de ${p.nombre}?`));
        if (!isNaN(cant) && cant > 0) {
            await supabase.from('productos').update({ cantidad: parseFloat((p.cantidad + cant).toFixed(2)) }).eq('id', id);
            consultarDatosDeInternet();
        }
    }
}

async function restarStock(id, txt = "sacar") {
    if (!supabase) return;
    const p = productos.find(x => x.id === id);
    if (p) {
        const cant = parseFloat(prompt(`¿Cuánto vas a ${txt} de ${p.nombre}?`));
        if (!isNaN(cant) && cant > 0 && p.cantidad >= cant) {
            await supabase.from('productos').update({ cantidad: parseFloat((p.cantidad - cant).toFixed(2)) }).eq('id', id);
            consultarDatosDeInternet();
        } else if (p.cantidad < cant) { alert("Error: Cantidad insuficiente."); }
    }
}

async function eliminarProducto(id) {
    if (!supabase) return;
    if (confirm("¿Eliminar artículo?")) { await supabase.from('productos').delete().eq('id', id); consultarDatosDeInternet(); }
}

if (buscador) buscador.addEventListener('input', () => { paginaActual = 1; actualizarInterfaz(); });
if (btnAnterior) btnAnterior.addEventListener('click', () => { if (paginaActual > 1) { paginaActual--; actualizarInterfaz(); } });

if (btnExportar) btnExportar.addEventListener('click', () => {
    if (productos.length === 0) return;
    const dEx = productos.map(x => ({ "Nombre": x.nombre, "Categoría": (x.categoria || "").toUpperCase(), "Cantidad": x.cantidad, "Unidad": x.unidad }));
    const hoja = XLSX.utils.json_to_sheet(dEx); const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Inventario"); XLSX.writeFile(libro, `Inventario_Molarepa.xlsx`);
});

function configurarPermisosPorRol() {
    if (!usuarioActivo) return;
    const sF = document.querySelector('.formulario'), sR = document.querySelector('.resumen');
    if (usuarioActivo.rol === 'encargada') {
        if (sF) sF.style.display = 'block'; if (sR) sR.style.display = 'block'; if (btnExportar) btnExportar.style.display = 'block';
    } else {
        if (sF) sF.style.display = 'none'; if (sR) sR.style.display = 'none'; if (btnExportar) btnExportar.style.display = 'none';
    }
}

function actualizarInterfaz() {
    if (!listaProductos) return; listaProductos.innerHTML = '';
    let cAl = document.getElementById('panel-alarmas');
    if (!cAl) {
        cAl = document.createElement('div'); cAl.id = 'panel-alarmas'; cAl.style.marginTop = '1rem';
        const sR = document.querySelector('.resumen'); if (sR) sR.appendChild(cAl);
    }
    cAl.innerHTML = '';

    if (productos.length === 0) {
        mensajeVacio.style.display = 'block'; if (btnExportar) btnExportar.style.display = 'none';
        if (buscador) buscador.style.display = 'none'; if (controlesPaginacion) controlesPaginacion.style.display = 'none';
        totalProductosTxt.textContent = "0"; stockBajoTxt.textContent = "0"; porCaducarTxt.textContent = "0"; return;
    } else {
        mensajeVacio.style.display = 'none'; if (buscador) buscador.style.display = 'block';
        if (controlesPaginacion) controlesPaginacion.style.display = 'flex';
    }

    const term = buscador ? buscador.value.toLowerCase() : "";
    const fil = productos.filter(x => x.nombre.toLowerCase().includes(term));
    const totPag = Math.ceil(fil.length / productosPorPagina) || 1;
    if (paginaActual > totPag) paginaActual = totPag;

    const idx = (paginaActual - 1) * productosPorPagina;
    const vis = fil.slice(idx, idx + productosPorPagina);

    if (infoPagina) infoPagina.textContent = `Página ${paginaActual} de ${totPag}`;
    if (btnAnterior) btnAnterior.disabled = (paginaActual === 1);

    const clonSig = btnSiguiente.cloneNode(true); btnSiguiente.parentNode.replaceChild(clonSig, btnSiguiente);
    clonSig.disabled = (paginaActual === totPag);
    clonSig.addEventListener('click', () => { if (paginaActual < totPag) { paginaActual++; actualizarInterfaz(); } });

    const hoy = new Date(); let msgAl = "";
    const uRol = usuarioActivo ? usuarioActivo.rol : "";

    vis.forEach(p => {
        const li = document.createElement('li'); li.className = `producto-item cat-${p.categoria || 'otros'}`;
        const esB = p.cantidad <= p.stockMinimo;
        let esC = false, infoC = 'No registra';
        if (p.caducidad) {
            const dD = Math.ceil((new Date(p.caducidad) - hoy) / (1000 * 60 * 60 * 24));
            infoC = p.caducidad; if (dD <= 3) esC = true;
        }

        let btnH = "";
        if (uRol === 'encargada') {
            btnH = `<button onclick="sumarStock(${p.id})" style="background:#2ecc71; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">➕</button>
                    <button onclick="restarStock(${p.id})" style="background:#f39c12; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">➖</button>
                    <button onclick="eliminarProducto(${p.id})" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">🗑️</button>`;
        } else if (uRol === 'almacenista') {
            btnH = `<button onclick="sumarStock(${p.id}, 'recibir como Entrada')" style="background:#2ecc71; color:white; border:none; padding:6px 10px; border-radius:3px; cursor:pointer; font-weight:bold; margin-right:5px;">📥 Recibir</button>
                    <button onclick="restarStock(${p.id}, 'descontar del Almacén')" style="background:#e74c3c; color:white; border:none; padding:6px 10px; border-radius:3px; cursor:pointer; font-weight:bold;">📤 Sacar</button>`;
        } else if (uRol === 'cocinero') {
