// ============================================
// APP PRINCIPAL - GARAJE EN LÍNEA
// ============================================

// ===== CONFIGURACIÓN =====
const CONFIG = {
    DIRECCION: 'Tu dirección aquí, Ciudad, Cuba',
    TELEFONO: '+53 5 555 5555',
    CATEGORIAS: [
        { id: 'maquinas', icono: '⌨️', nombre: 'Máquinas de Escribir' },
        { id: 'libros', icono: '📚', nombre: 'Libros Antiguos' },
        { id: 'ropa', icono: '👕', nombre: 'Ropa' },
        { id: 'calzado', icono: '👟', nombre: 'Calzado Nuevo' },
        { id: 'macetas', icono: '🌵', nombre: 'Macetas con Suculentas' },
        { id: 'cocina', icono: '🍳', nombre: 'Útiles de Cocina' }
    ]
};

// ===== ESTADO GLOBAL =====
let productos = [];
let reservas = [];
let viewActual = 'home';
let categoriaActual = null;

// ===== DOM REFERENCIAS =====
const content = document.getElementById('content');
const navBtns = document.querySelectorAll('.nav-btn');

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    cargarReservas();
    await cargarProductos();
    
    const hash = window.location.hash || '#home';
    manejarHash(hash);
    
    window.addEventListener('hashchange', () => {
        manejarHash(window.location.hash);
    });
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (view === 'home') window.location.hash = '#home';
            else if (view === 'categorias') window.location.hash = '#categorias';
            else if (view === 'carrito') window.location.hash = '#reservas';
        });
    });
});

// ===== MANEJADOR DE HASH =====
function manejarHash(hash) {
    const cleanHash = hash.replace('#', '');
    
    navBtns.forEach(btn => btn.classList.remove('active'));
    
    if (cleanHash === 'home' || cleanHash === '') {
        navBtns.forEach(btn => { if (btn.dataset.view === 'home') btn.classList.add('active'); });
        renderizarHome();
        viewActual = 'home';
    } else if (cleanHash === 'categorias') {
        navBtns.forEach(btn => { if (btn.dataset.view === 'categorias') btn.classList.add('active'); });
        renderizarCategorias();
        viewActual = 'categorias';
    } else if (cleanHash === 'reservas') {
        navBtns.forEach(btn => { if (btn.dataset.view === 'carrito') btn.classList.add('active'); });
        renderizarReservas();
        viewActual = 'reservas';
    } else if (cleanHash.startsWith('producto/')) {
        const id = cleanHash.replace('producto/', '');
        renderizarProducto(id);
        viewActual = 'producto';
    } else if (cleanHash.startsWith('categoria/')) {
        const cat = cleanHash.replace('categoria/', '');
        categoriaActual = cat;
        renderizarCategoria(cat);
        viewActual = 'categoria';
    }
}

// ===== CARGAR PRODUCTOS =====
async function cargarProductos() {
    try {
        const response = await fetch('productos.json');
        if (!response.ok) throw new Error('No se pudo cargar el catálogo');
        const data = await response.json();
        productos = data.productos || [];
        console.log(`✅ ${productos.length} productos cargados`);
    } catch (error) {
        console.error('Error cargando productos:', error);
        try {
            const cache = await caches.open('garaje-v1');
            const cachedResponse = await cache.match('productos.json');
            if (cachedResponse) {
                const data = await cachedResponse.json();
                productos = data.productos || [];
                console.log(`✅ ${productos.length} productos cargados desde caché`);
            }
        } catch (cacheError) {
            console.error('Error cargando desde caché:', cacheError);
            productos = [];
        }
    }
}

