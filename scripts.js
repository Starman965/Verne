// scripts.js for Planetside RPG game

import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getDatabase,
    ref, 
    set, 
    onValue,
    get,
    remove
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Game state
let player = {
    health: 100,
    activeWeapon: "Pistol",
    inventory: [],
    location: { x: 0, y: 0 }
};

let currentLocation = {
    description: "You are standing in front of a massive stargate.",
    items: []
};

let selectedItemId = null;

// DOM elements
const narrativeBox = document.getElementById('narrative-box');
const playerHealthDisplay = document.getElementById('player-health');
const playerWeaponDisplay = document.getElementById('player-weapon');
const contentArea = document.getElementById('content-area');
const currentSceneImage = document.getElementById('current-scene');

// Function to update the game log
function updateGameLog(message) {
    const newEntry = document.createElement('p');
    newEntry.textContent = message;
    narrativeBox.appendChild(newEntry);
    narrativeBox.scrollTop = narrativeBox.scrollHeight;
}

// Function to update player info display
function updatePlayerInfo() {
    playerHealthDisplay.textContent = `Health: ${player.health}`;
    playerWeaponDisplay.textContent = `Weapon: ${player.activeWeapon}`;
}

// Function to display inventory
function displayInventory() {
    const inventoryRef = ref(database, 'player/inventory');
    get(inventoryRef).then((snapshot) => {
        contentArea.innerHTML = '<h3>Inventory</h3>';
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const item = childSnapshot.val();
                const itemElement = document.createElement('div');
                itemElement.className = 'inventory-item';
                itemElement.textContent = item.name;
                itemElement.dataset.id = childSnapshot.key;
                itemElement.onclick = () => selectItem(childSnapshot.key);
                contentArea.appendChild(itemElement);
            });
        } else {
            contentArea.innerHTML += '<p>Your inventory is empty.</p>';
        }
    });
}
function selectItem(itemId) {
    selectedItemId = itemId;
    document.querySelectorAll('.inventory-item').forEach(item => {
        item.classList.remove('selected');
    });
    const selectedItem = document.querySelector(`.inventory-item[data-id="${itemId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    updateGameLog(`Selected item: ${selectedItem.textContent}`);
}
function getSelectedItemId() {
    return selectedItemId;
}

// Function to update location
function updateLocation(newX, newY) {
    const locationKey = `${newX}_${newY}`;
    const locationRef = ref(database, `locations/${locationKey}`);
    
    // Stop any currently playing audio
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio.currentTime = 0;
    }
    
    get(locationRef).then((snapshot) => {
        if (snapshot.exists()) {
            player.location = { x: newX, y: newY };
            const locationData = snapshot.val();
            currentLocation = locationData;
            updateGameLog(`-->\n${currentLocation.description}`);
            if (currentLocation.imageLink) {
                currentSceneImage.src = currentLocation.imageLink;
            }
            
            // Update location name
            const locationNameElement = document.getElementById('location-name');
            if (locationNameElement) {
                locationNameElement.textContent = locationData.name || 'Unknown Location';
            }
            
            updateAvailableExits(locationData.exits);
            checkForItems(locationData);
            
            // Play audio if available
            if (locationData.audioLink) {
                playLocationAudio(locationData.audioLink);
            }

            // Speak narration if available
            if (locationData.narration) {
                speakNarration(locationData.narration);
            }
        } else {
            updateGameLog("You cannot move in that direction.");
        }
    }).catch((error) => {
        console.error("Error checking location:", error);
        updateGameLog("Something went wrong. Please try again.");
    });
}

// Updated playLocationAudio function
function playLocationAudio(audioUrl) {
    // Create and play new audio
    window.currentAudio = new Audio(audioUrl);
    window.currentAudio.play().catch(e => console.error("Error playing audio:", e));
}

// Function to speak narration
function speakNarration(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
    } else {
        console.log("Text-to-speech not supported in this browser.");
    }
}

function updateAvailableExits(exits) {
    const directions = ['north', 'south', 'east', 'west'];
    directions.forEach(direction => {
        const button = document.getElementById(`move-${direction}`);
        if (button) {
            if (exits && exits[direction]) {
                button.disabled = false;
                button.style.opacity = 1;
            } else {
                button.disabled = true;
                button.style.opacity = 0.5;
            }
        }
    });
}

function checkForItems(locationData) {
    const pickupButton = document.getElementById('pickup-button');
    if (pickupButton) {
        if (locationData.item) {
            updateGameLog(`You see a ${locationData.item} here.`);
            pickupButton.disabled = false;
            pickupButton.style.opacity = 1;
        } else {
            pickupButton.disabled = true;
            pickupButton.style.opacity = 0.5;
        }
    }
}

function pickupItem() {
    const locationKey = `${player.location.x}_${player.location.y}`;
    const locationRef = ref(database, `locations/${locationKey}`);
    get(locationRef).then((snapshot) => {
        if (snapshot.exists()) {
            const locationData = snapshot.val();
            if (locationData.item) {
                const itemName = locationData.item;
                const itemKey = itemName.replace(/\s+/g, '_').toLowerCase();
                const itemRef = ref(database, `items/${itemKey}`);
                get(itemRef).then((itemSnapshot) => {
                    if (itemSnapshot.exists()) {
                        const item = itemSnapshot.val();
                        const inventoryRef = ref(database, `player/inventory/${itemKey}`);
                        set(inventoryRef, item).then(() => {
                            updateGameLog(`You picked up the ${item.name}.`);
                            // Remove item from location
                            const updatedLocationData = { ...locationData };
                            delete updatedLocationData.item;
                            set(ref(database, `locations/${locationKey}`), updatedLocationData).then(() => {
                                displayInventory();
                                checkQuestProgress();
                                checkForItems({});
                            });
                        });
                    } else {
                        console.log("Item does not exist in items database");
                        // If the item doesn't exist in the items database, we'll create a basic item
                        const basicItem = {
                            name: itemName,
                            description: `A ${itemName}.`
                        };
                        const inventoryRef = ref(database, `player/inventory/${itemKey}`);
                        set(inventoryRef, basicItem).then(() => {
                            updateGameLog(`You picked up the ${itemName}.`);
                            // Remove item from location
                            const updatedLocationData = { ...locationData };
                            delete updatedLocationData.item;
                            set(ref(database, `locations/${locationKey}`), updatedLocationData).then(() => {
                                displayInventory();
                                checkQuestProgress();
                                checkForItems({});
                            });
                        });
                    }
                });
            } else {
                updateGameLog("There's nothing to pick up here.");
            }
        }
    }).catch((error) => {
        console.error("Error in pickupItem:", error);
    });
}
function dropItem(itemId) {
    const inventoryRef = ref(database, `player/inventory/${itemId}`);
    const locationKey = `${player.location.x}_${player.location.y}`;
    const locationRef = ref(database, `locations/${locationKey}`);

    get(locationRef).then((snapshot) => {
        if (snapshot.exists()) {
            const locationData = snapshot.val();
            if (locationData.item) {
                updateGameLog(`There is already a ${locationData.item} here. You'll need to drop it in another location.`);
            } else {
                get(inventoryRef).then((itemSnapshot) => {
                    if (itemSnapshot.exists()) {
                        const item = itemSnapshot.val();
                        remove(inventoryRef).then(() => {
                            set(ref(database, `locations/${locationKey}/item`), item.name).then(() => {
                                updateGameLog(`You dropped the ${item.name}.`);
                                displayInventory();
                                checkForItems({ item: item.name });
                            });
                        });
                    }
                });
            }
        }
    });
}
function startGame() {
    currentSceneImage.src = ''; // Clear the splash screen
    updateLocation(0, 0); // This will set the first location image
    
    // Enable all game controls
    document.querySelectorAll('#action-buttons button, #navigation-controls button').forEach(button => {
        button.disabled = false;
    });
    
    // Remove the click event listener from the scene image
    currentSceneImage.removeEventListener('click', startGame);
}

