import API_BASE_URL from "../config.js";

console.log('Iniciando script de notas.js');

const token = localStorage.getItem('token');
if (!token) {
    console.error('No token found');
    window.location.replace('/Dashboard CAA/Front-workspace/login/login.html');
}
const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

// Variables globales
let quill;
let currentNoteId = null;
let saveTimeout = null;
let lastSavedContent = '';
let isSaving = false;

// Función para cargar una nota específica
async function loadNote(noteId) {
    try {
        console.log('Cargando nota:', noteId);
        
        // Asegurarnos de que el ID sea un string válido
        const id = typeof noteId === 'string' ? noteId : 
                  noteId.$oid ? noteId.$oid : 
                  noteId.toString();
        
        currentNoteId = id;
        
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
        
        // Actualizar el título de la nota en la página
        const titleElement = document.getElementById('note-title');
        if (titleElement) {
            titleElement.textContent = note.titulo || 'Nota sin título';
        }
        
        // Establecer el contenido en el editor
        if (quill) {
            console.log('Estableciendo contenido en el editor');
            // Manejar el caso donde contenido es null, undefined o vacío
            if (note.contenido && note.contenido.trim() !== '') {
                quill.root.innerHTML = note.contenido;
            } else {
                quill.root.innerHTML = ''; // Inicializar con contenido vacío
            }
            
            lastSavedContent = quill.root.innerHTML;
            return true;
        } else {
            console.warn('No se pudo establecer el contenido: Quill no está inicializado');
            return false;
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

// Función para guardar el contenido de la nota
async function saveNoteContent() {
    if (!currentNoteId || !quill || isSaving) return;
    
    const currentContent = quill.root.innerHTML;
    
    // Si el contenido no ha cambiado, no hacer nada
    if (currentContent === lastSavedContent) {
        console.log('El contenido no ha cambiado, no se guarda');
        return;
    }
    
    isSaving = true;
    
    try {
        console.log('Guardando nota:', currentNoteId);
        
        const response = await fetch(`${API_BASE_URL}/updateNote/${currentNoteId}`, {
            method: 'PUT',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contenido: currentContent
            })
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error al guardar nota:', errorData);
            throw new Error(`Error al guardar: ${response.status} - ${errorData}`);
        }
        
        console.log('Nota guardada correctamente');
        lastSavedContent = currentContent;
        
        // Mostrar indicador de guardado (opcional)
        const saveIndicator = document.getElementById('save-indicator');
        if (saveIndicator) {
            saveIndicator.textContent = 'Guardado';
            saveIndicator.classList.add('saved');
            
            setTimeout(() => {
                saveIndicator.classList.remove('saved');
            }, 2000);
        }
        
    } catch (error) {
        console.error('Error al guardar nota:', error);
        
        // Mostrar mensaje de error
        Swal.fire({
            icon: 'error',
            title: 'Error al guardar',
            text: error.message || 'No se pudo guardar la nota'
        });
    } finally {
        isSaving = false;
    }
}

// Inicializar el editor Quill y cargar la nota
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM Cargado, inicializando Quill');
    
    // Crear indicador de guardado si no existe
    if (!document.getElementById('save-indicator')) {
        const saveIndicator = document.createElement('div');
        saveIndicator.id = 'save-indicator';
        saveIndicator.className = 'save-indicator';
        saveIndicator.textContent = 'Guardado automático activado';
        document.body.appendChild(saveIndicator);
        
        // Estilos para el indicador de guardado
        const style = document.createElement('style');
        style.textContent = `
            .save-indicator {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 14px;
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: 1000;
            }
            .save-indicator.saved {
                opacity: 1;
                background-color: rgba(40, 167, 69, 0.9);
            }
            .save-indicator.saving {
                opacity: 1;
                background-color: rgba(0, 123, 255, 0.9);
            }
            .save-indicator.error {
                opacity: 1;
                background-color: rgba(220, 53, 69, 0.9);
            }
        `;
        document.head.appendChild(style);
    }
    
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
        
        // Configurar el guardado automático cuando el usuario escribe
        quill.on('text-change', function(delta, oldDelta, source) {
            if (source === 'user' && currentNoteId) {
                // Mostrar indicador de "Guardando..."
                const saveIndicator = document.getElementById('save-indicator');
                if (saveIndicator) {
                    saveIndicator.textContent = 'Guardando...';
                    saveIndicator.classList.add('saving');
                    saveIndicator.classList.remove('saved', 'error');
                }
                
                // Limpiar el timeout anterior si existe
                if (saveTimeout) clearTimeout(saveTimeout);

                // Establecer un nuevo timeout para guardar después de 2 segundos de inactividad
                saveTimeout = setTimeout(() => {
                    saveNoteContent();
                }, 2000);
            }
        });

        // Obtener el ID de la nota de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const noteId = urlParams.get('id');
        console.log('ID de nota obtenido de URL:', noteId);

        if (noteId) {
            try {
                // Cargar la nota
                await loadNote(noteId);
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
            // Redirigir a la página de notas si no hay ID
            window.location.href = 'notas.html';
        }

    } catch (error) {
        console.error('Error al crear Quill:', error);
    }
    
    // Agregar botón de guardado manual
    const saveButton = document.createElement('button');
    saveButton.id = 'save-button';
    saveButton.className = 'save-button';
    saveButton.innerHTML = '<i class="bx bx-save"></i> Guardar';
    saveButton.addEventListener('click', () => {
        saveNoteContent();
    });
    
    // Agregar estilos para el botón
    const buttonStyle = document.createElement('style');
    buttonStyle.textContent = `
        .save-button {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background-color: #3C91E6;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 15px;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            z-index: 1000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        }
        .save-button:hover {
            background-color: #2c7dd9;
            transform: translateY(-2px);
        }
        .save-button i {
            font-size: 18px;
        }
    `;
    document.head.appendChild(buttonStyle);
    document.body.appendChild(saveButton);
});

// Guardar al salir de la página
window.addEventListener('beforeunload', (event) => {
    if (currentNoteId && quill) {
        const currentContent = quill.root.innerHTML;
        if (currentContent !== lastSavedContent) {
            // Intentar guardar síncronamente antes de salir
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', `${API_BASE_URL}/updateNote/${currentNoteId}`, false);
            xhr.setRequestHeader('Authorization', authToken);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({ contenido: currentContent }));
            
            // Mensaje para el usuario
            event.preventDefault();
            event.returnValue = 'Hay cambios sin guardar. ¿Estás seguro de que quieres salir?';
            return event.returnValue;
        }
    }
});
