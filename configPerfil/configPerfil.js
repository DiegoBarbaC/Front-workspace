import API_BASE_URL from '../config.js';
import axiosInstance, { authService } from '../services/axios-config.js';
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos del usuario
    loadUserData();

    // Event listeners
    document.getElementById('imageInput').addEventListener('change', handleImageUpload);
    document.getElementById('profileForm').addEventListener('submit', handleFormSubmit);
    
    // Event listeners para mostrar/ocultar contraseñas
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('bx-show');
                this.classList.add('bx-hide');
            } else {
                input.type = 'password';
                this.classList.remove('bx-hide');
                this.classList.add('bx-show');
            }
        });
    });
});

async function loadUserData() {
    try {
        if (!authService.isAuthenticated()) {
            console.error('No token found');
            window.location.replace('../login/login.html');
            return;
        }

        // Obtener el ID del usuario del token
        const token = localStorage.getItem('token').replace('Bearer ', '');
        const tokenParts = token.split('.');
        const payload = JSON.parse(atob(tokenParts[1]));
        const userId = String(payload.sub);
        console.log('User ID:', userId);

        const { data } = await axiosInstance.get(`/getUser/${userId}`);
        console.log('User data:', data);
        
        document.getElementById('userEmail').textContent = data.email;
        if (data.fechaCumple) {
            document.getElementById('birthday').value = data.fechaCumple;
        }
        if (data.foto) {
            document.getElementById('profileImage').src = `data:image/jpeg;base64,${data.foto}`;
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la información del usuario'
        });
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor, selecciona un archivo de imagen válido'
        });
        return;
    }

    // Solo mostrar vista previa
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('profileImage').src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function handleFormSubmit(event) {
    event.preventDefault();

    try {
        if (!authService.isAuthenticated()) {
            console.error('No token found');
            window.location.replace('../login/login.html');
            return;
        }

        const birthday = document.getElementById('birthday').value;
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validar contraseñas si se están cambiando
        if (newPassword || confirmPassword) {
            if (!currentPassword) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Por favor, ingresa tu contraseña actual'
                });
                return;
            }
            if (newPassword !== confirmPassword) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Las contraseñas nuevas no coinciden'
                });
                return;
            }
        }

        // Obtener el email del usuario del elemento HTML
        const email = document.getElementById('userEmail').textContent;

        const formData = new FormData();
        formData.append('email', email);
        formData.append('fechaCumple', birthday);
        if (currentPassword && newPassword) {
            formData.append('password', newPassword);
        }
        
        // Agregar la imagen si se seleccionó una
        const imageFile = document.getElementById('imageInput').files[0];
        if (imageFile) {
            formData.append('foto', imageFile);
        }

        console.log('Enviando datos del perfil:', [...formData.entries()]);

        const { data } = await axiosInstance.put('/updateUser', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: 'Perfil actualizado correctamente'
        }).then(() => {
            // Limpiar campos de contraseña
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        });
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar el perfil'
        });
    }
}