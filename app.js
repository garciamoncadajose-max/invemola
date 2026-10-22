// 1. Inicialización de datos exclusivamente desde LocalStorage
let productos = JSON.parse(localStorage.getItem('inventario_restaurante')) || [];

// Captura de elementos de la interfaz (DOM)
const formulario = document.getElementById('formulario-producto');
const listaProductos = document.getElementById('lista-productos');
const mensajeVacio = document.getElementById('mensaje-vacio');
const btnExportar = document.getElementById('btn-exportar');
const buscador = document.getElementById('buscador');

const totalProductosTxt = document.getElementById('total-productos');
const stockBajoTxt = document.getElementById('stock-bajo');
const porCaducarTxt = document.getElementById('por-caducar');

// Procesar el envío manual del formulario
if (formulario) {
    formulario.addEventListener('submit', function(e) {
        e.preventDefault();

        const nombre = document.getElementById('nombre').value;
        const cantidad = parseFloat(document.getElementById('cantidad').value);
        const unidad = document.getElementById('unidad').value;
        const categoria = document.getElementById('categoria').value;
        const stockMinimo = parseFloat(document.getElementById('stock-minimo').value);
        const caducidad = document.getElementById('caducidad').value;

        const nuevoProducto = {
            id: Date.now(),
            nombre,
            cantidad,
            unidad,
            categoria,
            stockMinimo,
            caducidad
        };

        productos.push(nuevoProducto);
        guardarYActualizar();

        formulario.reset();
        document.getElementById('stock-minimo').value = "1"; 
    });
}

if (buscador) {
    buscador.addEventListener('input', function() {
        actualizarInterfaz(); 
    });
}

if (btnExportar) {
    btnExportar.addEventListener('click', exportarAExcel);
}

// 2. Control de Inventario Manual (Sumar, Restar, Eliminar)
function sumarStock(id) {
    const producto = productos.find(p => p.id === id);
    if (producto) {
        const cantidadASumar = parseFloat(prompt(`¿Cuánto vas a añadir al stock de ${producto.nombre}?`));
        if (!isNaN(cantidadASumar) && cantidadASumar > 0) {
            producto.cantidad = parseFloat((producto.cantidad + cantidadASumar).toFixed(2));
            const nuevaFecha = prompt(`¿Actualizar vencimiento? (AAAA-MM-DD)`, producto.caducidad);
            if (nuevaFecha !== null) producto.caducidad = nuevaFecha;
            guardarYActualizar();
        }
    }
}

function restarStock(id) {
    const producto = productos.find(p => p.id === id);
    if (producto) {
        const cantidadARestar = parseFloat(prompt(`¿Cuánto vas a usar o descontar de ${producto.nombre}?`));
        if (!isNaN(cantidadARestar) && cantidadARestar > 0) {
            if (producto.cantidad >= cantidadARestar) {
                producto.cantidad = parseFloat((producto.cantidad - cantidadARestar).toFixed(2));
                guardarYActualizar();
            } else {
                alert("No hay suficiente stock disponible.");
            }
        }
    }
}

function eliminarProducto(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este artículo de la lista?")) {
        productos = productos.filter(p => p.id !== id);
        guardarYActualizar();
    }
}

// 3. Exportación nativa a archivo de Excel
function exportarAExcel() {
    if (productos.length === 0) {
        alert("Agrega al menos un producto para exportar.");
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert("La librería de Excel no se cargó correctamente. Revisa tu conexión.");
        return;
    }

    const datosExcel = productos.map(p => {
        const categoriaTexto = p.categoria ? p.categoria.toUpperCase() : "OTROS";
        return {
            "Nombre del Producto": p.nombre,
            "Categoría": categoriaTexto,
            "Cantidad Actual": p.cantidad,
            "Unidad": p.unidad,
            "Stock Mínimo": p.stockMinimo,
            "Fecha de Caducidad": p.caducidad || "No registra",
            "Estado del Stock": p.cantidad <= p.stockMinimo ? "⚠️ REVISIÓN REQUERIDA" : "OK"
        };
    });

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Inventario");
    XLSX.writeFile(libro, `Reporte_Inventario.xlsx`);
}

// 4. Sincronizar con LocalStorage y repintar pantalla
function guardarYActualizar() {
    localStorage.setItem('inventario_restaurante', JSON.stringify(productos));
    actualizarInterfaz();
}

