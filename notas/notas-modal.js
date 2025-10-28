import API_BASE_URL from '../config.js';
import { authService } from '../auth-service.js';

document.addEventListener('DOMContentLoaded', function() {
    // Obtener elementos del DOM
    const createNoteBtn = document.getElementById('btn-create-note');
    
    // Verificar autenticación
    if (!authService.isAuthenticated()) {
        authService.redirectToLogin();
        return;
    }
    
    // Obtener token de autenticación
    const token = authService.getToken();
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    // Event listener para el botón de crear nota
    if (createNoteBtn) {
        createNoteBtn.addEventListener('click', openCreateModal);
    }
    
    // Función para abrir el modal de creación de notas con SweetAlert2
    async function openCreateModal() {
        try {
            // Cargar usuarios disponibles
            const response = await fetch(`${API_BASE_URL}/getUsersForNotes`, {
                headers: {
                    'Authorization': authToken
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al cargar usuarios');
            }
            
            const users = await response.json();
            
            // Obtener el ID del usuario actual
            const currentUserId = getUserIdFromToken(token);
            
            // Crear checkboxes HTML para los usuarios (excepto el usuario actual)
            const usersCheckboxes = users
                .filter(user => user._id !== currentUserId)
                .map(user => {
                    return `
                        <div class="usuario-item" style="display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid #eee;">
                            <input type="checkbox" id="user-${user._id}" value="${user._id}" style="cursor: pointer;">
                            <label for="user-${user._id}" style="cursor: pointer; flex: 1; margin: 0;">${user.email || user.nombre || user._id}</label>
                        </div>
                    `;
                }).join('');
            
            // Mostrar modal con SweetAlert2
            const { value: formValues } = await Swal.fire({
                title: 'Crear Nueva Nota',
                html: `
                    <div style="text-align: left;">
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label for="titulo-nota" style="display: block; margin-bottom: 8px; font-weight: bold;">Título*:</label>
                            <input type="text" id="titulo-nota" placeholder="Título de la nota" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; box-sizing: border-box;">
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 10px; font-weight: bold;">Participantes:</label>
                            <div id="usuarios-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 10px;">
                                ${usersCheckboxes}
                            </div>
                            <p style="margin-top: 10px; font-size: 0.9em; color: #666;">Selecciona los usuarios que tendrán acceso a esta nota</p>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Crear Nota',
                cancelButtonText: 'Cancelar',
                width: '600px',
                focusConfirm: false,
                preConfirm: () => {
                    const tituloInput = document.getElementById('titulo-nota');
                    const titulo = tituloInput ? tituloInput.value.trim() : '';
                    const checkboxes = document.querySelectorAll('#usuarios-list input[type="checkbox"]:checked');
                    const selectedUsers = Array.from(checkboxes).map(cb => cb.value);
                    
                    if (!titulo) {
                        Swal.showValidationMessage('El título es obligatorio');
                        return false;
                    }
                    
                    return { titulo, selectedUsers };
                }
            });
            
            if (formValues) {
                await handleCreateNote(formValues.titulo, formValues.selectedUsers);
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo abrir el modal de creación'
            });
        }
    }
    
    // Función para manejar la creación de una nota
    async function handleCreateNote(titulo, selectedUsers) {
        try {
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
                    let errorMessage = 'Error al crear la nota';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.msg || errorData.message || errorMessage;
                    } catch (parseError) {
                        console.error('Error al parsear respuesta de error:', parseError);
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                console.log('Nota creada:', data);
                
                // Mostrar mensaje de éxito y redirigir
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
                    title: 'Error al crear la nota',
                    text: error.message || 'No se pudo crear la nota'
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
