// ========== CONFIGURACIÓN INICIAL ========== //
// Prueba de conexión a Firestore
db.collection("products").get().then((querySnapshot) => {
    console.log("Conexión exitosa. Productos:", querySnapshot.size);
}).catch((error) => {
    console.error("Error de conexión:", error);
});

// Variable para controlar si estamos editando
let editingProductId = null;

// Referencias a elementos del DOM
const searchInput = document.getElementById('search-input'); // Campo de búsqueda
const btnAddProduct = document.getElementById('btn-add-product'); // Botón de agregar
const productModal = document.getElementById('product-modal'); // Modal
const productForm = document.getElementById('product-form'); // Formulario
const closeModal = document.querySelector('.close-modal'); // Botón cerrar modal

// ========== EVENT LISTENERS ========== //
// Abrir modal para nuevo producto
btnAddProduct.addEventListener('click', () => {
    editingProductId = null; // Indica que es nuevo producto
    document.getElementById('modal-title').textContent = 'Add Product';
    productForm.reset(); // Limpiar formulario
    productModal.classList.remove('hidden'); // Mostrar modal
});

// Cerrar modal
closeModal.addEventListener('click', () => {
    productModal.classList.add('hidden');
});

// Envío de formulario
productForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Evitar recarga de página
    saveProduct(); // Guardar producto
});

// ========== FUNCIONES PRINCIPALES ========== //
// Cargar productos al iniciar
document.addEventListener('DOMContentLoaded', loadProducts);

// Función para cargar productos desde Firestore
async function loadProducts() {
    try {
        const querySnapshot = await db.collection("products").get();
        const tableBody = document.querySelector("#products-table tbody");
        tableBody.innerHTML = ""; // Limpiar tabla

        // Por cada producto en la base de datos
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            // Añadir fila a la tabla
            tableBody.innerHTML += `
                <tr>
                    <td>${product.name}</td>
                    <td>$${product.price}</td>
                    <td>${product.quantity}</td>
                    <td>${product.expiryDate}</td>
                    <td>${product.quantity > 0 ? 'In-stock' : 'Out of stock'}</td>
                    <td>
                        <button class="btn-edit" onclick="openEditModal('${doc.id}')">
                            Edit
                        </button>
                    </td>
                </tr>
            `;
        });

        // Actualizar contador
        document.getElementById('total-products').textContent = querySnapshot.size;
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

// Función para abrir modal en modo edición
function openEditModal(productId) {
    editingProductId = productId; // Guardar ID a editar

    db.collection("products").doc(productId).get().then((doc) => {
        const product = doc.data();
        // Llenar formulario con datos existentes
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-quantity').value = product.quantity;
        document.getElementById('product-expiry').value = product.expiryDate;

        document.getElementById('modal-title').textContent = 'Edit Product';
        productModal.classList.remove('hidden');
    });
}

// Función para guardar producto (crear o actualizar)
function saveProduct() {
    // Obtener datos del formulario
    const productData = {
        name: document.getElementById('product-name').value,
        price: Number(document.getElementById('product-price').value), // Convertir a número
        quantity: Number(document.getElementById('product-quantity').value), // Convertir a número
        expiryDate: document.getElementById('product-expiry').value
    };

    if (editingProductId) {
        // Actualizar producto existente
        db.collection("products").doc(editingProductId).update(productData)
            .then(() => {
                alert('Product updated!');
                productModal.classList.add('hidden');
                loadProducts(); // Recargar tabla
            });
    } else {
        // Crear nuevo producto
        db.collection("products").add(productData)
            .then(() => {
                alert('Product added!');
                productModal.classList.add('hidden');
                loadProducts(); // Recargar tabla
            });
    }
}