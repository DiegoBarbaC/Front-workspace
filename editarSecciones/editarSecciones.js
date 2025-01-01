async function loadCardsFromAPI() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            window.location.replace('../Front-workspace/login/login.html');
            return;
        }

        // Asegurar que el token tenga el formato correcto
        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        console.log('Token de autorización:', authToken); // Debug

        const response = await fetch('http://localhost:5000/user/sections', {
            method: 'GET',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            }
        });

        const responseData = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', responseData);

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.replace('../Front-workspace/login/login.html');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(responseData)}`);
        }

        const sections = responseData;
        console.log('Secciones recibidas:', sections); // Debug

        const tableBody = document.getElementById('sectionsTable').getElementsByTagName('tbody')[0];
            tableBody.innerHTML = ''; // Limpiar el contenido anterior
        
            sections.forEach(section => {
                const row = tableBody.insertRow();
                
                row.insertCell(0).innerText = section.titulo; // Título
                row.insertCell(1).innerText = section.descripcion; // Descripción
                row.insertCell(2).innerHTML = `<a href="${section.link}">${section.link}</a>`; // Link
                row.insertCell(3).innerHTML = section.imagen ? `<img src="data:image/jpeg;base64,${section.imagen}" alt="${section.titulo}" style="width: 50px; height: auto;">` : 'Sin imagen'; // Imagen
                
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

function editSection(sectionId) {
    currentSectionId = sectionId;
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found');
        window.location.replace('../Front-workspace/login/login.html');
        return;
    }
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    fetch(`http://localhost:5000/user/sections/${sectionId}`, {
        method: 'GET',
        headers: {
            'Authorization': authToken
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al obtener la sección');
        }
        return response.json();
    })
    .then(section => {
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
    })
    .catch(error => console.error('Error:', error));
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('previewImg').style.display = 'none';
    document.getElementById('editForm').reset();
    document.body.classList.remove('modal-open'); // Remover clase al cerrar el modal
}

function saveChanges() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found');
        window.location.replace('../Front-workspace/login/login.html');
        return;
    }
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    const formData = new FormData();
    formData.append('titulo', document.getElementById('editTitle').value);
    formData.append('descripcion', document.getElementById('editDescription').value);
    formData.append('link', document.getElementById('editLink').value);

    const imageFile = document.getElementById('editImage').files[0];
    if (imageFile) {
        formData.append('imagen', imageFile);
    }

    fetch(`http://localhost:5000/editSection/${currentSectionId}`, {
        method: 'PUT',
        headers: {
            'Authorization': authToken
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al actualizar la sección');
        }
        return response.json();
    })
    .then(data => {
        console.log('Sección actualizada:', data);
        closeModal();
        window.location.reload();
    })
    .catch(error => console.error('Error:', error));
}

// Función para eliminar la sección
function deleteSection(sectionId) {
    if (confirm('¿Estás seguro de que deseas eliminar esta sección?')) {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            window.location.replace('../Front-workspace/login/login.html');
            return;
        }
        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        fetch(`http://localhost:5000/user/sections/${sectionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': authToken
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al eliminar la sección');
            }
            return response.json();
        })
        .then(data => {
            console.log('Sección eliminada:', data);
            window.location.reload(); // Recargar las secciones para reflejar los cambios
        })
        .catch(error => console.error('Error al eliminar la sección:', error));
}}

// Funciones globales para los modales
function openCreateModal() {
    document.getElementById('createModal').style.display = 'block';
    document.body.classList.add('modal-open');
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    document.getElementById('createPreviewImg').style.display = 'none';
    document.getElementById('createForm').reset();
    document.body.classList.remove('modal-open');
}

function createSection() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found');
        window.location.replace('../Front-workspace/login/login.html');
        return;
    }
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    // Validar que todos los campos estén llenos
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

    fetch('http://localhost:5000/createGlobalSection', {
        method: 'POST',
        headers: {
            'Authorization': authToken
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al crear la sección');
        }
        return response.json();
    })
    .then(data => {
        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: 'Sección creada correctamente',
        }).then(() => {
            closeCreateModal();
            window.location.reload();
        });
    })
    .catch(error => {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo crear la sección',
        });
    });
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