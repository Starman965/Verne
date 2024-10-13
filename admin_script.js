// admin_script.js

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);

// Function to safely add event listener
function safeAddEventListener(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener(event, handler);
    } else {
        console.warn(`Element with id '${id}' not found`);
    }
}

// Function to initialize game data
async function initializeGameData() {
    if (confirm('Are you sure you want to reset the game data? This will overwrite all existing data.')) {
        try {
            const initialGameData = {
                gameState: {
                    player: {
                        activeWeapon: "Pistol",
                        health: 100,
                        inventoryWeight: 0,
                        location: { x: 0, y: 0 }
                    }
                },
                items: {
                    green_emerald: {
                        cantBeLiftedFlag: false,
                        description: "A small, Green Emerald with strange symbols etched into its surface. It seems to be of Mayan origin.",
                        imageLink: "https://firebasestorage.googleapis.com/v0/b/pickleball-e2a5a.appspot.com/o/items%2Fgreen_emerald.jpg?alt=media&token=1564b944-5087-4fcf-894e-5eccdf8054d7",
                        name: "Green Emerald",
                        weight: 5
                    },
                    necklace: {
                        cantBeLiftedFlag: false,
                        description: "It's a very pretty necklace",
                        imageLink: "https://firebasestorage.googleapis.com/v0/b/pickleball-e2a5a.appspot.com/o/items%2Fnecklace.jpg?alt=media&token=839b8a3f-6ac1-49a2-9638-b25195a52995",
                        name: "Necklace",
                        weight: 5
                    }
                },
                locations: {
                    "-1_0": {
                        audioLink: "https://firebasestorage.googleapis.com/v0/b/pickleball-e2a5a.appspot.com/o/locations%2F-1_0_audio.mp3?alt=media&token=b7616fff-f1f9-4c97-ba40-01bb821a4b29",
                        description: "You are in the Stargate control room. Banks of computers and control panels line the walls. The main console for operating the Stargate is prominently placed, but the settings are locked.",
                        exits: { east: "0_0" },
                        imageLink: "https://firebasestorage.googleapis.com/v0/b/pickleball-e2a5a.appspot.com/o/locations%2F-1_0_image.jpg?alt=media&token=a797891c-470c-45f7-b22d-5476d78d6c0f",
                        name: "Stargate Control Room",
                        narration: "",
                        x: -1,
                        y: 0
                    },
                    "0_0": {
                        description: "You are standing in front of a massive Stargate. The gate's ring is filled with a shimmering blue event horizon. To the west, you see the entrance to the control room. The path to the east is blocked by walls of controls and displays.",
                        exits: { north: "0_1", west: "-1_0" },
                        imageLink: "https://firebasestorage.googleapis.com/v0/b/pickleball-e2a5a.appspot.com/o/locations%2F0_0_image.jpg?alt=media&token=71330278-2ba2-4732-8d94-2e721d5b2ea9",
                        name: "Stargate Base",
                        narration: "",
                        x: 0,
                        y: 0
                    },
                    "0_1": {
                        description: "You've emerged from the Stargate into what appears to be an ancient Mayan ruin. Crumbling stone structures surround you, and a narrow path leads deeper into the complex.",
                        exits: { north: "0_2", south: "0_0" },
                        imageLink: "https://firebasestorage.googleapis.com/v0/b/pickleball-e2a5a.appspot.com/o/locations%2F0_1_image.jpg?alt=media&token=baedd8a8-13d5-4679-85f4-18ec10003d43",
                        items: ["Green Emerald"],
                        name: "Mayan Ruin",
                        narration: "",
                        x: 0,
                        y: 1
                    },
                    "0_2": {
                        description: "You are inside the Mayan Ruin. You've discovered a treasure chest with beautiful items inside.",
                        exits: { south: "0_1" },
                        imageLink: "https://firebasestorage.googleapis.com/v0/b/pickleball-e2a5a.appspot.com/o/locations%2F0_2_image.jpg?alt=media&token=f499762a-6107-452b-bd4e-3f5bc2b90095",
                        items: ["Necklace"],
                        name: "Mayan Ruin",
                        narration: "",
                        x: 0,
                        y: 2
                    }
                },
                player: {
                    startLocation: "0_0"
                },
                quests: {
                    "-O8hEcHAiW022WDLpM6m": {
                        description: "Find and pickup the Green Emerald.",
                        isCompleted: false,
                        name: "Find the Emerald",
                        requirements: ["Green Emerald"]
                    }
                }
            };

            await set(ref(database), initialGameData);
            alert('Game data has been successfully initialized!');
            loadLocations();
            loadItems();
        } catch (error) {
            console.error('Error initializing game data:', error);
            alert('Error initializing game data. Please try again.');
        }
    }
}

