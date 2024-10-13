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

// DOM elements
const narrativeBox = document.getElementById('narrative-box');
const playerHealthDisplay = document.getElementById('player-health');
const playerWeaponDisplay = document.getElementById('player-weapon');
const contentArea = document.getElementById('content-area');
const currentSceneImage = document.getElementById('current-scene');

// Function to update the game log
// Function to update the game log
// Function to update the game log
function updateGameLog(message, clearPrevious = false) {
    if (clearPrevious) {
        narrativeBox.innerHTML = '';
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = message;
    const maxChars = 500; // Adjust this number to change the length before [MORE] appears
    
    if (tempDiv.innerText.length > maxChars) {
        let firstPartHTML = '';
        let remainingHTML = '';
        let charCount = 0;
        let inFirstPart = true;

        for (const node of tempDiv.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (inFirstPart) {
                    const availableChars = maxChars - charCount;
                    if (node.length <= availableChars) {
                        firstPartHTML += node.textContent;
                        charCount += node.length;
                    } else {
                        firstPartHTML += node.textContent.slice(0, availableChars);
                        remainingHTML += node.textContent.slice(availableChars);
                        inFirstPart = false;
                    }
                } else {
                    remainingHTML += node.textContent;
                }
            } else {
                if (inFirstPart) {
                    firstPartHTML += node.outerHTML;
                    charCount += node.innerText.length;
                    if (charCount >= maxChars) {
                        inFirstPart = false;
                    }
                } else {
                    remainingHTML += node.outerHTML;
                }
            }
        }
        
        const newEntry = document.createElement('p');
        newEntry.innerHTML = `${firstPartHTML} <span class="more-text">[MORE]</span>`;
        narrativeBox.appendChild(newEntry);
        
        const moreText = newEntry.querySelector('.more-text');
        moreText.addEventListener('click', () => {
            const moreSpan = moreText;
            moreSpan.remove();
            const remainingText = document.createElement('span');
            remainingText.innerHTML = remainingHTML;
            newEntry.appendChild(remainingText);
            
            // Check if there's still more text to show
            if (remainingText.innerText.length > maxChars) {
                updateGameLog(remainingText.innerHTML);
            }
            
            smoothScroll(narrativeBox, narrativeBox.scrollHeight, scrollSpeed);
        });
    } else {
        const newEntry = document.createElement('p');
        newEntry.innerHTML = message;
        narrativeBox.appendChild(newEntry);
    }
    
    smoothScroll(narrativeBox, narrativeBox.scrollHeight, scrollSpeed);
}
// Function for smooth auto-scrolling
function smoothScroll(element, target, duration) {
    const start = element.scrollTop;
    const change = target - start;
    let currentTime = 0;
    const increment = 20;

    function animateScroll() {
        currentTime += increment;
        const val = Math.easeInOutQuad(currentTime, start, change, duration);
        element.scrollTop = val;
        if (currentTime < duration) {
            setTimeout(animateScroll, increment);
        }
    }

    Math.easeInOutQuad = function (t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    };

    animateScroll();
}
function clearNarrativeBox() {
    narrativeBox.innerHTML = '';
}
// Scroll speed in milliseconds (adjust as needed)
const scrollSpeed = 500; // You can modify this value to change the scroll speed
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
        updateDropButtonState(); // Call the new helper function here
    });
}

function getSelectedItemId() {
    return selectedItemId;
}
let selectedItemId = null;

