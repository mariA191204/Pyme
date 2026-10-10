// Control de inventario y ventas (los datos se guardan en el navegador)
const MONEDA = 'C$ ';     // cambia aquí el símbolo de moneda
const STOCK_BAJO = 5;    // a partir de cuántas unidades se avisa

let productos = JSON.parse(localStorage.getItem('productos') || 'null') || [
  { id: 1, nombre: 'Arroz 1 kg', precio: 1.2, stock: 40 },
  { id: 2, nombre: 'Aceite 1 L', precio: 3.4, stock: 4 },
  { id: 3, nombre: 'Azúcar 1 kg', precio: 1.1, stock: 25 }
];
let editandoId = null;   // producto que se está editando (null = ninguno)
let ventas = JSON.parse(localStorage.getItem('ventas') || '[]');

const $ = id => document.getElementById(id);
const dinero = n => MONEDA + Number(n).toFixed(2);

function guardar() {
  localStorage.setItem('productos', JSON.stringify(productos));
  localStorage.setItem('ventas', JSON.stringify(ventas));
}

function mostrar() {
  // Tabla de productos
  $('lista-productos').innerHTML = productos.length
    ? productos.map(p => `
      <tr class="${p.stock <= STOCK_BAJO ? 'bajo' : ''} ${p.id === editandoId ? 'editando' : ''}">
        <td>${p.nombre}</td><td>${dinero(p.precio)}</td><td>${p.stock}</td>
        <td><button class="editar" onclick="editarProducto(${p.id})">Editar</button><button class="borrar" onclick="borrarProducto(${p.id})">Eliminar</button></td>
      </tr>`).join('')
    : '<tr><td colspan="4">No hay productos. Agrega el primero arriba.</td></tr>';

  // Lista para vender (solo con stock)
  const disponibles = productos.filter(p => p.stock > 0);
  $('v-producto').innerHTML = disponibles.length
    ? disponibles.map(p => `<option value="${p.id}">${p.nombre} (${p.stock} disp.)</option>`).join('')
    : '<option value="">Sin productos disponibles</option>';

  // Ventas
  $('lista-ventas').innerHTML = ventas.length
    ? ventas.map((v, i) => `
      <tr>
        <td>${v.fecha}</td>
        <td>${v.nombre}</td>
        <td>${v.cantidad}</td>
        <td>${dinero(v.total)}</td>
        <td><button class="borrar" onclick="borrarVenta(${i})">Eliminar</button></td>
      </tr>`).join('')
    : '<tr><td colspan="5">Todavía no hay ventas.</td></tr>';
  $('total-vendido').textContent = dinero(ventas.reduce((s, v) => s + v.total, 0));
}

let accionConfirmarModal = null;

function abrirConfirmacion(mensajeTexto, accion) {
  $('modal-mensaje').textContent = mensajeTexto;
  accionConfirmarModal = accion;
  $('modal-confirmar').classList.remove('oculto');
}

function cerrarConfirmacion() {
  $('modal-confirmar').classList.add('oculto');
  accionConfirmarModal = null;
}

$('modal-btn-cancelar').addEventListener('click', cerrarConfirmacion);
$('modal-btn-confirmar').addEventListener('click', () => {
  if (typeof accionConfirmarModal === 'function') {
    accionConfirmarModal();
  }
  cerrarConfirmacion();
});

$('modal-confirmar').addEventListener('click', e => {
  if (e.target === $('modal-confirmar')) cerrarConfirmacion();
});

function borrarVenta(index) {
  const v = ventas[index];
  if (!v) return;
  abrirConfirmacion(`¿Estás seguro que quieres eliminar esta venta de "${v.nombre}"?`, () => {
    const p = productos.find(x => x.id === v.productoId || x.nombre === v.nombre);
    if (p) {
      p.stock += v.cantidad;
    }
    ventas.splice(index, 1);
    guardar();
    mostrar();
    mensaje('Registro de venta eliminado.', 'ok');
  });
}

function mensaje(texto, tipo) {
  $('mensaje').textContent = texto;
  $('mensaje').className = tipo || '';
}

$('form-producto').addEventListener('submit', e => {
  e.preventDefault();
  const nombre = $('p-nombre').value.trim();
  if (productos.some(p => p.id !== editandoId && p.nombre.toLowerCase() === nombre.toLowerCase())) {
    alert('Ese producto ya existe. Usa otro nombre.');
    return;
  }
  const datos = { nombre, precio: +$('p-precio').value, stock: +$('p-stock').value };
  if (editandoId) Object.assign(productos.find(p => p.id === editandoId), datos);   // editar
  else productos.push({ id: Date.now(), ...datos });                                 // agregar
  guardar(); cancelarEdicion();
});

// Pone los datos del producto en el formulario para modificarlos
function editarProducto(id) {
  const p = productos.find(x => x.id === id);
  editandoId = id;
  $('p-nombre').value = p.nombre;
  $('p-precio').value = p.precio;
  $('p-stock').value = p.stock;
  $('titulo-form').textContent = 'Editar producto';
  $('btn-guardar').textContent = 'Guardar cambios';
  $('btn-cancelar').classList.remove('oculto');
  $('form-producto').classList.add('modo-editar');
  $('p-nombre').focus();
  mostrar();
}

function cancelarEdicion() {
  editandoId = null;
  $('form-producto').reset();
  $('titulo-form').textContent = 'Agregar producto';
  $('btn-guardar').textContent = 'Agregar producto';
  $('btn-cancelar').classList.add('oculto');
  $('form-producto').classList.remove('modo-editar');
  mostrar();
}
$('btn-cancelar').addEventListener('click', cancelarEdicion);

function borrarProducto(id) {
  const p = productos.find(x => x.id === id);
  const nombre = p ? p.nombre : 'este producto';
  abrirConfirmacion(`¿Estás seguro que quieres eliminar este producto ("${nombre}")?`, () => {
    productos = productos.filter(x => x.id !== id);
    guardar();
    if (editandoId === id) cancelarEdicion(); else mostrar();
    mensaje('Producto eliminado.', 'ok');
  });
}

$('form-venta').addEventListener('submit', e => {
  e.preventDefault();
  const p = productos.find(x => x.id === +$('v-producto').value);
  const cantidad = parseInt($('v-cantidad').value, 10);
  if (!p) return mensaje('Elige un producto con existencias.', 'error');
  if (!(cantidad > 0)) return mensaje('Escribe una cantidad mayor que cero.', 'error');
  if (cantidad > p.stock) return mensaje(`Solo quedan ${p.stock} unidades de ${p.nombre}.`, 'error');

  p.stock -= cantidad;  // el inventario se descuenta solo
  ventas.unshift({ id: Date.now(), productoId: p.id, fecha: new Date().toLocaleString('es'), nombre: p.nombre, cantidad, total: cantidad * p.precio });
  guardar(); mostrar();
  mensaje('Venta registrada. El inventario se actualizó.', 'ok');
});

mostrar();
