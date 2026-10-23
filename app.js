/* global createClient */
const SUPABASE_URL = "https://pejeyknmlfimglapyvxw.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlamV5a25tbGZpbWdsYXB5dnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NDU4NDAsImV4cCI6MjEwODMyMTg0MH0.DM-n-O5RMuelAFZyxQJsuB9LQSZHDyNkhKSqydZNujw";
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
let productos = [], usuarioActivo = null, paginaActual = 1; const pPorPag = 5;

const nominaEmpleados = {
    "1234": { nombre: "María (Encargada)", rol: "encargada" },
    "8881": { nombre: "Carlos (Almacenista)", rol: "almacenista" },
    "2001": { nombre: "Juan (Cocinero 1)", rol: "cocinero" },
    "2002": { nombre: "Pedro (Cocinero 2)", rol: "cocinero" },
    "2003": { nombre: "Luis (Cocinero 3)", rol: "cocinero" },
    "2004": { nombre: "Andrés (Cocinero 4)", rol: "cocinero" },
    "2005": { nombre: "José (Cocinero 5)", rol: "cocinero" }
};

const fProd = document.getElementById('formulario-producto');
const lProd = document.getElementById('lista-productos');
const buscador = document.getElementById('buscador');
const totalProductosTxt = document.getElementById('total-productos');
const stockBajoTxt = document.getElementById('stock-bajo');
const porCaducarTxt = document.getElementById('por-caducar');

async function consultarDatosDeInternet() {
    if (!supabase) return;
    const { data, error } = await supabase.from('productos').select('*');
    if (!error && data) { productos = data; actualizarInterfaz(); }
}

const botonIngresar = document.getElementById('btn-entrar');
if (botonIngresar) {
    botonIngresar.onclick = function() {
        const pin = document.getElementById('pin-acceso').value;
        if (nominaEmpleados[pin]) {
            usuarioActivo = nominaEmpleados[pin];
            document.getElementById('pantalla-login').style.display = 'none';
            document.getElementById('app-principal').style.display = 'block';
            document.getElementById('pin-acceso').value = "";
            const hP = document.querySelector('.encabezado p');
            if (hP) hP.textContent = `Operario: ${usuarioActivo.nombre} | Rol: ${usuarioActivo.rol.toUpperCase()}`;
            configurarPermisosPorRol(); consultarDatosDeInternet();
        } else { alert("❌ PIN Inválido."); }
    };
}

if (document.getElementById('btn-cerrar-sesion')) {
    document.getElementById('btn-cerrar-sesion').addEventListener('click', function() {
        usuarioActivo = null; document.getElementById('app-principal').style.display = 'none'; document.getElementById('pantalla-login').style.display = 'block';
    });
}

if (lProd) {
    lProd.addEventListener('click', async function(e) {
        const b = e.target.closest('button'); if (!b) return;
        const id = parseInt(b.dataset.id), op = b.dataset.operacion, p = productos.find(x => x.id === id); if (!p) return;
        const act = parseFloat(p.cantidad) || 0;
        if (op === 'sumar') {
            const c = parseFloat(prompt(`¿Cuánto vas a añadir de ${p.nombre}?`));
            if (!isNaN(c) && c > 0) { await supabase.from('productos').update({ cantidad: parseFloat((act + c).toFixed(2)) }).eq('id', id); consultarDatosDeInternet(); }
        } else if (op === 'restar') {
            const c = parseFloat(prompt(`¿Cuánto vas a descontar de ${p.nombre}?`));
            if (!isNaN(c) && c > 0 && act >= c) { await supabase.from('productos').update({ cantidad: parseFloat((act - c).toFixed(2)) }).eq('id', id); consultarDatosDeInternet(); }
            else if (act < c) alert("Cantidad insuficiente.");
        } else if (op === 'eliminar' && confirm("¿Eliminar artículo?")) {
            await supabase.from('productos').delete().eq('id', id); consultarDatosDeInternet();
        }
    });
}

if (fProd) {
    fProd.addEventListener('submit', async function(e) {
        e.preventDefault(); if (!supabase) return;
        const nuevo = {
            nombre: document.getElementById('nombre').value, cantidad: parseFloat(document.getElementById('cantidad').value) || 0,
            unidad: document.getElementById('unidad').value, categoria: document.getElementById('categoria').value,
            stockMinimo: parseFloat(document.getElementById('stock-minimo').value) || 0, caducidad: document.getElementById('caducidad').value,
            usuario: usuarioActivo ? usuarioActivo.nombre : "Desconocido"
        };
        const { error } = await supabase.from('productos').insert([nuevo]);
        if (!error) { fProd.reset(); document.getElementById('stock-minimo').value = "1"; consultarDatosDeInternet(); }
    });
}

if (buscador) buscador.addEventListener('input', () => { paginaActual = 1; actualizarInterfaz(); });
if (document.getElementById('btn-anterior')) document.getElementById('btn-anterior').addEventListener('click', () => { if (paginaActual > 1) { paginaActual--; actualizarInterfaz(); } });