// Function to add exit input fields
function addExitFields(direction = '', target = '') {
    const exitslist = document.getElementById('exits-list');
    if (!exitslist) return;

    const exitDiv = document.createElement('div');
    exitDiv.innerHTML = `
        <select class="exit-direction">
            <option value="north" ${direction === 'north' ? 'selected' : ''}>North</option>
            <option value="south" ${direction === 'south' ? 'selected' : ''}>South</option>
            <option value="east" ${direction === 'east' ? 'selected' : ''}>East</option>
            <option value="west" ${direction === 'west' ? 'selected' : ''}>West</option>
        </select>
        <input type="text" class="exit-target" value="${target}" placeholder="Target location (e.g., 0_1)">
        <button type="button" class="remove-exit">Remove</button>
    `;
    exitslist.appendChild(exitDiv);

    exitDiv.querySelector('.remove-exit').addEventListener('click', () => {
        exitslist.removeChild(exitDiv);
    });
}

// Function to load items into select elements
// Function to load items into select elements
function loadItemsIntoSelect() {
    const locationItems = document.getElementById('location-items');
    const availableItems = document.getElementById('available-items');
    const itemsRef = ref(database, 'items');
    
    if (!locationItems || !availableItems) {
        console.warn('Location items or available items select not found');
        return Promise.resolve();
    }

    return get(itemsRef).then((snapshot) => {
        locationItems.innerHTML = '';
        availableItems.innerHTML = '';
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const item = childSnapshot.val();
                const option = document.createElement('option');
                option.value = item.name;
                option.textContent = item.name;
                availableItems.appendChild(option.cloneNode(true));
            });
        }
    }).catch((error) => {
        console.error("Error loading items:", error);
    });
}

// Function to move selected items between lists
function moveSelectedItems(fromSelect, toSelect) {
    Array.from(fromSelect.selectedOptions).forEach(option => {
        toSelect.appendChild(option);
        option.selected = false;
    });
}

// Load and display locations
function loadLocations() {
    const locationList = document.getElementById('location-list');
    if (!locationList) {
        console.warn('Location list element not found');
        return;
    }
    
    const locationsRef = ref(database, 'locations');
    
    onValue(locationsRef, (snapshot) => {
        locationList.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const locationKey = childSnapshot.key;
            const locationData = childSnapshot.val();
            
            const locationElement = document.createElement('div');
            locationElement.className = 'location-item';
            locationElement.innerHTML = `
                <h3>${locationData.name} (${locationKey})</h3>
                <p>${locationData.description}</p>
                <p>Items: ${locationData.items ? locationData.items.join(', ') : 'None'}</p>
                <p>Exits: ${Object.keys(locationData.exits || {}).join(', ') || 'None'}</p>
                ${locationData.imageLink ? '<p>Image: ✅ <button onclick="previewImage(\'' + locationData.imageLink + '\')">Preview</button></p>' : '<p>Image: ❌</p>'}
                ${locationData.audioLink ? '<p>Audio: ✅ <button onclick="previewAudio(\'' + locationData.audioLink + '\')">Preview</button></p>' : '<p>Audio: ❌</p>'}
                <button onclick="editLocation('${locationKey}')">Edit</button>
                <button onclick="deleteLocation('${locationKey}')">Delete</button>
            `;
            locationList.appendChild(locationElement);
        });
    });
}

// Load and display items
function loadItems() {
    return new Promise((resolve) => {
        const itemList = document.getElementById('item-list');
        if (!itemList) {
            console.warn('Item list element not found');
            resolve();
            return;
        }

        const itemsRef = ref(database, 'items');
        
        onValue(itemsRef, (snapshot) => {
            itemList.innerHTML = '';
            snapshot.forEach((childSnapshot) => {
                const itemKey = childSnapshot.key;
                const itemData = childSnapshot.val();
                
                const itemElement = document.createElement('div');
                itemElement.className = 'item-entry';
                itemElement.innerHTML = `
                    <h3>${itemData.name}</h3>
                    <p>Weight: ${itemData.weight}</p>
                    <p>Can't be lifted: ${itemData.cantBeLiftedFlag ? 'Yes' : 'No'}</p>
                    ${itemData.imageLink ? '<img src="' + itemData.imageLink + '" alt="' + itemData.name + '" style="max-width: 100px;">' : ''}
                    <button onclick="editItem('${itemKey}')">Edit</button>
                    <button onclick="deleteItem('${itemKey}')">Delete</button>
                `;
                itemList.appendChild(itemElement);
            });
            resolve();
        });
    });
}

