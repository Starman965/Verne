// ====================================
// Firebase Initialization & Imports
// ====================================
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getDatabase,
    ref, 
    set, 
    push,
    onValue,
    remove,
    get,
    update
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);

// ====================================
// Global State Management
// ====================================
let currentTab = 'locations';
let currentEntity = null;

// ====================================
// Preview System
// ====================================
// Update just the preview selectors and structure to match your HTML
const previewManagers = {
    splash: {
        update(data) {
            const preview = document.querySelector('#splash-preview');
            if (!preview) {
                console.error('Splash preview container not found');
                return;
            }
    
            console.log('Updating splash preview with:', data);
    
            preview.innerHTML = `
                <div class="preview-image">
                    ${data.imageLink ? 
                        `<img src="${data.imageLink}" alt="${data.title || 'Splash preview'}"
                         onload="console.log('Splash image loaded')" 
                         onerror="console.error('Splash image failed to load')">` : 
                        '<span>No image available</span>'}
                </div>
    
                <div class="preview-section">
                    <h3>Title</h3>
                    <div class="preview-title" style="color: ${data.titleColor || '#ffffff'}; ${
                        this.getTextEffects(data.titleShadow, data.titleGlow)
                    }">${data.title || 'No title'}</div>
                </div>
    
                <div class="preview-section">
                    <h3>Subtitle</h3>
                    <div class="preview-subtitle" style="color: ${data.subtitleColor || '#ffffff'}; ${
                        this.getTextEffects(data.subtitleShadow, data.subtitleGlow)
                    }">${data.subtitle || 'No subtitle'}</div>
                </div>
    
                <div class="preview-section">
                    <h3>Buttons</h3>
                    <div class="preview-buttons">
                        ${data.primaryButton ? `
                            <button class="preview-primary-button" type="button"
                                style="color: ${data.primaryButton.textColor}; background-color: ${data.primaryButton.backgroundColor}"
                                data-url="${data.primaryButton.url || '#'}">
                                ${data.primaryButton.text || 'Primary Button'}
                            </button>` : ''}
                        ${data.secondaryButton ? `
                            <button class="preview-secondary-button" type="button"
                                style="color: ${data.secondaryButton.textColor}; background-color: ${data.secondaryButton.backgroundColor}"
                                data-url="${data.secondaryButton.url || '#'}">
                                ${data.secondaryButton.text || 'Secondary Button'}
                            </button>` : ''}
                    </div>
                </div>
    
                ${data.audioLink ? `
                    <div class="preview-section">
                        <h3>Audio</h3>
                        <div class="audio-player">
                            <button class="play-button" type="button">▶</button>
                            <span>Background Audio ${data.audioAutoplay ? '(Autoplay)' : ''}</span>
                        </div>
                    </div>` : ''}
            `;
    
            // Add event listeners after HTML is inserted
            if (data.primaryButton) {
                const primaryBtn = preview.querySelector('.preview-primary-button');
                primaryBtn?.addEventListener('click', () => {
                    window.open(data.primaryButton.url, '_blank');
                });
            }
    
            if (data.secondaryButton) {
                const secondaryBtn = preview.querySelector('.preview-secondary-button');
                secondaryBtn?.addEventListener('click', () => {
                    window.open(data.secondaryButton.url, '_blank');
                });
            }
    
            if (data.audioLink) {
                const playButton = preview.querySelector('.play-button');
                playButton?.addEventListener('click', () => {
                    this.playAudio(data.audioLink);
                });
            }
        },
        clear() {
            const preview = document.querySelector('#splash-preview');
            if (preview) {
                preview.innerHTML = '<span>Select a splash screen to preview</span>';
            }
        },
        getTextEffects(shadow, glow) {
            const effects = [];
            
            if (shadow && shadow !== 'none') {
                effects.push(`text-shadow: var(--text-shadow-${shadow})`);
            }
            
            if (glow && glow !== 'none') {
                effects.push(`filter: var(--text-glow-${glow})`);
            }
            
            return effects.join(';');
        },
        playAudio(audioUrl) {
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            const audio = new Audio(audioUrl);
            audio.play().catch(error => console.error('Error playing audio:', error));
            this.currentAudio = audio;
        },
        currentAudio: null
    },

    locations: {
        update(data) {
            // Using your exact HTML structure
            const preview = document.querySelector('#location-panels .preview-content');
            if (!preview) return;

            // Creating sections in a way that matches your HTML structure
            preview.innerHTML = `
                <div class="preview-image">
                    ${data.imageLink ? 
                        `<img src="${data.imageLink}" alt="${data.name || 'Location preview'}" 
                         onload="console.log('Location image loaded')" 
                         onerror="console.error('Location image failed to load')">` : 
                        '<span>No image available</span>'}
                </div>

                ${data.audioLink ? `
                    <div class="preview-audio">
                        <div class="audio-player">
                            <button class="play-button" onclick="previewManagers.locations.playAudio('${data.audioLink}')">▶</button>
                            <span>Scene Audio</span>
                        </div>
                    </div>` : ''}

                <div class="preview-section">
                    <h3>Description</h3>
                    <div>${data.description || 'No description available'}</div>
                </div>

                <div class="preview-section">
                    <h3>Items Present</h3>
                    <div>${data.items?.length ? 
                        data.items.map(item => `<div>• ${item}</div>`).join('') : 
                        'No items in this location'}</div>
                </div>

                <div class="preview-section">
                    <h3>Available Exits</h3>
                    <div>${data.exits ? 
                        Object.entries(data.exits)
                            .map(([direction, target]) => `${direction} → ${target}`)
                            .join('<br>') : 
                        'No exits available'}</div>
                </div>`;
        },
        clear() {
            const preview = document.querySelector('#location-panels .preview-content');
            if (preview) {
                preview.innerHTML = '<div class="preview-image"><span>Select a location to preview</span></div>';
            }
        },
        playAudio(audioUrl) {
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            const audio = new Audio(audioUrl);
            audio.play().catch(error => console.error('Error playing audio:', error));
            this.currentAudio = audio;
        },
        currentAudio: null
    },

    items: {
        update(data) {
            const preview = document.querySelector('#items-panels .preview-content');
            if (!preview) return;

            preview.innerHTML = `
                <div class="preview-image">
                    ${data.imageLink ? 
                        `<img src="${data.imageLink}" alt="${data.name || 'Item preview'}"
                         onload="console.log('Item image loaded')" 
                         onerror="console.error('Item image failed to load')">` : 
                        '<span>No image available</span>'}
                </div>

                <div class="preview-section">
                    <h3>Description</h3>
                    <div>${data.description || 'No description available'}</div>
                </div>

                <div class="preview-section">
                    <h3>Properties</h3>
                    <div>
                        <div>Weight: ${data.weight || 0}</div>
                        <div>Can be lifted: ${!data.cantBeLiftedFlag ? 'Yes' : 'No'}</div>
                    </div>
                </div>`;
        },
        clear() {
            const preview = document.querySelector('#items-panels .preview-content');
            if (preview) {
                preview.innerHTML = '<div class="preview-image"><span>Select an item to preview</span></div>';
            }
        }
    }
};