function actualizarInterfaz() {
    if (!listaProductos) return;
    listaProductos.innerHTML = '';

    // Buscar o crear dinámicamente un contenedor para los mensajes de alarma
    let contenedorAlarmas = document.getElementById('panel-alarmas');
    if (!contenedorAlarmas) {
        contenedorAlarmas = document.createElement('div');
        contenedorAlarmas.id = 'panel-alarmas';
        contenedorAlarmas.style.marginTop = '1rem';
        document.querySelector('.resumen').appendChild(contenedorAlarmas);
    }
    contenedorAlarmas.innerHTML = ''; // Limpiar alarmas anteriores

    if (productos.length === 0) {
        mensajeVacio.style.display = 'block';
        btnExportar.style.display = 'none';
        if (buscador) buscador.style.display = 'none';
        
        totalProductosTxt.textContent = "0";
        stockBajoTxt.textContent = "0";
        porCaducarTxt.textContent = "0";
        
        // Resetear colores de tarjetas si está vacío
        stockBajoTxt.parentElement.className = "tarjeta";
        porCaducarTxt.parentElement.className = "tarjeta";
        return;
    } else {
        mensajeVacio.style.display = 'none';
        btnExportar.style.display = 'block';
        if (buscador) buscador.style.display = 'block';
    }

    const terminoBusqueda = buscador ? buscador.value.toLowerCase() : "";
    const productosFiltrados = productos.filter(prod => 
        prod.nombre.toLowerCase().includes(terminoBusqueda)
    );

    const hoy = new Date();
    let naciendoMensajesAlarma = "";

    productosFiltrados.forEach(prod => {
        const li = document.createElement('li');
        const claseCategoria = `cat-${prod.categoria || 'otros'}`;
        li.className = `producto-item ${claseCategoria}`;

        const esStockBajo = prod.cantidad <= prod.stockMinimo;
        
        let esCriticoCaducidad = false;
        let infoCaducidad = 'No registra';

        if (prod.caducidad) {
            const fechaCad = new Date(prod.caducidad);
            const diferenciaDias = Math.ceil((fechaCad - hoy) / (1000 * 60 * 60 * 24));
            infoCaducidad = prod.caducidad;
            if (diferenciaDias <= 3) {
                esCriticoCaducidad = true;
            }
        }

        // NUEVO: Si detecta peligro, construye un mensaje de alarma en texto
        if (esStockBajo) {
            naciendoMensajesAlarma += `<div class="notificacion-alarma">⚠️ ALERTA STOCK: Quedan solo ${prod.cantidad} ${prod.unidad} de "${prod.nombre}". Reabastecer urgente.</div>`;
        }
        if (esCriticoCaducidad) {
            naciendoMensajesAlarma += `<div class="notificacion-alarma">🚨 ALERTA CADUCIDAD: El lote de "${prod.nombre}" vence pronto (${infoCaducidad}). Revisar frescura.</div>`;
        }

        li.innerHTML = `
            <div class="producto-info">
                <h4>${prod.nombre}</h4>
                <p style="font-size:0.8rem; color:#888; font-weight:600; text-transform: uppercase; margin:0;">🏷️ ${prod.categoria || 'otros'}</p>
                <p style="margin-top:2px;">Mínimo: ${prod.stockMinimo} ${prod.unidad} | Vence: ${infoCaducidad}</p>
            </div>
            <div class="producto-acciones">
                <span class="${esStockBajo ? 'alerta-stock' : ''}" style="font-size: 1.1rem; font-weight:bold;">
                    ${prod.cantidad} ${prod.unidad}
                </span>
                ${esCriticoCaducidad ? '<small class="alerta-caducado" style="display:block; color:#e74c3c;">⚠️ Revisar</small>' : ''}
                
                <div class="grupo-botones" style="display:flex; gap:5px; margin-top:5px;">
                    <button onclick="sumarStock(${prod.id})" style="background:#2ecc71; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">➕</button>
                    <button onclick="restarStock(${prod.id})" style="background:#f39c12; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">➖</button>
                    <button onclick="eliminarProducto(${prod.id})" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">🗑️</button>
                </div>
            </div>
        `;
        listaProductos.appendChild(li);
    });

    // Inyectar los mensajes de alarma recolectados en el panel
    if (naciendoMensajesAlarma !== "") {
        contenedorAlarmas.innerHTML = naciendoMensajesAlarma;
    }

    // Calcular contadores globales completos
    let totalBajoGlobal = productos.filter(p => p.cantidad <= p.stockMinimo).length;
    let totalCaducarGlobal = productos.filter(p => {
        if (!p.caducidad) return false;
        const dias = Math.ceil((new Date(p.caducidad) - hoy) / (1000 * 60 * 60 * 24));
        return dias <= 3;
    }).length;

    totalProductosTxt.textContent = productos.length;
    stockBajoTxt.textContent = totalBajoGlobal;
    porCaducarTxt.textContent = totalCaducarGlobal;

    // NUEVO: CAMBIO DE COLOR COMPLETO EN LAS TARJETA AL LLEGAR AL LÍMITE
    if (totalBajoGlobal > 0) {
        stockBajoTxt.parentElement.className = "tarjeta tarjeta-alerta-critica";
    } else {
        stockBajoTxt.parentElement.className = "tarjeta";
    }

    if (totalCaducarGlobal > 0) {
        porCaducarTxt.parentElement.className = "tarjeta tarjeta-alerta-critica";
    } else {
        porCaducarTxt.parentElement.className = "tarjeta";
    }
}

actualizarInterfaz();
