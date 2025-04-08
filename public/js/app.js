// ========== CONFIGURACIÓN INICIAL ========== //
console.log("Initializing application...");

// Variables globales
let editingProductId = null;
let currentDetailProductId = null;
let currentPage = 1;
const productsPerPage = 10;
let allProducts = [];
let unsubscribe = null;

// Referencias a elementos del DOM
const searchInput = document.getElementById('search-input');
const btnAddProduct = document.getElementById('btn-add-product');
const productModal = document.getElementById('product-modal');
const detailModal = document.getElementById('detail-modal');
const productForm = document.getElementById('product-form');
const closeModal = document.querySelector('.close-modal');
const closeDetailModal = document.querySelector('.close-detail-modal');
const editFromDetailBtn = document.getElementById('edit-from-detail');
const closeDetailBtn = document.getElementById('close-detail');
const discardBtn = document.getElementById('discard-btn');
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const imageUrlInput = document.getElementById('image-url');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');

// ========== EVENT LISTENERS ========== //
// Abrir modal para nuevo producto
btnAddProduct.addEventListener('click', () => {
    editingProductId = null;
    document.getElementById('modal-title').textContent = 'Añadir Producto';
    productForm.reset();
    productModal.classList.remove('hidden');
});

// Cerrar modales
closeModal.addEventListener('click', () => productModal.classList.add('hidden'));
closeDetailModal.addEventListener('click', () => detailModal.classList.add('hidden'));
closeDetailBtn.addEventListener('click', () => detailModal.classList.add('hidden'));
discardBtn.addEventListener('click', () => productModal.classList.add('hidden'));

// Editar desde detalles
editFromDetailBtn.addEventListener('click', () => {
    detailModal.classList.add('hidden');
    openEditModal(currentDetailProductId);
});

// Envío de formulario
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProduct();
});

// Búsqueda en tiempo real
searchInput.addEventListener('input', () => {
    currentPage = 1;
    filterProducts(searchInput.value.toLowerCase());
});

// Paginación
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayProducts(allProducts);
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(allProducts.length / productsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayProducts(allProducts);
    }
});

// Drag and drop para imágenes
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

dropArea.addEventListener('drop', handleDrop, false);
dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFiles);

// ========== FUNCIONES PRINCIPALES ========== //
// Inicializar la aplicación
async function initApp() {
    console.log("Initializing Firebase connection...");

    try {
        // Configurar escucha en tiempo real de Firestore
        unsubscribe = db.collection("products").orderBy("name").onSnapshot({
            next: (snapshot) => {
                console.log("Received snapshot from Firestore");
                allProducts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                displayProducts(allProducts);
                updateMetrics();
            },
            error: (error) => {
                console.error("Error in Firestore snapshot:", error);
                alert("Error loading products: " + error.message);
            }
        });

        console.log("Firestore listener established successfully");
    } catch (error) {
        console.error("Error initializing app:", error);
        alert("Error initializing application: " + error.message);
    }
}

