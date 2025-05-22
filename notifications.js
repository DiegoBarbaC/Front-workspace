import API_BASE_URL from "./config.js";

class NotificationManager {
    constructor() {
        this.notificationIcon = document.getElementById('notification-icon');
        this.notificationDropdown = document.getElementById('notification-dropdown');
        this.notificationList = document.getElementById('notification-list');
        this.notificationCount = document.getElementById('notification-count');
        this.markAllReadBtn = document.getElementById('mark-all-read');
        this.notificationEmpty = document.getElementById('notification-empty');
        this.notifications = [];
        this.unreadCount = 0;
        
        // Inicializar
        this.init();
    }
    
    // Inicializar el manejador de notificaciones
    init() {
        // Cargar notificaciones al iniciar
        this.loadNotifications();
        
        // Manejar click en el icono de notificación
        if (this.notificationIcon) {
            this.notificationIcon.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleNotificationDropdown();
            });
        }
        
        // Manejar click fuera del dropdown para cerrarlo
        document.addEventListener('click', (e) => {
            if (this.notificationDropdown && 
                this.notificationDropdown.classList.contains('active') && 
                !this.notificationDropdown.contains(e.target) && 
                e.target !== this.notificationIcon && 
                !this.notificationIcon.contains(e.target)) {
                this.notificationDropdown.classList.remove('active');
            }
        });
        
        // Manejar click en "Marcar todo como leído"
        if (this.markAllReadBtn) {
            this.markAllReadBtn.addEventListener('click', () => {
                this.markAllNotificationsAsRead();
            });
        }
    }
    
    // Cargar notificaciones del servidor
    async loadNotifications() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found');
                return;
            }
            
            // Asegurar que el token tenga el formato correcto
            const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            
            const response = await fetch(`${API_BASE_URL}/getNotifications?limit=10`, {
                method: 'GET',
                headers: {
                    'Authorization': authToken
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.replace('/Dashboard CAA/Front-workspace/login/login.html');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.notifications = data.notificaciones || [];
            this.unreadCount = data.total_no_leidas || 0;
            
            // Actualizar UI
            this.updateNotificationCount();
            this.renderNotifications();
        } catch (error) {
            console.error('Error al cargar notificaciones:', error);
            this.notificationList.innerHTML = `
                <div class="error-notification">
                    Error al cargar notificaciones. Intenta de nuevo más tarde.
                </div>
            `;
        }
    }
    
    // Actualizar contador de notificaciones
    updateNotificationCount() {
        if (this.notificationCount) {
            this.notificationCount.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            
            // Ocultar el contador si no hay notificaciones sin leer
            if (this.unreadCount === 0) {
                this.notificationCount.style.display = 'none';
            } else {
                this.notificationCount.style.display = 'inline-block';
            }
        }
    }
    
    // Renderizar lista de notificaciones
    renderNotifications() {
        if (!this.notificationList) return;
        
        if (this.notifications.length === 0) {
            this.notificationList.innerHTML = '';
            if (this.notificationEmpty) {
                this.notificationEmpty.style.display = 'block';
            }
            return;
        }
        
        if (this.notificationEmpty) {
            this.notificationEmpty.style.display = 'none';
        }
        
        this.notificationList.innerHTML = '';
        
        this.notifications.forEach(notification => {
            const notificationItem = document.createElement('div');
            notificationItem.className = `notification-item${notification.leida ? '' : ' unread'}`;
            notificationItem.dataset.id = notification.id;
            
            const iconClass = this.getIconForNotificationType(notification.tipo);
            
            notificationItem.innerHTML = `
                <div class="notification-icon">
                    <i class='bx ${iconClass}'></i>
                </div>
                <div class="notification-content">
                    <div class="notification-message">${notification.contenido}</div>
                    <div class="notification-time">${this.formatNotificationDate(notification.fecha_creacion)}</div>
                    <div class="notification-actions-item">
                        <button class="mark-read-btn">${notification.leida ? 'Marcar como no leída' : 'Marcar como leída'}</button>
                        <button class="delete-notification-btn">Eliminar</button>
                    </div>
                </div>
            `;
            
            // Agregar evento para marcar como leída al hacer clic
            notificationItem.querySelector('.mark-read-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (notification.leida) {
                    // Implementar marcar como no leída si es necesario
                } else {
                    this.markNotificationAsRead(notification.id);
                }
            });
            
            // Agregar evento para eliminar
            notificationItem.querySelector('.delete-notification-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNotification(notification.id);
            });
            
            // Al hacer clic en la notificación, marcarla como leída
            notificationItem.addEventListener('click', () => {
                if (!notification.leida) {
                    this.markNotificationAsRead(notification.id);
                }
                
                // Si la notificación es de un evento, redirigir al calendario
                if (notification.tipo.includes('evento')) {
                    window.location.href = '../Front-workspace/calendario/calendario.html';
                }
                // Implementar redirección para otros tipos de notificaciones según sea necesario
            });
            
            this.notificationList.appendChild(notificationItem);
        });
    }
    
    // Obtener icono según el tipo de notificación
    getIconForNotificationType(tipo) {
        switch (tipo) {
            case 'nuevo_evento':
            case 'actualización_evento':
            case 'evento_hoy':
                return 'bxs-calendar';
            case 'nuevo_nota':
            case 'actualización_nota':
                return 'bxs-note';
            default:
                return 'bxs-bell';
        }
    }
    
    // Formatear fecha de notificación
    formatNotificationDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.round(diffMs / 1000);
        const diffMin = Math.round(diffSec / 60);
        const diffHour = Math.round(diffMin / 60);
        const diffDay = Math.round(diffHour / 24);
        
        if (diffSec < 60) {
            return 'Hace un momento';
        } else if (diffMin < 60) {
            return `Hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
        } else if (diffHour < 24) {
            return `Hace ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`;
        } else if (diffDay < 7) {
            return `Hace ${diffDay} ${diffDay === 1 ? 'día' : 'días'}`;
        } else {
            return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    }
    
    // Mostrar/ocultar el menú desplegable de notificaciones
    toggleNotificationDropdown() {
        if (this.notificationDropdown) {
            this.notificationDropdown.classList.toggle('active');
            
            // Si se abrió el dropdown, cargar notificaciones nuevamente
            if (this.notificationDropdown.classList.contains('active')) {
                this.loadNotifications();
            }
        }
    }
    
    // Marcar una notificación como leída
    async markNotificationAsRead(notificationId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            
            const response = await fetch(`${API_BASE_URL}/markNotificationRead/${notificationId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': authToken
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al marcar notificación como leída');
            }
            
            // Actualizar localmente
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.leida) {
                notification.leida = true;
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.updateNotificationCount();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    // Marcar todas las notificaciones como leídas
    async markAllNotificationsAsRead() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            
            const response = await fetch(`${API_BASE_URL}/markAllRead`, {
                method: 'PUT',
                headers: {
                    'Authorization': authToken
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al marcar todas las notificaciones como leídas');
            }
            
            // Actualizar localmente
            this.notifications.forEach(notification => {
                notification.leida = true;
            });
            this.unreadCount = 0;
            this.updateNotificationCount();
            this.renderNotifications();
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    // Eliminar una notificación
    async deleteNotification(notificationId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            
            const response = await fetch(`${API_BASE_URL}/deleteNotification/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': authToken
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al eliminar notificación');
            }
            
            // Actualizar localmente
            const index = this.notifications.findIndex(n => n.id === notificationId);
            if (index !== -1) {
                // Si la notificación no estaba leída, actualizar contador
                if (!this.notifications[index].leida) {
                    this.unreadCount = Math.max(0, this.unreadCount - 1);
                    this.updateNotificationCount();
                }
                
                this.notifications.splice(index, 1);
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

// Inicializar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si estamos en una página con el componente de notificaciones
    if (document.getElementById('notification-icon')) {
        const notificationManager = new NotificationManager();
    }
});

export default NotificationManager;
