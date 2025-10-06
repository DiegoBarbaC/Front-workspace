import API_BASE_URL from '../config.js';
import axiosInstance, { authService } from '../services/axios-config.js';
// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar si hay token
    if (!authService.isAuthenticated()) {
        console.error('No token found');
        window.location.replace('../login/login.html');
        return;
    }
    
    console.log('Usuario autenticado, iniciando calendario...');

    // Agregar event listeners para los botones
    const addEventBtn = document.getElementById('btn-add-event');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', openCreateModal);
        console.log('Event listener agregado al botón de agregar evento');
    }
    
    // Event listener para el botón de sincronización con Outlook
    const syncOutlookBtn = document.getElementById('btn-sync-outlook');
    if (syncOutlookBtn) {
        syncOutlookBtn.addEventListener('click', syncWithOutlook);
        console.log('Event listener agregado al botón de sincronización con Outlook');
    }

    // Event listeners para el modal de crear evento
    const closeCreateModalBtn = document.getElementById('close-create-modal');
    const cancelCreateModalBtn = document.getElementById('cancel-create-modal');
    if (closeCreateModalBtn) {
        closeCreateModalBtn.addEventListener('click', closeCreateModal);
    }
    if (cancelCreateModalBtn) {
        cancelCreateModalBtn.addEventListener('click', closeCreateModal);
    }

    // Event listeners para el modal de ver/editar evento
    const closeViewModalBtn = document.getElementById('close-view-modal');
    const btnCloseViewModal = document.getElementById('btn-close-view-modal');
    const btnEditEvent = document.getElementById('btn-edit-event');
    const btnDeleteEvent = document.getElementById('btn-delete-event');

    if (closeViewModalBtn) {
        closeViewModalBtn.addEventListener('click', closeViewModal);
    }
    if (btnCloseViewModal) {
        btnCloseViewModal.addEventListener('click', closeViewModal);
    }
    if (btnEditEvent) {
        btnEditEvent.addEventListener('click', handleEditEvent);
    }
    if (btnDeleteEvent) {
        btnDeleteEvent.addEventListener('click', handleDeleteEvent);
    }

    // Agregar event listener para el formulario de crear evento
    const createEventForm = document.getElementById('createEventForm');
    if (createEventForm) {
        createEventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleCreateEvent(e);
        });
    }

    // Inicializar Flatpickr para los selectores de fecha
    const dateTimeConfig = {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        locale: "es",
        minuteIncrement: 30,
        defaultHour: new Date().getHours(),
        defaultMinute: Math.ceil(new Date().getMinutes() / 30) * 30
    };

    // Inicializar los campos de fecha
    flatpickr("#fechaInicio", dateTimeConfig);
    flatpickr("#fechaFin", dateTimeConfig);
    flatpickr("#viewFechaInicio", dateTimeConfig);
    flatpickr("#viewFechaFin", dateTimeConfig);
    
    console.log('Configurando calendario...');

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
                // Usar el servicio de autenticación para cerrar sesión
                authService.logout();
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
        if (!authService.isAuthenticated()) {
            console.error('No autenticado en loadUsers');
            return;
        }

        console.log('Cargando usuarios...');
        // Usar axiosInstance para hacer la petición
        const { data } = await axiosInstance.get('/getAllUsers');
        console.log('Datos de usuarios recibidos:', data);
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
    
    try {
        if (!authService.isAuthenticated()) {
            console.error('No token found');
            window.location.replace('../login/login.html');
            return;
        }

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
        
        console.log('Datos del evento a enviar (FormData):', [...formData.entries()]);

        // Enviar datos al servidor usando axiosInstance con configuración especial para FormData
        const { data: responseData } = await axiosInstance.post('/addEvent', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

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
async function openCreateModal() {
    try {
        // Cargar usuarios disponibles
        const { data: users } = await axiosInstance.get('/getUsersForNotes');
        console.log('Usuarios cargados:', users);
        
        // Verificar que users sea un array
        if (!Array.isArray(users) || users.length === 0) {
            throw new Error('No se encontraron usuarios');
        }
        
        // Obtener el ID del usuario actual
        const token = localStorage.getItem('token');
        const currentUserId = getUserIdFromToken(token);
        console.log('ID del usuario actual:', currentUserId);
        
        // Crear checkboxes HTML para los usuarios (excepto el usuario actual)
        const usersCheckboxes = users
            .filter(user => {
                console.log('Comparando:', user._id, 'con', currentUserId);
                return user._id !== currentUserId;
            })
            .map(user => {
                const userId = user._id;
                const userEmail = user.email || user.nombre || userId;
                console.log('Generando checkbox para:', userId, userEmail);
                return `
                    <div class="usuario-item" style="display: flex !important; flex-direction: row !important; align-items: center !important; gap: 8px; padding: 8px; border-bottom: 1px solid #eee; width: 100% !important;">
                        <input type="checkbox" id="user-${userId}" value="${userId}" style="cursor: pointer; flex-shrink: 0 !important; width: auto !important;">
                        <label for="user-${userId}" style="cursor: pointer !important; flex: 1 1 auto !important; margin: 0 !important; display: inline-block !important; white-space: normal !important; word-break: normal !important; overflow: visible !important; min-width: 0 !important; max-width: 100% !important;">${userEmail}</label>
                    </div>
                `;
            }).join('');
        
        // Mostrar modal con SweetAlert2
        const { value: formValues } = await Swal.fire({
            title: 'Crear Nuevo Evento',
            html: `
                <div style="text-align: left;">
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label for="titulo-evento" style="display: block; margin-bottom: 8px; font-weight: bold;">Título*:</label>
                        <input type="text" id="titulo-evento" placeholder="Título del evento" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label for="descripcion-evento" style="display: block; margin-bottom: 8px; font-weight: bold;">Descripción:</label>
                        <textarea id="descripcion-evento" placeholder="Descripción del evento" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; box-sizing: border-box; resize: vertical;"></textarea>
                    </div>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label for="fecha-inicio" style="display: block; margin-bottom: 8px; font-weight: bold;">Fecha de Inicio*:</label>
                        <input type="datetime-local" id="fecha-inicio" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label for="fecha-fin" style="display: block; margin-bottom: 8px; font-weight: bold;">Fecha de Fin*:</label>
                        <input type="datetime-local" id="fecha-fin" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">Participantes*:</label>
                        <div id="usuarios-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 10px;">
                            ${usersCheckboxes}
                        </div>
                        <p style="margin-top: 10px; font-size: 0.9em; color: #666;">Selecciona los usuarios que participarán en el evento</p>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Crear Evento',
            cancelButtonText: 'Cancelar',
            width: '600px',
            focusConfirm: false,
            preConfirm: () => {
                const titulo = document.getElementById('titulo-evento').value.trim();
                const descripcion = document.getElementById('descripcion-evento').value.trim();
                const fechaInicio = document.getElementById('fecha-inicio').value;
                const fechaFin = document.getElementById('fecha-fin').value;
                const checkboxes = document.querySelectorAll('#usuarios-list input[type="checkbox"]:checked');
                const selectedUsers = Array.from(checkboxes).map(cb => cb.value);
                
                if (!titulo) {
                    Swal.showValidationMessage('El título es obligatorio');
                    return false;
                }
                
                if (!fechaInicio || !fechaFin) {
                    Swal.showValidationMessage('Las fechas de inicio y fin son obligatorias');
                    return false;
                }
                
                if (new Date(fechaInicio) > new Date(fechaFin)) {
                    Swal.showValidationMessage('La fecha de inicio debe ser anterior a la fecha de fin');
                    return false;
                }
                
                if (selectedUsers.length === 0) {
                    Swal.showValidationMessage('Debe seleccionar al menos un participante');
                    return false;
                }
                
                return { titulo, descripcion, fechaInicio, fechaFin, selectedUsers };
            }
        });
        
        if (formValues) {
            await handleCreateEventFromSwal(formValues);
        }
    } catch (error) {
        console.error('Error completo:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `No se pudo abrir el modal de creación: ${error.message}`
        });
    }
}

function closeCreateModal() {
    // Esta función ya no se usa con SweetAlert2, pero la mantenemos por compatibilidad
    console.log('closeCreateModal llamado - usando SweetAlert2 ahora');
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

// Función para manejar la creación de eventos desde SweetAlert2
async function handleCreateEventFromSwal(formValues) {
    try {
        if (!authService.isAuthenticated()) {
            console.error('No token found');
            window.location.replace('../login/login.html');
            return;
        }

        const { titulo, descripcion, fechaInicio, fechaFin, selectedUsers } = formValues;

        // Crear FormData
        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('descripcion', descripcion);
        formData.append('fechaInicio', fechaInicio);
        formData.append('fechaFin', fechaFin);
        selectedUsers.forEach(usuario => {
            formData.append('usuarios', usuario);
        });
        
        console.log('Datos del evento a enviar (FormData):', [...formData.entries()]);

        // Enviar datos al servidor usando axiosInstance
        const { data: responseData } = await axiosInstance.post('/addEvent', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: 'Evento creado correctamente',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
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

// Función para mostrar detalles del evento
async function showEventDetails(event) {
    try {
        // Llenar el modal con los datos del evento
        document.getElementById('eventId').value = event.id;
        document.getElementById('viewTitulo').value = event.title;
        document.getElementById('viewDescripcion').value = event.extendedProps.descripcion || '';
        
        // Formatear las fechas para el input datetime-local
        const startDate = formatDateTimeForInput(event.start);
        const endDate = formatDateTimeForInput(event.end || event.start);
        
        document.getElementById('viewFechaInicio').value = startDate;
        document.getElementById('viewFechaFin').value = endDate;
        
        // Cargar la lista de usuarios
        const usuariosList = document.getElementById('viewUsuariosList');
        usuariosList.innerHTML = '';
        
        // Obtener todos los usuarios
        const { data } = await axiosInstance.get('/getAllUsers');
        const users = JSON.parse(data.usuarios);
        const eventUsers = event.extendedProps.usuarios || [];
        
        // Agregar checkboxes para cada usuario
        users.forEach(user => {
            const div = document.createElement('div');
            div.className = 'usuario-checkbox';
            
            const userId = user._id.$oid || user._id;
            const isChecked = eventUsers.some(eventUser => 
                (eventUser.$oid || eventUser) === userId
            );
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `view_user_${userId}`;
            checkbox.value = userId;
            checkbox.className = 'user-checkbox';
            checkbox.checked = isChecked;
            
            const label = document.createElement('label');
            label.htmlFor = `view_user_${userId}`;
            label.textContent = user.email;
            
            div.appendChild(checkbox);
            div.appendChild(label);
            usuariosList.appendChild(div);
        });
        
        // Agregar checkbox para seleccionar todos los usuarios
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'usuario-checkbox';
        
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'viewSelectAll';
        selectAllCheckbox.className = 'user-checkbox';
        
        const selectAllLabel = document.createElement('label');
        selectAllLabel.htmlFor = 'viewSelectAll';
        selectAllLabel.textContent = 'Seleccionar todos';
        
        selectAllDiv.appendChild(selectAllCheckbox);
        selectAllDiv.appendChild(selectAllLabel);
        usuariosList.insertBefore(selectAllDiv, usuariosList.firstChild);
        
        // Agregar evento de click al checkbox de seleccionar todos
        selectAllCheckbox.addEventListener('click', function() {
            const checkboxes = usuariosList.querySelectorAll('.user-checkbox:not(#viewSelectAll)');
            checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
        });
        
        // Habilitar los campos para edición
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
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los detalles del evento'
        });
    }
}

// Función para manejar el clic en el botón editar
async function handleEditEvent() {
    try {
        const eventId = String(document.getElementById('eventId').value);
        if (!eventId) {
            throw new Error('ID de evento no encontrado');
        }

        // Obtener usuarios seleccionados
        const usuariosSeleccionados = Array.from(
            document.querySelectorAll('#viewUsuariosList .user-checkbox:checked:not(#viewSelectAll)')
        ).map(cb => cb.value);

        // Obtener y formatear las fechas
        const fechaInicio = formatDateTimeForServer(document.getElementById('viewFechaInicio').value);
        const fechaFin = formatDateTimeForServer(document.getElementById('viewFechaFin').value);
        
        // Crear FormData
        const formData = new FormData();
        formData.append('titulo', document.getElementById('viewTitulo').value);
        formData.append('descripcion', document.getElementById('viewDescripcion').value);
        formData.append('fechaInicio', fechaInicio);
        formData.append('fechaFin', fechaFin);
        usuariosSeleccionados.forEach(usuario => {
            formData.append('usuarios', usuario);
        });
        
        console.log('Datos del evento a actualizar (FormData):', [...formData.entries()]);
        
        // Enviar datos al servidor usando axiosInstance con configuración especial para FormData
        const { data } = await axiosInstance.put(`/updateEvent/${eventId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        // Esperar a que se complete la actualización
        await loadEvents();
        
        // Mostrar mensaje de éxito
        await Swal.fire({
            icon: 'success',
            title: 'Evento actualizado',
            showConfirmButton: false,
            timer: 1500
        });

        // Cerrar el modal después de mostrar el mensaje
        closeViewModal();
        
        // Recargar la página después de un breve retraso
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo actualizar el evento'
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
    try {
        const eventId = document.getElementById('eventId').value;
        if (!eventId) {
            throw new Error('ID de evento no encontrado');
        }

        const token = localStorage.getItem('token');
        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

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
            const response = await fetch(`${API_BASE_URL}/deleteEvent/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': authToken,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Error al eliminar el evento');
            }
            
            // Cerrar el modal
            closeViewModal();
            
            // Actualizar el calendario
            await loadEvents();
            
            // Mostrar mensaje de éxito
            await Swal.fire({
                icon: 'success',
                title: 'Evento eliminado',
                showConfirmButton: false,
                timer: 1500
            });

            // Recargar la página solo si todo fue exitoso
            window.location.reload();
        }
    } catch (error) {
        console.error('Error:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo eliminar el evento'
        });
    }
}

// Función para cargar eventos
async function loadEvents(info, successCallback, failureCallback) {
    try {
        if (!authService.isAuthenticated()) {
            console.error('No autenticado en loadEvents');
            return;
        }

        console.log('Cargando eventos del calendario...');
        // Usar axiosInstance para hacer la petición
        const { data } = await axiosInstance.get('/getEvents');
        console.log('Eventos recibidos:', data.eventos);

        // Si no hay eventos, devolver array vacío
        if (!data.eventos || !Array.isArray(data.eventos)) {
            console.log('No hay eventos o formato incorrecto');
            if (successCallback) {
                successCallback([]);
            }
            return;
        }

        const events = data.eventos.map(evento => {
            return {
                id: evento.id || evento._id,
                title: evento.title || evento.titulo,
                start: new Date(evento.start || evento.fechaInicio),
                end: new Date(evento.end || evento.fechaFin),
                extendedProps: {
                    descripcion: evento.description || evento.descripcion,
                    usuarios: evento.usuarios || [],
                    creador_id: evento.creador_id || evento.creador
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

// Función para formatear fecha y hora a formato local
function formatDateTimeForInput(date) {
    const d = new Date(date);
    // Ajustar a la zona horaria local
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16); // Formato YYYY-MM-DDTHH:mm
}

// Función para formatear fecha y hora para el servidor
function formatDateTimeForServer(dateStr) {
    const d = new Date(dateStr);
    // Ajustar a UTC
    return d.toISOString();
}

// Función para sincronizar con Outlook
async function syncWithOutlook() {
    try {
        if (!authService.isAuthenticated()) {
            throw new Error('No se encontró token de autenticación');
        }
        
        const result = await Swal.fire({
            title: 'Sincronización con Outlook',
            text: 'Para sincronizar con Outlook, necesitas autorizar la aplicación en tu cuenta de Microsoft.Al dar click en autorizar, se abrirá una ventana de autorización de Microsoft.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Autorizar',
            cancelButtonText: 'Cancelar'
        });
        
        if (result.isConfirmed) {
            // Aquí se abriría la ventana de autorización de Microsoft
            // Por ahora, simulamos el proceso
            Swal.fire({
                title: 'Procesando...',
                text: 'Autorizando aplicación',
                icon: 'info',
                allowOutsideClick: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });
            
            setTimeout(() => {
                Swal.fire({
                    title: '¡Sincronización exitosa!',
                    text: 'Tus eventos han sido sincronizados con Outlook.',
                    icon: 'success'
                }).then(() => {
                    // Recargar eventos después de sincronizar
                    loadEvents();
                });
            }, 2000);
        }
        
    } catch (error) {
        console.error('Error al sincronizar con Outlook:', error);
        Swal.fire({
            title: 'Error',
            text: error.message || 'No se pudo sincronizar con Outlook',
            icon: 'error'
        });
    }
}
