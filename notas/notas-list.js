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
    card.onclick = () => window.location.href = `nota.html?id=${noteId}`;
    
    const title = document.createElement('h3');
    title.textContent = note.titulo;
    
    card.appendChild(title);
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

// Cargar las notas cuando se carga la página
document.addEventListener('DOMContentLoaded', loadNotes);
