// 1. Importar Firebase y Cloud Firestore desde los servidores de Google
import { initializeApp } from "https://gstatic.com";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc 
} from "https://gstatic.com";

// 2. Tus Claves Oficiales de Conexión (El "1" rojo inicial es normal del editor)
const firebaseConfig = {
    apiKey: "AIzaSyAF8GKINazkaqN69EFCsLxv_0xG3EbUGAk",
    authDomain: "://firebaseapp.com",
    projectId: "invenatrio-molarepa-prueba",
    storageBucket: "invenatrio-molarepa-prueba.firebasestorage.app",
    messagingSenderId: "2314307099",
    appId: "1:2314307099:web:a655411fa87d1da1cc1abe"
};

// Inicializar Firebase y la Base de Datos
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3. Base de Datos de Usuarios y PINs Permitidos
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

// 4. ESCUCHA EN TIEMPO REAL (Sincronización Automática entre Dispositivos)
onSnapshot(collection(db, "inventario"), (snapshot) => {
    productos = [];
    snapshot.forEach((documento) => {
        productos.push({
            id: documento.id, // ID único automático de Firebase
            ...documento.data()
        });
    });
    actualizarInterfaz();
});

// 5. Funciones de Control de Mercancía en la Nube (Vinculadas a Window para los botones HTML)
window.sumarStock = async function(id) {
    const prod = productos.find(function(p) { return p.id === id; });
    if (prod) {
        const val = parseFloat(prompt(`¿Cuánta mercancía vas a INGRESAR de ${prod.nombre}?`));
        if (!isNaN(val) && val > 0) {
            const nuevaCantidad = parseFloat((prod.cantidad + val).toFixed(2));
            const nuevaFecha = prompt(`¿Deseas actualizar la fecha de vencimiento? (AAAA-MM-DD)`, prod.caducidad || "");
            
            try {
                const docRef = doc(db, "inventario", id);
                await updateDoc(docRef, {
                    cantidad: nuevaCantidad,
                    caducidad: nuevaFecha !== null ? nuevaFecha : (prod.caducidad || "")
                });
            } catch (error) {
                console.error("Error al sumar stock en Firebase:", error);
            }
        }
    }
};

window.restarStock = async function(id) {
    const prod = productos.find(function(p) { return p.id === id; });
    if (prod) {
        const val = parseFloat(prompt(`¿Cuánto vas a RETIRAR/SACAR de ${prod.nombre}?`));
        if (!isNaN(val) && val > 0) {
            if (prod.cantidad >= val) {
                const nuevaCantidad = parseFloat((prod.cantidad - val).toFixed(2));
                try {
                    const docRef = doc(db, "inventario", id);
                    await updateDoc(docRef, { cantidad: nuevaCantidad });
                } catch (error) {
                    console.error("Error al restar stock en Firebase:", error);
                }
            } else {
                alert(`¡Error! Existencias insuficientes.`);
            }
        }
    }
};

window.eliminarProducto = async function(id) {
    if (confirm("¿Borrar permanentemente este ítem del inventario?")) {
        try {
            await deleteDoc(doc(db, "inventario", id));
        } catch (error) {
            console.error("Error al eliminar producto en Firebase:", error);
        }
    }
};

// 6. Orquestador de Eventos de la Interfaz
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
        formulario.addEventListener('submit', async function(e) {
            e.preventDefault();
            const nombre = document.getElementById('nombre').value;
            const cantidad = parseFloat(document.getElementById('cantidad').value);
            const unidad = document.getElementById('unidad').value;
            const categoria = document.getElementById('categoria').value; 
            const stockMinimo = parseFloat(document.getElementById('stock-minimo').value);
            const caducidad = document.getElementById('caducidad').value;

            try {
                // Guarda el producto directamente en la colección de Firebase en la nube
                await addDoc(collection(db, "inventario"), {
                    nombre: nombre,
                    cantidad: cantidad,
                    unidad: unidad,
                    categoria: categoria,
                    stockMinimo: stockMinimo,
                    caducidad: caducidad
                });
                
                formulario.reset();
                document.getElementById('stock-minimo').value = "1";
            } catch (error) {
                console.error("Error al añadir producto a Firebase:", error);
            }
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
});

// 7. Renderizar los datos en la pantalla
function actualizarInterfaz() {
    const listaProductos = document.getElementById('lista-productos');
    const mensajeVacio = document.getElementById('mensaje-vacio');
    const totalProductosTxt = document.getElementById('total-productos');
    const stockBajoTxt = document.getElementById('stock-bajo');
    const porCaducarTxt = document.getElementById('por-caducar');
    const buscador = document.getElementById('buscador');

    if (!listaProductos) return;
    listaProductos.innerHTML = '';

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
