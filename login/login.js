import API_BASE_URL from '../config.js';
import { authService } from '../services/axios-config.js';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');

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
});
