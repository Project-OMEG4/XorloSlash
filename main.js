/* Config Constants */
const extensionLayer                    = document.getElementById("extension-layer");
const extensionGameLayer                = document.getElementById("extension-game-layer");

const swordWrapper                      = document.getElementById("sword-wrapper");
const sword                             = document.getElementById("sword");
const swordEvolved                      = document.getElementById("swordEvolved")
const slash                             = document.getElementById("slash");
const volumeSlider                      = document.getElementById("volume-slider");
const volumeUpIcon                      = document.getElementById("volumeup");
const volumeDownIcon                    = document.getElementById("volumedown");

const SWORD_HOVER_CLASSNAME             = "animate-sword-hover";
const SWORD_ANIMATION_CLASSNAME         = "animate-sword";
const SWORD_CHARGE_ANIMATION_CLASSNAME  = "rotate";
const SWORD_CHARGED_ANIMATION_CLASSNAME = "sword-charged";
const SHAKE_ANIMATION_CLASSNAME         = "shake";
const SLASH_ANIMATION_CLASSNAME         = "animate-slash";
const SLASH_ANIMATION_CHARGED_CLASSNAME = "animate-slash-charged";

const RESET_SWORD_TIMEOUT  = 500;  // ms
const CHARGE_SWORD_TIMEOUT = 1250; // ms
const EVOLUTION_TIMEOUT    = 6000  // ms // Use 900000 when this goes live
const SLASH_X_OFFSET       = 20;   // px
const SLASH_Y_OFFSET       = 40;   // px


// https://dev.twitch.tv/docs/extensions/guidelines-and-policies/#2-technical
// 2.4  Extensions can include audio, only if they include controls which allow viewers 
// to adjust the volume, and by default, these controls are set to off/muted.


/* Audio Config */
const VOLUME_INITIAL = 0;

/* Audio Randomizer - Sound assets ripped using m35's jPSXdec */ 
/* https://github.com/m35/jpsxdec */
const swordAudio0 = new Audio("assets/slice.wav");
const swordAudio1 = new Audio("assets/slash.wav");
const swordAudio2 = new Audio("assets/tear.wav");
const swordAudio3 = new Audio("assets/gather.wav");
const swordAudio4 = new Audio("assets/huzzah.wav");
const swordAudio5 = new Audio("");

function pickAudio() {
    // Define weights for each audio clip (multipliers)
    const weights = [
        7,    // slice.wav  - Weight: 7
        5,    // slash.wav  - Weight: 5
        0.5,  // tear.wav   - Weight: 1
        0.5,  // gather.wav - Weight: 1
        2,    // huzzah.wav - Weight: 2
        4,    // silence    - Weight: 4
    ];

    // Create an array with repeated audio clips based on weights
    const values = [];
    weights.forEach((weight, index) => {
        for (let i = 0; i < weight; i++) {
            values.push(index);
        }
    });

    // Randomly select an audio file to play from the modified array
    const randomIndex = Math.floor(Math.random() * values.length);

    // Map the selected index back to the corresponding audio clip
    switch (values[randomIndex]) {
        case 0: return swordAudio0;
        case 1: return swordAudio1;
        case 2: return swordAudio2;
        case 3: return swordAudio3;
        case 4: return swordAudio4;
        default: return swordAudio5; // Default to silence
    }
}

/* Volume Settings */
const maxVolume  = Number(volumeSlider.getAttribute("max"));
const minVolume  = Number(volumeSlider.getAttribute("min"));
const volumeStep = Number(volumeSlider.getAttribute("step"));
const storageAvailable = typeof Storage !== "undefined" ? true : false;

const volumeKey = "xorloslash_volume";

const saveVolumeToLocalStorageIfAvailable = (value) => { if (storageAvailable) { localStorage.setItem(volumeKey, value); } };
const getVolumeFromLocalStorageIfAvailable = () => { if (storageAvailable) { return localStorage.getItem(volumeKey) ?? VOLUME_INITIAL; } };

/** initialize volume from localstorage if available */
volumeSlider.value = getVolumeFromLocalStorageIfAvailable();

const setVolume = (value) => { volumeSlider.value = value; saveVolumeToLocalStorageIfAvailable(value); };
const volumeGoesUp   = () => { setVolume(clampVolume(volumeSlider.valueAsNumber + volumeStep)); };
const volumeGoesDown = () => { setVolume(clampVolume(volumeSlider.valueAsNumber - volumeStep)); };
const onVolumeInputRangeChange = (event) => { setVolume(event.target.valueAsNumber); };
const clampVolume = (num, min = minVolume, max = maxVolume) => { return Math.min(Math.max(num, min), max); };

const playSlashSound = () => {
    const selectedAudio = pickAudio();
    let swordAudioCopy = selectedAudio.cloneNode();
    swordAudioCopy.addEventListener("ended", () => { swordAudioCopy = null; });
    swordAudioCopy.volume = volumeSlider.value / 600;
    swordAudioCopy.play();
};

/* Animation Stuff */
let isSlashing = false;
let isChargedSlash = false;
let isEvolved = false;
let slashTimeout;
let chargeTimeout;
let hoverTimeout;

/* Sword Evolution */
const swordImg1 = document.getElementById('sword');
const swordImg2 = document.getElementById('swordWhite');
const swordImg3 = document.getElementById('swordEvolvedWhite');
const swordImg4 = document.getElementById('swordEvolved');
const swords = [swordImg1, swordImg2, swordImg3, swordImg4];

let currentSwordIndex = 0;
let reverseSwordOrder = false;

