import API_BASE_URL from "../config.js";
import { authService } from '../auth-service.js';

// Verificar autenticación
if (!authService.isAuthenticated()) {
    authService.redirectToLogin();
    // Si la redirección no funciona, el código no debería continuar
    throw new Error('No authentication');
}

// Función para extraer el ID del usuario del token
function getUserIdFromToken(token) {
    try {
        // Remover 'Bearer ' si existe
        const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
        // Obtener la parte de datos del token (la segunda parte)
        const base64Url = cleanToken.split('.')[1];
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

// Obtener token de autenticación
const token = authService.getToken();
const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

// Elemento donde se mostrarán las notas
const notesGrid = document.querySelector('.notes-grid');
const groupNotesGrid = document.querySelector('#groupNotes');
const myNotesGrid = document.querySelector('#myNotes');

// Función para crear una tarjeta de nota
function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    
    card.onclick = (e) => {
        e.stopPropagation();
        window.location.href = `nota.html?id=${note._id.$oid}`;
    };
    // Convertir el ObjectId a string
    const noteId = note._id.$oid || note._id.toString();
    
    // Crear el contenedor para el título (para que sea clickeable)
    const titleContainer = document.createElement('div');
    titleContainer.className = 'note-title-container';
    titleContainer.onclick = (e) => {
        // Evitar que el clic se propague a los botones
        if (e.target === titleContainer || e.target === title) {
            window.location.href = `nota.html?id=${noteId}`;
        }
    };
    
    const title = document.createElement('h3');
    title.textContent = note.titulo;
    titleContainer.appendChild(title);
    
    // Crear el contenedor para los botones
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'note-buttons';
    
    // Botón de editar
    const editButton = document.createElement('button');
    editButton.className = 'note-btn edit-btn';
    editButton.innerHTML = '<i class="bx bx-edit"></i>';
    editButton.title = 'Editar título';
    editButton.onclick = (e) => {
        e.stopPropagation(); // Evitar que se propague el clic a la tarjeta
        editNoteTitle(noteId, note.titulo);
    };
    
    // Botón de agregar usuarios
    const addUsersButton = document.createElement('button');
    addUsersButton.className = 'note-btn add-users-btn';
    addUsersButton.innerHTML = '<i class="bx bx-user-plus"></i>';
    addUsersButton.title = 'Agregar usuarios';
    addUsersButton.onclick = (e) => {
        e.stopPropagation(); // Evitar que se propague el clic a la tarjeta
        addUsersToNote(noteId, note.titulo);
    };
    
    // Botón de eliminar
    const deleteButton = document.createElement('button');
    deleteButton.className = 'note-btn delete-btn';
    deleteButton.innerHTML = '<i class="bx bx-trash"></i>';
    deleteButton.title = 'Eliminar nota';
    deleteButton.onclick = (e) => {
        e.stopPropagation(); // Evitar que se propague el clic a la tarjeta
        deleteNote(noteId, note.titulo);
    };
    
    // Agregar botones al contenedor
    buttonsContainer.appendChild(editButton);
    buttonsContainer.appendChild(addUsersButton);
    buttonsContainer.appendChild(deleteButton);
    
    // Agregar elementos a la tarjeta
    card.appendChild(titleContainer);
    card.appendChild(buttonsContainer);
    
    return card;
}

// Función para cargar las notas
async function loadNotes() {
    try {
        const response = await fetch(`${API_BASE_URL}/notes`, {
            headers: {
                'Authorization': authToken
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar las notas');
        }

        const notes = await response.json();
        // Una nota es grupal cuando tiene 2 o más usuarios en el array
        const groupNotes = notes.filter(note => note.usuarios && note.usuarios.length >= 2);
        // Una nota es individual cuando tiene 1 o ningún usuario en el array
        const myNotes = notes.filter(note => !note.usuarios || note.usuarios.length < 2);
        
        // Limpiar el grid
        notesGrid.innerHTML = '';
        groupNotesGrid.innerHTML = '';
        myNotesGrid.innerHTML = '';

        // Agregar notas grupales (con 2 o más usuarios) al grid de notas grupales
        groupNotes.forEach(note => {
            const card = createNoteCard(note);
            groupNotesGrid.appendChild(card);
        });
        
        // Agregar notas individuales al grid de mis notas
        myNotes.forEach(note => {
            const card = createNoteCard(note);
            myNotesGrid.appendChild(card);
        });

    } catch (error) {
        console.error('Error:', error);
        // Aquí podrías mostrar un mensaje de error al usuario
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar las notas'
        });
    }
}

// Manejar el botón de crear nueva nota
document.querySelector('.create-note-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch(`${API_BASE_URL}/createNote`, {
            method: 'POST',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                titulo: 'Nueva Nota',
                usuarios: [token] // El usuario actual
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

        const result = await response.json();
        // Recargar las notas para mostrar la nueva
        await loadNotes();
        
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error al crear la nota',
            text: error.message || 'No se pudo crear la nota'
        });
    }
});

