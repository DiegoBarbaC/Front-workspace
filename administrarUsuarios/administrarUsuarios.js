import API_BASE_URL from "../config.js"
import axiosInstance, { authService } from '../services/axios-config.js';
// Variable para almacenar el ID del usuario actual
let currentUserId;
//Variable para controlar si hay una peticion en proceso
let isRequestInProgress = false;

// Función para cargar los usuarios desde la API
async function loadUsersFromAPI() {
    try {
        // Verificar si el usuario está autenticado
        if (!authService.isAuthenticated()) {
            console.error('No token found');
            window.location.replace('../login/login.html');
            return;
        }

        // Usar axiosInstance para hacer la petición
        const { data } = await axiosInstance.get('/getAllUsers');
        const tableBody = document.querySelector('table tbody');
        tableBody.innerHTML = '';

        const users = JSON.parse(data.usuarios);
        users.forEach(user => {
            const row = tableBody.insertRow();
            
            // Crear celdas con la información del usuario
            row.insertCell(0).innerText = user.email;
            row.insertCell(1).innerText = user.admin ? 'Sí' : 'No';
            row.insertCell(2).innerText = user.editar ? 'Sí' : 'No';
            
            // Crear celda para los botones
            const cell = row.insertCell(3);
            
            // Crear botón de editar
            const editButton = document.createElement('button');
            editButton.innerText = 'Editar';
            // Extraer el ID como string
            const userId = user._id.$oid || user._id;
            console.log("ID A EDITAR:", userId);
            editButton.onclick = () => editUser(userId);
            
            // Crear botón de eliminar
            const deleteButton = document.createElement('button');
            deleteButton.innerText = 'Eliminar';
            deleteButton.className = 'delete-button';
            deleteButton.onclick = () => deleteUser(user.email);
            
            cell.appendChild(editButton);
            cell.appendChild(deleteButton);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// Función para editar usuario
function editUser(userId) {
    currentUserId = userId;
    
    // Verificar si el usuario está autenticado
    if (!authService.isAuthenticated()) {
        console.error('No token found');
        window.location.replace('../login/login.html');
        return;
    }

    console.log("Enviando petición para ID:", userId);

    // Usar axiosInstance para hacer la petición
    axiosInstance.get(`/getUser/${userId}`)
    .then(response => {
        const data = response.data;
        console.log("Datos recibidos:", data);
        document.getElementById('editEmail').value = data.email;
        document.getElementById('editEsAdmin').checked = data.admin;
        document.getElementById('editPuedeEditar').checked = data.editar;
        document.getElementById('editModal').style.display = 'block';
        document.body.classList.add('modal-open');
    })
    .catch(error => {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Error al obtener el usuario'
        });
    });
}

// Función para guardar cambios
function saveChanges() {
    if (isRequestInProgress) {
        return;
    }
    isRequestInProgress = true;
    
    // Verificar si el usuario está autenticado
    if (!authService.isAuthenticated()) {
        console.error('No token found');
        window.location.replace('../login/login.html');
        return;
    }

    const email = document.getElementById('editEmail').value;
    const admin = document.getElementById('editEsAdmin').checked;
    const editar = document.getElementById('editPuedeEditar').checked;

    const data = {
        email: email,
        admin: admin,
        editar: editar
    };

    // Usar axiosInstance para hacer la petición
    axiosInstance.put(`/updateUser/${currentUserId}`, data)
    .then(response => {
        return response.data;
    })
    .then(data => {
        closeModal();
        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: 'Usuario actualizado correctamente',
        }).then(() => {
            window.location.reload();
        });
    })
    .catch(error => {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo actualizar el usuario',
        });
    })
    .finally(() => {
        isRequestInProgress = false;
    });
}

// Función para eliminar usuario
function deleteUser(email) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: `¿Realmente deseas eliminar al usuario ${email}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            // Verificar si el usuario está autenticado
            if (!authService.isAuthenticated()) {
                console.error('No token found');
                window.location.replace('../login/login.html');
                return;
            }

            // Usar axiosInstance para hacer la petición
            axiosInstance.delete('/deleteUser', {
                data: { email: email }
            })
            .then(response => {
                return response.data;
            })
            .then(data => {
                Swal.fire(
                    '¡Eliminado!',
                    'El usuario ha sido eliminado.',
                    'success'
                ).then(() => {
                    window.location.reload();
                });
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo eliminar el usuario',
                });
            });
        }
    });
}

// Funciones para el modal
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('editForm').reset();
    document.body.classList.remove('modal-open');
}

function openCreateModal() {
    document.getElementById('createModal').style.display = 'block';
    document.body.classList.add('modal-open');
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    document.getElementById('createForm').reset();
    document.body.classList.remove('modal-open');
}
window.closeModal = closeModal;
window.closeCreateModal = closeCreateModal;
window.saveChanges = saveChanges;
window.createUser = createUser;

let isCreatingUser = false;
// Función para crear usuario
async function createUser() {
    if (isCreatingUser) {
        return;
    }
    
    const createButton = document.getElementById('createUser');
    createButton.disabled = true;
    createButton.innerHTML = 'Creando...';
    isCreatingUser = true;

    try{
    // Verificar si el usuario está autenticado
    if (!authService.isAuthenticated()) {
        console.error('No token found');
        window.location.replace('../login/login.html');
        return;
    }

    const email = document.getElementById('createEmail').value;
    const admin = document.getElementById('createEsAdmin').checked;
    const editar = document.getElementById('createPuedeEditar').checked;

    const data = {
        email: email,
        admin: admin,
        editar: editar
    };

    // Usar axiosInstance para hacer la petición
    const response = await axiosInstance.post('/register', data);
    const responseData = response.data;
    closeCreateModal();
    await Swal.fire({
        icon: 'success',
        title: '¡Usuario creado!',
        html: `La contraseña se ha enviado al correo ${email}.<br>Por favor, indicar que la cambie al iniciar sesión.`,
    });
    window.location.reload();
    }catch(error){
        console.error('Error:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo crear el usuario',
        });
}finally{
    isCreatingUser = false;
        createButton.disabled = false;
        createButton.innerHTML = 'Crear Usuario';
}}




// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    loadUsersFromAPI();
    
    // Agregar eventos a los botones de crear y cerrar modal
    document.getElementById('openCreateModal').addEventListener('click', openCreateModal);
    document.getElementById('closeCreateModal').addEventListener('click', closeCreateModal);
    document.getElementById('createUser').addEventListener('click', createUser);
});