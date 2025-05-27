import API_BASE_URL from "../config.js";

// Verificar autenticación
const token = localStorage.getItem('token');
if (!token) {
    console.error('No token found');
    window.location.replace('/Dashboard CAA/Front-workspace/login/login.html');
}
const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

// Elemento donde se mostrarán las notas
const notesGrid = document.querySelector('.notes-grid');
const groupNotesGrid = document.querySelector('#groupNotes');
const myNotesGrid = document.querySelector('#myNotes');

// Función para crear una tarjeta de nota
function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    
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
            throw new Error('Error al crear la nota');
        }

        const result = await response.json();
        // Recargar las notas para mostrar la nueva
        await loadNotes();
        
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo crear la nota'
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
                throw new Error('Error al actualizar el título');
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
                title: 'Error',
                text: 'No se pudo actualizar el título de la nota'
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
                throw new Error('Error al eliminar la nota');
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
                title: 'Error',
                text: 'No se pudo eliminar la nota'
            });
        }
    }
}

// Exponer las funciones al ámbito global para que puedan ser llamadas desde el HTML
window.editNoteTitle = editNoteTitle;
window.deleteNote = deleteNote;

// Cargar las notas cuando se carga la página
document.addEventListener('DOMContentLoaded', loadNotes);
