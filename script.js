const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');
import API_BASE_URL from "./config.js";
import axiosInstance, { authService } from './services/axios-config.js';


allSideMenu.forEach(item=> {
	const li = item.parentElement;

	item.addEventListener('click', function () {
		allSideMenu.forEach(i=> {
			i.parentElement.classList.remove('active');
		})
		li.classList.add('active');
	})
});

// Handle card clicks (to prevent conflict with dragging)
function handleCardClick(event, url) {
    // Si el clic fue en el manejador de arrastre o en un botón, no abrir el enlace
    if (event.target.closest('.drag-handle') || event.target.tagName === 'BUTTON') {
        event.preventDefault();
        return;
    }
    
    // Crear el enlace programáticamente
    const newWindow = window.open();
    if (newWindow) {
        // Inmediatamente enfocar de vuelta a la ventana actual
        window.focus();
        // Establecer la URL de la nueva pestaña
        newWindow.location.href = url;
    }
    
    // Prevenir el comportamiento por defecto
    event.preventDefault();
    return false;
}

// Function to create a card element
function createCard(cardData) {
    const card = document.createElement('div');
    card.className = 'card card-section';
    card.setAttribute('data-id', cardData.id);
    card.style.cursor = 'pointer';
    
    // Prevenir el comportamiento por defecto del enlace
    card.addEventListener('click', (event) => {
        event.preventDefault();
        handleCardClick(event, cardData.url);
        return false;
    });

    card.innerHTML = `
        <div class="drag-handle">⋮⋮</div>
        <div class="card-image">
            <img src="${cardData.image}" alt="${cardData.title}">
        </div>
        <div class="card-content">
            <h3>${cardData.title}</h3>
            <p>${cardData.description}</p>
        </div>
    `;
    return card;
}

// Function to fetch and load cards from API
async function loadCardsFromAPI() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            window.location.replace('login/login.html');
            return;
        }

        // Asegurar que el token tenga el formato correcto
        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        console.log('Token de autorización:', authToken); // Debug

        // Usar axiosInstance para hacer la petición
        const { data: sections } = await axiosInstance.get('/user/sections', {
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response data:', sections);

        if (!sections) {
            throw new Error('No data received from server');
        }

        const grid = document.getElementById('sortable-grid');
        if (!grid) {
            console.error('Grid element not found');
            return;
        }

        grid.innerHTML = '';

        if (!sections || sections.length === 0) {
            grid.innerHTML = '<div class="no-sections">No hay secciones disponibles</div>';
            return;
        }

        // Ordenar las secciones según su orden
        sections.sort((a, b) => (a.orden || 0) - (b.orden || 0));

        // Crear y añadir cada carta al grid
        sections.forEach(section => {
            console.log('Procesando sección:', section); // Debug
            const card = createCard({
                id: section._id,
                title: section.titulo,
                description: section.descripcion,
                image: section.imagen ? `data:image/jpeg;base64,${section.imagen}` : 'img/workspace2.jpg',
                url: section.link
            });
            grid.appendChild(card);
        });

        // Inicializar Sortable después de cargar las cartas
        initializeSortable();

    } catch (error) {
        console.error('Error completo:', error);
        console.error('Stack trace:', error.stack);
        const grid = document.getElementById('sortable-grid');
        if (grid) {
            grid.innerHTML = '<div class="error-message">Error al cargar las secciones: ' + error.message + '</div>';
        }
    }
}

// Función para guardar el orden de las tarjetas en el backend
async function saveCardOrder() {
    const sections = document.querySelectorAll('.card-section');
    const newOrder = Array.from(sections).map((section, index) => ({
        seccion_id: section.getAttribute('data-id'), // Usar data-id en lugar de id
        orden: index
    }));

    Swal.fire({
        title: '¿Guardar cambios?',
        text: "¿Desea guardar el nuevo orden de las secciones?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login/login.html';
                return;
            }

            // Usar axiosInstance para hacer la petición
            axiosInstance.put('/user/sections/order', { sections: newOrder }, {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                console.log('Orden guardado:', response.data);
                Swal.fire(
                    '¡Guardado!',
                    'El orden de las secciones ha sido actualizado.',
                    'success'
                );
                // Recargar las secciones para asegurar sincronización
                loadCardsFromAPI();
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire(
                    'Error',
                    error.message || 'No se pudo guardar el nuevo orden de las secciones.',
                    'error'
                );
            });
        }
    });
}