// Main preview functions
function updatePreview(data) {
    if (!data) {
        previewManagers[currentTab]?.clear();
        return;
    }
    console.log(`Updating ${currentTab} preview with:`, data);
    previewManagers[currentTab]?.update(data);
}

function clearPreview() {
    previewManagers[currentTab]?.clear();
}

// ====================================
// Tab Management
// ====================================
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    currentTab = tab;
    
    // Update UI
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tab);
    });

    // Show appropriate panels container and hide others
    const panelsContainers = {
        splash: document.getElementById('splash-screen-panels'),
        locations: document.getElementById('location-panels'),
        items: document.getElementById('items-panels')
    };

    Object.values(panelsContainers).forEach(container => {
        if (container) container.style.display = 'none';
    });

    if (panelsContainers[tab]) {
        panelsContainers[tab].style.display = 'grid';
    }
    
    // Load appropriate data
    const loaders = {
        locations: loadLocations,
        items: loadItems,
        splash: loadSplashScreens
    };
    
    loaders[tab]?.();
    clearPreview();
}

// ====================================
// File Upload Handling
// ====================================
async function handleFileUpload(file, path) {
    if (!file) return null;
    
    const fileRef = storageRef(storage, path);
    try {
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

// ====================================
// Locations Management
// ====================================
async function loadLocations() {
    const locationsRef = ref(database, 'locations');
    const entityList = document.getElementById('entity-list');
    entityList.innerHTML = '';
    
    try {
        const snapshot = await get(locationsRef);
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const locationKey = childSnapshot.key;
                const locationData = childSnapshot.val();
                createLocationListItem(locationKey, locationData, entityList);
            });
        }
    } catch (error) {
        console.error('Error loading locations:', error);
        showError('Failed to load locations');
    }
}

