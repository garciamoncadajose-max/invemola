// 1. Base de Datos de Usuarios y PINs Permitidos
const USUARIOS = {
    "1111": "Gaby",
    "2222": "Juaco",
    "3333": "Yenni",
    "4444": "Cheo",
    "5555": "Jhon",
    "6666": "Desire"
};

let usuarioActivo = "";
let productos = [];

try {
    productos = JSON.parse(localStorage.getItem('inventario_restaurante')) || [];
} catch (e) {
    console.error("Error cargando inventario", e);
    productos = [];
}

// 2. Funciones de Control de Mercancía Libres de Contexto Interno
window.sumarStock = function(id) {
    const prod = productos.find(function(p) { return p.id === id; });
    if (prod) {
        const val = parseFloat(prompt(`¿Cuánta mercancía vas a INGRESAR de ${prod.nombre}?`));
        if (!isNaN(val) && val > 0) {
            prod.cantidad = parseFloat((prod.cantidad + val).toFixed(2));
            const nuevaFecha = prompt(`¿Deseas actualizar la fecha de vencimiento? (AAAA-MM-DD)`, prod.caducidad);
            if (nuevaFecha !== null) prod.caducidad = nuevaFecha;
            
            localStorage.setItem('inventario_restaurante', JSON.stringify(productos));
            if (window.actualizarPantalla) window.actualizarPantalla();
        }
    }
};

window.restarStock = function(id) {
    const prod = productos.find(function(p) { return p.id === id; });
    if (prod) {
        const val = parseFloat(prompt(`¿Cuánto vas a RETIRAR/SACAR de ${prod.nombre}?`));
        if (!isNaN(val) && val > 0) {
            if (prod.cantidad >= val) {
                prod.cantidad = parseFloat((prod.cantidad - val).toFixed(2));
                
                localStorage.setItem('inventario_restaurante', JSON.stringify(productos));
                if (window.actualizarPantalla) window.actualizarPantalla();
            } else {
                alert(`¡Error! Existencias insuficientes.`);
            }
        }
    }
};

window.eliminarProducto = function(id) {
    if (confirm("¿Borrar permanentemente este ítem del inventario?")) {
        productos = productos.filter(function(p) { return p.id !== id; });
        localStorage.setItem('inventario_restaurante', JSON.stringify(productos));
        if (window.actualizarPantalla) window.actualizarPantalla();
    }
};

