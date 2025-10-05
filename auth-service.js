// Servicio de autenticación para gestionar tokens JWT
export const authService = {
    // Verificar si el usuario está autenticado (tiene token válido)
    isAuthenticated() {
        const token = localStorage.getItem('token');
        if (!token) {
            return false;
        }
        
        // Verificar si el token ha expirado
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000; // Convertir a milisegundos
            
            if (Date.now() >= expiry) {
                // Token expirado, limpiar localStorage
                this.logout();
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error al verificar token:', error);
            return false;
        }
    },
    
    // Obtener el token actual
    getToken() {
        return localStorage.getItem('token');
    },
    
    // Guardar token en localStorage
    setToken(token) {
        localStorage.setItem('token', token);
    },
    
    // Cerrar sesión (eliminar token y datos de usuario)
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('admin');
        localStorage.removeItem('editar');
    },
    
    // Redirigir al login cuando no hay autenticación
    redirectToLogin() {
        console.error('No token found');
        // Usar una ruta absoluta desde la raíz del sitio
        window.location.replace(window.location.origin + '/login/login.html');
    },
    
    // Verificar si el usuario tiene rol de administrador
    isAdmin() {
        return localStorage.getItem('admin') === 'true';
    },
    
    // Verificar si el usuario tiene permisos de edición
    canEdit() {
        return localStorage.getItem('editar') === 'true' || this.isAdmin();
    },
    
    // Obtener información del usuario actual
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    }
};
