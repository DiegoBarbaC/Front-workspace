async function loadCardsFromAPI() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            window.location.replace('../Front-workspace/login/login.html');
            return;
        }

        // Asegurar que el token tenga el formato correcto
        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        console.log('Token de autorización:', authToken); // Debug

        const response = await fetch('http://localhost:5000/user/sections', {
            method: 'GET',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            }
        });

        const responseData = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', responseData);

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.replace('../Front-workspace/login/login.html');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(responseData)}`);
        }

        const sections = responseData;
        console.log('Secciones recibidas:', sections); // Debug

        const tableBody = document.getElementById('sectionsTable').getElementsByTagName('tbody')[0];
            tableBody.innerHTML = ''; // Limpiar el contenido anterior
        
            sections.forEach(section => {
                const row = tableBody.insertRow();
                
                row.insertCell(0).innerText = section.titulo; // Título
                row.insertCell(1).innerText = section.descripcion; // Descripción
                row.insertCell(2).innerHTML = `<a href="${section.link}">${section.link}</a>`; // Link
                row.insertCell(3).innerHTML = section.imagen ? `<img src="data:image/jpeg;base64,${section.imagen}" alt="${section.titulo}" style="width: 50px; height: auto;">` : 'Sin imagen'; // Imagen
                
                // Crear el botón de editar
                const editButton = document.createElement('button');
                editButton.innerText = 'Editar';
                editButton.className = 'edit-button'; // Clase para estilos (opcional)
                editButton.onclick = function() {
                    
                    editSection(section._id); // Llama a la función de edición pasando el ID de la sección
                    console.log(section._id);
                };

                // Insertar el botón en la última celda
                //const cell = row.insertCell(4); // Cambia el índice según la posición deseada
                

                // Crear el botón de eliminar
                const deleteButton = document.createElement('button');
                deleteButton.innerText = 'Eliminar';
                deleteButton.className = 'delete-button'; // Clase para estilos (opcional)
                deleteButton.onclick = function() {
                    deleteSection(section._id); // Llama a la función de eliminación pasando el ID de la sección
                };
                
                // Insertar el botón de eliminar en la última celda
                const cell = row.insertCell(4);
                cell.appendChild(editButton);
                cell.appendChild(deleteButton);
            });


        

        
        

    } catch (error) {
        console.error('Error completo:', error);
        console.error('Stack trace:', error.stack);
        
    }
}

let currentSectionId; // Variable para almacenar el ID de la sección actual

function editSection(sectionId) {
    currentSectionId = sectionId; // Guardar el ID de la sección que se va a editar
    console.log('ID de la sección a editar:', currentSectionId);
    const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            window.location.replace('../Front-workspace/login/login.html');
            return;
        }

        // Asegurar que el token tenga el formato correcto
        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        console.log('Token de autorización:', authToken); // Debug
    // Hacer una solicitud para obtener los detalles de la sección
    fetch(`http://localhost:5000/user/sections/${sectionId}`, {
        method: 'GET',
        headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
        }
    })

        .then(response => {
            if (!response.ok) {
                throw new Error('Error al obtener la sección');
            }
            return response.json();
        })
        .then(section => {
            // Llenar el modal con los datos de la sección
            document.getElementById('editTitle').value = section.titulo;
            document.getElementById('editDescription').value = section.descripcion;
            document.getElementById('editLink').value = section.link;

            // Mostrar el modal
            document.getElementById('editModal').style.display = 'block'; // Asegúrate de que el modal se muestre
        })
        .catch(error => console.error('Error al obtener la sección:', error));
}

// Función para cerrar el modal
function closeModal() {
    document.getElementById('editModal').style.display = 'none'; // Ocultar el modal
}

// Modificar la función saveChanges para que use el ID de la sección actual
function saveChanges() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found');
        window.location.replace('../Front-workspace/login/login.html');
        return;
    }
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    console.log('Token de autorización:', authToken); // Debug

    // Crear un objeto FormData
    const formData = new FormData();
    formData.append('titulo', document.getElementById('editTitle').value);
    formData.append('descripcion', document.getElementById('editDescription').value);
    formData.append('link', document.getElementById('editLink').value);

    // Si hay un archivo de imagen, añadirlo al FormData
    //const imageFile = document.getElementById('editImage').files[0]; // Asegúrate de que el input tenga el ID 'editImage'
    //if (imageFile) {
    //    formData.append('imagen', imageFile);
    //}

    console.log('Datos del formulario a enviar:', formData);

    // Llamar a la API para actualizar la sección
    fetch(`http://localhost:5000/editSection/${currentSectionId}`, {
        method: 'PUT',
        headers: {
            'Authorization': authToken // No se debe establecer 'Content-Type' para FormData, se configura automáticamente
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('Sección actualizada:', data);
        // Aquí puedes actualizar la tabla o cerrar el modal
        closeModal(); // Cerrar el modal después de guardar
        window.location.reload();
    })
    .catch(error => console.error('Error al actualizar la sección:', error));
}

// Función para eliminar la sección
function deleteSection(sectionId) {
    if (confirm('¿Estás seguro de que deseas eliminar esta sección?')) {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            window.location.replace('../Front-workspace/login/login.html');
            return;
        }
        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        fetch(`http://localhost:5000/user/sections/${sectionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': authToken
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al eliminar la sección');
            }
            return response.json();
        })
        .then(data => {
            console.log('Sección eliminada:', data);
            window.location.reload(); // Recargar las secciones para reflejar los cambios
        })
        .catch(error => console.error('Error al eliminar la sección:', error));
    }
}








// Llamar a la función al cargar la página
document.addEventListener('DOMContentLoaded', fetchSections);