if (document.getElementById('btn-exportar')) {
    document.getElementById('btn-exportar').addEventListener('click', () => {
        if (productos.length === 0) return;
        const dEx = productos.map(x => ({ "Nombre": x.nombre, "Categoría": (x.categoria || "").toUpperCase(), "Cantidad": x.cantidad, "Unidad": x.unidad }));
        const hoja = XLSX.utils.json_to_sheet(dEx); const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Inventario"); XLSX.writeFile(libro, `Inventario_Molarepa.xlsx`);
    });
}

function configurarPermisosPorRol() {
    const sF = document.querySelector('.formulario'), sR = document.querySelector('.resumen'), bE = document.getElementById('btn-exportar');
    const esEnc = usuarioActivo.rol === 'encargada';
    if (sF) sF.style.display = esEnc ? 'block' : 'none'; if (sR) sR.style.display = esEnc ? 'block' : 'none'; if (bE) bE.style.display = esEnc ? 'block' : 'none';
}

function actualizarInterfaz() {
    if (!lProd) return; lProd.innerHTML = '';
    let cAl = document.getElementById('panel-alarmas');
    if (!cAl) {
        cAl = document.createElement('div'); cAl.id = 'panel-alarmas'; cAl.style.marginTop = '1rem';
        const sR = document.querySelector('.resumen'); if (sR) sR.appendChild(cAl);
    }
    cAl.innerHTML = '';

    const bE = document.getElementById('btn-exportar'), cPag = document.getElementById('controles-paginacion');
    if (productos.length === 0) {
        document.getElementById('mensaje-vacio').style.display = 'block'; if (bE) bE.style.display = 'none';
        if (buscador) buscador.style.display = 'none'; if (cPag) cPag.style.display = 'none';
        totalProductosTxt.textContent = "0"; stockBajoTxt.textContent = "0"; porCaducarTxt.textContent = "0"; return;
    } else {
        document.getElementById('mensaje-vacio').style.display = 'none'; if (buscador) buscador.style.display = 'block'; if (cPag) cPag.style.display = 'flex';
    }

    const term = buscador ? buscador.value.toLowerCase() : ""; const fil = productos.filter(x => x.nombre && x.nombre.toLowerCase().includes(term));
    const totPag = Math.ceil(fil.length / pPorPag) || 1; if (paginaActual > totPag) paginaActual = totPag;
    const idx = (paginaActual - 1) * pPorPag; const vis = fil.slice(idx, idx + pPorPag);

    const infoP = document.getElementById('info-pagina'), bAnt = document.getElementById('btn-anterior'), bSig = document.getElementById('btn-siguiente');
    if (infoP) infoP.textContent = `Página ${paginaActual} de ${totPag}`; if (bAnt) bAnt.disabled = (paginaActual === 1);

    const clonSig = bSig.cloneNode(true); bSig.parentNode.replaceChild(clonSig, bSig);
    clonSig.disabled = (paginaActual === totPag); clonSig.addEventListener('click', () => { if (paginaActual < totPag) { paginaActual++; actualizarInterfaz(); } });

    const hoy = new Date(); let msgAl = "", uRol = usuarioActivo ? usuarioActivo.rol : "";

    vis.forEach(p => {
        const li = document.createElement('li'); li.className = `producto-item cat-${p.categoria || 'otros'}`;
        const cantP = parseFloat(p.cantidad) || 0, minP = parseFloat(p.stockMinimo) || 0, esB = cantP <= minP;
        let esC = false, infoC = 'No registra';
        if (p.caducidad) { const dD = Math.ceil((new Date(p.caducidad) - hoy) / 86400000); infoC = p.caducidad; if (dD <= 3) esC = true; }

        let btnH = "";
        if (uRol === 'encargada') {
            btnH = `<button data-id="${p.id}" data-operacion="sumar" style="background:#2ecc71; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">➕</button>
                    <button data-id="${p.id}" data-operacion="restar" style="background:#f39c12; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">➖</button>
                    <button data-id="${p.id}" data-operacion="eliminar" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">🗑️</button>`;
        } else if (uRol === 'almacenista') {
            btnH = `<button data-id="${p.id}" data-operacion="sumar" style="background:#2ecc71; color:white; border:none; padding:6px 10px; border-radius:3px; cursor:pointer; font-weight:bold; margin-right:5px;">📥 Recibir</button>
                    <button data-id="${p.id}" data-operacion="restar" style="background:#e74c3c; color:white; border:none; padding:6px 10px; border-radius:3px; cursor:pointer; font-weight:bold;">📤 Sacar</button>`;
        } else if (uRol === 'cocinero') {
            btnH = `<button data-id="${p.id}" data-operacion="restar" style="background:#f39c12; color:white; border:none; padding:6px 10px; border-radius:3px; cursor:pointer; font-weight:bold; margin-right:5px;">🍳 Gastar</button>
                    <button data-id="${p.id}" data-operacion="sumar" style="background:#3498db; color:white; border:none; padding:6px 10px; border-radius:3px; cursor:pointer; font-weight:bold;">📦 Producir</button>`;
        }
