// get DOM elements
const algorithmSelect = document.getElementById('algorithm');
const startPositionInput = document.getElementById('startPosition');
const maxSectorInput = document.getElementById('maxSector');
const directionSelect = document.getElementById('direction');
const requestsInput = document.getElementById('requests');
const randomCountInput = document.getElementById('randomCount');
const randomizeBtn = document.getElementById('randomizeBtn');
const startBtn = document.getElementById('startBtn');
const speedControl = document.getElementById('speedControl');
const speedValue = document.getElementById('speedValue');
const quickEndBtn = document.getElementById('quickEndBtn');
const canvas = document.getElementById('visualizationCanvas');
const ctx = canvas.getContext('2d');
const animationMessage = document.getElementById('animationMessage');
const totalMovementOutput = document.getElementById('totalMovement');
const pathOutput = document.getElementById('pathOutput');

// setup variables
let currentRequests = [];
let startPosition = 100;
let maxSector = 200;
let initialDirection = 'right';
let path = [];
let totalMovement = 0;
let animationFrameId = null;
let currentStep = 0;
let animationSpeed = 200; // 1.0x speed
let isAnimating = false;
let showQuickEnd = false;

// speed control
const BASE_ANIMATION_DELAY = 200; // ms
const MIN_MULTIPLIER = 0.5; // min speed mult
const MIDDLE_MULTIPLIER = 1.0 
const MAX_MULTIPLIER = 2.0; // max speed mult
const MIN_SLIDER_VAL = 1;
const MAX_SLIDER_VAL = 100;
const MIDDLE_SLIDER_VAL = 50;
const MIN_ANIMATION_DELAY = 20;

// randomize requests
randomizeBtn.addEventListener('click', () => {
    // Validate input values
    const count = parseInt(randomCountInput.value);
    const currentMax = parseInt(maxSectorInput.value);
    if (isNaN(count) || count <= 0 || isNaN(currentMax) || currentMax <= 0) {
        alert('Please enter valid numbers for Randomize Count and Total Sectors.');
        return;
    }
    const currentStartPos = parseInt(startPositionInput.value);
    if (isNaN(currentStartPos) || currentStartPos < 0 || currentStartPos > currentMax) {
        alert('Please enter valid numbers for Start Position');
        return;
    }

    // Update variables
    maxSector = currentMax;
    startPosition = currentStartPos;

    const randomRequests = new Set();
    while (randomRequests.size < count) {
        // Random numbers are within range [0, maxSector-1]
        randomRequests.add(Math.floor(Math.random() * maxSector));
    }
    requestsInput.value = Array.from(randomRequests).join(', ');
    drawVisualization(-1); // Redraw background with new maxSector
});

// Max Sector input field
maxSectorInput.addEventListener('change', () => {
    maxSector = parseInt(maxSectorInput.value);
    // Validate input value
    if (isNaN(maxSector) || maxSector <= 0) {
        maxSector = 200;
        maxSectorInput.value = maxSector; 
    }

    // Update label
    const startLabel = document.querySelector('label[for="startPosition"]');
    if(startLabel) startLabel.textContent = `Start Head Position (0-${maxSector - 1}):`;
    
    // Also validate start position against new maxSector
    startPosition = parseInt(startPositionInput.value);
    // Update if value is out of bound
    if (startPosition >= maxSector) {
        startPosition = maxSector - 1; 
        startPositionInput.value = startPosition;
    }
    drawVisualization(-1); // Redraw
});

// Start Position input field
startPositionInput.addEventListener('change', () => {
    startPosition = parseInt(startPositionInput.value);
    // Validate input value
    if (isNaN(startPosition) || startPosition < 0 || startPosition >= maxSector) {
        startPosition = Math.max(0, Math.min(100, maxSector -1));
        startPositionInput.value = startPosition;
    }
    drawVisualization(-1); // Redraw
});