function toggleSwords() {
  swords[currentSwordIndex].hidden = true;  // Toggle sword visibility 

  // This is to determine the next index based on the reverseSwordOrder flag. 
  if(reverseSwordOrder){
    currentSwordIndex = (currentSwordIndex - 1 + swords.length) % swords.length;
  } else {
    currentSwordIndex = (currentSwordIndex + 1) % swords.length;
  }
     
  swords[currentSwordIndex].hidden = false; // Show the next image

  // Apply blur only to the middle two images
  if (currentSwordIndex === 1 || currentSwordIndex === 2) {
    swords[currentSwordIndex].style.filter = 'blur(2px)';
    swords[currentSwordIndex].classList.add('xorloEvolution');
  } else {
    swords[currentSwordIndex].style.filter = ''; // Remove blur for other images
    swords[currentSwordIndex].classList.remove('xorloEvolution');
  }

  // Set custom display durations (ms)
  const displayDuration = currentSwordIndex === 1 || currentSwordIndex === 2 ? 150 : EVOLUTION_TIMEOUT;
  setTimeout(toggleSwords, displayDuration);

  // Reverse order when the evolution timer counts down to zero
  if (currentSwordIndex === 0 || currentSwordIndex === 3) {
    reverseSwordOrder = !reverseSwordOrder;
  }
}

toggleSwords();

const onSlashRelease = () => {
  clearTimeout(chargeTimeout);
  swing(isChargedSlash);

  sword.classList.remove(SWORD_CHARGE_ANIMATION_CLASSNAME);
  swordEvolved.classList.remove(SWORD_CHARGE_ANIMATION_CLASSNAME);
  swordWrapper.classList.remove(SWORD_CHARGED_ANIMATION_CLASSNAME);
  
  isChargedSlash = false;
  chargeTimeout = null;
  document.addEventListener("mouseup", onMouseUp, {once: true,});
};

const onSwordSlashStart = () => {
  addOrReplaceClassName(sword, SWORD_CHARGE_ANIMATION_CLASSNAME);
  addOrReplaceClassName(swordEvolved, SWORD_CHARGE_ANIMATION_CLASSNAME);
  chargeTimeout = setTimeout(() => {
    addOrReplaceClassName(swordWrapper, SWORD_CHARGED_ANIMATION_CLASSNAME);
    isChargedSlash = true;
  }, CHARGE_SWORD_TIMEOUT);
};

const swing = (charged) => {
  if (isSlashing) { return; }
  playSlashSound(); spawnSlash(charged); animateSword();

  if (charged) { addOrReplaceClassName(extensionLayer, SHAKE_ANIMATION_CLASSNAME); }
};

const addOrReplaceClassName = (element, className) => { 
    if (element.classList.contains(className)) { 
        element.classList.remove(className); 
        element.offsetWidth = element.offsetWidth; 
        element.classList.add(className); } 
    else { element.classList.add(className); } 
  };

const spawnSlash = (charged) => {
  const animationClassName = charged ? SLASH_ANIMATION_CHARGED_CLASSNAME : SLASH_ANIMATION_CLASSNAME;
  let slashAudioCopy = slash.cloneNode(true);
  slashAudioCopy.style.left = `calc(${swordWrapper.style.left} - ${SLASH_X_OFFSET}px) `;
  slashAudioCopy.style.top = `calc(${swordWrapper.style.top} + ${SLASH_Y_OFFSET}px) `;
  slashAudioCopy.classList.add(animationClassName);

  extensionGameLayer.appendChild(slashAudioCopy);
  slashAudioCopy.addEventListener( "animationend", () => { slashAudioCopy.remove(); }, { once: true, } );
};

const animateSword = () => { 
  hoverTimeout = setTimeout(() => { 
    sword.classList.remove(SWORD_HOVER_CLASSNAME);
    swordEvolved.classList.remove(SWORD_HOVER_CLASSNAME);
    }, RESET_SWORD_TIMEOUT);

  isSlashing = true; 

  sword.classList.add(SWORD_ANIMATION_CLASSNAME); 
  swordEvolved.classList.add(SWORD_ANIMATION_CLASSNAME); 
  slashTimeout = setTimeout(() => { 
    sword.classList.remove(SWORD_ANIMATION_CLASSNAME); 
    swordEvolved.classList.remove(SWORD_ANIMATION_CLASSNAME); 
    isSlashing = false; 
    }, RESET_SWORD_TIMEOUT); 
};

const moveSword = (event) => {
  swordWrapper.style.left = `${ event.clientX - swordWrapper.offsetWidth  / 2 }px`;
  swordWrapper.style.top  = `${ event.clientY - swordWrapper.offsetHeight / 2 }px`;
};

/* Event Listening and mapping */
const onMouseMove = (event) => moveSword(event);
const onMouseDown = () => onSwordSlashStart();
const onMouseUp = () => onSlashRelease();
const onVolumeChange = (event) => onVolumeInputRangeChange(event);
const disableDefaultBehavior = () => false;
const onVolumeUpClick = volumeGoesUp;
const onVolumeDownClick = volumeGoesDown;

/* Main Config */
document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onSwordSlashStart);
    document.addEventListener("mouseup", onMouseUp, { once: true, });
    volumeSlider.addEventListener("input", onVolumeChange);
    sword.ondragstart = disableDefaultBehavior;
    volumeUpIcon.ondragstart = disableDefaultBehavior;
    volumeDownIcon.ondragstart = disableDefaultBehavior;
    volumeUpIcon.addEventListener("click", onVolumeUpClick);
    volumeDownIcon.addEventListener("click", onVolumeDownClick);
  });