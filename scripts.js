// scripts.js
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getDatabase,
    ref, 
    set, 
    onValue,
    get,
    remove,
    update
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

import { audioManager } from './audio-manager.js';

// Initialize Firebase
console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Cache DOM elements
const narrativeBox = document.getElementById('narrative-box');
const sceneImage = document.getElementById('scene-image');
const menuPanel = document.getElementById('menu-panel');
const inventoryPanel = document.getElementById('inventory-panel');
const questsPanel = document.getElementById('quests-panel');


// Game state
let player = {
    health: 100,
    inventory: [],
    location: { x: 0, y: 0 }
};

let currentLocation = {
    description: "",
    items: []
};

// Initialize UI elements
console.log('Initializing UI elements...');
document.querySelectorAll('.menu-toggle').forEach(button => {
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = button.id.split('-')[0]; // menu, inventory, or quests
        togglePanel(targetId);
    });
});

// Panel management
function togglePanel(panelType) {
    console.log(`Toggling ${panelType} panel`);
    const panels = {
        menu: menuPanel,
        inventory: inventoryPanel,
        quests: questsPanel
    };
    
    const targetPanel = panels[panelType];
    if (!targetPanel) return;
    
    const dropButton = document.getElementById('drop-btn');
    const isDropActive = dropButton && dropButton.classList.contains('active');
    
    // Close other panels
    Object.values(panels).forEach(panel => {
        if (panel !== targetPanel) {
            panel.classList.remove('open');
        }
    });
    
    // Only toggle if not being opened by drop button
    if (!isDropActive) {
        targetPanel.classList.toggle('open');
    }
}


// Close panels when clicking outside, but not during drop action
document.addEventListener('click', (event) => {
    const dropButton = document.getElementById('drop-btn');
    // Don't close panels if drop button is active
    if (dropButton && dropButton.classList.contains('active')) {
        return;
    }

    const panels = [menuPanel, inventoryPanel, questsPanel];
    panels.forEach(panel => {
        if (panel && 
            panel.classList.contains('open') && 
            !panel.contains(event.target) && 
            !event.target.closest('.menu-toggle') &&
            !event.target.closest('#drop-btn')) {
            panel.classList.remove('open');
        }
    });
});

// Narrative system
function updateGameLog(message, clearPrevious = false, isPermanent = true) {
    console.log('Updating game log:', message);
    
    if (clearPrevious) {
        narrativeBox.innerHTML = '';
    } else {
        // If not clearing, append to existing content
        message = narrativeBox.innerHTML + '<br><br>' + message;
    }
    
    narrativeBox.innerHTML = message;
    narrativeBox.classList.add('visible');
    
    if (!isPermanent) {
        setTimeout(() => {
            narrativeBox.classList.remove('visible');
        }, 5000);
    }
}

// Location management
async function updateLocation(newX, newY) {
    console.log(`Updating location to ${newX}, ${newY}`);
    const locationKey = `${newX}_${newY}`;
    const locationRef = ref(database, `locations/${locationKey}`);
    
    try {
        const snapshot = await get(locationRef);
        if (snapshot.exists()) {
            player.location = { x: newX, y: newY };
            const locationData = snapshot.val();
            currentLocation = locationData;
            
            // Update scene image with fade
            sceneImage.classList.add('fade-out');
            setTimeout(() => {
                sceneImage.style.backgroundImage = `url(${locationData.imageLink})`;
                sceneImage.classList.remove('fade-out');
                sceneImage.classList.add('fade-in');
                
                setTimeout(() => {
                    sceneImage.classList.remove('fade-in');
                }, 300);
            }, 300);
            
            // Update narrative with location description
            updateGameLog(currentLocation.description, true, true);
            
            // Stop any existing location audio
            audioManager.stopLocationAudio();
            
            // Play location audio if available
            if (locationData.audioLink) {
                console.log('Playing scene audio:', locationData.audioLink);
                audioManager.playLocationAudio(locationData.audioLink);
            }
            
            // Update available exits
            updateAvailableExits(locationData.exits);
            
            // Check for items after a brief delay to allow description to be read
            setTimeout(() => {
                checkForItems(locationData);
            }, 100);
            
            console.log('Location updated successfully');
        } else {
            updateGameLog("You cannot move in that direction.");
            console.log('Invalid location');
        }
    } catch (error) {
        console.error("Error updating location:", error);
        updateGameLog("An error occurred while updating the location.");
    }
}


// Navigation system
function updateAvailableExits(exits) {
    console.log('Updating available exits:', exits);
    const directions = ['north', 'south', 'east', 'west'];
    directions.forEach(direction => {
        const button = document.getElementById(`move-${direction}`);
        if (button) {
            if (exits && exits[direction]) {
                button.disabled = false;
                button.style.opacity = 1;
            } else {
                button.disabled = true;
                button.style.opacity = 0.3;
            }
        }
    });
}

