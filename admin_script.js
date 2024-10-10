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
    get
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

// Initial game data
const initialGameData = {
  "items": {
    "green_emerald": {
      "description": "A small, Green Emerald with strange symbols etched into its surface. It seems to be of Mayan origin.",
      "name": "Green Emerald"
    }
  },
  "locations": {
    "-1_0": {
      "description": "You are in the Stargate control room. Banks of computers and control panels line the walls. The main console for operating the Stargate is prominently placed, but the settings are locked.",
      "exits": {
        "east": "0_0"
      },
      "imageLink": "https://firebasestorage.googleapis.com/v0/b/pickleball-e2a5a.appspot.com/o/locations%2F-1_0_image.jpg?alt=media&token=a797891c-470c-45f7-b22d-5476d78d6c0f",
      "name": "Stargate Control Room",
      "narration": "",
      "x": -1,
      "y": 0
    },
    "0_0": {
      "description": "You are standing in front of a massive Stargate. The gate's ring is filled with a shimmering blue event horizon. To the west, you see the entrance to the control room. The path to the east is blocked by walls of controls and displays.",
      "exits": {
        "north": "0_1",
        "west": "-1_0"
      },
      "imageLink": "https://firebasestorage.googleapis.com/v0/b/pickleball-e2a5a.appspot.com/o/locations%2F0_0_image.jpg?alt=media&token=71330278-2ba2-4732-8d94-2e721d5b2ea9",
      "name": "Stargate Base",
      "narration": "",
      "x": 0,
      "y": 0
    },
    "0_1": {
      "description": "You've emerged from the Stargate into what appears to be an ancient Mayan ruin. Crumbling stone structures surround you, and a narrow path leads deeper into the complex. Something on the ground catches your eye, sparkling in the sunlight.",
      "exits": {
        "south": "0_0"
      },
      "imageLink": "https://firebasestorage.googleapis.com/v0/b/pickleball-e2a5a.appspot.com/o/locations%2F0_1_image.jpg?alt=media&token=baedd8a8-13d5-4679-85f4-18ec10003d43",
      "item": "Green Emerald",
      "name": "Mayan Ruin",
      "narration": "",
      "x": 0,
      "y": 1
    }
  },
  "player": {
    "startLocation": "0_0",
    "inventory": {}
  },
  "quests": {
    "-O8hEcHAiW022WDLpM6m": {
      "description": "Find the Green Emerald to enter the cathedral.",
      "isCompleted": false,
      "name": "Find the Emerald",
      "requirements": [
        "Green Emerald"
      ]
    }
  }
};

// Function to initialize game data
async function initializeGameData() {
    if (confirm('Are you sure you want to reset the game data? This will overwrite all existing data.')) {
        try {
            await set(ref(database), initialGameData);
            alert('Game data has been successfully initialized!');
            loadLocations();
        } catch (error) {
            console.error('Error initializing game data:', error);
            alert('Error initializing game data. Please try again.');
        }
    }
}

// Add event listener for the init game button
document.getElementById('init-game').addEventListener('click', initializeGameData);

// Function to add exit input fields
function addExitFields(direction = '', target = '') {
    const exitslist = document.getElementById('exits-list');
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

// Add event listener for the add exit button
document.getElementById('add-exit').addEventListener('click', () => addExitFields());

// Location form submission
const locationForm = document.getElementById('location-form');
locationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const locationKey = document.getElementById('location-key').value;
    const locationName = document.getElementById('location-name').value;
    const xCoordinate = document.getElementById('x-coordinate').value;
    const yCoordinate = document.getElementById('y-coordinate').value;
    const locationDescription = document.getElementById('location-description').value;
    const locationItem = document.getElementById('location-item').value.trim();
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
            exits: exits
        };

        // Handle the item
        if (locationItem) {
            locationData.item = locationItem;
        } else {
            // If the item field is empty, remove the item property
            delete locationData.item;
        }

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
        loadLocations();
    } catch (error) {
        console.error('Error saving location:', error);
        alert('Error saving location. Please try again.');
    }
});

// New Load and display locations
function loadLocations() {
    const locationList = document.getElementById('location-list');
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
                <p>Item: ${locationData.item || 'None'}</p>
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

// Edit location
window.editLocation = function(locationKey) {
    const locationRef = ref(database, `locations/${locationKey}`);
    onValue(locationRef, (snapshot) => {
        const locationData = snapshot.val();
        document.getElementById('location-key').value = locationKey;
        document.getElementById('location-name').value = locationData.name;
        document.getElementById('x-coordinate').value = locationData.x;
        document.getElementById('y-coordinate').value = locationData.y;
        document.getElementById('location-description').value = locationData.description;
        document.getElementById('location-item').value = locationData.item || '';
        document.getElementById('location-narration').value = locationData.narration || '';
        
        // Clear file inputs
        document.getElementById('location-image').value = '';
        document.getElementById('location-audio').value = '';

        // Show image preview if exists
        const imagePreview = document.getElementById('image-preview');
        if (locationData.imageLink) {
            imagePreview.innerHTML = `<img src="${locationData.imageLink}" alt="Location Image" style="max-width: 200px;">`;
        } else {
            imagePreview.innerHTML = '';
        }

        // Show audio preview if exists
        const audioPreview = document.getElementById('audio-preview');
        if (locationData.audioLink) {
            audioPreview.innerHTML = `
                <audio controls>
                    <source src="${locationData.audioLink}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>`;
        } else {
            audioPreview.innerHTML = '';
        }

        // Populate exits
        const exitslist = document.getElementById('exits-list');
        exitslist.innerHTML = ''; // Clear existing exits
        if (locationData.exits) {
            for (const [direction, target] of Object.entries(locationData.exits)) {
                addExitFields(direction, target);
            }
        }
    }, { onlyOnce: true });
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

// Load locations when the page loads
loadLocations();