// Speed control Logic
function updateAnimationSpeed() {
    const sliderValue = parseInt(speedControl.value);

    // Linear interpolation for the speed multiplier
    if (sliderValue <= MIDDLE_SLIDER_VAL) {
        // Lower half of the slider range
        speedMultiplier = MIN_MULTIPLIER +
                            (MIDDLE_MULTIPLIER - MIN_MULTIPLIER) *
                            (sliderValue - MIN_SLIDER_VAL) / (MIDDLE_SLIDER_VAL - MIN_SLIDER_VAL);
    } else {
        // Upper half of the slider range
        speedMultiplier = MIDDLE_MULTIPLIER +
                            (MAX_MULTIPLIER - MIDDLE_MULTIPLIER) *
                            (sliderValue - MIDDLE_SLIDER_VAL) / (MAX_SLIDER_VAL - MIDDLE_SLIDER_VAL);
    }

    if (speedMultiplier > 0) {
        animationSpeed = Math.max(MIN_ANIMATION_DELAY, BASE_ANIMATION_DELAY / speedMultiplier);
    } else {
        animationSpeed = BASE_ANIMATION_DELAY / MIN_MULTIPLIER; // Max delay
    }

    speedValue.textContent = `${speedMultiplier.toFixed(1)}x`;
}

speedControl.addEventListener('input', updateAnimationSpeed);

// Initialize speed display and animationSpeed on load
updateAnimationSpeed();

startBtn.addEventListener('click', runSimulation);
quickEndBtn.addEventListener('click', handleQuickEnd);

// Algorithms (FCFS, SCAN, C-SCAN, C-LOOK)

function fcfs(requests, start) {
    let currentPosition = start;
    let movement = 0;
    const sequence = [start];
    
    requests.forEach(req => {
        movement += Math.abs(req - currentPosition);
        currentPosition = req;
        sequence.push(req);
    });
    
    return { path: sequence, movement: movement };
}

function scan(requests, start, max, direction) {
    let movement = 0;
    const sequence = [start];
    const sortedRequests = [...requests].sort((a, b) => a - b);
    let leftPart = sortedRequests.filter(r => r < start);
    let rightPart = sortedRequests.filter(r => r >= start);

    if (direction === 'right') {
        rightPart.forEach(req => { sequence.push(req); });
        if (requests.length > 0 || start !== max -1) sequence.push(max - 1);
        leftPart.reverse().forEach(req => { sequence.push(req); });
    } else {
        leftPart.reverse().forEach(req => { sequence.push(req); });
        if (requests.length > 0 || start !== 0) sequence.push(0);
        rightPart.forEach(req => { sequence.push(req); });
    }

    const uniqueSequence = [...new Set(sequence)];
    movement = 0;
    for (let i = 1; i < uniqueSequence.length; i++) {
        movement += Math.abs(uniqueSequence[i] - uniqueSequence[i-1]);
    }

    return { path: uniqueSequence, movement: movement };
}

function look(requests, start, max, direction) {
    let movement = 0;
    const sequence = [start];
    const sortedRequests = [...requests].sort((a, b) => a - b);
    let leftPart = sortedRequests.filter(r => r < start);
    let rightPart = sortedRequests.filter(r => r >= start);

    if (direction === 'right') {
        rightPart.forEach(req => { sequence.push(req); });
        leftPart.reverse().forEach(req => { sequence.push(req); });
    } else {
        leftPart.reverse().forEach(req => { sequence.push(req); });
        rightPart.forEach(req => { sequence.push(req); });
    }

    const uniqueSequence = [...new Set(sequence)];
    movement = 0;
    for (let i = 1; i < uniqueSequence.length; i++) {
        movement += Math.abs(uniqueSequence[i] - uniqueSequence[i-1]);
    }

    return { path: uniqueSequence, movement: movement };
}

function cscan(requests, start, max, direction) {
    let movement = 0;
    const sequence = [start];
    const sortedRequests = [...requests].sort((a, b) => a - b);
    let leftPart = sortedRequests.filter(r => r < start);
    let rightPart = sortedRequests.filter(r => r >= start);

    if (direction === 'right') {
        rightPart.forEach(req => { sequence.push(req); });
        if (requests.length > 0 || start !== max -1) {
            sequence.push(max - 1);
            if (leftPart.length > 0 || start !== 0) sequence.push(0);
        }
        leftPart.forEach(req => { sequence.push(req); });
    } else {
        leftPart.reverse().forEach(req => { sequence.push(req); });
        if (requests.length > 0 || start !== 0) {
            sequence.push(0);
            if (rightPart.length > 0 || start !== max -1) sequence.push(max - 1);
        }
        rightPart.reverse().forEach(req => { sequence.push(req); });
    }

    const uniqueSequence = [...new Set(sequence)];
    movement = 0;
    for (let i = 1; i < uniqueSequence.length; i++) {
        const diff = Math.abs(uniqueSequence[i] - uniqueSequence[i-1]);
        const isWrapAroundJump = (uniqueSequence[i-1] === max - 1 && uniqueSequence[i] === 0) ||
                                 (uniqueSequence[i-1] === 0 && uniqueSequence[i] === max - 1);
        if (!isWrapAroundJump) {
            movement += diff;
        }
    }

    return { path: uniqueSequence, movement: movement };
}