// Edit location
window.editLocation = function(locationKey) {
    const locationRef = ref(database, `locations/${locationKey}`);
    get(locationRef).then((snapshot) => {
        if (snapshot.exists()) {
            const locationData = snapshot.val();
            document.getElementById('location-key').value = locationKey;
            document.getElementById('location-name').value = locationData.name || '';
            document.getElementById('x-coordinate').value = locationData.x || '';
            document.getElementById('y-coordinate').value = locationData.y || '';
            document.getElementById('location-description').value = locationData.description || '';
            document.getElementById('location-narration').value = locationData.narration || '';
            
            // Clear file inputs
            document.getElementById('location-image').value = '';
            document.getElementById('location-audio').value = '';

            // Show image preview if exists
            const imagePreview = document.getElementById('image-preview');
            if (imagePreview) {
                if (locationData.imageLink) {
                    imagePreview.innerHTML = `<img src="${locationData.imageLink}" alt="Location Image" style="max-width: 200px;">`;
                } else {
                    imagePreview.innerHTML = '';
                }
            }

            // Show audio preview if exists
            const audioPreview = document.getElementById('audio-preview');
            if (audioPreview) {
                if (locationData.audioLink) {
                    audioPreview.innerHTML = `
                        <audio controls>
                            <source src="${locationData.audioLink}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>`;
                } else {
                    audioPreview.innerHTML = '';
                }
            }

            // Populate exits
            const exitslist = document.getElementById('exits-list');
            if (exitslist) {
                exitslist.innerHTML = ''; // Clear existing exits
                if (locationData.exits) {
                    for (const [direction, target] of Object.entries(locationData.exits)) {
                        addExitFields(direction, target);
                    }
                }
            }

            // Populate items
            loadItemsIntoSelect().then(() => {
                const locationItems = document.getElementById('location-items');
                const availableItems = document.getElementById('available-items');
                
                if (locationItems && availableItems && locationData.items) {
                    locationData.items.forEach(item => {
                        const option = availableItems.querySelector(`option[value="${item}"]`);
                        if (option) {
                            locationItems.appendChild(option);
                        }
                    });
                }
            });
        } else {
            console.log("No data available for this location");
        }
    }).catch((error) => {
        console.error("Error getting location data:", error);
    });
}

// Delete location
window.deleteLocation = async function(locationKey) {
    if (confirm('Are you sure you want to delete this location?')) {
        try {
            const locationRef = ref(database, `locations/${locationKey}`);
            const snapshot = await get(locationRef);
            const locationData = snapshot.val();

            // Delete image if exists
            if (locationData.imageLink) {
                const imageRef = storageRef(storage, locationData.imageLink);
                await deleteObject(imageRef);
            }

            // Delete audio if exists
            if (locationData.audioLink) {
                const audioRef = storageRef(storage, locationData.audioLink);
                await deleteObject(audioRef);
            }

            // Delete location data
            await remove(locationRef);
            alert('Location deleted successfully!');
            loadLocations();
        } catch (error) {
            console.error('Error deleting location:', error);
            alert('Error deleting location. Please try again.');
        }
    }
}

// Preview image
window.previewImage = function(imageUrl) {
    window.open(imageUrl, '_blank');
}

// Preview audio
window.previewAudio = function(audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play();
}

// Edit item
window.editItem = function(itemKey) {
    const itemRef = ref(database, `items/${itemKey}`);
    onValue(itemRef, (snapshot) => {
        const itemData = snapshot.val();
        document.getElementById('item-key').value = itemKey;
        document.getElementById('item-name').value = itemData.name;
        document.getElementById('item-description').value = itemData.description;
        document.getElementById('item-weight').value = itemData.weight;
        document.getElementById('item-cant-be-lifted').checked = itemData.cantBeLiftedFlag;
        
        // Clear file input
        document.getElementById('item-image').value = '';

        // Show image preview if exists
        const imagePreview = document.getElementById('item-image-preview');
        if (itemData.imageLink) {
            imagePreview.innerHTML = `<img src="${itemData.imageLink}" alt="Item Image" style="max-width: 200px;">`;
        } else {
            imagePreview.innerHTML = '';
        }
    }, { onlyOnce: true });
}

// Delete item
window.deleteItem = async function(itemKey) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            const itemRef = ref(database, `items/${itemKey}`);
            const snapshot = await get(itemRef);
            const itemData = snapshot.val();

            // Delete image if exists
            if (itemData.imageLink) {
                const imageRef = storageRef(storage, itemData.imageLink);
                await deleteObject(imageRef);
            }

            // Delete item data
            await remove(itemRef);
            alert('Item deleted successfully!');
            loadItems();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Error deleting item. Please try again.');
        }
    }
}