function createLocationListItem(key, data, container) {
    const coords = parseLocationKey(key);
    const x = data.x ?? coords.x;
    const y = data.y ?? coords.y;
    
    const element = document.createElement('div');
    element.className = 'entity-item';
    element.innerHTML = `
        <div class="entity-name">${data.name || 'Unnamed Location'}</div>
        <div class="entity-meta">Coordinates: (${x}, ${y})</div>
    `;
    
    element.addEventListener('click', () => {
        document.querySelectorAll('.entity-item').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        editLocation(key);
    });
    
    container.appendChild(element);
}

async function editLocation(locationKey) {
    const locationRef = ref(database, `locations/${locationKey}`);
    try {
        const snapshot = await get(locationRef);
        if (snapshot.exists()) {
            const locationData = snapshot.val();
            currentEntity = locationData;
            
            // Populate form fields
            populateLocationForm(locationData, locationKey);
            
            // Update related UI elements
            updateExitList(locationData.exits || {});  // Note the renamed function
            await updateItemsLists(locationData.items || []);
            updatePreview(locationData);
        }
    } catch (error) {
        console.error('Error editing location:', error);
        showError('Failed to load location data');
    }
}

function populateLocationForm(data, key = '') {
    const fields = {
        'location-key': key,
        'location-name': data.name || '',
        // Fix: Use correct HTML IDs and ensure coordinates are strings
        'x-coordinate': String(data.x ?? ''),  // Changed from x to x-coordinate
        'y-coordinate': String(data.y ?? ''),  // Changed from y to y-coordinate
        'location-description': data.description || '',
        'location-narration': data.narration || ''
    };

    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        } else {
            console.warn(`Element with id '${id}' not found`);  // Add warning for debugging
        }
    });

    // Clear file inputs
    ['location-image', 'location-audio'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
}
// Items list management
async function updateItemsLists(locationItems = []) {
    try {
        // Get all items from database
        const itemsSnapshot = await get(ref(database, 'items'));
        const allItems = itemsSnapshot.exists() ? itemsSnapshot.val() : {};
        
        // Clear existing lists in memory
        const availableItems = [];
        const selectedItems = [...(locationItems || [])];
        
        // Sort items into available vs selected
        Object.entries(allItems).forEach(([key, item]) => {
            if (!selectedItems.includes(item.name)) {
                availableItems.push(item.name);
            }
        });

        // Update the UI with the sorted items
        updateItemsList('available-items', availableItems);
        updateItemsList('location-items', selectedItems);
        
    } catch (error) {
        console.error('Error updating items lists:', error);
        showError('Failed to update items lists');
    }
}

function updateItemsList(elementId, items) {
    const select = document.getElementById(elementId);
    if (!select) {
        console.error(`Element with id '${elementId}' not found`);
        return;
    }
    
    select.innerHTML = items
        .map(item => `<option value="${item}">${item}</option>`)
        .join('');
}

