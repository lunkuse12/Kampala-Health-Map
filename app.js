class HealthCentersMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.healthCenters = healthCentersData;
        this.userLocation = null;
        this.currentFilter = 'all';
        
        this.init();
    }

    // Initialize the application
    init() {
        this.initMap();
        this.initEventListeners();
        this.renderFacilitiesList();
        this.updateStatistics();
    }

    // Initialize Leaflet map
    initMap() {
        // Create map instance
        this.map = L.map('map').setView([0.3476, 32.5825], 13);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Add markers to map
        this.addMarkers();
    }

    // Add markers to the map
    addMarkers() {
        this.healthCenters.forEach(center => {
            const icon = this.createCustomIcon(center.type);
            
            const marker = L.marker([center.lat, center.lng], { icon })
                .addTo(this.map)
                .bindPopup(this.createPopupContent(center));

            this.markers.push({
                marker,
                data: center
            });
        });
    }

    // Create custom icons based on facility type
    createCustomIcon(type) {
        const iconConfig = {
            hospital: { 
                color: '#ef4444', 
                icon: 'fa-hospital', 
                bgColor: '#ef4444',
                borderColor: '#dc2626'
            },
            clinic: { 
                color: '#06b6d4', 
                icon: 'fa-stethoscope', 
                bgColor: '#06b6d4',
                borderColor: '#0891b2'
            },
            'health-center': { 
                color: '#f59e0b', 
                icon: 'fa-house-medical', 
                bgColor: '#f59e0b',
                borderColor: '#d97706'
            }
        };

        const config = iconConfig[type] || iconConfig.hospital;

        return L.divIcon({
            html: `
                <div class="custom-marker ${type}" style="background: ${config.bgColor}; border-color: ${config.borderColor}">
                    <i class="fas ${config.icon}"></i>
                </div>
            `,
            className: 'custom-marker-container',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
    }

    // Create popup content for markers
    createPopupContent(center) {
        return `
            <div class="health-popup">
                <div class="popup-title">${center.name}</div>
                <div class="popup-type">${this.formatType(center.type)}</div>
                <div class="popup-contact">
                    <div><strong>Address:</strong> ${center.address}</div>
                    <div><strong>Contact:</strong> ${center.contact}</div>
                    ${center.emergency ? `<div><strong>Emergency:</strong> ${center.emergency}</div>` : ''}
                    <div><strong>Hours:</strong> ${center.hours}</div>
                </div>
                <div class="popup-services">
                    <h5>Services:</h5>
                    <div class="service-tags">
                        ${center.services.slice(0, 5).map(service => 
                            `<span class="service-tag">${service}</span>`
                        ).join('')}
                        ${center.services.length > 5 ? 
                            `<span class="service-tag">+${center.services.length - 5} more</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Format type for display
    formatType(type) {
        const typeMap = {
            'hospital': 'Hospital',
            'clinic': 'Medical Clinic',
            'health-center': 'Health Center'
        };
        return typeMap[type] || type;
    }

    // Initialize event listeners
    initEventListeners() {
        // Search functionality
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchFacilities(e.target.value);
        });

        // Location and reset buttons
        document.getElementById('locate-me').addEventListener('click', () => {
            this.locateUser();
        });
        
        document.getElementById('reset-view').addEventListener('click', () => {
            this.resetMap();
        });

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.filterFacilities(e.target);
            });
        });

        // Map controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.map.zoomIn();
        });
        
        document.getElementById('zoom-out').addEventListener('click', () => {
            this.map.zoomOut();
        });
    }

    // Search facilities
    searchFacilities(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            // If search is empty, show all facilities based on current filter
            this.applyFilter(this.currentFilter);
            return;
        }

        // Filter facilities based on search term
        const results = this.healthCenters.filter(center =>
            center.name.toLowerCase().includes(term) ||
            center.type.toLowerCase().includes(term) ||
            center.services.some(service => service.toLowerCase().includes(term)) ||
            center.address.toLowerCase().includes(term)
        );

        // Update markers visibility
        this.markers.forEach(({ marker, data }) => {
            const isMatch = results.some(result => result.id === data.id);
            
            if (isMatch && (this.currentFilter === 'all' || data.type === this.currentFilter)) {
                if (!this.map.hasLayer(marker)) {
                    this.map.addLayer(marker);
                }
            } else {
                if (this.map.hasLayer(marker)) {
                    this.map.removeLayer(marker);
                }
            }
        });

        // Update list
        this.renderFacilitiesList(this.currentFilter, term);
        
        if (results.length > 0 && term) {
            this.showNotification(`Found ${results.length} facilities matching "${term}"`, 'success');
        } else if (term) {
            this.showNotification('No facilities found matching your search', 'warning');
        }
    }

    // Filter facilities by type
    filterFacilities(clickedTab) {
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        clickedTab.classList.add('active');

        const filter = clickedTab.getAttribute('data-filter');
        this.currentFilter = filter;
        
        // Apply the filter
        this.applyFilter(filter);
        
        // Also apply any active search
        const searchTerm = document.getElementById('search-input').value;
        if (searchTerm) {
            this.searchFacilities(searchTerm);
        }
    }

    // Apply filter to markers and list
    applyFilter(filter) {
        // Filter markers
        this.markers.forEach(({ marker, data }) => {
            if (filter === 'all' || data.type === filter) {
                if (!this.map.hasLayer(marker)) {
                    this.map.addLayer(marker);
                }
            } else {
                if (this.map.hasLayer(marker)) {
                    this.map.removeLayer(marker);
                }
            }
        });

        // Filter list
        this.renderFacilitiesList(filter);
    }

    // Render facilities list
    renderFacilitiesList(filter = 'all', searchTerm = '') {
        const container = document.getElementById('health-center-list');
        
        // Filter centers based on type and search term
        let filteredCenters = filter === 'all' 
            ? this.healthCenters 
            : this.healthCenters.filter(center => center.type === filter);
            
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredCenters = filteredCenters.filter(center =>
                center.name.toLowerCase().includes(term) ||
                center.type.toLowerCase().includes(term) ||
                center.services.some(service => service.toLowerCase().includes(term)) ||
                center.address.toLowerCase().includes(term)
            );
        }

        container.innerHTML = filteredCenters.map(center => `
            <li class="health-center-item" data-id="${center.id}">
                <div class="health-center-name">${center.name}</div>
                <div class="health-center-type">${this.formatType(center.type)}</div>
                <div class="health-center-contact">${center.contact}</div>
            </li>
        `).join('');

        // Add click events to list items
        container.querySelectorAll('.health-center-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.getAttribute('data-id'));
                this.focusOnFacility(id);
            });
        });
    }

    // Focus on specific facility
    focusOnFacility(id) {
        const center = this.healthCenters.find(c => c.id === id);
        if (center) {
            // Center map on facility
            this.map.setView([center.lat, center.lng], 16);
            
            // Find and open the marker's popup
            const markerData = this.markers.find(m => m.data.id === id);
            if (markerData) {
                setTimeout(() => markerData.marker.openPopup(), 300);
            }
            
            // Highlight list item
            document.querySelectorAll('.health-center-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`.health-center-item[data-id="${id}"]`).classList.add('active');
            
            this.showNotification(`Viewing ${center.name}`, 'info');
        }
    }

    // Locate user
    locateUser() {
        if (!navigator.geolocation) {
            this.showNotification('Geolocation is not supported by your browser', 'error');
            return;
        }

        const button = document.getElementById('locate-me');
        const originalHtml = button.innerHTML;
        
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
        button.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Remove existing user location marker
                if (this.userLocation) {
                    this.map.removeLayer(this.userLocation);
                }

                // Add user location marker
                this.userLocation = L.marker([lat, lng])
                    .addTo(this.map)
                    .bindPopup('Your current location')
                    .openPopup();

                // Center map on user location
                this.map.setView([lat, lng], 14);

                button.innerHTML = originalHtml;
                button.disabled = false;
                
                this.showNotification('Location found successfully', 'success');
            },
            (error) => {
                let message = 'Unable to retrieve your location';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location access was denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out';
                        break;
                }
                
                this.showNotification(message, 'error');
                button.innerHTML = originalHtml;
                button.disabled = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    // Reset map view
    resetMap() {
        this.map.setView([0.3476, 32.5825], 13);
        document.getElementById('search-input').value = '';
        
        // Remove user location marker if exists
        if (this.userLocation) {
            this.map.removeLayer(this.userLocation);
            this.userLocation = null;
        }
        
        // Reset filter to 'all'
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector('.filter-tab[data-filter="all"]').classList.add('active');
        
        this.currentFilter = 'all';
        this.applyFilter('all');
        
        this.showNotification('Map view reset', 'info');
    }

    // Update statistics
    updateStatistics() {
        const total = this.healthCenters.length;
        const hospitals = this.healthCenters.filter(c => c.type === 'hospital').length;
        const emergency = this.healthCenters.filter(c => c.hasEmergency).length;

        document.getElementById('total-facilities').textContent = total;
        document.getElementById('hospitals-count').textContent = hospitals;
        document.getElementById('emergency-count').textContent = emergency;
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.healthMap = new HealthCentersMap();
});