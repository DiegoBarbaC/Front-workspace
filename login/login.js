import API_BASE_URL from "../config.js";
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value.toString();

        try {
            console.log('Intentando conectar a:', API_BASE_URL + '/login');
            console.log('Datos de login:', { email: username, password: password.length + ' caracteres' });

            const response = await fetch(API_BASE_URL + '/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email: username,
                    password: password
                })
            });

            console.log('Respuesta recibida:', {
                status: response.status,
                statusText: response.statusText
            });

            const data = await response.json();
            console.log('Datos de respuesta:', data);

            if (response.ok) {
                if (!data.access_token) {
                    throw new Error('Token no recibido del servidor');
                }

                // Guardar el token exactamente como lo espera el backend
                const tokenToStore = `Bearer ${data.access_token}`;
                localStorage.setItem('token', tokenToStore);
                //const tokenParts = tokenToStore.split('.');
                //const payload = JSON.parse(atob(tokenParts[1]));
                
                //const isAdmin = payload.admin;
                //const canEdit = payload.editar;
                //const userPhoto = payload.foto;

                //localStorage.setItem('admin', isAdmin);
                //localStorage.setItem('editar', canEdit);
                //localStorage.setItem('foto', userPhoto);

                //console.log('admin:', isAdmin);
                //console.log('editar:', canEdit);
                //console.log('foto:', userPhoto);

                window.location.replace('../index.html');
            } else {
                errorMessage.textContent = data.msg || data.message || 'Error al iniciar sesión';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error detallado:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage.textContent = 'No se puede conectar al servidor. Asegúrate de que el servidor esté corriendo en ' + API_BASE_URL;
            } else {
                errorMessage.textContent = 'Error de conexión: ' + error.message;
            }
            errorMessage.style.display = 'block';
        }
    });
});
