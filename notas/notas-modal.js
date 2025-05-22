import API_BASE_URL from '../config.js';

document.addEventListener('DOMContentLoaded', function() {
    // Obtener elementos del DOM
    const createNoteBtn = document.getElementById('btn-create-note');
    const createNoteModal = document.getElementById('createNoteModal');
    const closeCreateModalBtn = document.getElementById('close-create-modal');
    const cancelCreateModalBtn = document.getElementById('cancel-create-modal');
    const createNoteForm = document.getElementById('createNoteForm');
    const selectAllCheckbox = document.getElementById('selectAll');
    const usuariosList = document.getElementById('usuariosList');
    
    // Obtener token de autenticación
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found');
        window.location.replace('/Dashboard CAA/Front-workspace/login/login.html');
        return;
    }
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    // Event listeners
    if (createNoteBtn) {
        createNoteBtn.addEventListener('click', openCreateModal);
    }
    
    if (closeCreateModalBtn) {
        closeCreateModalBtn.addEventListener('click', closeCreateModal);
    }
    
    if (cancelCreateModalBtn) {
        cancelCreateModalBtn.addEventListener('click', closeCreateModal);
    }
    
    if (createNoteForm) {
        createNoteForm.addEventListener('submit', handleCreateNote);
    }
    
    // Cargar usuarios al iniciar
    loadUsers();
    
    // Función para abrir el modal de creación de notas
    function openCreateModal() {
        if (createNoteModal) {
            createNoteModal.style.display = 'block';
            // Asegurarse de que los usuarios estén cargados
            if (!usuariosList.children.length) {
                loadUsers();
            }
        }
    }
    
    // Función para cerrar el modal de creación de notas
    function closeCreateModal() {
        if (createNoteModal) {
            createNoteModal.style.display = 'none';
            // Limpiar el formulario
            if (createNoteForm) {
                createNoteForm.reset();
            }
        }
    }
    
    // Función para cargar la lista de usuarios
    async function loadUsers() {
        try {
            console.log('Intentando cargar usuarios desde:', `${API_BASE_URL}/getUsersForNotes`);
            
            const response = await fetch(`${API_BASE_URL}/getUsersForNotes`, {
                headers: {
                    'Authorization': authToken
                }
            });
            
            console.log('Respuesta del servidor:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error en la respuesta:', errorText);
                throw new Error(`Error al cargar usuarios: ${response.status} ${response.statusText}`);
            }
            
            const users = await response.json();
            console.log('Usuarios recibidos:', users);
            
            // Limpiar la lista
            usuariosList.innerHTML = '';
            
            // Obtener el ID del usuario actual
            const currentUserId = getUserIdFromToken(token);
            console.log('ID del usuario actual:', currentUserId);
            
            // Verificar si hay usuarios para mostrar
            if (!Array.isArray(users) || users.length === 0) {
                console.log('No hay usuarios para mostrar o no es un array');
                const noUsersMessage = document.createElement('div');
                noUsersMessage.textContent = 'No hay usuarios disponibles';
                usuariosList.appendChild(noUsersMessage);
                return;
            }
            
            // Agregar cada usuario a la lista (excepto el usuario actual)
            users.forEach(user => {
                console.log('Procesando usuario:', user);
                // No mostrar al usuario actual en la lista de participantes
                if (user._id !== currentUserId) {
                    const userItem = document.createElement('div');
                    userItem.className = 'usuario-item';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `user-${user._id}`;
                    checkbox.value = user._id;
                    checkbox.name = 'usuarios';
                    
                    const label = document.createElement('label');
                    label.htmlFor = `user-${user._id}`;
                    label.textContent = user.email || user.nombre || user._id;
                    
                    userItem.appendChild(checkbox);
                    userItem.appendChild(label);
                    
                    usuariosList.appendChild(userItem);
                }
            });
            
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los usuarios'
            });
        }
    }
    
    // Función para seleccionar/deseleccionar todos los usuarios
    window.toggleAllUsers = function() {
        const checkboxes = usuariosList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
    };
    
    // Función para manejar la creación de una nota
    async function handleCreateNote(event) {
        event.preventDefault();
        
        try {
            const titulo = document.getElementById('titulo').value;
            
            if (!titulo) {
                throw new Error('El título es obligatorio');
            }
            
            // Obtener usuarios seleccionados
            const selectedUsers = Array.from(
                document.querySelectorAll('#usuariosList input[type="checkbox"]:checked')
            ).map(checkbox => checkbox.value);
            
            // Obtener el ID del usuario actual
            const currentUserId = getUserIdFromToken(token);
            
            // Añadir al usuario actual a la lista de usuarios
            const usuarios = [currentUserId, ...selectedUsers];
            
            // Crear la nota
            try {
                const response = await fetch(`${API_BASE_URL}/createNote`, {
                    method: 'POST',
                    headers: {
                        'Authorization': authToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        titulo,
                        contenido: '<p><br></p>', // Contenido inicial con formato Quill válido
                        usuarios
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.msg || 'Error al crear la nota');
                }

                const data = await response.json();
                console.log('Nota creada:', data);

                // Cerrar el modal
                closeCreateModal();
                
                // Mostrar mensaje de éxito
                Swal.fire({
                    icon: 'success',
                    title: 'Nota creada',
                    text: 'La nota se ha creado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    // Redirigir a la página de la nota después de mostrar el mensaje
                    // Usamos data.id que es lo que devuelve nuestro endpoint
                    window.location.href = `nota.html?id=${data.id}`;
                });

            } catch (error) {
                console.error('Error al crear la nota:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message
                });
            }

        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo crear la nota'
            });
        }
    }
    
    // Función para extraer el ID del usuario del token
    function getUserIdFromToken(token) {
        try {
            // Obtener la parte de datos del token (la segunda parte)
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            return payload.identity || payload.sub || payload.id;
        } catch (error) {
            console.error('Error al decodificar el token:', error);
            return null;
        }
    }
});
