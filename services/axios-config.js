import API_BASE_URL from '../config.js';

// Crear instancia de axios con la URL base
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Función para obtener el token de acceso del localStorage
const getAccessToken = () => {
    const token = localStorage.getItem('token');
    return token ? token.replace('Bearer ', '') : null;
};

// Función para obtener el refresh token del localStorage
const getRefreshToken = () => {
    return localStorage.getItem('refresh_token');
};

// Función para guardar tokens en localStorage
const saveTokens = (accessToken, refreshToken = null) => {
    localStorage.setItem('token', `Bearer ${accessToken}`);
    if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
    }
};

// Función para limpiar tokens del localStorage al cerrar sesión
const clearTokens = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('admin');
    localStorage.removeItem('editar');
};

// Variable para controlar si estamos en proceso de renovar el token
let isRefreshing = false;
// Cola de solicitudes pendientes mientras se renueva el token
let refreshSubscribers = [];

// Función para procesar la cola de solicitudes pendientes
const onRefreshed = (accessToken) => {
    refreshSubscribers.forEach(callback => callback(accessToken));
    refreshSubscribers = [];
};

// Función para añadir solicitudes a la cola
const addRefreshSubscriber = (callback) => {
    refreshSubscribers.push(callback);
};

// Interceptor para añadir el token a las solicitudes salientes
axiosInstance.interceptors.request.use(
    config => {
        const token = getAccessToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar respuestas y renovar token si es necesario
axiosInstance.interceptors.response.use(
    response => {
        return response;
    },
    async error => {
        const originalRequest = error.config;
        
        // Si el error es 401 (Unauthorized) y no es una solicitud de refresh
        if (error.response && error.response.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/refresh')) {
            if (isRefreshing) {
                // Si ya estamos refrescando, añadir esta solicitud a la cola
                try {
                    const accessToken = await new Promise((resolve, reject) => {
                        addRefreshSubscriber(token => {
                            resolve(token);
                        });
                    });
                    originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
                    return axiosInstance(originalRequest);
                } catch (err) {
                    return Promise.reject(err);
                }
            }

            // Marcar que estamos refrescando
            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Intentar renovar el token
                const refreshToken = getRefreshToken();
                if (!refreshToken) {
                    // Si no hay refresh token, redirigir al login
                    clearTokens();
                    window.location.href = '/login/login.html';
                    return Promise.reject(error);
                }

                const response = await axios.post(`${API_BASE_URL}/refresh`, {}, {
                    headers: {
                        'Authorization': `Bearer ${refreshToken}`
                    }
                });

                if (response.data.access_token) {
                    // Guardar el nuevo token
                    saveTokens(response.data.access_token);
                    
                    // Actualizar el token en la solicitud original y en las pendientes
                    originalRequest.headers['Authorization'] = `Bearer ${response.data.access_token}`;
                    onRefreshed(response.data.access_token);
                    
                    // Reiniciar el estado de refreshing
                    isRefreshing = false;
                    
                    // Reintentar la solicitud original
                    return axiosInstance(originalRequest);
                } else {
                    // Si no se pudo renovar, redirigir al login
                    clearTokens();
                    window.location.href = '/login/login.html';
                    return Promise.reject(new Error('No se pudo renovar el token'));
                }
            } catch (refreshError) {
                // Si hay error al renovar, redirigir al login
                isRefreshing = false;
                clearTokens();
                window.location.href = '/login/login.html';
                return Promise.reject(refreshError);
            }
        }

        // Para otros errores, simplemente rechazar la promesa
        return Promise.reject(error);
    }
);

// Funciones de autenticación
const authService = {
    login: async (email, password) => {
        try {
            const response = await axiosInstance.post('/login', { email, password });
            const { access_token, refresh_token, admin, editar, user_id } = response.data;
            
            saveTokens(access_token, refresh_token);
            
            // Guardar información adicional del usuario
            localStorage.setItem('admin', admin);
            localStorage.setItem('editar', editar);
            localStorage.setItem('user_id', user_id);
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.msg || 'Error al iniciar sesión' 
            };
        }
    },
    
    logout: async () => {
        try {
            // Intentar hacer logout en el servidor
            await axiosInstance.post('/logout');
        } catch (error) {
            console.error('Error al cerrar sesión en el servidor:', error);
        } finally {
            // Siempre limpiar tokens locales
            clearTokens();
            window.location.href = '/login/login.html';
        }
    },
    
    isAuthenticated: () => {
        return !!getAccessToken();
    },
    
    isAdmin: () => {
        return localStorage.getItem('admin') === 'true';
    },
    
    canEdit: () => {
        return localStorage.getItem('editar') === 'true';
    }
};

export { axiosInstance as default, authService };