// ===== RENDERIZAR CARD =====
function renderizarCard(producto) {
    const estadoClase = producto.vendido ? 'vendido' : '';
    const estadoTexto = producto.vendido ? 'VENDIDO' : producto.estado || 'Buen estado';
    
    return `
        <div class="card ${estadoClase}" data-id="${producto.id}">
            <img src="${producto.imagen || 'img/placeholder.webp'}" alt="${producto.titulo}" loading="lazy" onerror="this.src='img/placeholder.webp'">
            <div class="info">
                <h3>${producto.titulo}</h3>
                <div class="precio">${producto.precio} ${producto.moneda || 'CUP'}</div>
                <span class="estado">${estadoTexto}</span>
                ${producto.vendido ? '<div class="vendido-badge">VENDIDO</div>' : ''}
            </div>
        </div>
    `;
}

// ===== RENDERIZAR HOME (CON EVENT DELEGATION) =====
function renderizarHome() {
    const disponibles = productos.filter(p => !p.vendido);
    
    let html = `
        <div class="fade-in">
            <h2>🏠 Todos los Productos</h2>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">
                ${disponibles.length} productos disponibles
            </p>
            <input type="text" class="buscador" id="buscador" placeholder="🔍 Buscar productos..." oninput="buscarProductos(this.value)">
            <div class="filtros" id="filtros-home">
                <button class="filtro-btn active" data-categoria="todos" onclick="filtrarPorCategoria('todos')">Todos</button>
    `;
    
    CONFIG.CATEGORIAS.forEach(cat => {
        const count = disponibles.filter(p => p.categoria === cat.id).length;
        if (count > 0) {
            html += `<button class="filtro-btn" data-categoria="${cat.id}" onclick="filtrarPorCategoria('${cat.id}')">${cat.icono} ${cat.nombre} (${count})</button>`;
        }
    });
    
    html += `</div><div id="productos-grid" class="grid">`;
    
    if (disponibles.length === 0) {
        html += `<p style="text-align:center;color:var(--text-secondary);padding:40px 0;">No hay productos disponibles.</p>`;
    } else {
        disponibles.forEach(p => {
            html += renderizarCard(p);
        });
    }
    
    html += `</div></div>`;
    content.innerHTML = html;
    
    // 📌 EVENT DELEGATION - EVITA EL REFLUJO
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', function() {
            const id = this.dataset.id;
            if (id) window.location.hash = `#producto/${id}`;
        });
    });
}

// ===== RENDERIZAR CATEGORÍAS =====
function renderizarCategorias() {
    const disponibles = productos.filter(p => !p.vendido);
    
    let html = `
        <div class="fade-in">
            <h2>📂 Categorías</h2>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">Explora por tipo de producto</p>
            <div class="categorias-grid">
    `;
    
    CONFIG.CATEGORIAS.forEach(cat => {
        const count = disponibles.filter(p => p.categoria === cat.id).length;
        if (count > 0) {
            html += `
                <div class="categoria-card" onclick="window.location.hash='#categoria/${cat.id}'">
                    <span class="icono">${cat.icono}</span>
                    <div class="nombre">${cat.nombre}</div>
                    <div class="count">${count} productos</div>
                </div>
            `;
        }
    });
    
    html += `</div></div>`;
    content.innerHTML = html;
}

// ===== RENDERIZAR CATEGORÍA (CON EVENT DELEGATION) =====
function renderizarCategoria(categoriaId) {
    const cat = CONFIG.CATEGORIAS.find(c => c.id === categoriaId);
    const disponibles = productos.filter(p => p.categoria === categoriaId && !p.vendido);
    
    let html = `
        <div class="fade-in">
            <button class="btn-volver" onclick="window.location.hash='#categorias'">← Volver a categorías</button>
            <h2>${cat ? cat.icono : '📂'} ${cat ? cat.nombre : categoriaId}</h2>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">${disponibles.length} productos disponibles</p>
            <div class="grid" id="categoria-grid">
    `;
    
    if (disponibles.length === 0) {
        html += `<p style="text-align:center;color:var(--text-secondary);padding:40px 0;">No hay productos en esta categoría.</p>`;
    } else {
        disponibles.forEach(p => {
            html += renderizarCard(p);
        });
    }
    
    html += `</div></div>`;
    content.innerHTML = html;
    
    // 📌 EVENT DELEGATION - EVITA EL REFLUJO
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', function() {
            const id = this.dataset.id;
            if (id) window.location.hash = `#producto/${id}`;
        });
    });
}

