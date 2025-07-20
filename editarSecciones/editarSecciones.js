let isProcessing = false;
import API_BASE_URL from "../config.js";
import axiosInstance, { authService } from '../services/axios-config.js';

async function loadCardsFromAPI() {
    try {
        if (!authService.isAuthenticated()) {
            console.error('No token found');
            window.location.replace('../login/login.html');
            return;
        }

        console.log('Cargando secciones...');
        const { data: sections } = await axiosInstance.get('/user/sections');
        console.log('Secciones recibidas:', sections);

        const tableBody = document.getElementById('sectionsTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = ''; // Limpiar el contenido anterior
        
        sections.forEach(section => {
            const row = tableBody.insertRow();
            
            row.insertCell(0).innerText = section.titulo; // Título
            row.insertCell(1).innerText = section.descripcion; // Descripción
            row.insertCell(2).innerHTML = `<a href="${section.link}">${section.link}</a>`; // Link
            row.insertCell(3).innerHTML = section.imagen ? `<img class="section-image" src="data:image/jpeg;base64,${section.imagen}" alt="${section.titulo}" style="width: 50px; height: auto;">` : 'Sin imagen'; // Imagen
            
            // Crear el botón de editar
            const editButton = document.createElement('button');
            editButton.innerText = 'Editar';
            editButton.className = 'edit-button'; // Clase para estilos (opcional)
            editButton.onclick = function() {
                editSection(section._id); // Llama a la función de edición pasando el ID de la sección
                console.log(section._id);
            };

            // Crear el botón de eliminar
            const deleteButton = document.createElement('button');
            deleteButton.innerText = 'Eliminar';
            deleteButton.className = 'delete-button'; // Clase para estilos (opcional)
            deleteButton.onclick = function() {
                deleteSection(section._id); // Llama a la función de eliminación pasando el ID de la sección
            };
            
            // Insertar el botón de eliminar en la última celda
            const cell = row.insertCell(4);
            cell.appendChild(editButton);
            cell.appendChild(deleteButton);
        });
    } catch (error) {
        console.error('Error completo:', error);
        console.error('Stack trace:', error.stack);
    }
}

let currentSectionId; // Variable para almacenar el ID de la sección actual

async function editSection(sectionId) {
    try {
        currentSectionId = sectionId;
        if (!authService.isAuthenticated()) {
            console.error('No token found');
            window.location.replace('../login/login.html');
            return;
        }

        console.log('Editando sección:', sectionId);
        const { data: section } = await axiosInstance.get(`/user/sections/${sectionId}`);
        
        document.getElementById('editTitle').value = section.titulo;
        document.getElementById('editDescription').value = section.descripcion;
        document.getElementById('editLink').value = section.link;
        
        // Mostrar la imagen actual si existe
        const preview = document.getElementById('previewImg');
        if (section.imagen) {
            preview.src = `data:image/jpeg;base64,${section.imagen}`;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
        
        document.getElementById('editModal').style.display = 'block';
        document.body.classList.add('modal-open'); // Agregar clase para prevenir scroll
    } catch (error) {
        console.error('Error al cargar la sección:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la información de la sección'
        });
    }
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('previewImg').style.display = 'none';
    document.getElementById('editForm').reset();
    document.body.classList.remove('modal-open'); // Remover clase al cerrar el modal
}
window.closeModal = closeModal;

async function saveChanges() {
    try {
        if (!authService.isAuthenticated()) {
            console.error('No token found');
            window.location.replace('../login/login.html');
            return;
        }

        const titulo = document.getElementById('editTitle').value;
        const descripcion = document.getElementById('editDescription').value;
        const link = document.getElementById('editLink').value;
        const imageFile = document.getElementById('editImage').files[0];

        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('descripcion', descripcion);
        formData.append('link', link);
        
        // Solo agregar la imagen si se seleccionó una nueva
        if (imageFile) {
            formData.append('imagen', imageFile);
        }

        console.log('Actualizando sección:', currentSectionId);
        const { data } = await axiosInstance.put(`/editSection/${currentSectionId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        console.log('Sección actualizada:', data);
        closeModal();
        Swal.fire({
            icon: 'success',
            title: '¡Sección actualizada!',
            text: 'La sección ha sido actualizada exitosamente',
        });
        loadCardsFromAPI(); // Recargar las tarjetas
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar la sección',
        });
    }
}
window.saveChanges = saveChanges;

// Función para eliminar la sección
async function deleteSection(sectionId) {
    try {
        if (!authService.isAuthenticated()) {
            console.error('No token found');
            window.location.replace('../login/login.html');
            return;
        }

        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esta acción",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            console.log('Eliminando sección:', sectionId);
            const { data } = await axiosInstance.delete(`/user/sections/${sectionId}`);
            
            console.log('Sección eliminada:', data);
            Swal.fire(
                '¡Eliminada!',
                'La sección ha sido eliminada.',
                'success'
            );
            loadCardsFromAPI(); // Recargar las tarjetas
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo eliminar la sección',
        });
    }
}

// Funciones globales para los modales
function openCreateModal() {
    document.getElementById('createModal').style.display = 'block';
    document.body.classList.add('modal-open');
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    document.getElementById('createForm').reset();
    document.getElementById('createPreviewImg').style.display = 'none';
    document.body.classList.remove('modal-open');
}
window.closeCreateModal = closeCreateModal;

async function createSection() {
    if (isProcessing) return;
    
    try {
        isProcessing = true;
        const createButton = document.getElementById('createSection');
        createButton.disabled = true;
        createButton.innerHTML = 'Creando...';

        if (!authService.isAuthenticated()) {
            console.error('No token found');
            window.location.replace('../login/login.html');
            return;
        }

        const titulo = document.getElementById('createTitle').value;
        const descripcion = document.getElementById('createDescription').value;
        const link = document.getElementById('createLink').value;
        const imagen = document.getElementById('createImage').files[0];

        if (!titulo || !descripcion || !link || !imagen) {
            Swal.fire({
                icon: 'error',
                title: 'Campos incompletos',
                text: 'Todos los campos son obligatorios',
            });
            return;
        }
        
        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('descripcion', descripcion);
        formData.append('link', link);
        formData.append('imagen', imagen);

        console.log('Creando nueva sección...');
        const { data } = await axiosInstance.post('/createGlobalSection', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        console.log('Sección creada:', data);
        closeCreateModal();
        await Swal.fire({
            icon: 'success',
            title: '¡Sección creada!',
            text: 'La sección ha sido creada exitosamente',
        });
        window.location.reload();
    } catch (error) {
        console.error('Error:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo crear la sección',
        });
    } finally {
        const createButton = document.getElementById('createSection');
        createButton.disabled = false;
        createButton.innerHTML = 'Crear sección';
        isProcessing = false;
    }
}
    
document.addEventListener('DOMContentLoaded', function() {
    loadCardsFromAPI();

    // Evento para la vista previa de la imagen en el modal de edición
    document.getElementById('editImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('previewImg');
        
        // Lista de tipos MIME permitidos para imágenes
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        if (file) {
            if (!allowedTypes.includes(file.type)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Archivo no válido',
                    text: 'Por favor, selecciona solo archivos de imagen (JPEG, PNG, GIF, WEBP)',
                });
                e.target.value = '';
                preview.style.display = 'none';
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    // Evento para la vista previa de la imagen en el modal de creación
    document.getElementById('createImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('createPreviewImg');
        
        // Lista de tipos MIME permitidos para imágenes
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        if (file) {
            if (!allowedTypes.includes(file.type)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Archivo no válido',
                    text: 'Por favor, selecciona solo archivos de imagen (JPEG, PNG, GIF, WEBP)',
                });
                e.target.value = '';
                preview.style.display = 'none';
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    // Agregar eventos a los botones de crear y cerrar modal
    document.getElementById('openCreateModal').addEventListener('click', openCreateModal);
    document.getElementById('closeCreateModal').addEventListener('click', closeCreateModal);
    document.getElementById('createSection').addEventListener('click', createSection);
});