function selectItem(itemId) {
    selectedItemId = itemId;
    document.querySelectorAll('.inventory-item').forEach(item => {
        item.classList.remove('selected');
    });
    const selectedItem = document.querySelector(`.inventory-item[data-id="${itemId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
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
            clearNarrativeBox();
            updateGameLog(`-->\n${currentLocation.description}`, true);
            
            if (currentLocation.imageLink) {
                const currentSceneImage = document.getElementById('current-scene');
                if (currentSceneImage) {
                    // Fade out
                    currentSceneImage.classList.add('fade-out');
                    
                    // Wait for fade out to complete, then change image and fade in
                    setTimeout(() => {
                        currentSceneImage.src = currentLocation.imageLink;
                        
                        // Wait for the new image to load before fading in
                        currentSceneImage.onload = () => {
                            currentSceneImage.classList.remove('fade-out');
                            currentSceneImage.classList.add('fade-in');
                            
                            // Remove the fade-in class after transition completes
                            setTimeout(() => {
                                currentSceneImage.classList.remove('fade-in');
                            }, 300); // This should match the transition duration in CSS
                        };
                    }, 300); // This should match the transition duration in CSS
                }
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
        updateGameLog("An error occurred while updating the location. Please try again.");
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

function updateActionButtonsState(items) {
    const buttons = {
        'look-btn': document.getElementById('look-btn'),
        'pickup-btn': document.getElementById('pickup-btn'),
        'interact-btn': document.getElementById('interact-btn'),
        'use-btn': document.getElementById('use-btn'),
        'drop-btn': document.getElementById('drop-btn'),
        'attack-btn': document.getElementById('attack-btn')
    };

    const hasItems = items && items.length > 0;

    Object.keys(buttons).forEach(key => {
        if (buttons[key]) {
            buttons[key].disabled = !hasItems;
        }
    });
}

function handleItemClick(itemName) {
    const activeAction = document.querySelector('#action-buttons button.active');
    if (activeAction) {
        switch (activeAction.id) {
            case 'look-button':
                lookItem(itemName);
                break;
            case 'pickup-button':
                pickupItem(itemName);
                break;
            case 'interact-button':
                interactWithItem(itemName);
                break;
            case 'use-button':
                useItem(itemName);
                break;
        }
    } else {
        updateGameLog("Please select an action first (Look, Pickup, or Use).");
    }
}
function handleLook(itemName) {
    const itemKey = itemName.replace(/\s+/g, '_').toLowerCase();
    const itemRef = ref(database, `items/${itemKey}`);
    get(itemRef).then((snapshot) => {
        if (snapshot.exists()) {
            const item = snapshot.val();
            updateGameLog(item.description);
            if (item.imageLink) {
                displayItemImage(item.imageLink);
            }
        } else {
            updateGameLog(`You look the ${itemName}, but find nothing special about it.`);
        }
    });
}


function displayItemImage(imageUrl) {
    const sceneImage = document.getElementById('current-scene');
    sceneImage.src = imageUrl;
    sceneImage.onclick = () => {
        updateLocation(player.location.x, player.location.y); // Reset to location image
    };
}
//Latest Check for Items
function checkForItems(locationData) {
    const pickupButton = document.getElementById('pickup-btn');
    
    if (!pickupButton) {
        console.error("Pickup button not found in the DOM");
        return; // Exit the function if the button is not found
    }

    if (locationData.items && locationData.items.length > 0) {
        const itemsList = locationData.items.map(item => `<span class="clickable-item" data-item="${item}">${item}</span>`).join(', ');
        updateGameLog(`You see ${itemsList} here.`);
        pickupButton.disabled = false;
        pickupButton.classList.remove('disabled');
        
        // Add click event listeners to clickable items
        setTimeout(() => {
            document.querySelectorAll('.clickable-item').forEach(item => {
                item.addEventListener('click', () => pickupItem(item.dataset.item));
            });
        }, 0);
    } else {
        pickupButton.disabled = true;
        pickupButton.classList.add('disabled');
        // We're not adding any message about no items here
    }
}

// Latest to pickup an item
function pickupItem(itemName) {
    const locationKey = `${player.location.x}_${player.location.y}`;
    const locationRef = ref(database, `locations/${locationKey}`);
    get(locationRef).then((snapshot) => {
        if (snapshot.exists()) {
            const locationData = snapshot.val();
            if (locationData.items && locationData.items.includes(itemName)) {
                const itemKey = itemName.replace(/\s+/g, '_').toLowerCase();
                const itemRef = ref(database, `items/${itemKey}`);
                get(itemRef).then((itemSnapshot) => {
                    if (itemSnapshot.exists()) {
                        const item = itemSnapshot.val();
                        const inventoryRef = ref(database, `player/inventory/${itemKey}`);
                        set(inventoryRef, item).then(() => {
                            updateGameLog(`You picked up the ${item.name}.`);
                            playSound('https://starman965.github.io/Verne/sounds/backpack.mp3');
                            // Remove item from location
                            const updatedItems = locationData.items.filter(i => i !== itemName);
                            set(ref(database, `locations/${locationKey}/items`), updatedItems).then(() => {
                                displayInventory();
                                checkQuestProgress();
                                checkForItems({ items: updatedItems });
                                updateDropButtonState();
                            });
                        });
                    }
                });
            }
        }
    });
}

function performDropItem(itemId) {
    const inventoryRef = ref(database, 'player/inventory');
    const locationKey = `${player.location.x}_${player.location.y}`;
    const locationRef = ref(database, `locations/${locationKey}`);

    get(inventoryRef).then((inventorySnapshot) => {
        if (inventorySnapshot.exists()) {
            const itemSnapshot = inventorySnapshot.child(itemId);
            if (itemSnapshot.exists()) {
                const item = itemSnapshot.val();
                remove(ref(database, `player/inventory/${itemId}`)).then(() => {
                    get(locationRef).then((locationSnapshot) => {
                        let locationData = locationSnapshot.val() || {};
                        let items = locationData.items || [];
                        items.push(item.name);
                        set(ref(database, `locations/${locationKey}/items`), items).then(() => {
                            updateGameLog(`You dropped the ${item.name}.`);
                            playSound('/sounds/backpack.mp3');
                            displayInventory();
                            checkForItems({ items: items });
                            updateDropButtonState();
                            
                            // Clear the selected item
                            selectedItemId = null;
                            document.querySelectorAll('.inventory-item').forEach(item => {
                                item.classList.remove('selected');
                            });
                        });
                    });
                });
            } else {
                updateGameLog("Error: Item not found in inventory.");
            }
        } else {
            updateGameLog("Error: Inventory is empty.");
        }
    }).catch((error) => {
        console.error("Error in dropItem:", error);
        updateGameLog("Something went wrong. Please try again.");
    });
}
function dropItem() {
    const inventoryRef = ref(database, 'player/inventory');
    get(inventoryRef).then((snapshot) => {
        if (snapshot.exists() && Object.keys(snapshot.val()).length > 0) {
            updateGameLog("Pick an item to drop.");
            enableInventoryItemsForDrop();
        } else {
            updateGameLog("There's nothing in your inventory to drop.");
        }
    }).catch((error) => {
        console.error("Error checking inventory:", error);
        updateGameLog("Something went wrong. Please try again.");
    });
}
function playSound(soundFile) {
    const audio = new Audio(soundFile);
    audio.play();
}
function interactWithItem(itemName) {
    updateGameLog(`You interact with the ${itemName}, but nothing happens.`);
    // Implement specific interactions for items here
}

function useItem(itemName) {
    updateGameLog(`You try to use the ${itemName}, but you're not sure how.`);
    // Implement specific use cases for items here
}

function startGame() {
    const homeScreenImage = document.getElementById('current-scene');
    
    // Fade out the home screen image
    homeScreenImage.classList.add('fade-out');
    
    // Wait for the fade-out transition to complete
    setTimeout(() => {
        // Update location (this will set the first location image)
        updateLocation(0, 0);
        
        // Enable all game controls
        document.querySelectorAll('#action-buttons button, #navigation-controls button').forEach(button => {
            button.disabled = false;
        });
        
        // Remove the click event listener from the scene image
        homeScreenImage.removeEventListener('click', startGame);
        
        // Show the game UI
        document.getElementById('game-container').classList.remove('home-screen');
        document.getElementById('game-container').classList.add('game-started');

        // Update drop button state
        updateDropButtonState();
    }, 300); // This duration should match the CSS transition time
}
function updateDropButtonState() {
    const dropButton = document.getElementById('drop-btn');
    const inventoryRef = ref(database, 'player/inventory');
    
    get(inventoryRef).then((snapshot) => {
        if (snapshot.exists() && Object.keys(snapshot.val()).length > 0) {
            dropButton.disabled = false;
            dropButton.classList.remove('disabled');
        } else {
            dropButton.disabled = true;
            dropButton.classList.add('disabled');
        }
        
        // Remove any existing event listeners
        dropButton.removeEventListener('click', dropItem);
        
        // Add the event listener
        dropButton.addEventListener('click', dropItem);
    }).catch((error) => {
        console.error("Error checking inventory:", error);
    });
}
function enableInventoryItemsForDrop() {
    const inventoryItems = document.querySelectorAll('.inventory-item');
    inventoryItems.forEach(item => {
        item.classList.add('droppable');
        item.addEventListener('click', dropItemHandler, { once: true });
    });
}

function dropItemHandler(event) {
    const itemId = event.target.dataset.id;
    if (itemId) {
        performDropItem(itemId);
    }
    // Remove the 'droppable' class and click event listeners from all items
    const inventoryItems = document.querySelectorAll('.inventory-item');
    inventoryItems.forEach(item => {
        item.classList.remove('droppable');
        item.removeEventListener('click', dropItemHandler);
    });
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
        dropButton.addEventListener('click', dropItem);
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
                    contentArea.innerHTML = '<h3>About</h3><p>Planetside RPG - An interactive fiction adventure game created using the Verne Stories Engine, written by David Lewis.</p><p>All images created by Generative AI. Audio created by AI and licensed by Epidemic Sound.</p>';
                    break;
            }
        });
    });

    // Initialize the game
    updatePlayerInfo();
    displayInventory();
});

document.querySelectorAll('#action-buttons button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('#action-buttons button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

// Make functions available globally for onclick events
window.pickupItem = pickupItem;
window.dropItem = dropItem;
window.getSelectedItemId = getSelectedItemId;