function clook(requests, start, direction) {
    let movement = 0;
    const sequence = [start];
    if (requests.length === 0) return { path: sequence, movement: 0 };

    const sortedRequests = [...requests].sort((a, b) => a - b);
    let leftPart = sortedRequests.filter(r => r < start);
    let rightPart = sortedRequests.filter(r => r >= start);
    const lowestReq = Math.min(...requests);
    const highestReq = Math.max(...requests);

    if (direction === 'right') {
        rightPart.forEach(req => { sequence.push(req); });
        if (leftPart.length > 0) { // Jump if there are requests to the left
            leftPart.forEach(req => { sequence.push(req); });
        }
    } else { // direction === 'left'
        leftPart.reverse().forEach(req => { sequence.push(req); });
        if (rightPart.length > 0) { // Jump if there are requests to the right
            rightPart.reverse().forEach(req => { sequence.push(req); });
        }
    }

    const uniqueSequence = [...new Set(sequence)];
    movement = 0;
    for (let i = 1; i < uniqueSequence.length; i++) {
        const diff = Math.abs(uniqueSequence[i] - uniqueSequence[i-1]);
        const isWrapAroundJump = (uniqueSequence[i-1] === highestReq && uniqueSequence[i] === lowestReq) ||
                                 (uniqueSequence[i-1] === lowestReq && uniqueSequence[i] === highestReq);
        if (!isWrapAroundJump) {
            movement += diff;
        }
    }

    return { path: uniqueSequence, movement: movement };
}

// Simulation Logic
function runSimulation() {
    if (isAnimating) {
        cancelAnimationFrame(animationFrameId);
        isAnimating = false;
    }

    // Read current values from inputs
    startPosition = parseInt(startPositionInput.value);
    maxSector = parseInt(maxSectorInput.value); // Use current value
    initialDirection = directionSelect.value;
    const requestsStr = requestsInput.value.trim();

    // Input validation
    if (isNaN(maxSector) || maxSector <= 0) {
        alert('Total sectors must be a positive number.'); return;
    }
    if (isNaN(startPosition) || startPosition < 0 || startPosition >= maxSector) {
        alert(`Start position must be between 0 and ${maxSector - 1}.`); return;
    }
    // Check if there are requests, else stop
    if (!requestsStr) {
        alert('Please enter sector requests or use Randomize.');
        return;
    }

    // Parse requests
    try {
        currentRequests = requestsStr.split(',')
                          .map(s => s.trim())
                          .filter(s => s !== '')
                          .map(s => parseInt(s));
        if (currentRequests.some(isNaN)) throw new Error('Invalid number found.');
    
        // Validate requests
        if (currentRequests.some(r => r < 0 || r >= maxSector)) throw new Error(`Requests must be between 0 and ${maxSector - 1}.`);

        // Remove duplicates (optional)
        // currentRequests = [...new Set(currentRequests)];
    } catch (error) {
        alert(`Invalid sector requests: ${error.message}. Please use comma-separated numbers.`); return;
    }
    
    // Check for at least one valid request
    if (currentRequests.length === 0) {
        alert('Please enter at least one valid sector request.');
        return;
    }

    // Select and run algorithm
    const algorithm = algorithmSelect.value;
    let result;
    switch (algorithm) {
        case 'fcfs': result = fcfs([...currentRequests], startPosition); break;
        case 'scan': result = scan([...currentRequests], startPosition, maxSector, initialDirection); break;
        case 'look': result = look([...currentRequests], startPosition, maxSector, initialDirection); break;
        case 'cscan': result = cscan([...currentRequests], startPosition, maxSector, initialDirection); break;
        case 'clook': result = clook([...currentRequests], startPosition, initialDirection); break;
        default: alert('Invalid algorithm selected.'); return;
    }

    path = result.path;
    totalMovement = result.movement;

    // Reset and start animation
    currentStep = 0;
    showQuickEnd = false;
    isAnimating = true;
    startBtn.disabled = true;
    quickEndBtn.disabled = false;
    animationMessage.textContent = 'Animation running...';
    totalMovementOutput.textContent = '';
    pathOutput.textContent = '';

    adjustCanvasHeight();
    animateStep();
}