// Función para editar el título de una nota
async function editNoteTitle(noteId, currentTitle) {
    // Mostrar un cuadro de diálogo para editar el título
    const { value: newTitle } = await Swal.fire({
        title: 'Editar título',
        input: 'text',
        inputLabel: 'Nuevo título',
        inputValue: currentTitle,
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) {
                return 'Debes ingresar un título';
            }
        }
    });

    if (newTitle) {
        try {
            // Llamar al endpoint para actualizar el título
            const response = await fetch(`${API_BASE_URL}/updateNote/${noteId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': authToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    titulo: newTitle
                })
            });

            if (!response.ok) {
                let errorMessage = 'Error al actualizar el título';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.msg || errorData.message || errorMessage;
                } catch (parseError) {
                    console.error('Error al parsear respuesta de error:', parseError);
                }
                throw new Error(errorMessage);
            }

            // Recargar las notas para mostrar el cambio
            await loadNotes();
            
            // Mostrar mensaje de éxito
            Swal.fire({
                icon: 'success',
                title: 'Título actualizado',
                text: 'El título de la nota ha sido actualizado correctamente',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error al actualizar el título',
                text: error.message || 'No se pudo actualizar el título de la nota'
            });
        }
    }
}

// Función para eliminar una nota
async function deleteNote(noteId, noteTitle) {
    // Mostrar confirmación antes de eliminar
    const result = await Swal.fire({
        title: '¿Eliminar nota?',
        text: `¿Estás seguro de que deseas eliminar la nota "${noteTitle}"? Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            // Llamar al endpoint para eliminar la nota
            const response = await fetch(`${API_BASE_URL}/deleteNote/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': authToken
                }
            });

            if (!response.ok) {
                let errorMessage = 'Error al eliminar la nota';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.msg || errorData.message || errorMessage;
                } catch (parseError) {
                    console.error('Error al parsear respuesta de error:', parseError);
                }
                throw new Error(errorMessage);
            }

            // Recargar las notas para reflejar el cambio
            await loadNotes();
            
            // Mostrar mensaje de éxito
            Swal.fire({
                icon: 'success',
                title: 'Nota eliminada',
                text: 'La nota ha sido eliminada correctamente',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error al eliminar la nota',
                text: error.message || 'No se pudo eliminar la nota'
            });
        }
    }
}

// Función para agregar usuarios a una nota
async function addUsersToNote(noteId, noteTitle) {
    try {
        // Obtener el ID del usuario actual
        const currentUserId = getUserIdFromToken(token);
        console.log('ID del usuario actual:', currentUserId);
        
        // Primero, obtener la lista de usuarios disponibles
        const usersResponse = await fetch(`${API_BASE_URL}/getUsersForNotes`, {
            headers: {
                'Authorization': authToken
            }
        });
        
        if (!usersResponse.ok) {
            throw new Error('Error al cargar usuarios');
        }
        
        const allUsers = await usersResponse.json();
        
        // Filtrar para excluir al usuario actual
        const users = allUsers.filter(user => {
            console.log('Comparando:', user._id, 'con', currentUserId);
            return user._id !== currentUserId;
        });
        
        // Obtener la información de la nota para saber qué usuarios ya están
        const noteResponse = await fetch(`${API_BASE_URL}/getNote/${noteId}`, {
            headers: {
                'Authorization': authToken
            }
        });
        
        if (!noteResponse.ok) {
            throw new Error('Error al cargar la nota');
        }
        
        const noteData = await noteResponse.json();
        const currentUsers = noteData.usuarios || [];
        
        // Crear checkboxes HTML para los usuarios
        const usersCheckboxes = users.map(user => {
            const isChecked = currentUsers.includes(user._id) ? 'checked' : '';
            return `
                <div class="usuario-item" style="display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid #eee;">
                    <input type="checkbox" id="user-${user._id}" value="${user._id}" ${isChecked} style="cursor: pointer;">
                    <label for="user-${user._id}" style="cursor: pointer; flex: 1; margin: 0;">${user.email || user.nombre || user._id}</label>
                </div>
            `;
        }).join('');
        
        // Mostrar modal con lista de usuarios
        const { value: confirmed } = await Swal.fire({
            title: `Agregar usuarios a "${noteTitle}"`,
            html: `
                <div style="text-align: left;">
                    <div id="usuarios-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 10px;">
                        ${usersCheckboxes}
                    </div>
                    <p style="margin-top: 10px; font-size: 0.9em; color: #666;">Los usuarios marcados ya están en la nota</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar cambios',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const checkboxes = document.querySelectorAll('#usuarios-list input[type="checkbox"]:checked');
                const selected = Array.from(checkboxes).map(cb => cb.value);
                return selected;
            }
        });
        
        if (confirmed) {
            // Llamar al endpoint para actualizar usuarios (envía todos los seleccionados)
            const addResponse = await fetch(`${API_BASE_URL}/updateNote/${noteId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': authToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuarios: confirmed
                })
            });
            
            if (!addResponse.ok) {
                let errorMessage = 'Error al actualizar usuarios';
                try {
                    const errorData = await addResponse.json();
                    errorMessage = errorData.msg || errorData.message || errorMessage;
                } catch (parseError) {
                    console.error('Error al parsear respuesta de error:', parseError);
                }
                throw new Error(errorMessage);
            }
            
            // Recargar las notas para mostrar los cambios
            await loadNotes();
            
            // Mostrar mensaje de éxito
            Swal.fire({
                icon: 'success',
                title: 'Usuarios actualizados',
                text: `La nota ahora tiene ${confirmed.length} usuario(s)`,
                timer: 1500,
                showConfirmButton: false
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error al actualizar usuarios',
            text: error.message || 'No se pudieron actualizar los usuarios'
        });
    }
}

// Exponer las funciones al ámbito global para que puedan ser llamadas desde el HTML
window.editNoteTitle = editNoteTitle;
window.deleteNote = deleteNote;
window.addUsersToNote = addUsersToNote;

// Cargar las notas cuando se carga la página
document.addEventListener('DOMContentLoaded', loadNotes);
