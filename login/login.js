import { authService } from '../services/axios-config.js';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    const forgotPasswordLink = document.getElementById('forgot-password-link');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.toString();
        const password = document.getElementById('password').value.toString();

        try {
            
            
            // Usar el servicio de autenticación en lugar de fetch
            const result = await authService.login(username, password);
            
            if (result.success) {
                // Redirigir al usuario a la página principal
                window.location.replace('../index.html');
            } else {
                // Mostrar mensaje de error
                errorMessage.textContent = result.message || 'Error al iniciar sesión';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error durante el login:', error);
            errorMessage.textContent = 'Error al conectar con el servidor';
            errorMessage.style.display = 'block';
        }
    });

    // Manejar clic en el enlace de recuperación de contraseña
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Obtener el correo electrónico ingresado
        const email = document.getElementById('username').value.trim();
        
        if (!email) {
            // Si no hay correo, mostrar mensaje
            errorMessage.textContent = 'Ingresa tu correo electrónico para recuperar tu contraseña';
            errorMessage.style.display = 'block';
            return;
        }
        
        // Mostrar mensaje de confirmación usando SweetAlert si está disponible, o un confirm básico
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Recuperar contraseña',
                text: `¿Deseas enviar un correo de recuperación a ${email}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Enviar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Aquí iría la llamada a la API para enviar el correo de recuperación
                    sendPasswordRecoveryEmail(email);
                }
            });
        } else {
            if (confirm(`¿Deseas enviar un correo de recuperación a ${email}?`)) {
                // Aquí iría la llamada a la API para enviar el correo de recuperación
                sendPasswordRecoveryEmail(email);
            }
        }
    });
    
    // Función para enviar el correo de recuperación
    async function sendPasswordRecoveryEmail(email) {
        try {
            // Mostrar mensaje de carga
            errorMessage.textContent = 'Enviando correo de recuperación...';
            errorMessage.style.display = 'block';
            
            // Llamar al servicio de autenticación para solicitar recuperación de contraseña
            const result = await authService.requestPasswordRecovery(email);
            
            if (result.success) {
                // Mostrar mensaje de éxito
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Correo enviado',
                        text: `Se ha enviado un correo de recuperación a ${email}`,
                        icon: 'success'
                    });
                } else {
                    alert(`Se ha enviado un correo de recuperación a ${email}`);
                }
                errorMessage.style.display = 'none';
            } else {
                // Mostrar mensaje de error
                errorMessage.textContent = result.message;
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error al enviar correo de recuperación:', error);
            errorMessage.textContent = 'Error al enviar el correo de recuperación';
            errorMessage.style.display = 'block';
        }
    }
});