// 3. Orquestador de Eventos de la Interfaz
document.addEventListener('DOMContentLoaded', function() {
    const pantallaLogin = document.getElementById('pantalla-login');
    const contenidoApp = document.getElementById('contenido-app');
    const pinEntrada = document.getElementById('pin-entrada');
    const btnLogin = document.getElementById('btn-login');
    const errorLogin = document.getElementById('error-login');
    const nombreUsuarioActivo = document.getElementById('nombre-usuario-activo');
    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    const formulario = document.getElementById('formulario-producto');
    const listaProductos = document.getElementById('lista-productos');
    const mensajeVacio = document.getElementById('mensaje-vacio');
    const btnExportar = document.getElementById('btn-exportar');
    const buscador = document.getElementById('buscador');

    const totalProductosTxt = document.getElementById('total-productos');
    const stockBajoTxt = document.getElementById('stock-bajo');
    const porCaducarTxt = document.getElementById('por-caducar');

    if (pantallaLogin) pantallaLogin.style.display = 'flex';
    if (contenidoApp) contenidoApp.style.display = 'none';

    if (btnLogin) btnLogin.addEventListener('click', login);
    if (pinEntrada) pinEntrada.addEventListener('keypress', function(e) { if (e.key === 'Enter') login(); });
    
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', function(e) {
            e.preventDefault();
            usuarioActivo = "";
            if (pinEntrada) pinEntrada.value = '';
            if (pantallaLogin) pantallaLogin.style.display = 'flex';
            if (contenidoApp) contenidoApp.style.display = 'none';
        });
    }

    function login() {
        if (!pinEntrada) return;
        const pin = pinEntrada.value.trim();
        if (USUARIOS[pin]) {
            usuarioActivo = USUARIOS[pin];
            if (errorLogin) errorLogin.style.display = 'none';
            if (pantallaLogin) pantallaLogin.style.display = 'none';
            if (contenidoApp) contenidoApp.style.display = 'block';
            if (nombreUsuarioActivo) nombreUsuarioActivo.textContent = usuarioActivo;
            actualizarInterfaz();
        } else {
            if (errorLogin) errorLogin.style.display = 'block';
            pinEntrada.value = '';
        }
    }

    if (formulario) {
        formulario.addEventListener('submit', function(e) {
            e.preventDefault();
            const nombre = document.getElementById('nombre').value;
            const cantidad = parseFloat(document.getElementById('cantidad').value);
            const unidad = document.getElementById('unidad').value;
            const categoria = document.getElementById('categoria').value; 
            const stockMinimo = parseFloat(document.getElementById('stock-minimo').value);
            const caducidad = document.getElementById('caducidad').value;

            productos.push({ id: Date.now(), nombre: nombre, cantidad: cantidad, unidad: unidad, categoria: categoria, stockMinimo: stockMinimo, caducidad: caducidad });
            localStorage.setItem('inventario_restaurante', JSON.stringify(productos));
            formulario.reset();
            document.getElementById('stock-minimo').value = "1";
            actualizarInterfaz();
        });
    }

    if (buscador) buscador.addEventListener('input', actualizarInterfaz);
    
    if (btnExportar) {
        btnExportar.addEventListener('click', function() {
            if (productos.length === 0 || typeof XLSX === 'undefined') return;
            const hoja = XLSX.utils.json_to_sheet(productos);
            const libro = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(libro, hoja, "Inventario");
            XLSX.writeFile(libro, "Reporte.xlsx");
        });
    }

    window.actualizarPantalla = actualizarInterfaz;

    function actualizarInterfaz() {
        if (!listaProductos) return;
        listaProductos.innerHTML = '';

        // Contadores para el resumen del inventario
        let totalBajo = 0;
        let totalCaduca = 0;

        if (productos.length === 0) {
            if (mensajeVacio) mensajeVacio.style.display = 'block';
            if (totalProductosTxt) totalProductosTxt.textContent = "0";
            if (stockBajoTxt) stockBajoTxt.textContent = "0";
            if (porCaducarTxt) porCaducarTxt.textContent = "0";
            return;
        }
        if (mensajeVacio) mensajeVacio.style.display = 'none';

        const busq = buscador ? buscador.value.toLowerCase() : "";
        const filtrados = productos.filter(function(p) { return p.nombre.toLowerCase().includes(busq); });
        const hoy = new Date();
        hoy.setHours(0,0,0,0);

        filtrados.forEach(function(prod) {
            const li = document.createElement('li');
            li.className = `producto-item cat-${prod.categoria || 'otros'}`;
            const bajo = prod.cantidad <= prod.stockMinimo;
            if (bajo) totalBajo++;
            
            let esCriticoCaducidad = false;
            if (prod.caducidad) {
                const fechaCad = new Date(prod.caducidad + 'T00:00:00');
                const dias = Math.ceil((fechaCad - hoy) / (1000 * 60 * 60 * 24));
                if (dias <= 3 && dias >= 0) {
                    esCriticoCaducidad = true;
                    totalCaduca++;
                }
            }

            li.innerHTML = `
                <div class="producto-info">
                    <h4>${prod.nombre}</h4>
                    <p style="font-size:0.8rem; color:#888; text-transform:uppercase; margin:0;">🏷️ ${prod.categoria || 'otros'}</p>
                    <p style="margin-top:2px; font-size:0.85rem;">Mínimo: ${prod.stockMinimo} | Vence: ${prod.caducidad || 'No registra'}</p>
                </div>
                <div class="producto-acciones" style="display:flex; flex-direction:column; align-items:flex-end;">
                    <span class="${bajo ? 'alerta-stock' : ''}" style="font-weight:bold; font-size:1.2rem;">${prod.cantidad} ${prod.unidad}</span>
                    ${esCriticoCaducidad ? '<small class="alerta-caduca" style="color:red; font-weight:bold;">⚠️ ¡Por Caducar!</small>' : ''}
                    <div style="margin-top: 5px;">
                        <button onclick="sumarStock(${prod.id})" style="padding: 2px 8px; cursor: pointer;">+</button>
                        <button onclick="restarStock(${prod.id})" style="padding: 2px 8px; cursor: pointer;">-</button>
                        <button onclick="eliminarProducto(${prod.id})" style="padding: 2px 8px; cursor: pointer; background-color: #ff4d4d; color: white; border: none; border-radius: 3px;">🗑️</button>
                    </div>
                </div>
            `;
            listaProductos.appendChild(li);
        });

        // Actualizar tarjetas de resumen con los valores reales calculados
        if (totalProductosTxt) totalProductosTxt.textContent = productos.length;
        if (stockBajoTxt) stockBajoTxt.textContent = totalBajo;
        if (porCaducarTxt) porCaducarTxt.textContent = totalCaduca;
    }
});