// Exits management
function updateExitList(exits = {}) {
    const exitsList = document.getElementById('exits-list');
    if (!exitsList) return;
    
    exitsList.innerHTML = '';
    
    Object.entries(exits).forEach(([direction, target]) => {
        addExitField(direction, target);
    });
}

function addExitField(direction = '', target = '') {
    const exitsList = document.getElementById('exits-list');
    if (!exitsList) return;
    
    const exitDiv = document.createElement('div');
    exitDiv.className = 'exit-direction';
    exitDiv.innerHTML = `
        <select class="exit-direction-select">
            ${['north', 'south', 'east', 'west'].map(dir => 
                `<option value="${dir}" ${direction === dir ? 'selected' : ''}>${dir}</option>`
            ).join('')}
        </select>
        <input type="text" class="exit-target" value="${target}" placeholder="Target (e.g., 0_1)">
        <button type="button" class="delete-button">Remove</button>
    `;
    
    exitDiv.querySelector('.delete-button').addEventListener('click', () => exitsList.removeChild(exitDiv));
    exitsList.appendChild(exitDiv);
}


// ====================================
// Items Management
// ====================================
async function loadItems() {
    const itemsRef = ref(database, 'items');
    const itemsList = document.getElementById('items-list') || document.getElementById('entity-list');
    
    if (!itemsList) {
        console.error('Items list container not found');
        return;
    }
    
    itemsList.innerHTML = '';
    
    try {
        const snapshot = await get(itemsRef);
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                createItemListItem(childSnapshot.key, childSnapshot.val(), itemsList);
            });
        }
    } catch (error) {
        console.error('Error loading items:', error);
        showError('Failed to load items');
    }
}

function createItemListItem(key, data, container) {
    const element = document.createElement('div');
    element.className = 'entity-item';
    element.innerHTML = `
        <div class="entity-name">${data.name}</div>
        <div class="entity-meta">Weight: ${data.weight}</div>
    `;
    
    element.addEventListener('click', () => {
        document.querySelectorAll('.entity-item').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        editItem(key);
    });
    
    container.appendChild(element);
}

async function editItem(itemKey) {
    const itemRef = ref(database, `items/${itemKey}`);
    try {
        const snapshot = await get(itemRef);
        if (snapshot.exists()) {
            const itemData = snapshot.val();
            currentEntity = itemData;
            
            populateItemForm(itemData, itemKey);
            updatePreview({
                ...itemData,
                imageLink: itemData.imageLink || null
            });
        }
    } catch (error) {
        console.error('Error editing item:', error);
        showError('Failed to load item data');
    }
}

function populateItemForm(data, key = '') {
    const fields = {
        'item-key': key,
        'item-name': data.name || '',
        'item-description': data.description || '',
        'item-weight': data.weight || 0,
        'item-cant-be-lifted': data.cantBeLiftedFlag || false
    };

    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value;
            } else {
                element.value = value;
            }
        }
    });

    // Clear file input
    const imageInput = document.getElementById('item-image');
    if (imageInput) imageInput.value = '';
}

// ====================================
// Splash Screen Management
// ====================================
async function loadSplashScreens() {
    const splashScreensRef = ref(database, 'splashScreens');
    const splashList = document.getElementById('splash-screen-list');
    
    try {
        const snapshot = await get(splashScreensRef);
        const data = snapshot.val() || {};
        
        // Update selection state
        document.querySelectorAll('#splash-screen-list .entity-item').forEach(item => {
            const id = item.dataset.id;
            item.classList.toggle('configured', Boolean(data[id]));
        });
    } catch (error) {
        console.error('Error loading splash screens:', error);
        showError('Failed to load splash screens');
    }
}

async function editSplashScreen(screenId) {
    const splashRef = ref(database, `splashScreens/${screenId}`);
    try {
        const snapshot = await get(splashRef);
        const data = snapshot.exists() ? snapshot.val() : getDefaultSplashScreen(screenId);
        currentEntity = data;
        
        populateSplashForm(data, screenId);
        updatePreview(data);
    } catch (error) {
        console.error('Error editing splash screen:', error);
        showError('Failed to load splash screen data');
    }
}