// Initialize Sortable
function initializeSortable() {
    const grid = document.getElementById('sortable-grid');
    if (!grid) return;

    let originalOrder = [];

    Sortable.create(grid, {
        animation: 150,
        handle: '.drag-handle',
        onStart: function(evt) {
            // Guardar el orden original antes de mover
            originalOrder = Array.from(grid.children).map(card => ({
                id: card.getAttribute('data-id'),
                orden: card.getAttribute('data-order')
            }));
        },
        onEnd: async function(evt) {
            // Si la posición no cambió, no hacer nada
            if (evt.oldIndex === evt.newIndex) return;

            // Preguntar al usuario si desea guardar el cambio
            const confirmMove = await Swal.fire({
                title: '¿Confirmar cambio?',
                text: '¿Estás seguro que deseas cambiar el orden de esta sección?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, cambiar',
                cancelButtonText: 'No, mantener como estaba',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33'
            });

            if (confirmMove.isConfirmed) {
                // Si el usuario confirma, guardar el nuevo orden
                await saveCardOrder();
            } else {
                // Si el usuario cancela, restaurar el orden original
                const grid = evt.target;
                originalOrder.forEach((item, index) => {
                    const card = Array.from(grid.children).find(
                        card => card.getAttribute('data-id') === item.id
                    );
                    if (card) {
                        grid.insertBefore(card, grid.children[index]);
                    }
                });
            }
        }
    });
}

// Función para eliminar una sección del dashboard
async function removeSection(sectionId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            return;
        }

        // Usar axiosInstance para hacer la petición
        await axiosInstance.delete(`/user/sections/${sectionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Recargar las secciones después de eliminar
        await loadCardsFromAPI();

    } catch (error) {
        console.error('Error removing section:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay token
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('login/login.html');
        return;
    }
    const isAdmin = localStorage.getItem('admin') === 'true';
    const canEdit = localStorage.getItem('editar') === 'true';

    // Oculta los elementos solo para admin si no es admin
    document.querySelectorAll('.admin-only').forEach(el => {
        if (!isAdmin) el.style.display = 'none';
    });

    // Oculta los elementos solo para editar si no es admin ni editor
    document.querySelectorAll('.edit-only').forEach(el => {
        if (!(isAdmin || canEdit)) el.style.display = 'none';
    });

    // Cargar las tarjetas
    loadCardsFromAPI();

    // TOGGLE SIDEBAR
    const menuBar = document.querySelector('#content nav .bx.bx-menu');
    const sidebar = document.getElementById('sidebar');
    
    if (menuBar) {
        menuBar.addEventListener('click', function () {
            sidebar.classList.toggle('hide');
        });
    }

    const searchButton = document.querySelector('#content nav form .form-input button');
    const searchButtonIcon = document.querySelector('#content nav form .form-input button .bx');
    const searchForm = document.querySelector('#content nav form');

    if (searchButton) {
        searchButton.addEventListener('click', function (e) {
            if(window.innerWidth < 576) {
                e.preventDefault();
                searchForm.classList.toggle('show');
                if(searchForm.classList.contains('show')) {
                    searchButtonIcon.classList.replace('bx-search', 'bx-x');
                } else {
                    searchButtonIcon.classList.replace('bx-x', 'bx-search');
                }
            }
        });
    }

    if(window.innerWidth < 768) {
        sidebar && sidebar.classList.add('hide');
    } else if(window.innerWidth > 576) {
        searchButtonIcon && searchButtonIcon.classList.replace('bx-x', 'bx-search');
        searchForm && searchForm.classList.remove('show');
    }

    window.addEventListener('resize', function () {
        if(this.innerWidth > 576) {
            searchButtonIcon && searchButtonIcon.classList.replace('bx-x', 'bx-search');
            searchForm && searchForm.classList.remove('show');
        }
    });

    const switchMode = document.getElementById('switch-mode');
    if (switchMode) {
        switchMode.addEventListener('change', function () {
            if(this.checked) {
                document.body.classList.add('dark');
            } else {
                document.body.classList.remove('dark');
            }
        });
    }

    // Función para cerrar sesión
    function logout() {
        // Mostrar confirmación antes de cerrar sesión
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
                // Limpiar el token del localStorage
                localStorage.removeItem('token');
                
                // Redirigir al login
                //ruta absoluta
                //window.location.href = 'login/login.html';
                window.location.reload();
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
});