// Item management
async function checkForItems(locationData) {
    console.log('Checking for items:', locationData?.items);
    const pickupButton = document.getElementById('pickup-btn');
    const dropButton = document.getElementById('drop-btn');
    
    // Handle pickup button state based on location items
    if (locationData?.items && locationData.items.length > 0) {
        const itemsList = locationData.items.map(item => 
            `<span class="clickable-item" data-item="${item}">${item}</span>`
        ).join(', ');
        updateGameLog(`You see ${itemsList} here.`, false, true);
        pickupButton.disabled = false;
        
        // Add click listeners to items
        setTimeout(() => {
            document.querySelectorAll('.clickable-item').forEach(item => {
                item.removeEventListener('click', itemClickHandler); // Remove old listener if exists
                item.addEventListener('click', itemClickHandler);
            });
        }, 0);
    } else {
        pickupButton.disabled = true;
    }

    // Handle drop button state based on inventory
    const inventoryRef = ref(database, 'player/inventory');
    try {
        const snapshot = await get(inventoryRef);
        const hasInventoryItems = snapshot.exists() && Object.keys(snapshot.val()).length > 0;
        dropButton.disabled = !hasInventoryItems;
    } catch (error) {
        console.error("Error checking inventory:", error);
        dropButton.disabled = true;
    }
}


function itemClickHandler(event) {
    const itemName = event.target.dataset.item;
    console.log('Item clicked:', itemName);
    
    const activeButton = document.querySelector('#action-buttons button.active');
    if (!activeButton) {
        updateGameLog("Please select an action (Pickup or Drop) before clicking an item.");
        return;
    }

    if (activeButton.id === 'pickup-btn') {
        pickupItem(itemName);
    }
}
// updateActionButtonStates function
function updateActionButtonStates(locationData) {
    console.log('Updating action button states');
    const hasItems = locationData?.items && locationData.items.length > 0;
    
    // Update button states based on context
    document.getElementById('pickup-btn').disabled = !hasItems;
    
    // Disable placeholder buttons
    ['look-btn', 'talk-btn', 'use-btn', 'open-btn'].forEach(btnId => {
        document.getElementById(btnId).disabled = true;
    });
}

function handleItemClick(itemName) {
    console.log('Inventory item clicked:', itemName);
    const activeButton = document.querySelector('#action-buttons button.active');
    if (activeButton && activeButton.id === 'drop-btn') {
        dropItem(itemName);
    } else {
        updateGameLog("Please select an action first.");
    }
}

// Inventory system
async function pickupItem(itemName) {
    console.log('Attempting to pickup:', itemName);
    const locationKey = `${player.location.x}_${player.location.y}`;
    const locationRef = ref(database, `locations/${locationKey}`);
    
    try {
        const locationSnapshot = await get(locationRef);
        if (locationSnapshot.exists()) {
            const locationData = locationSnapshot.val();
            if (locationData.items && locationData.items.includes(itemName)) {
                const itemKey = itemName.replace(/\s+/g, '_').toLowerCase();
                const itemRef = ref(database, `items/${itemKey}`);
                
                const itemSnapshot = await get(itemRef);
                if (itemSnapshot.exists()) {
                    const item = itemSnapshot.val();
                    
                    // Add to inventory
                    await set(ref(database, `player/inventory/${itemKey}`), item);
                    
                    // Remove from location
                    const updatedItems = locationData.items.filter(i => i !== itemName);
                    await set(ref(database, `locations/${locationKey}/items`), updatedItems);
                    
                    updateGameLog(`You picked up the ${itemName}.`);
                    audioManager.playSoundEffect('backpack');
                    await displayInventory();
                    checkForItems({ items: updatedItems });
                }
            }
        }
    } catch (error) {
        console.error("Error picking up item:", error);
        updateGameLog("Couldn't pick up the item.");
    }
}
// Drop system updates
function initializeDropButton() {
    const dropButton = document.getElementById('drop-btn');
    
    if (!dropButton) {
        console.error('Drop button not found');
        return;
    }
    
    dropButton.addEventListener('click', (e) => {
        console.log('Drop button clicked');
        e.stopPropagation(); // Prevent event from bubbling up
        
        // Clear any other active buttons and set drop button as active
        document.querySelectorAll('.action-button').forEach(btn => {
            btn.classList.remove('active');
        });
        dropButton.classList.add('active');
        
        if (!inventoryPanel) {
            console.error('Inventory panel not found');
            return;
        }
        
        // Close any other open panels first
        [menuPanel, questsPanel].forEach(panel => {
            if (panel) {
                panel.classList.remove('open');
            }
        });
        
        // Force open inventory panel
        console.log('Opening inventory panel for drop');
        inventoryPanel.classList.add('open');
        
        // Enable drop mode on inventory items
        setTimeout(() => {
            document.querySelectorAll('.inventory-item').forEach(item => {
                item.classList.add('droppable');
                // Remove any existing listeners first to prevent duplicates
                item.removeEventListener('click', handleDropItem);
                item.addEventListener('click', handleDropItem);
            });
        }, 0);
        
        updateGameLog("Select an item from your inventory to drop.", false, true);
    });
}