// Función para mostrar productos en la tabla
function displayProducts(products) {
    const tableBody = document.querySelector("#products-table tbody");
    tableBody.innerHTML = "";

    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const paginatedProducts = products.slice(startIndex, endIndex);

    if (paginatedProducts.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="no-products">No products found</td></tr>`;
        updatePagination();
        return;
    }

    paginatedProducts.forEach(product => {
        const row = document.createElement('tr');
        row.dataset.id = product.id;

        // Determinar disponibilidad
        let availability;
        let availabilityClass;
        if (product.quantity <= 0) {
            availability = 'Sin Inventario';
            availabilityClass = 'out-of-stock';
        } else if (product.quantity <= (product.thresholdValue || 0)) {
            availability = 'Bajo Inventario';
            availabilityClass = 'low-stock';
        } else {
            availability = 'En Inventario';
            availabilityClass = 'in-stock';
        }

        row.innerHTML = `
            <td>${product.name || 'N/A'}</td>
            <td>$${product.price?.toFixed(2) || '0.00'}</td>
            <td>${product.quantity || 0} ${product.unit || ''}</td>
            <td>${product.thresholdValue || 'N/A'}</td>
            <td>${formatDate(product.expiryDate) || 'N/A'}</td>
            <td><span class="availability ${availabilityClass}">${availability}</span></td>
            <td>
                <button class="btn-edit" onclick="openEditModal('${product.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-secondary" onclick="showProductDetail('${product.id}')" style="margin-left: 5px;">
                    <i class="fas fa-info-circle"></i> Detalles
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    updatePagination();
}

// Función para filtrar productos
function filterProducts(searchTerm) {
    if (!searchTerm) {
        displayProducts(allProducts);
        return;
    }

    const filteredProducts = allProducts.filter(product => {
        const searchFields = [
            product.name?.toLowerCase() || '',
            product.category?.toLowerCase() || '',
            product.id?.toLowerCase() || ''
        ].join(" ");

        return searchFields.includes(searchTerm.toLowerCase());
    });

    displayProducts(filteredProducts);
}

// Función para actualizar métricas
function updateMetrics() {
    const categories = new Set();
    let totalValue = 0;

    allProducts.forEach(product => {
        if (product.category) {
            categories.add(product.category);
        }
        if (product.price && product.quantity) {
            totalValue += product.price * product.quantity;
        }
    });

    document.getElementById('total-products').textContent = allProducts.length;
    document.getElementById('categories-count').textContent = categories.size;
}

// Función para abrir modal en modo edición
function openEditModal(productId) {
    editingProductId = productId;

    db.collection("products").doc(productId).get().then((doc) => {
        if (!doc.exists) {
            alert("Product not found!");
            return;
        }

        const product = doc.data();

        // Llenar formulario con datos existentes
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-id').value = product.id || '';
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-price').value = product.price || '';
        document.getElementById('product-quantity').value = product.quantity || '';
        document.getElementById('product-unit').value = product.unit || '';
        document.getElementById('product-threshold').value = product.thresholdValue || '';
        document.getElementById('product-expiry').value = product.expiryDate || '';
        document.getElementById('image-url').value = product.imageUrl || '';

        document.getElementById('modal-title').textContent = 'Edit Product';
        productModal.classList.remove('hidden');
    }).catch(error => {
        console.error("Error loading product:", error);
        alert("Error loading product: " + error.message);
    });
}

// Función para mostrar detalles del producto
function showProductDetail(productId, productData = null) {
    currentDetailProductId = productId;

    // Si no se proporcionan los datos del producto, obtenerlos de Firestore
    if (!productData) {
        db.collection("products").doc(productId).get().then((doc) => {
            if (doc.exists) {
                displayProductDetails(doc.data());
            } else {
                alert("Product not found!");
            }
        }).catch(error => {
            console.error("Error loading product:", error);
            alert("Error loading product: " + error.message);
        });
    } else {
        displayProductDetails(productData);
    }
}

function displayProductDetails(productData) {
    // Llenar el modal de detalles
    document.getElementById('detail-name').textContent = productData.name || 'N/A';
    document.getElementById('detail-id').textContent = productData.id || 'Auto-generated';
    document.getElementById('detail-category').textContent = productData.category || 'N/A';
    document.getElementById('detail-expiry').textContent = formatDate(productData.expiryDate) || 'N/A';
    document.getElementById('detail-threshold').textContent = productData.thresholdValue || 'N/A';
    document.getElementById('detail-opening').textContent = productData.openingStock || productData.quantity || 'N/A';
    document.getElementById('detail-remaining').textContent = productData.quantity || 'N/A';
    document.getElementById('detail-onway').textContent = productData.onTheWay || '0';

    // Mostrar la imagen si existe
    const imageElement = document.getElementById('detail-image');
    if (productData.imageUrl) {
        imageElement.src = productData.imageUrl;
        imageElement.style.display = 'block';
    } else {
        imageElement.style.display = 'none';
    }

    detailModal.classList.remove('hidden');
}

// Función para guardar producto
async function saveProduct() {
    const productName = document.getElementById('product-name').value.trim();
    if (!productName) {
        alert("Product name is required!");
        return;
    }

    const productData = {
        name: productName,
        category: document.getElementById('product-category').value || "Uncategorized",
        price: parseFloat(document.getElementById('product-price').value) || 0,
        quantity: parseInt(document.getElementById('product-quantity').value) || 0,
        unit: document.getElementById('product-unit').value || "",
        thresholdValue: parseInt(document.getElementById('product-threshold').value) || 0,
        expiryDate: document.getElementById('product-expiry').value || null,
        imageUrl: document.getElementById('image-url').value || null,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (editingProductId) {
            // Actualizar producto existente
            await db.collection("products").doc(editingProductId).update(productData);
            console.log("Product updated successfully");
        } else {
            // Crear nuevo producto
            await db.collection("products").add(productData);
            console.log("Product added successfully");
        }

        productModal.classList.add('hidden');
    } catch (error) {
        console.error("Error saving product:", error);
        alert("Error saving product: " + error.message);
    }
}

// Función para actualizar paginación
function updatePagination() {
    const totalPages = Math.ceil(allProducts.length / productsPerPage);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

// ========== FUNCIONES AUXILIARES ========== //
function formatDate(dateString) {
    if (!dateString) return '';

    // Si es un objeto Timestamp de Firebase
    if (dateString.toDate) {
        return dateString.toDate().toLocaleDateString('es-MX');
    }

    // Si es una cadena de fecha ISO
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Si ya está en formato legible
    return dateString;
}

// Funciones para drag and drop de imágenes
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    dropArea.classList.add('highlight');
}

function unhighlight() {
    dropArea.classList.remove('highlight');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            // Subir imagen a Firebase Storage
            const storageRef = storage.ref(`product_images/${file.name}`);
            const uploadTask = storageRef.put(file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progreso de la subida
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress + '% done');
                },
                (error) => {
                    console.error("Error uploading image:", error);
                    alert("Error uploading image: " + error.message);
                },
                () => {
                    uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                        imageUrlInput.value = downloadURL;
                        console.log("Image uploaded successfully:", downloadURL);
                    });
                }
            );
        } else {
            alert("Please upload an image file");
        }
    }
}

// ========== INICIALIZACIÓN ========== //
// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");
    initApp();
});

// Hacer funciones accesibles globalmente
window.openEditModal = openEditModal;
window.showProductDetail = showProductDetail;