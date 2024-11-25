const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');

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
    // If we're dragging, don't open the link
    if (event.target.closest('.drag-handle')) {
        event.preventDefault();
        return;
    }
    window.open(url, '_blank');
}

// Function to create a card element
function createCard(cardData) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', cardData.id);
    card.onclick = (event) => handleCardClick(event, cardData.url);

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
        // Replace this URL with your actual API endpoint
        const response = await fetch('your-api-endpoint');
        const cardsData = await response.json();
        
        const grid = document.getElementById('sortable-grid');
        const savedOrder = localStorage.getItem('cardOrder');
        let orderArray = [];

        if (savedOrder) {
            orderArray = JSON.parse(savedOrder);
            
            // First, add cards in the saved order
            orderArray.forEach(id => {
                const cardData = cardsData.find(card => card.id.toString() === id);
                if (cardData) {
                    grid.appendChild(createCard(cardData));
                    // Remove from cardsData to track which ones are new/unordered
                    cardsData.splice(cardsData.indexOf(cardData), 1);
                }
            });
        }

        // Add remaining cards that weren't in the saved order
        cardsData.forEach(cardData => {
            grid.appendChild(createCard(cardData));
        });

        // Initialize Sortable after cards are loaded
        initializeSortable();

    } catch (error) {
        console.error('Error loading cards:', error);
        // You might want to show an error message to the user
    }
}

// Initialize Sortable
function initializeSortable() {
    const grid = document.getElementById('sortable-grid');
    if (!grid) return;

    const sortable = new Sortable(grid, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onEnd: function() {
            saveCardOrder();
        }
    });
}

// Save card order to localStorage
function saveCardOrder() {
    const grid = document.getElementById('sortable-grid');
    const cards = grid.getElementsByClassName('card');
    const order = Array.from(cards).map(card => card.getAttribute('data-id'));
    localStorage.setItem('cardOrder', JSON.stringify(order));
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Clear existing static cards
    const grid = document.getElementById('sortable-grid');
    if (grid) {
        grid.innerHTML = '';
        // Load cards from API
        loadCardsFromAPI();
    }

    // TOGGLE SIDEBAR
    const menuBar = document.querySelector('#content nav .bx.bx-menu');
    const sidebar = document.getElementById('sidebar');

    menuBar.addEventListener('click', function () {
        sidebar.classList.toggle('hide');
    })

    const searchButton = document.querySelector('#content nav form .form-input button');
    const searchButtonIcon = document.querySelector('#content nav form .form-input button .bx');
    const searchForm = document.querySelector('#content nav form');

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
    })

    if(window.innerWidth < 768) {
        sidebar.classList.add('hide');
    } else if(window.innerWidth > 576) {
        searchButtonIcon.classList.replace('bx-x', 'bx-search');
        searchForm.classList.remove('show');
    }

    window.addEventListener('resize', function () {
        if(this.innerWidth > 576) {
            searchButtonIcon.classList.replace('bx-x', 'bx-search');
            searchForm.classList.remove('show');
        }
    })

    const switchMode = document.getElementById('switch-mode');

    switchMode.addEventListener('change', function () {
        if(this.checked) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    })
})