// ===== RENDERIZAR PRODUCTO =====
function renderizarProducto(id) {
    const producto = productos.find(p => p.id === id);
    
    if (!producto) {
        content.innerHTML = `
            <div class="fade-in">
                <button class="btn-volver" onclick="window.location.hash='#home'">← Volver</button>
                <p style="text-align:center;color:var(--text-secondary);padding:40px 0;">Producto no encontrado</p>
            </div>
        `;
        return;
    }
    
    const estaVendido = producto.vendido || false;
    const detallesHtml = producto.detalles ? Object.entries(producto.detalles).map(([key, val]) => {
        if (val === null || val === undefined || val === '') return '';
        const labels = {
            anio: 'Año', marca: 'Marca', material: 'Material', funciona: 'Funciona',
            accesorios: 'Accesorios', talla: 'Talla', color: 'Color',
            tipo_planta: 'Tipo de planta', tamaño_maceta: 'Tamaño de maceta',
            cuidado: 'Cuidado', editorial: 'Editorial', idioma: 'Idioma',
            paginas: 'Páginas', tipo: 'Tipo'
        };
        const label = labels[key] || key;
        return `<span>${label}: ${Array.isArray(val) ? val.join(', ') : (typeof val === 'boolean' ? (val ? '✅ Sí' : '❌ No') : val)}</span>`;
    }).filter(Boolean).join('') : '';
    
    let html = `
        <div class="fade-in">
            <button class="btn-volver" onclick="window.location.hash='${categoriaActual ? '#categoria/' + categoriaActual : '#home'}'">← Volver</button>
            <div class="producto-detalle">
                <img src="${producto.imagen || 'img/placeholder.webp'}" alt="${producto.titulo}" class="imagen-principal" onerror="this.src='img/placeholder.webp'">
                <h2>${producto.titulo}</h2>
                <div class="precio-grande">${producto.precio} ${producto.moneda || 'CUP'}</div>
                ${producto.negociable ? '<span style="color:var(--accent);font-size:0.9rem;">💬 Precio negociable</span>' : ''}
                <p class="descripcion">${producto.descripcion || 'Sin descripción'}</p>
                ${detallesHtml ? `<div class="detalles">${detallesHtml}</div>` : ''}
                <div style="margin: 12px 0; color: var(--text-secondary); font-size: 0.9rem;">
                    Estado: <strong>${producto.estado || 'Buen estado'}</strong>
                </div>
    `;
    
    if (estaVendido) {
        html += `
            <div style="background:#e74c3c20;border:2px solid #e74c3c;border-radius:var(--radius);padding:16px;text-align:center;margin-top:12px;">
                <strong style="color:#e74c3c;">❌ PRODUCTO VENDIDO</strong>
                <p style="color:var(--text-secondary);font-size:0.9rem;">Este producto ya no está disponible.</p>
            </div>
        `;
    } else {
        html += `
            <button class="btn-reservar" onclick="reservarProducto('${producto.id}')">
                📌 Reservar / Hacer Oferta
            </button>
            <div id="qr-container" style="margin-top:16px;"></div>
        `;
    }
    
    html += `</div></div>`;
    content.innerHTML = html;
}