function checkQuestProgress() {
    const questsRef = ref(database, 'quests');
    const inventoryRef = ref(database, 'player/inventory');
    
    Promise.all([get(questsRef), get(inventoryRef)]).then(([questsSnapshot, inventorySnapshot]) => {
        if (questsSnapshot.exists() && inventorySnapshot.exists()) {
            const inventory = Object.values(inventorySnapshot.val());
            questsSnapshot.forEach((childSnapshot) => {
                const quest = childSnapshot.val();
                if (!quest.isCompleted) {
                    const allRequirementsMet = quest.requirements.every(req => 
                        inventory.some(item => item.name === req)
                    );
                    if (allRequirementsMet) {
                        updateGameLog(`Quest completed: ${quest.name}`);
                        set(ref(database, `quests/${childSnapshot.key}/isCompleted`), true);
                    }
                }
            });
        }
    });
}

function displayQuests() {
    contentArea.innerHTML = '<h3>Quests</h3>';
    const questsRef = ref(database, 'quests');
    get(questsRef).then((snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const quest = childSnapshot.val();
                const questElement = document.createElement('div');
                questElement.className = 'quest-item';
                questElement.innerHTML = `
                    <h4>${quest.name}</h4>
                    <p>${quest.description}</p>
                    <p>Status: ${quest.isCompleted ? 'Completed' : 'In Progress'}</p>
                `;
                contentArea.appendChild(questElement);
            });
        } else {
            contentArea.innerHTML += '<p>No active quests.</p>';
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const pickupButton = document.getElementById('pickup-button');
    if (pickupButton) {
        pickupButton.addEventListener('click', pickupItem);
    }

    const dropButton = document.getElementById('drop-btn');
if (dropButton) {
    dropButton.addEventListener('click', () => {
        const selectedItemId = getSelectedItemId();
        if (selectedItemId) {
            dropItem(selectedItemId);
        } else {
            updateGameLog("Please select an item to drop from your inventory.");
        }
    });
}

    // Add click event to the scene image to start the game
    currentSceneImage.addEventListener('click', startGame);

    // Disable all game controls initially
    document.querySelectorAll('#action-buttons button, #navigation-controls button').forEach(button => {
        button.disabled = true;
    });

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

    // Tab switching
    document.querySelectorAll('#tabs button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#tabs button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            switch(button.id) {
                case 'inventory-tab':
                    displayInventory();
                    break;
                case 'quests-tab':
                    displayQuests();
                    break;
                case 'about-tab':
                    contentArea.innerHTML = '<h3>About</h3><p>Planetside RPG - A text-based adventure game.</p>';
                    break;
            }
        });
    });

    // Initialize the game
    updatePlayerInfo();
    displayInventory();
});

// Make functions available globally for onclick events
window.pickupItem = pickupItem;
window.dropItem = dropItem;
window.getSelectedItemId = getSelectedItemId;