// Quick end animation
function handleQuickEnd() {
    if (isAnimating) {
    showQuickEnd = true;
    } else if (path && path.length > 0) {
        showQuickEnd = false;
        isAnimating = false;
        cancelAnimationFrame(animationFrameId);
        adjustCanvasHeight();
        drawVisualization(path.length -1);
        displayResults();
        quickEndBtn.disabled = true;
        startBtn.disabled = false;
    }
}

function displayResults() {
    totalMovementOutput.textContent = `Total Head Movement: ${totalMovement}`;
    pathOutput.textContent = `Path: ${path.join(' -> ')}`;
    const steps = path && path.length > 1 ? path.length - 1 : 0;
    animationMessage.textContent = `Animation finished. Steps: ${steps}`;
}

// Visualization

const padding = 50;
const pointRadius = 4;
const headRadius = 6;
const numberLineY = 50;
const startY = 80;
const stepHeight = 25;

function adjustCanvasHeight() {
    const pathLength = path ? path.length : 0;
    const requiredHeight = startY + (pathLength * stepHeight) + padding;
    const minHeight = 400;
    canvas.height = Math.max(minHeight, requiredHeight);
}

function drawVisualization(step) {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Use the current maxSector value for calculations
    const currentMaxSector = maxSector;
    const drawWidth = canvasWidth - 2 * padding;
    const effectiveMaxSector = Math.max(1, currentMaxSector);
    const scaleX = drawWidth / effectiveMaxSector;

    function getX(sector) {
            const clampedSector = Math.max(0, Math.min(sector, effectiveMaxSector > 0 ? effectiveMaxSector -1 : 0));
            return padding + clampedSector * scaleX;
    }

    // Draw Disk Number Line
    ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(padding, numberLineY); ctx.lineTo(canvasWidth - padding, numberLineY); ctx.stroke();

    // Draw Ticks and Labels
    ctx.fillStyle = '#4b5563'; ctx.textAlign = 'center'; ctx.font = '11px Inter';
    ctx.beginPath(); ctx.moveTo(getX(0), numberLineY - 5); ctx.lineTo(getX(0), numberLineY + 5); ctx.stroke();
    ctx.fillText('0', getX(0), numberLineY - 10);

    // Use currentMaxSector for range end
    if (currentMaxSector > 0) {
        const endSector = currentMaxSector - 1;
        ctx.beginPath(); ctx.moveTo(getX(endSector), numberLineY - 5); ctx.lineTo(getX(endSector), numberLineY + 5); ctx.stroke();
        ctx.fillText(endSector.toString(), getX(endSector), numberLineY - 10);
    }

    const tickInterval = Math.max(1, Math.floor(effectiveMaxSector / 10));
    if (effectiveMaxSector > 1) {
        for (let i = tickInterval; i < effectiveMaxSector -1; i += tickInterval) {
            if (i > 0) { 
                ctx.beginPath(); ctx.moveTo(getX(i), numberLineY - 3); ctx.lineTo(getX(i), numberLineY + 3); ctx.stroke(); 
            }
        }
    }

    // Draw Request Markers & Guidelines (using currentRequests array)
    ctx.fillStyle = '#ef4444'; ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 0.5; ctx.setLineDash([2, 3]);
    currentRequests.forEach(req => {
        const x = getX(req);
        ctx.beginPath(); ctx.arc(x, numberLineY, pointRadius, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, numberLineY + pointRadius); ctx.lineTo(x, canvasHeight - padding / 2); ctx.stroke();
        ctx.fillStyle = '#dc2626'; ctx.fillText(req.toString(), x, numberLineY + 15);
    });

    ctx.setLineDash([]); ctx.lineWidth = 1;

    // Draw Start Position Marker (using current startPosition)
    const startX = getX(startPosition);
    ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(startX, numberLineY, pointRadius + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#059669'; ctx.fillText(`Start: ${startPosition}`, startX, numberLineY - 10);

    // Draw Path Trajectory
    if (!path || path.length === 0 || step < 0) return;

    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const endStep = showQuickEnd ? path.length -1 : step;

    for (let i = 1; i <= endStep && i < path.length; i++) {
        const x1 = getX(path[i-1]); const y1 = startY + (i-1) * stepHeight;
        const x2 = getX(path[i]); const y2 = startY + i * stepHeight;

        // Check for Wrap-Around Jump
        const algorithm = algorithmSelect.value;
        let isWrapAroundJump = false;

        if (algorithm === 'cscan' && currentRequests.length > 0) {
            isWrapAroundJump = (path[i-1] === currentMaxSector - 1 && path[i] === 0) ||
                               (path[i-1] === 0 && path[i] === currentMaxSector - 1);
        } else if (algorithm === 'clook' && currentRequests.length > 1) {
            const lowestReq = Math.min(...currentRequests);
            const highestReq = Math.max(...currentRequests);
            isWrapAroundJump = (path[i-1] === highestReq && path[i] === lowestReq) ||
                               (path[i-1] === lowestReq && path[i] === highestReq);
        }

        // Draw Segment
        ctx.beginPath();
        if (isWrapAroundJump) { ctx.setLineDash([5, 5]); ctx.strokeStyle = '#f59e0b'; }
        else { ctx.setLineDash([]); ctx.strokeStyle = '#3b82f6'; }
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

        // Draw Target Node
        ctx.fillStyle = isWrapAroundJump ? '#f59e0b' : '#3b82f6';
        ctx.beginPath(); ctx.arc(x2, y2, pointRadius, 0, Math.PI * 2); ctx.fill();

        // Draw Start Node (first segment only)
        if (i === 1) {
            ctx.fillStyle = '#10b981';
            ctx.beginPath(); ctx.arc(x1, y1, pointRadius, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.setLineDash([]);

    // Draw Current Head Position Indicator
    if (endStep >= 0 && endStep < path.length) {
        const currentHeadSector = path[endStep];
        const headX = getX(currentHeadSector);
        const headY = startY + endStep * stepHeight;
        ctx.fillStyle = '#0ea5e9'; ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(headX, headY, headRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#0369a1'; ctx.textAlign = 'center'; ctx.fillText(currentHeadSector.toString(), headX, headY + headRadius + 10);
    }
}

function animateStep() {
    if (!path || path.length <= 1) { // Handle no/single point path
        isAnimating = false; showQuickEnd = false;
        drawVisualization(path && path.length === 1 ? 0 : -1); // Draw start point or empty
        displayResults();
        startBtn.disabled = false; quickEndBtn.disabled = true;
        return;
    }

    if (currentStep < path.length - 1 && !showQuickEnd) {
        drawVisualization(currentStep + 1);
        currentStep++;
        animationFrameId = setTimeout(() => { requestAnimationFrame(animateStep); }, animationSpeed);
    } else {
        isAnimating = false; showQuickEnd = false;
        drawVisualization(path.length -1);
        displayResults();
        startBtn.disabled = false; quickEndBtn.disabled = true;
    }
}

// Initial setup on load
window.onload = () => {
    // Set JS state from default HTML values
    maxSector = parseInt(maxSectorInput.value);
    startPosition = parseInt(startPositionInput.value);
    // Update start position label based on initial maxSector
    const startLabel = document.querySelector('label[for="startPosition"]');
    if(startLabel) startLabel.textContent = `Start Head Position (0-${maxSector - 1}):`;

    const containerWidth = canvas.parentElement.clientWidth;
    canvas.width = Math.max(600, containerWidth);
    updateAnimationSpeed(); // Set initial speed text and delay value
    adjustCanvasHeight(); // Set initial height
    drawVisualization(-1); // Draw axes and initial state
};

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const containerWidth = canvas.parentElement.clientWidth;
        canvas.width = Math.max(600, containerWidth);
        adjustCanvasHeight();
        let stepToDraw = -1;
        if (path && path.length > 0) {
            stepToDraw = isAnimating ? currentStep + 1 : path.length -1;
        }
        drawVisualization(stepToDraw);
    }, 250);
});
