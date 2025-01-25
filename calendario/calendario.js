// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay token
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('../login/login.html');
        return;
    }

    // Inicializar el calendario
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: 'es',
        buttonText: {
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día'
        },
        editable: true,
        selectable: true,
        events: loadEvents,
        eventClick: function(info) {
            showEventDetails(info.event);
        }
    });
    
    calendar.render();

    // Cargar la lista de usuarios para el select
    loadUsers();

    // Event listener para el formulario de crear evento
    document.getElementById('createEventForm').addEventListener('submit', handleCreateEvent);

    // Función para cerrar sesión
    function logout() {
        Swal.fire({
            title: '¿Cerrar sesión?',
            text: "¿Está seguro que desea cerrar sesión?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('token');
                window.location.href = '../login/login.html';
            }
        });
    }

    // Agregar evento de click al botón de logout
    const logoutButton = document.querySelector('.logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    // TOGGLE SIDEBAR
    const menuBar = document.querySelector('#content nav .bx.bx-menu');
    const sidebar = document.getElementById('sidebar');
    
    if (menuBar) {
        menuBar.addEventListener('click', function () {
            sidebar.classList.toggle('hide');
        });
    }

    // SWITCH THEME
    const switchMode = document.getElementById('switch-mode');
    
    if (switchMode) {
        switchMode.addEventListener('change', function () {
            if (this.checked) {
                document.body.classList.add('dark');
            } else {
                document.body.classList.remove('dark');
            }
        });
    }
});

// Función para cargar usuarios en la lista de checkboxes
async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        
        const response = await fetch('http://localhost:5000/getAllUsers', {
            method: 'GET',
            headers: {
                'Authorization': authToken
            }
        });

        if (!response.ok) throw new Error('Error al obtener usuarios');
        
        const data = await response.json();
        const users = JSON.parse(data.usuarios);
        const usuariosList = document.getElementById('usuariosList');
        
        // Limpiar lista existente
        usuariosList.innerHTML = '';
        
        // Agregar checkboxes para cada usuario
        users.forEach(user => {
            const div = document.createElement('div');
            div.className = 'usuario-checkbox';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `user-${user._id.$oid || user._id}`;
            checkbox.value = user._id.$oid || user._id;
            checkbox.className = 'user-checkbox';
            
            const label = document.createElement('label');
            label.htmlFor = `user-${user._id.$oid || user._id}`;
            label.textContent = user.email;
            
            div.appendChild(checkbox);
            div.appendChild(label);
            usuariosList.appendChild(div);
        });
        
        // Agregar checkbox para seleccionar todos los usuarios
        const selectAllCheckbox = document.getElementById('selectAll');
        if (!selectAllCheckbox) {
            const selectAllDiv = document.createElement('div');
            selectAllDiv.className = 'usuario-checkbox';
            
            const selectAllCheckbox = document.createElement('input');
            selectAllCheckbox.type = 'checkbox';
            selectAllCheckbox.id = 'selectAll';
            selectAllCheckbox.className = 'user-checkbox';
            
            const selectAllLabel = document.createElement('label');
            selectAllLabel.htmlFor = 'selectAll';
            selectAllLabel.textContent = 'Seleccionar todos';
            
            selectAllDiv.appendChild(selectAllCheckbox);
            selectAllDiv.appendChild(selectAllLabel);
            usuariosList.appendChild(selectAllDiv);
            
            // Agregar evento de click al checkbox de seleccionar todos
            selectAllCheckbox.addEventListener('click', toggleAllUsers);
        }
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
function toggleAllUsers() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const userCheckboxes = document.querySelectorAll('.user-checkbox');
    
    userCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// Función para manejar la creación de eventos
async function handleCreateEvent(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('../login/login.html');
        return;
    }
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    // Obtener valores del formulario
    const titulo = document.getElementById('titulo').value;
    const descripcion = document.getElementById('descripcion').value;
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    
    // Obtener usuarios seleccionados
    const usuariosSeleccionados = Array.from(document.querySelectorAll('.user-checkbox:checked'))
        .map(checkbox => checkbox.value);

    // Validar que al menos un usuario esté seleccionado
    if (usuariosSeleccionados.length === 0) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Debe seleccionar al menos un usuario'
        });
        return;
    }

    // Validar fechas
    if (new Date(fechaInicio) > new Date(fechaFin)) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'La fecha de inicio debe ser anterior a la fecha de fin'
        });
        return;
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('descripcion', descripcion);
    formData.append('fechaInicio', fechaInicio);
    formData.append('fechaFin', fechaFin);
    usuariosSeleccionados.forEach(usuario => {
        formData.append('usuarios', usuario);
    });

    try {
        const response = await fetch('http://localhost:5000/addEvent', {
            method: 'POST',
            headers: {
                'Authorization': authToken
            },
            body: formData
        });

        if (!response.ok) throw new Error('Error al crear el evento');

        const data = await response.json();
        
        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: 'Evento creado correctamente'
        }).then(() => {
            closeCreateModal();
            document.getElementById('createEventForm').reset();
            document.getElementById('selectAll').checked = false;
            window.location.reload();
        });
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo crear el evento'
        });
    }
}

