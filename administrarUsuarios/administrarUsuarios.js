import API_BASE_URL from "../config.js"
// Variable para almacenar el ID del usuario actual
let currentUserId;
//Variable para controlar si hay una peticion en proceso
let isRequestInProgress = false;

// Función para cargar los usuarios desde la API
async function loadUsersFromAPI() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            window.location.replace('/Dashboard CAA/Front-workspace/login/login.html');
            return;
        }
        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/getAllUsers`, {
            method: 'GET',
            headers: {
                'Authorization': authToken
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener los usuarios');
        }

        const data = await response.json();
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
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found');
        window.location.replace('/Dashboard CAA/Front-workspace/login/login.html');
        return;
    }
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    console.log("Enviando petición para ID:", userId);

    fetch(`${API_BASE_URL}/getUser/${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.replace('/Dashboard CAA/Front-workspace/login/login.html');
                return;
            }
            throw new Error('Error al obtener el usuario');
        }
        return response.json();
    })
    .then(data => {
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
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found');
        window.location.replace('/Dashboard CAA/Front-workspace/login/login.html');
        return;
    }
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    const email = document.getElementById('editEmail').value;
    const admin = document.getElementById('editEsAdmin').checked;
    const editar = document.getElementById('editPuedeEditar').checked;

    const formData = new FormData();
    formData.append('email', email);
    formData.append('admin', admin);
    formData.append('editar', editar);

    fetch(`${API_BASE_URL}/updateUser`, {
        method: 'PUT',
        headers: {
            'Authorization': authToken
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al actualizar el usuario');
        }
        return response.json();
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
    });
}

// Función para eliminar usuario
function deleteUser(email) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.replace('/Dashboard CAA/Front-workspace/login/login.html');
                return;
            }
            const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

            fetch(`${API_BASE_URL}/deleteUser`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken
                },
                body: JSON.stringify({ email: email })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al eliminar el usuario');
                }
                return response.json();
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
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found');
        window.location.replace('/Dashboard CAA/Front-workspace/login/login.html');
        return;
    }
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    const email = document.getElementById('createEmail').value;
    const admin = document.getElementById('createEsAdmin').checked;
    const editar = document.getElementById('createPuedeEditar').checked;

    const data = {
        email: email,
        admin: admin,
        editar: editar
    };

    const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        return response.json().then(data => {
            throw new Error(data.message || 'Error al crear el usuario');
        });
    }

    const responseData = await response.json();
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