// ===== FILTRAR POR CATEGORÍA =====
function filtrarPorCategoria(categoria) {
    const disponibles = productos.filter(p => !p.vendido);
    
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.categoria === categoria) {
            btn.classList.add('active');
        }
    });
    
    const filtrados = categoria === 'todos' 
        ? disponibles 
        : disponibles.filter(p => p.categoria === categoria);
    
    const grid = document.getElementById('productos-grid');
    if (grid) {
        if (filtrados.length === 0) {
            grid.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:40px 0;">No hay productos en esta categoría.</p>`;
        } else {
            grid.innerHTML = filtrados.map(p => renderizarCard(p)).join('');
            // 📌 REASIGNAR EVENTOS A LAS NUEVAS TARJETAS
            document.querySelectorAll('.card').forEach(card => {
                card.addEventListener('click', function() {
                    const id = this.dataset.id;
                    if (id) window.location.hash = `#producto/${id}`;
                });
            });
        }
    }
}

// ===== BUSCADOR =====
function buscarProductos(texto) {
    const disponibles = productos.filter(p => !p.vendido);
    const termino = texto.toLowerCase().trim();
    
    if (!termino) {
        const categoriaActiva = document.querySelector('.filtro-btn.active');
        if (categoriaActiva) {
            filtrarPorCategoria(categoriaActiva.dataset.categoria);
        } else {
            filtrarPorCategoria('todos');
        }
        return;
    }
    
    const filtrados = disponibles.filter(p => {
        return p.titulo.toLowerCase().includes(termino) ||
               p.descripcion?.toLowerCase().includes(termino) ||
               p.categoria.includes(termino);
    });
    
    const grid = document.getElementById('productos-grid');
    if (grid) {
        if (filtrados.length === 0) {
            grid.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:40px 0;">No se encontraron productos para "${texto}"</p>`;
        } else {
            grid.innerHTML = filtrados.map(p => renderizarCard(p)).join('');
            // 📌 REASIGNAR EVENTOS A LAS NUEVAS TARJETAS
            document.querySelectorAll('.card').forEach(card => {
                card.addEventListener('click', function() {
                    const id = this.dataset.id;
                    if (id) window.location.hash = `#producto/${id}`;
                });
            });
        }
    }
}

// ===== RESERVAR PRODUCTO =====
function reservarProducto(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto || producto.vendido) {
        alert('Este producto ya fue vendido.');
        return;
    }
    
    const yaReservado = reservas.some(r => r.productoId === productoId);
    if (yaReservado) {
        alert('Ya tienes este producto reservado. Revisa tus reservas.');
        return;
    }
    
    const timestamp = Date.now();
    const codigo = `${producto.id}-${timestamp}`;
    
    const reserva = {
        id: `R-${timestamp}`,
        productoId: producto.id,
        titulo: producto.titulo,
        precio: producto.precio,
        moneda: producto.moneda || 'CUP',
        codigo: codigo,
        fecha: new Date(timestamp).toLocaleString('es-CU'),
        timestamp: timestamp
    };
    
    reservas.push(reserva);
    guardarReservas();
    mostrarQR(codigo, producto.titulo);
    
    const qrContainer = document.getElementById('qr-container');
    if (qrContainer) {
        qrContainer.innerHTML = `
            <div class="instrucciones-qr">
                <strong>✅ ¡Producto reservado con éxito!</strong>
                <p style="margin-top:8px;">
                    📌 <strong>Código:</strong> ${codigo}<br>
                    📅 <strong>Fecha:</strong> ${reserva.fecha}
                </p>
                <p style="margin-top:8px;">Escanea o descarga este QR para recoger el producto.</p>
            </div>
        `;
    }
}

