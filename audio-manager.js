class AudioManager {
    constructor() {
        this.locationAudio = null; // Single audio instance for location audio
        this.soundEffects = new Map(); // Store sound effects
        this.settings = {
            enabled: true,
            volume: 5  // Default volume set to 5 (range 0-10)
        };

        this.loadSettings();
        this.initSoundEffects(); // Initialize sound effects when the class is instantiated
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('audioSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    saveSettings() {
        localStorage.setItem('audioSettings', JSON.stringify(this.settings));
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    
        const adjustedVolume = this.settings.volume / 10;
    
        // Apply volume to currently playing location audio, even if it's already playing
        if (this.locationAudio) {
            this.locationAudio.volume = adjustedVolume;
            console.log('Updated location audio volume to:', adjustedVolume);
        }
    
        // Update volume for all sound effects, and ensure it's applied to clones as well
        this.soundEffects.forEach((audio, name) => {
            audio.volume = adjustedVolume;
            console.log(`Updated sound effect volume for ${name} to:`, adjustedVolume);
        });
    }

    initSoundEffects() {
        // Load your sound effects
        this.loadSoundEffect('backpack', '/sounds/backpack.mp3'); // Replace with actual path
    }

    loadSoundEffect(name, path) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = this.settings.volume / 10;
        this.soundEffects.set(name, audio);
    }

    playSoundEffect(name) {
        if (!this.settings.enabled) return;
        
        const sound = this.soundEffects.get(name);
        if (sound) {
            const soundClone = sound.cloneNode();
            soundClone.volume = this.settings.volume / 10;
            soundClone.play().catch(error => {
                console.error(`Error playing sound effect ${name}:`, error);
            });
        }
    }

    playLocationAudio(audioUrl) {
        if (!audioUrl || !this.settings.enabled) return;

        // Stop any existing audio before playing a new one
        this.stopLocationAudio();

        // Create a new audio object and set its properties
        this.locationAudio = new Audio(audioUrl);
        this.locationAudio.loop = false;  // Ensure it does not loop
        this.locationAudio.volume = this.settings.volume / 10;  // Set volume based on settings

        this.locationAudio.play().catch(error => {
            console.error('Error playing location audio:', error);
        });
    }

    stopLocationAudio() {
        if (this.locationAudio) {
            this.locationAudio.pause();
            this.locationAudio.currentTime = 0;  // Reset to the beginning
            this.locationAudio = null;  // Clear the reference
        }
    }
}

export const audioManager = new AudioManager();