// Funciones para el modal
function openCreateModal() {
    document.getElementById('createModal').style.display = 'block';
    document.body.classList.add('modal-open');
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    document.getElementById('createEventForm').reset();
    document.body.classList.remove('modal-open');
}

// Función para mostrar detalles del evento
function showEventDetails(event) {
    // Llenar el modal con los datos del evento
    document.getElementById('eventId').value = event.id;
    document.getElementById('viewTitulo').value = event.title;
    document.getElementById('viewDescripcion').value = event.extendedProps.descripcion || '';
    
    // Formatear las fechas para el input datetime-local
    const startDate = new Date(event.start);
    const endDate = new Date(event.end || event.start);
    
    document.getElementById('viewFechaInicio').value = startDate.toISOString().slice(0, 16);
    document.getElementById('viewFechaFin').value = endDate.toISOString().slice(0, 16);
    
    // Mostrar los usuarios asignados
    const usuariosList = document.getElementById('viewUsuariosList');
    usuariosList.innerHTML = '';
    
    // Habilitar los campos para edición directa
    document.getElementById('viewTitulo').disabled = false;
    document.getElementById('viewDescripcion').disabled = false;
    document.getElementById('viewFechaInicio').disabled = false;
    document.getElementById('viewFechaFin').disabled = false;
    
    // Mostrar los botones
    document.querySelector('.btn-delete').style.display = 'block';
    document.querySelector('.btn-edit').style.display = 'block';
    document.querySelector('.btn-save').style.display = 'none';
    
    // Mostrar el modal
    const modal = document.getElementById('viewEventModal');
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
}

// Función para manejar el clic en el botón editar
async function handleEditEvent() {
    const eventId = String(document.getElementById('eventId').value);
    const token = localStorage.getItem('token');
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    

    // Crear FormData con los datos del evento
    const formData = new FormData();
    formData.append('titulo', document.getElementById('viewTitulo').value);
    formData.append('descripcion', document.getElementById('viewDescripcion').value);
    formData.append('fechaInicio', document.getElementById('viewFechaInicio').value);
    formData.append('fechaFin', document.getElementById('viewFechaFin').value);
    
    try {
        const response = await fetch(`http://localhost:5000/updateEvent/${eventId}`, {
            method: 'PUT',
            headers: {
                'Authorization': authToken
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Error al actualizar el evento');
        }
        
        // Actualizar el calendario
        await loadEvents();
        
        // Cerrar el modal
        closeViewModal();
        
        // Mostrar mensaje de éxito
        Swal.fire({
            icon: 'success',
            title: 'Evento actualizado',
            showConfirmButton: false,
            timer: 1500
        });
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar el evento'
        });
    }
}

// Función para cerrar el modal de vista/edición
function closeViewModal() {
    document.getElementById('viewEventModal').style.display = 'none';
    document.body.classList.remove('modal-open');
    // Resetear el formulario y deshabilitar campos
    document.getElementById('viewEventForm').reset();
    document.getElementById('viewTitulo').disabled = true;
    document.getElementById('viewDescripcion').disabled = true;
    document.getElementById('viewFechaInicio').disabled = true;
    document.getElementById('viewFechaFin').disabled = true;
    // Restaurar botones
    document.querySelector('.btn-edit').style.display = 'inline-block';
    document.querySelector('.btn-save').style.display = 'none';
}

// Función para manejar la eliminación del evento
async function handleDeleteEvent() {
    const eventId = document.getElementById('eventId').value;
    const token = localStorage.getItem('token');
    authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    // Confirmar eliminación
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
        try {
            const response = await fetch(`http://localhost:5000/deleteEvent/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': authToken
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al eliminar el evento');
            }
            
            // Actualizar el calendario
            await loadEvents();
            
            // Cerrar el modal
            closeViewModal();
            
            // Mostrar mensaje de éxito
            Swal.fire({
                icon: 'success',
                title: 'Evento eliminado',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar el evento'
            });
        }
    }
}

// Función para cargar eventos
async function loadEvents(info, successCallback, failureCallback) {
    try {
        const token = localStorage.getItem('token');
        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        if (!token) return;

        const response = await fetch('http://localhost:5000/getEvents', {
            method: 'GET',
            headers: {
                'Authorization': authToken
            }
        });

        if (!response.ok) throw new Error('Error al cargar eventos');

        const data = await response.json();
        console.log('Eventos recibidos:', data.eventos);

        const events = data.eventos.map(evento => {
            return {
                id: evento.id,
                title: evento.title,
                start: new Date(evento.start),
                end: new Date(evento.end),
                extendedProps: {
                    descripcion: evento.description,
                    usuarios: evento.usuarios || [],
                    creador_id: evento.creador_id
                }
            };
        });

        console.log('Eventos formateados:', events);

        if (successCallback) {
            successCallback(events);
        }
    } catch (error) {
        console.error('Error al cargar eventos:', error);
        if (failureCallback) {
            failureCallback(error);
        }
        // Mostrar mensaje de error al usuario
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los eventos'
        });
    }
}