// ===== MOSTRAR QR =====
function mostrarQR(codigo, titulo) {
    const container = document.getElementById('qr-container');
    if (!container) return;
    
    container.innerHTML = '';
    const qrDiv = document.createElement('div');
    qrDiv.id = 'qr-code';
    container.appendChild(qrDiv);
    
    try {
        new QRCode(qrDiv, {
            text: codigo,
            width: 220,
            height: 220,
            colorDark: "#1a1a1a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        const btnDescargar = document.createElement('button');
        btnDescargar.textContent = '📥 Descargar QR';
        btnDescargar.className = 'btn-descargar-qr';
        btnDescargar.onclick = descargarQR;
        container.appendChild(btnDescargar);
        
        const instrucciones = document.createElement('div');
        instrucciones.className = 'instrucciones-qr';
        instrucciones.innerHTML = `
            <strong>📋 Instrucciones:</strong>
            <ol>
                <li>Guarda este QR en tu galería.</li>
                <li>Preséntalo al recoger el producto.</li>
                <li>Negocia por <a href="tel:${CONFIG.TELEFONO}">teléfono</a> o <a href="https://wa.me/${CONFIG.TELEFONO.replace(/[^0-9]/g, '')}" target="_blank">WhatsApp</a>.</li>
            </ol>
            <p style="margin-top:8px;font-size:0.9rem;">📍 Recogida en: ${CONFIG.DIRECCION}</p>
        `;
        container.appendChild(instrucciones);
        
    } catch (error) {
        console.error('Error generando QR:', error);
        container.innerHTML = `
            <div style="padding:20px;background:var(--bg-primary);border-radius:var(--radius);text-align:center;">
                <p>❌ No se pudo generar el QR.</p>
                <p style="font-size:0.8rem;color:var(--text-secondary);">Código: ${codigo}</p>
            </div>
        `;
    }
}

// ===== DESCARGAR QR =====
function descargarQR() {
    const canvas = document.querySelector('#qr-code canvas');
    if (!canvas) {
        alert('No hay QR para descargar.');
        return;
    }
    const enlace = document.createElement('a');
    enlace.download = `reserva-${Date.now()}.png`;
    enlace.href = canvas.toDataURL('image/png');
    enlace.click();
}

// ===== RENDERIZAR RESERVAS =====
function renderizarReservas() {
    if (reservas.length === 0) {
        content.innerHTML = `
            <div class="fade-in">
                <h2>🛒 Mis Reservas</h2>
                <div class="reserva-vacio">
                    <p>No tienes productos reservados.</p>
                    <button class="btn-reservar" onclick="window.location.hash='#home'" style="width:auto;margin:16px auto;padding:10px 24px;">
                        Ver productos
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="fade-in">
            <h2>🛒 Mis Reservas (${reservas.length})</h2>
            <p style="color:var(--text-secondary);margin-bottom:16px;">Presenta este QR al recoger.</p>
    `;
    
    reservas.forEach((reserva, index) => {
        html += `
            <div class="reserva-item">
                <strong>${reserva.titulo}</strong>
                <div class="precio">${reserva.precio} ${reserva.moneda}</div>
                <div class="codigo">${reserva.codigo}</div>
                <div class="fecha">📅 ${reserva.fecha}</div>
                <button class="btn-descargar-qr" style="margin-top:8px;font-size:0.8rem;" onclick="mostrarQR('${reserva.codigo}', '${reserva.titulo}')">
                    📱 Ver QR
                </button>
                <button class="btn-descargar-qr" style="margin-top:8px;font-size:0.8rem;background:#e74c3c;border-color:#e74c3c;" onclick="eliminarReserva(${index})">
                    ❌ Cancelar
                </button>
            </div>
        `;
    });
    
    html += `<div id="qr-container" style="margin-top:20px;"></div></div>`;
    content.innerHTML = html;
}

// ===== ELIMINAR RESERVA =====
function eliminarReserva(index) {
    if (confirm('¿Cancelar esta reserva?')) {
        reservas.splice(index, 1);
        guardarReservas();
        renderizarReservas();
    }
}

// ===== GUARDAR/CARGAR RESERVAS =====
function guardarReservas() {
    try {
        localStorage.setItem('reservas-garaje', JSON.stringify(reservas));
    } catch (e) {
        console.warn('No se pudo guardar reservas');
    }
}

function cargarReservas() {
    try {
        const data = localStorage.getItem('reservas-garaje');
        if (data) reservas = JSON.parse(data);
    } catch (e) {
        reservas = [];
    }
}
