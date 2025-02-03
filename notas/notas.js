import API_BASE_URL from "../config.js";

console.log('Iniciando script de notas.js');

const token = localStorage.getItem('token');
if (!token) {
    console.error('No token found');
    window.location.replace('/Dashboard CAA/Front-workspace/login/login.html');
    
}
const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

// Initialize Socket.IO
console.log('Inicializando Socket.IO');
const socket = io(API_BASE_URL, {
    auth: {
        token: authToken
    }
});

let quill;
let currentNoteId = null;
let isTyping = false;
let typingTimeout = null;

// Initialize Quill editor
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM Cargado, inicializando Quill');
    
    const editorElement = document.querySelector('#editor');
    if (!editorElement) {
        console.error('No se encontró el elemento #editor');
        return;
    }
    console.log('Elemento editor encontrado:', editorElement);

    const toolbarOptions = [
        ['bold', 'italic', 'underline'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }]
    ];

    try {
        console.log('Creando instancia de Quill');
        quill = new Quill('#editor', {
            theme: 'snow',
            modules: {
                toolbar: toolbarOptions
            },
            placeholder: 'Comienza a escribir tu nota aquí...'
        });
        console.log('Quill creado exitosamente:', quill);
    } catch (error) {
        console.error('Error al crear Quill:', error);
    }

    // Obtener el ID de la nota de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const noteId = urlParams.get('id');
    console.log('ID de nota obtenido de URL:', noteId);

    if (noteId) {
        try {
            console.log('Intentando cargar nota con ID:', noteId);
            await loadNote(noteId);
            joinNoteRoom(noteId);
        } catch (error) {
            console.error('Error al cargar la nota:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar la nota'
            });
        }
    } else {
        console.log('No se encontró ID de nota en la URL');
    }

    // Manejar cambios en el editor
    quill.on('text-change', function(delta, oldDelta, source) {
        if (source === 'user' && currentNoteId) {
            console.log('Cambio en el editor detectado');
            // Limpiar el timeout anterior si existe
            if (typingTimeout) clearTimeout(typingTimeout);

            // Establecer un nuevo timeout
            typingTimeout = setTimeout(() => {
                const content = quill.root.innerHTML;
                console.log('Enviando actualización de contenido:', content);
                socket.emit('update_note_content', {
                    note_id: currentNoteId,
                    content: content
                });
            }, 1000); // Esperar 1 segundo después del último cambio
        }
    });

    /* Configurar el botón de guardar
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            if (!currentNoteId) return;
            
            const content = quill.root.innerHTML;
            console.log('Guardando contenido:', content);
            socket.emit('update_note_content', {
                note_id: currentNoteId,
                content: content
            });

            Swal.fire({
                icon: 'success',
                title: '¡Guardado!',
                text: 'La nota se ha guardado correctamente',
                timer: 1500,
                showConfirmButton: false
            });
        });
    }*/
});

// Unirse a la sala de la nota
function joinNoteRoom(noteId) {
    if (!noteId) return;
    
    currentNoteId = noteId;
    console.log('Uniendo a la sala de nota:', noteId);
    socket.emit('join_note', { note_id: noteId });
    console.log(`Unido a la sala de nota: ${noteId}`);
}

// Función para cargar una nota específica
async function loadNote(noteId) {
    try {
        console.log('Cargando nota:', noteId);
        
        // Asegurarnos de que el ID sea un string válido
        const id = typeof noteId === 'string' ? noteId : 
                  noteId.$oid ? noteId.$oid : 
                  noteId.toString();
        
        const url = `${API_BASE_URL}/getNote/${id}`;
        console.log('URL de la petición:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error del servidor:', errorData);
            throw new Error(`Error del servidor: ${response.status} - ${errorData}`);
        }

        const note = await response.json();
        console.log('Nota cargada:', note);
        
        // Establecer el contenido en el editor
        if (quill && note.contenido) {
            console.log('Estableciendo contenido en el editor:', note.contenido);
            quill.root.innerHTML = note.contenido;
        } else {
            console.warn('No se pudo establecer el contenido:', { 
                quillExists: !!quill, 
                contenidoExists: !!note.contenido 
            });
        }

    } catch (error) {
        console.error('Error detallado:', {
            message: error.message,
            stack: error.stack,
            noteId: noteId
        });
        throw error;
    }
}

// Manejar eventos de Socket.IO
socket.on('note_updated', (data) => {
    console.log('Nota actualizada:', data);
    if (quill && data.content) {
        const currentContent = quill.root.innerHTML;
        if (currentContent !== data.content) {
            console.log('Actualizando contenido en el editor:', data.content);
            quill.root.innerHTML = data.content;
        }
    }
});

socket.on('user_joined', (data) => {
    console.log('Usuario conectado:', data.msg);
    Swal.fire({
        icon: 'info',
        title: '¡Usuario conectado!',
        text: data.msg,
        timer: 1500,
        toast: true,
        position: 'top-end',
        showConfirmButton: false
    });
});

socket.on('user_left', (data) => {
    console.log('Usuario desconectado:', data.msg);
    Swal.fire({
        icon: 'info',
        title: 'Usuario desconectado',
        text: data.msg,
        timer: 1500,
        toast: true,
        position: 'top-end',
        showConfirmButton: false
    });
});

socket.on('error', (data) => {
    console.error('Error del socket:', data.msg);
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: data.msg
    });
});

// Limpiar al salir
window.addEventListener('beforeunload', () => {
    if (currentNoteId) {
        console.log('Saliendo de la sala de nota:', currentNoteId);
        socket.emit('leave_note', { note_id: currentNoteId });
    }
});