async function handleDropItem(event) {
    const itemElement = event.currentTarget;
    const itemId = itemElement.dataset.id;
    const itemName = itemElement.textContent.trim();
    
    if (!itemId || !itemName) {
        console.error('Invalid item data:', { itemId, itemName });
        return;
    }
    
    try {
        await performDropItem(itemId, itemName);
        
        // Clean up drop mode
        document.querySelectorAll('.inventory-item').forEach(item => {
            item.classList.remove('droppable');
            item.removeEventListener('click', handleDropItem);
        });
        
        // Deactivate drop button
        document.getElementById('drop-btn').classList.remove('active');
        
        // Close inventory panel
        document.getElementById('inventory-panel').classList.remove('open');
        
    } catch (error) {
        console.error('Error dropping item:', error);
        updateGameLog("Failed to drop the item. Please try again.");
    }
}

async function performDropItem(itemId, itemName) {
    const locationKey = `${player.location.x}_${player.location.y}`;
    const inventoryRef = ref(database, `player/inventory/${itemId}`);
    const locationRef = ref(database, `locations/${locationKey}`);
    
    try {
        // Get current location data
        const locationSnapshot = await get(locationRef);
        const locationData = locationSnapshot.val() || {};
        
        // Update location items array
        const currentItems = locationData.items || [];
        currentItems.push(itemName);
        
        // Remove from inventory and update location in one transaction
        const updates = {
            [`player/inventory/${itemId}`]: null,
            [`locations/${locationKey}/items`]: currentItems
        };
        
        await update(ref(database), updates);
        
        // Play sound effect
        audioManager.playSoundEffect('backpack');
        
        // Update game state
        updateGameLog(`You dropped the ${itemName}.`, false, true);
        await displayInventory();
        
        // Update location display
        checkForItems({ ...locationData, items: currentItems });
        
        // Update action button states
        updateActionButtonStates({ ...locationData, items: currentItems });
        
    } catch (error) {
        console.error("Error in performDropItem:", error);
        throw error; // Re-throw to be handled by caller
    }
}

// Helper function to handle database errors
function handleDatabaseError(error, operation) {
    console.error(`Database error during ${operation}:`, error);
    updateGameLog(`An error occurred while ${operation}. Please try again.`);
}
async function displayInventory() {
    console.log('Displaying inventory');
    const inventoryItems = document.getElementById('inventory-items');
    const dropButton = document.getElementById('drop-btn');
    const inventoryRef = ref(database, 'player/inventory');
    
    try {
        const snapshot = await get(inventoryRef);
        if (snapshot.exists()) {
            const items = snapshot.val();
            const hasItems = Object.keys(items).length > 0;
            
            inventoryItems.innerHTML = Object.entries(items).map(([key, item]) => `
                <div class="inventory-item" data-id="${key}">
                    ${item.name}
                </div>
            `).join('');
            
            // Update drop button state
            dropButton.disabled = !hasItems;
            
            // Add click handlers
            document.querySelectorAll('.inventory-item').forEach(item => {
                item.addEventListener('click', () => selectInventoryItem(item.dataset.id));
            });
        } else {
            inventoryItems.innerHTML = '<div class="empty-inventory">No items</div>';
            dropButton.disabled = true;
        }
    } catch (error) {
        console.error("Error displaying inventory:", error);
        dropButton.disabled = true;
    }
}

function selectInventoryItem(itemId) {
    console.log('Selected inventory item:', itemId);
    document.querySelectorAll('.inventory-item').forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.id === itemId) {
            item.classList.add('selected');
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    // Initialize drop button
    initializeDropButton();
    
    // Navigation buttons
    ['north', 'south', 'east', 'west'].forEach(direction => {
        const button = document.getElementById(`move-${direction}`);
        if (button) {
            button.addEventListener('click', () => {
                let newX = player.location.x;
                let newY = player.location.y;
                switch(direction) {
                    case 'north': newY++; break;
                    case 'south': newY--; break;
                    case 'east': newX++; break;
                    case 'west': newX--; break;
                }
                updateLocation(newX, newY);
            });
        }
    });
    
    // Action buttons (except drop button which is handled separately)
    document.querySelectorAll('.action-button:not(#drop-btn)').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.action-button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
        });
    });
    
    // Initialize game state
    updateLocation(0, 0);
    displayInventory();
});

document.addEventListener('DOMContentLoaded', () => {
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');

    // Initialize slider with the current volume setting from the audio manager
    volumeSlider.value = audioManager.settings.volume;
    volumeValue.textContent = audioManager.settings.volume;

    // Listen for changes on the slider
    volumeSlider.addEventListener('input', (event) => {
        const newVolume = parseInt(event.target.value, 10);
        volumeValue.textContent = newVolume;

        // Update the volume in the audio manager with the new slider value
        audioManager.updateSettings({ volume: newVolume });
    });
});

// Utility Functions
function playSound(soundFile) {
    console.log('Playing sound:', soundFile);
    const audio = new Audio(soundFile);
    audio.play().catch(error => console.error('Error playing sound:', error));
}