function getDefaultSplashScreen(screenId) {
    return {
        title: screenId === 'start' ? 'Welcome to the Story' : 'The End',
        subtitle: screenId === 'start' ? 'Click to begin your journey' : 'Thanks for playing',
        titleColor: '#ffffff',
        subtitleColor: '#ffffff',
        titleShadow: 'medium',
        subtitleShadow: 'medium',
        titleGlow: 'none',
        subtitleGlow: 'none',
        transition: 'fade',
        audioAutoplay: true,
        primaryButton: {
            text: screenId === 'start' ? 'Start Game' : 'Play Again',
            url: screenId === 'start' ? '#game' : '#restart',
            textColor: '#ffffff',
            backgroundColor: '#000000'
        },
        secondaryButton: {
            text: screenId === 'start' ? 'Credits' : 'Main Menu',
            url: screenId === 'start' ? '#credits' : '#menu',
            textColor: '#ffffff',
            backgroundColor: '#000000'
        }
    };
}

function populateSplashForm(data, screenId) {
    // Basic fields
    const fields = {
        'splash-screen-id': screenId,
        'splash-title': data.title || '',
        'splash-subtitle': data.subtitle || '',
        'title-color': data.titleColor || '#ffffff',
        'subtitle-color': data.subtitleColor || '#ffffff',
        'title-shadow': data.titleShadow || 'none',
        'subtitle-shadow': data.subtitleShadow || 'none',
        'title-glow': data.titleGlow || 'none',
        'subtitle-glow': data.subtitleGlow || 'none',
        'transition-type': data.transition || 'fade',
        'audio-autoplay': data.audioAutoplay || false
    };

    // Primary button fields
    if (data.primaryButton) {
        fields['primary-button-text'] = data.primaryButton.text || '';
        fields['primary-button-url'] = data.primaryButton.url || '';
        fields['primary-button-color'] = data.primaryButton.textColor || '#ffffff';
        fields['primary-button-bg'] = data.primaryButton.backgroundColor || '#000000';
    }

    // Secondary button fields
    if (data.secondaryButton) {
        fields['secondary-button-text'] = data.secondaryButton.text || '';
        fields['secondary-button-url'] = data.secondaryButton.url || '';
        fields['secondary-button-color'] = data.secondaryButton.textColor || '#ffffff';
        fields['secondary-button-bg'] = data.secondaryButton.backgroundColor || '#000000';
    }

    // Populate all fields
    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value;
            } else {
                element.value = value;
            }
        }
    });

    // Clear file inputs
    ['splash-image', 'splash-audio'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
}

// ====================================
// Form Handlers
// ====================================
async function handleLocationSubmit(e) {
    e.preventDefault();
    
    const formData = {
        key: document.getElementById('location-key').value,
        name: document.getElementById('location-name').value,
        x: parseInt(document.getElementById('x-coordinate').value),
        y: parseInt(document.getElementById('y-coordinate').value),
        description: document.getElementById('location-description').value,
        narration: document.getElementById('location-narration').value,
        imageFile: document.getElementById('location-image').files[0],
        audioFile: document.getElementById('location-audio').files[0]
    };
    
    try {
        // Prepare location data
        let locationData = {
            name: formData.name,
            x: formData.x,
            y: formData.y,
            description: formData.description,
            narration: formData.narration,
        };

        // Handle image upload
        if (formData.imageFile) {
            const imagePath = `locations/${formData.x}_${formData.y}_image.jpg`;
            locationData.imageLink = await handleFileUpload(formData.imageFile, imagePath);
        } else if (currentEntity?.imageLink) {
            locationData.imageLink = currentEntity.imageLink;
        }

        // Handle audio upload
        if (formData.audioFile) {
            const audioPath = `locations/${formData.x}_${formData.y}_audio.mp3`;
            locationData.audioLink = await handleFileUpload(formData.audioFile, audioPath);
        } else if (currentEntity?.audioLink) {
            locationData.audioLink = currentEntity.audioLink;
        }

        // Collect exits
        locationData.exits = {};
        document.querySelectorAll('.exit-direction').forEach(exitDiv => {
            const direction = exitDiv.querySelector('.exit-direction-select').value;
            const target = exitDiv.querySelector('.exit-target').value;
            if (direction && target) {
                locationData.exits[direction] = target;
            }
        });

        // Collect items
        locationData.items = Array.from(document.getElementById('location-items').options)
            .map(option => option.value);

        // Save to database
        const key = formData.key || `${formData.x}_${formData.y}`;
        await set(ref(database, `locations/${key}`), locationData);
        
        showSuccess('Location saved successfully');
        document.getElementById('location-form').reset();
        loadLocations();
        clearPreview();
        
    } catch (error) {
        console.error('Error saving location:', error);
        showError('Failed to save location');
    }
}