// Event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Set up event listeners
    safeAddEventListener('init-game', 'click', initializeGameData);
    safeAddEventListener('add-exit', 'click', () => addExitFields());
    safeAddEventListener('add-items', 'click', () => {
        const availableItems = document.getElementById('available-items');
        const locationItems = document.getElementById('location-items');
        if (availableItems && locationItems) {
            moveSelectedItems(availableItems, locationItems);
        } else {
            console.warn('Available items or location items select not found');
        }
    });
    safeAddEventListener('remove-items', 'click', () => {
        const availableItems = document.getElementById('available-items');
        const locationItems = document.getElementById('location-items');
        if (availableItems && locationItems) {
            moveSelectedItems(locationItems, availableItems);
        } else {
            console.warn('Available items or location items select not found');
        }
    });

    // Location form submission
    const locationForm = document.getElementById('location-form');
    if (locationForm) {
        locationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const locationKey = document.getElementById('location-key').value;
            const locationName = document.getElementById('location-name').value;
            const xCoordinate = document.getElementById('x-coordinate').value;
            const yCoordinate = document.getElementById('y-coordinate').value;
            const locationDescription = document.getElementById('location-description').value;
            const locationItems = Array.from(document.getElementById('location-items').options).map(option => option.value);
            const locationImage = document.getElementById('location-image').files[0];
            const locationAudio = document.getElementById('location-audio').files[0];
            const locationNarration = document.getElementById('location-narration').value;

            // Collect exits data
            const exits = {};
            document.querySelectorAll('#exits-list > div').forEach(exitDiv => {
                const direction = exitDiv.querySelector('.exit-direction').value;
                const target = exitDiv.querySelector('.exit-target').value;
                if (direction && target) {
                    exits[direction] = target;
                }
            });

            try {
                let locationData = {};
                
                // If we're editing an existing location, get the current data first
                if (locationKey) {
                    const locationRef = ref(database, `locations/${locationKey}`);
                    const snapshot = await get(locationRef);
                    if (snapshot.exists()) {
                        locationData = snapshot.val();
                    }
                }

                // Update the location data with the new values
                locationData = {
                    ...locationData,
                    name: locationName,
                    x: parseInt(xCoordinate),
                    y: parseInt(yCoordinate),
                    description: locationDescription,
                    narration: locationNarration,
                    exits: exits,
                    items: locationItems
                };

                // Only update the image if a new one is selected
                if (locationImage) {
                    const imagePath = `locations/${xCoordinate}_${yCoordinate}_image.jpg`;
                    const imageRef = storageRef(storage, imagePath);
                    await uploadBytes(imageRef, locationImage);
                    locationData.imageLink = await getDownloadURL(imageRef);
                }

                // Only update the audio if a new one is selected
                if (locationAudio) {
                    const audioPath = `locations/${xCoordinate}_${yCoordinate}_audio.mp3`;
                    const audioRef = storageRef(storage, audioPath);
                    await uploadBytes(audioRef, locationAudio);
                    locationData.audioLink = await getDownloadURL(audioRef);
                }

                const key = locationKey || `${xCoordinate}_${yCoordinate}`;
                await set(ref(database, `locations/${key}`), locationData);
                alert('Location saved successfully!');
                locationForm.reset();
                document.getElementById('location-key').value = '';
                document.getElementById('image-preview').innerHTML = '';
                document.getElementById('audio-preview').innerHTML = '';
                document.getElementById('exits-list').innerHTML = '';
                document.getElementById('location-items').innerHTML = '';
                document.getElementById('available-items').innerHTML = '';
                loadLocations();
                loadItemsIntoSelect();
            } catch (error) {
                console.error('Error saving location:', error);
                alert('Error saving location. Please try again.');
            }
        });
    }

    // Item form submission
    const itemForm = document.getElementById('item-form');
    if (itemForm) {
        itemForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const itemKey = document.getElementById('item-key').value;
            const itemName = document.getElementById('item-name').value;
            const itemDescription = document.getElementById('item-description').value;
            const itemWeight = parseInt(document.getElementById('item-weight').value);
            const itemImage = document.getElementById('item-image').files[0];
            const cantBeLiftedFlag = document.getElementById('item-cant-be-lifted').checked;

            try {
                let itemData = {
                    name: itemName,
                    description: itemDescription,
                    weight: itemWeight,
                    cantBeLiftedFlag: cantBeLiftedFlag
                };

                if (itemImage) {
                    const imagePath = `items/${itemName.toLowerCase().replace(/\s+/g, '_')}.jpg`;
                    const imageRef = storageRef(storage, imagePath);
                    await uploadBytes(imageRef, itemImage);
                    itemData.imageLink = await getDownloadURL(imageRef);
                }

                const key = itemKey || itemName.toLowerCase().replace(/\s+/g, '_');
                await set(ref(database, `items/${key}`), itemData);
                alert('Item saved successfully!');
                itemForm.reset();
                document.getElementById('item-key').value = '';
                document.getElementById('item-image-preview').innerHTML = '';
                loadItems();
            } catch (error) {
                console.error('Error saving item:', error);
                alert('Error saving item. Please try again.');
            }
        });
    }

    // Load initial data
    loadLocations();
    loadItems();
    loadItemsIntoSelect();
});