async function handleItemSubmit(e) {
    e.preventDefault();
    
    const formData = {
        key: document.getElementById('item-key').value,
        name: document.getElementById('item-name').value,
        description: document.getElementById('item-description').value,
        weight: parseInt(document.getElementById('item-weight').value),
        cantBeLiftedFlag: document.getElementById('item-cant-be-lifted').checked,
        imageFile: document.getElementById('item-image').files[0]
    };
    
    try {
        let itemData = {
            name: formData.name,
            description: formData.description,
            weight: formData.weight,
            cantBeLiftedFlag: formData.cantBeLiftedFlag
        };

        // Handle image upload
        if (formData.imageFile) {
            const imagePath = `items/${formData.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
            itemData.imageLink = await handleFileUpload(formData.imageFile, imagePath);
        } else if (currentEntity?.imageLink) {
            itemData.imageLink = currentEntity.imageLink;
        }

        // Save to database
        const key = formData.key || formData.name.toLowerCase().replace(/\s+/g, '_');
        await set(ref(database, `items/${key}`), itemData);
        
        showSuccess('Item saved successfully');
        document.getElementById('item-form').reset();
        loadItems();
        clearPreview();
        
    } catch (error) {
        console.error('Error saving item:', error);
        showError('Failed to save item');
    }
}
function moveSelectedItems(fromSelect, toSelect) {
    if (!fromSelect || !toSelect) return;
    
    const selectedOptions = Array.from(fromSelect.selectedOptions);
    selectedOptions.forEach(option => {
        toSelect.appendChild(option);
    });
}
async function handleSplashScreenSubmit(e) {
    e.preventDefault();
    
    const formData = {
        screenId: document.getElementById('splash-screen-id').value,
        title: document.getElementById('splash-title').value,
        subtitle: document.getElementById('splash-subtitle').value,
        titleColor: document.getElementById('title-color').value,
        subtitleColor: document.getElementById('subtitle-color').value,
        titleShadow: document.getElementById('title-shadow').value,
        subtitleShadow: document.getElementById('subtitle-shadow').value,
        titleGlow: document.getElementById('title-glow').value,
        subtitleGlow: document.getElementById('subtitle-glow').value,
        transition: document.getElementById('transition-type').value,
        audioAutoplay: document.getElementById('audio-autoplay').checked,
        imageFile: document.getElementById('splash-image').files[0],
        audioFile: document.getElementById('splash-audio').files[0],
        primaryButton: {
            text: document.getElementById('primary-button-text').value,
            url: document.getElementById('primary-button-url').value,
            textColor: document.getElementById('primary-button-color').value,
            backgroundColor: document.getElementById('primary-button-bg').value
        },
        secondaryButton: {
            text: document.getElementById('secondary-button-text').value,
            url: document.getElementById('secondary-button-url').value,
            textColor: document.getElementById('secondary-button-color').value,
            backgroundColor: document.getElementById('secondary-button-bg').value
        }
    };
    
    try {
        let splashData = { ...formData };
        delete splashData.imageFile;
        delete splashData.audioFile;
        delete splashData.screenId;

        // Handle image upload
        if (formData.imageFile) {
            const imagePath = `splashScreens/${formData.screenId}_image.jpg`;
            splashData.imageLink = await handleFileUpload(formData.imageFile, imagePath);
        } else if (currentEntity?.imageLink) {
            splashData.imageLink = currentEntity.imageLink;
        }

        // Handle audio upload
        if (formData.audioFile) {
            const audioPath = `splashScreens/${formData.screenId}_audio.mp3`;
            splashData.audioLink = await handleFileUpload(formData.audioFile, audioPath);
        } else if (currentEntity?.audioLink) {
            splashData.audioLink = currentEntity.audioLink;
        }

        // Save to database
        await set(ref(database, `splashScreens/${formData.screenId}`), splashData);
        
        showSuccess('Splash screen saved successfully');
        loadSplashScreens();
        updatePreview(splashData);
        
    } catch (error) {
        console.error('Error saving splash screen:', error);
        showError('Failed to save splash screen');
    }
}

// ====================================
// Delete Handler
// ====================================
async function handleDelete() {
    if (!currentEntity) return;
    
    const entityType = currentTab === 'locations' ? 'location' : 'item';
    const key = document.getElementById(`${entityType}-key`).value;
    
    if (!key || !confirm(`Are you sure you want to delete this ${entityType}?`)) {
        return;
    }
    
    try {
        // Delete associated files
        if (currentEntity.imageLink) {
            try {
                await deleteObject(storageRef(storage, currentEntity.imageLink));
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }
        if (currentEntity.audioLink) {
            try {
                await deleteObject(storageRef(storage, currentEntity.audioLink));
            } catch (error) {
                console.error('Error deleting audio:', error);
            }
        }
        
        // Delete database entry
        await remove(ref(database, `${currentTab}/${key}`));
        
        showSuccess(`${entityType} deleted successfully`);
        document.getElementById(`${entityType}-form`).reset();
        if (currentTab === 'locations') {
            loadLocations();
        } else {
            loadItems();
        }
        clearPreview();
        
    } catch (error) {
        console.error(`Error deleting ${entityType}:`, error);
        showError(`Failed to delete ${entityType}`);
    }
}

// ====================================
// Utility Functions
// ====================================
function parseLocationKey(key) {
    const [x, y] = key.split('_').map(Number);
    return { x, y };
}

function showSuccess(message) {
    // TODO: Replace with proper notification system
    alert(message);
}

function showError(message) {
    // TODO: Replace with proper notification system
    alert('Error: ' + message);
}

// ====================================
// Initialization
// ====================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tabs
    initializeTabs();
    
    // Initialize splash screen handlers
    document.querySelectorAll('#splash-screen-list .entity-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('#splash-screen-list .entity-item').forEach(el => 
                el.classList.remove('selected'));
            item.classList.add('selected');
            editSplashScreen(item.dataset.id);
        });
    });
    
    // Form submissions
    document.getElementById('location-form')?.addEventListener('submit', handleLocationSubmit);
    document.getElementById('item-form')?.addEventListener('submit', handleItemSubmit);
    document.getElementById('splash-screen-form')?.addEventListener('submit', handleSplashScreenSubmit);
    
    // Delete buttons
    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', handleDelete);
    });
    
    // Add exit button
    document.getElementById('add-exit')?.addEventListener('click', () => addExitField());
    
    // Item transfer buttons
    document.getElementById('add-items')?.addEventListener('click', () => {
        moveSelectedItems(
            document.getElementById('available-items'),
            document.getElementById('location-items')
        );
    });
    
    document.getElementById('remove-items')?.addEventListener('click', () => {
        moveSelectedItems(
            document.getElementById('location-items'),
            document.getElementById('available-items')
        );
    });
    
    // Load initial data
    switchTab('locations');
});

// Export necessary functions if needed
export {
    switchTab,
    updatePreview,
    clearPreview,
    handleDelete,
    showSuccess,
    showError
};