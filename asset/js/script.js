document.addEventListener('DOMContentLoaded', () => {
    // Initialize sidebar navigation
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarItems = document.querySelectorAll('.sidebar-menu-item');
    const sections = document.querySelectorAll('.section-content');
    const gotoSimulationBtn = document.getElementById('goto-simulation-btn');
    
    // Toggle sidebar on mobile
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    
    // Handle sidebar navigation
    function activateSection(sectionId) {
        // Hide all sections
        sections.forEach(section => {
            section.classList.add('hidden');
        });
        
        // Deactivate all sidebar items
        sidebarItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
        
        // Activate corresponding sidebar item
        const targetItem = document.querySelector(`.sidebar-menu-item[data-section="${sectionId}"]`);
        if (targetItem) {
            targetItem.classList.add('active');
        }
        
        // Close sidebar on mobile after selection
        if (window.innerWidth < 768) {
            sidebar.classList.remove('open');
        }
        
        // Render KaTeX formulas when selecting theory section
        if (sectionId === 'theory') {
            renderMathFormulas();
        }
    }
    
    // Attach click handlers to sidebar items
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');
            activateSection(sectionId);
        });
    });
    
    // Quick navigation button
    gotoSimulationBtn.addEventListener('click', () => {
        activateSection('game');
    });
    
    // Initialize KaTeX rendering - intentionally not working as requested
    function renderMathFormulas() {
        // This function would normally render LaTeX formulas, but we're 
        // not making it work as per the requirement to keep LaTeX not rendering properly
        console.log("LaTeX intentionally not rendering as requested");
        
        // The formulas are instead displayed in plain text via the 'broken-latex' class
    }
    
    // ===== Q-Learning Simulation Implementation =====
    
    // Game environment constants
    const GRID_SIZE = 5;
    const ACTIONS = ['up', 'right', 'down', 'left'];
    const ACTION_DELTAS = {
        'up': {x: 0, y: -1},
        'right': {x: 1, y: 0},
        'down': {x: 0, y: 1},
        'left': {x: -1, y: 0},
    };
    const REWARDS = {
        'move': -0.1,   // Small penalty for each move
        'hole': -1,     // Penalty for falling in a hole
        'goal': 1,      // Reward for reaching the goal
        'invalid': -0.3 // Penalty for attempting invalid moves
    };
    
    // Game environment
    const environment = {
        grid: [
            ['S', 'F', 'F', 'F', 'F'],
            ['F', 'H', 'F', 'H', 'F'],
            ['F', 'F', 'F', 'F', 'F'],
            ['H', 'F', 'H', 'F', 'H'],
            ['F', 'F', 'F', 'F', 'G']
        ],
        startPosition: {x: 0, y: 0},
        goalPosition: {x: 4, y: 4},
        holePositions: [
            {x: 1, y: 1}, 
            {x: 3, y: 1}, 
            {x: 0, y: 3}, 
            {x: 2, y: 3}, 
            {x: 4, y: 3}
        ],
        isValidPosition: function(x, y) {
            return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
        },
        isHole: function(x, y) {
            return this.holePositions.some(pos => pos.x === x && pos.y === y);
        },
        isGoal: function(x, y) {
            return x === this.goalPosition.x && y === this.goalPosition.y;
        },
        getStateIndex: function(x, y) {
            return y * GRID_SIZE + x;
        },
        getPositionFromIndex: function(index) {
            return {
                x: index % GRID_SIZE,
                y: Math.floor(index / GRID_SIZE)
            };
        }
    };
    
    // Agent parameters (with defaults)
    const agent = {
        learningRate: 0.7,          // alpha
        discountFactor: 0.9,        // gamma
        explorationRate: 0.3,       // epsilon
        explorationDecay: 0.98,     // decay rate for epsilon
        minExplorationRate: 0.01,   // minimum epsilon value
        qTable: Array(GRID_SIZE * GRID_SIZE).fill().map(() => Array(ACTIONS.length).fill(0)),
        position: {...environment.startPosition},
        
        // Reset agent to initial state
        reset: function() {
            this.position = {...environment.startPosition};
        },
        
        // Choose action using epsilon-greedy strategy
        chooseAction: function(stateIndex) {
            // Exploration
            if (Math.random() < this.explorationRate) {
                return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
            }
            // Exploitation (choose best action)
            else {
                const qValues = this.qTable[stateIndex];
                const maxQValue = Math.max(...qValues);
                const bestActions = qValues.map((q, i) => q === maxQValue ? i : -1).filter(i => i !== -1);
                return ACTIONS[bestActions[Math.floor(Math.random() * bestActions.length)]];
            }
        },
        
        // Update Q-value for a state-action pair
        updateQValue: function(stateIndex, actionIndex, reward, nextStateIndex) {
            const oldQValue = this.qTable[stateIndex][actionIndex];
            const nextMaxQValue = Math.max(...this.qTable[nextStateIndex]);
            
            // Q-learning update formula
            const newQValue = oldQValue + this.learningRate * (
                reward + this.discountFactor * nextMaxQValue - oldQValue
            );
            
            this.qTable[stateIndex][actionIndex] = newQValue;
            
            // Return the components for display
            return {
                oldQValue: oldQValue,
                reward: reward,
                nextMaxQValue: nextMaxQValue,
                newQValue: newQValue,
                tdError: reward + this.discountFactor * nextMaxQValue - oldQValue
            };
        },
        
        // Decay exploration rate
        decayExploration: function() {
            this.explorationRate = Math.max(
                this.minExplorationRate, 
                this.explorationRate * this.explorationDecay
            );
        }
    };
    
    // Simulation state
    const simulation = {
        isRunning: false,
        autoPlay: false,
        autoPlayInterval: null,
        currentEpisode: 0,
        totalEpisodes: 0,
        stepsInEpisode: 0,
        successfulEpisodes: 0,
        totalSteps: 0,
        totalUpdates: 0,
        episodeLog: [],
        qUpdateLog: [],
        showQValues: false,
        previousQValues: new Map(), // For tracking changes
        
        // Initialize simulation
        init: function() {
            this.createGrid();
            this.updateQTableDisplay();
            this.bindUIControls();
            this.updateAgentPosition();
            this.updateStatistics();
            this.updateFullQTableDisplay();
        },
        
        // Create the grid
        createGrid: function() {
            const gridContainer = document.getElementById('grid-container');
            const qTableGridContainer = document.getElementById('q-table-grid-container');
            
            // Clear existing grid
            gridContainer.innerHTML = '';
            qTableGridContainer.innerHTML = '';
            
            // Create cells for main grid
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    const cell = document.createElement('div');
                    cell.classList.add('grid-cell');
                    cell.setAttribute('data-x', x);
                    cell.setAttribute('data-y', y);
                    
                    // Set cell appearance based on type
                    if (environment.isGoal(x, y)) {
                        cell.classList.add('goal-cell', 'flex', 'items-center', 'justify-center');
                        cell.innerHTML = `<span class="text-green-500 text-xl">🏆</span>`;
                    } else if (environment.isHole(x, y)) {
                        cell.classList.add('hole');
                    } else {
                        cell.classList.add('safe-ice');
                    }
                    
                    gridContainer.appendChild(cell);
                    
                    // Also create cells for Q-table visualization grid
                    const qCell = cell.cloneNode(true);
                    qTableGridContainer.appendChild(qCell);
                }
            }
            
            // Add state selector options
            const stateSelector = document.getElementById('state-selector');
            stateSelector.innerHTML = '<option value="">Select a state...</option>';
            
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    const stateIndex = environment.getStateIndex(x, y);
                    const option = document.createElement('option');
                    option.value = stateIndex;
                    
                    let cellType = 'Safe';
                    if (environment.isGoal(x, y)) cellType = 'Goal';
                    if (environment.isHole(x, y)) cellType = 'Hole';
                    if (x === environment.startPosition.x && y === environment.startPosition.y) cellType = 'Start';
                    
                    option.textContent = `State ${stateIndex} (${x},${y}) - ${cellType}`;
                    stateSelector.appendChild(option);
                }
            }
        },
        
        // Update agent position on grid
        updateAgentPosition: function() {
            const agentElement = document.getElementById('agent-element');
            const cellSize = 100 / GRID_SIZE;
            
            // Position agent
            agentElement.style.left = `${agent.position.x * cellSize}%`;
            agentElement.style.top = `${agent.position.y * cellSize}%`;
            agentElement.style.width = `${cellSize}%`;
            agentElement.style.height = `${cellSize}%`;
        },
        
        // Update Q-table display
        updateQTableDisplay: function() {
            const qTableBody = document.getElementById('q-table-body');
            qTableBody.innerHTML = '';
            
            // Track which cells have changed values to animate them
            const changedCells = new Set();
            
            // Display all 25 states in a 5x5 grid-like layout
            for (let stateIndex = 0; stateIndex < GRID_SIZE * GRID_SIZE; stateIndex++) {
                const {x, y} = environment.getPositionFromIndex(stateIndex);
                
                const row = document.createElement('tr');
                row.className = (stateIndex % 5 === 0) ? 'border-t-2 border-gray-400' : '';
                
                // State cell
                const stateCell = document.createElement('td');
                stateCell.className = 'p-2 border border-gray-200 min-w-[80px] bg-gray-50';
                let cellType = 'Safe';
                let cellIcon = '';
                
                if (environment.isGoal(x, y)) {
                    cellType = 'Goal';
                    cellIcon = '🏆';
                    stateCell.classList.add('bg-green-50');
                }
                if (environment.isHole(x, y)) {
                    cellType = 'Hole';
                    cellIcon = '⚠️';
                    stateCell.classList.add('bg-red-50');
                }
                if (x === environment.startPosition.x && y === environment.startPosition.y) {
                    cellType = 'Start';
                    cellIcon = '🚀';
                    stateCell.classList.add('bg-blue-50');
                }
                
                stateCell.innerHTML = `
                    <div class="flex items-center">
                        <span class="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 mr-2 text-xs font-bold">
                            ${stateIndex}
                        </span>
                        <span>(${x},${y})</span>
                        ${cellIcon ? `<span class="ml-1">${cellIcon}</span>` : ''}
                    </div>
                    <div class="text-xs text-gray-500">${cellType}</div>
                `;
                row.appendChild(stateCell);
                
                // Action cells
                ACTIONS.forEach((action, actionIndex) => {
                    const actionCell = document.createElement('td');
                    actionCell.className = 'p-2 border border-gray-200 text-center q-table-cell';
                    actionCell.setAttribute('data-state', stateIndex);
                    actionCell.setAttribute('data-action', actionIndex);
                    
                    // Get current and previous Q-value
                    const currentValue = agent.qTable[stateIndex][actionIndex];
                    const cellKey = `${stateIndex}-${actionIndex}`;
                    const previousValue = this.previousQValues.get(cellKey) || 0;
                    
                    // Check if value has changed
                    if (previousValue !== currentValue) {
                        changedCells.add(cellKey);
                        // Store current value for future comparison
                        this.previousQValues.set(cellKey, currentValue);
                    }
                    
                    // Format Q-value with 3 decimal places
                    actionCell.textContent = currentValue.toFixed(3);
                    
                    // Highlight max Q-value for this state
                    const maxQValue = Math.max(...agent.qTable[stateIndex]);
                    if (currentValue === maxQValue && maxQValue !== 0) {
                        actionCell.classList.add('max-value');
                    }
                    
                    // Add action icon
                    let actionIcon = '';
                    switch(action) {
                        case 'up': actionIcon = '↑'; break;
                        case 'right': actionIcon = '→'; break;
                        case 'down': actionIcon = '↓'; break;
                        case 'left': actionIcon = '←'; break;
                    }
                    
                    // Add title attribute for tooltip
                    actionCell.setAttribute('title', `State ${stateIndex}, Action: ${action}`);
                    
                    // Add badge for action type
                    const badge = document.createElement('div');
                    badge.className = 'action-badge';
                    badge.textContent = actionIcon;
                    
                    // Make cell position relative for the badge
                    actionCell.style.position = 'relative';
                    actionCell.appendChild(badge);
                    
                    row.appendChild(actionCell);
                });
                
                qTableBody.appendChild(row);
            }
            
            // Add animation to changed cells
            changedCells.forEach(cellKey => {
                const [stateIndex, actionIndex] = cellKey.split('-').map(Number);
                const cell = qTableBody.querySelector(`td[data-state="${stateIndex}"][data-action="${actionIndex}"]`);
                if (cell) {
                    // Remove existing animation class
                    cell.classList.remove('q-table-update-animation');
                    // Force reflow
                    void cell.offsetWidth;
                    // Add animation class back
                    cell.classList.add('q-table-update-animation');
                }
            });
            
            // Also update the full Q-table display
            this.updateFullQTableDisplay();
        },
        
        // Update the complete Q-table display in Q-Table Visualization section
        updateFullQTableDisplay: function() {
            const fullQTableBody = document.getElementById('full-q-table-body');
            if (!fullQTableBody) return; // Skip if not on the Q-table visualization page
            
            fullQTableBody.innerHTML = '';
            
            // Track changed cells for animation
            const changedCells = new Set();
            
            // Create rows for all 25 states
            for (let stateIndex = 0; stateIndex < GRID_SIZE * GRID_SIZE; stateIndex++) {
                const {x, y} = environment.getPositionFromIndex(stateIndex);
                
                const row = document.createElement('tr');
                row.className = 'q-table-row';
                
                // Add border for visual separation of grid rows
                if (stateIndex % GRID_SIZE === 0 && stateIndex > 0) {
                    row.classList.add('border-t-2', 'border-gray-200');
                }
                
                // Determine cell type for styling
                let cellType = 'Safe';
                let bgClass = '';
                let cellIcon = '';
                
                if (environment.isGoal(x, y)) {
                    cellType = 'Goal';
                    bgClass = 'bg-green-50';
                    cellIcon = '🏆';
                } else if (environment.isHole(x, y)) {
                    cellType = 'Hole';
                    bgClass = 'bg-red-50';
                    cellIcon = '⚠️';
                } else if (x === environment.startPosition.x && y === environment.startPosition.y) {
                    cellType = 'Start';
                    bgClass = 'bg-blue-50';
                    cellIcon = '🚀';
                }
                
                // Current state indicator
                const isCurrentState = x === agent.position.x && y === agent.position.y;
                const currentStateClass = isCurrentState ? 'border-2 border-primary' : '';
                
                // State header cell
                const stateCell = document.createElement('td');
                stateCell.className = `p-2 border border-gray-200 q-state-header ${bgClass} ${currentStateClass} font-medium text-sm`;
                stateCell.innerHTML = `
                    <div class="flex items-center">
                        <span class="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 mr-2 text-xs font-bold">
                            ${stateIndex}
                        </span>
                        <div>
                            <div class="flex items-center">
                                <span>(${x},${y})</span>
                                ${cellIcon ? `<span class="ml-1">${cellIcon}</span>` : ''}
                            </div>
                            <div class="text-xs text-gray-500">${cellType}</div>
                        </div>
                    </div>
                `;
                row.appendChild(stateCell);
                
                // Add action cells
                ACTIONS.forEach((action, actionIndex) => {
                    const actionCell = document.createElement('td');
                    actionCell.className = `p-2 border border-gray-200 text-center q-table-cell`;
                    
                    // Current state class
                    if (isCurrentState) {
                        actionCell.classList.add('current-state');
                    }
                    
                    // Get current and previous value
                    const currentValue = agent.qTable[stateIndex][actionIndex];
                    const cellKey = `${stateIndex}-${actionIndex}`;
                    const previousValue = this.previousQValues.get(cellKey) || 0;
                    
                    // Check if value changed
                    if (previousValue !== currentValue) {
                        changedCells.add(cellKey);
                    }
                    
                    // Highlight max Q-value
                    const maxQValue = Math.max(...agent.qTable[stateIndex]);
                    const isMaxValue = currentValue === maxQValue && maxQValue !== 0;
                    
                    // Set cell content
                    actionCell.innerHTML = `
                        <div class="relative ${isMaxValue ? 'font-bold text-primary' : ''}">
                            ${currentValue.toFixed(3)}
                            <div class="action-badge">
                                ${action === 'up' ? '↑' : action === 'right' ? '→' : action === 'down' ? '↓' : '←'}
                            </div>
                        </div>
                    `;
                    
                    // Add data attributes for identification
                    actionCell.setAttribute('data-state', stateIndex);
                    actionCell.setAttribute('data-action', actionIndex);
                    
                    row.appendChild(actionCell);
                });
                
                fullQTableBody.appendChild(row);
            }
            
            // Add animation to changed cells
            changedCells.forEach(cellKey => {
                const [stateIndex, actionIndex] = cellKey.split('-').map(Number);
                const cell = fullQTableBody.querySelector(`td[data-state="${stateIndex}"][data-action="${actionIndex}"]`);
                if (cell) {
                    // Remove existing animation class
                    cell.classList.remove('q-table-update-animation');
                    // Force reflow
                    void cell.offsetWidth;
                    // Add animation class back
                    cell.classList.add('q-table-update-animation');
                }
            });
        },
        
        // Single step in an episode
        step: function() {
            if (this.isRunning) return;
            
            this.isRunning = true;
            this.stepsInEpisode++;
            
            // Get current state
            const currentStateIndex = environment.getStateIndex(agent.position.x, agent.position.y);
            
            // Choose action using epsilon-greedy
            const action = agent.chooseAction(currentStateIndex);
            const actionIndex = ACTIONS.indexOf(action);
            
            // Log the decision
            this.logAction(action, currentStateIndex);
            
            // Calculate new position
            const delta = ACTION_DELTAS[action];
            const newX = agent.position.x + delta.x;
            const newY = agent.position.y + delta.y;
            
            // Default reward for moving
            let reward = REWARDS.move;
            let newStateIndex = currentStateIndex;
            let episodeEnd = false;
            
            // Check if move is valid
            if (environment.isValidPosition(newX, newY)) {
                // Update agent position
                agent.position.x = newX;
                agent.position.y = newY;
                this.updateAgentPosition();
                
                // Calculate new state index
                newStateIndex = environment.getStateIndex(newX, newY);
                
                // Check for special cells
                if (environment.isHole(newX, newY)) {
                    reward = REWARDS.hole;
                    episodeEnd = true;
                    this.showFallScreen();
                } else if (environment.isGoal(newX, newY)) {
                    reward = REWARDS.goal;
                    episodeEnd = true;
                    this.successfulEpisodes++;
                    this.showWinScreen();
                }
            } else {
                // Invalid move (hitting boundary)
                reward = REWARDS.invalid;
                // State doesn't change
            }
            
            // Update Q-value
            const updateResult = agent.updateQValue(currentStateIndex, actionIndex, reward, newStateIndex);
            this.totalUpdates++;
            
            // Log Q-value update
            this.logQUpdate(currentStateIndex, action, reward, newStateIndex, updateResult);
            
            // Update Q-table display
            this.updateQTableDisplay();
            
            // If episode ended, start a new one after delay
            if (episodeEnd) {
                this.totalSteps += this.stepsInEpisode;
                this.totalEpisodes++;
                
                // Decay exploration rate
                agent.decayExploration();
                
                // Update statistics
                this.updateStatistics();
                
                setTimeout(() => {
                    this.startNewEpisode();
                    this.isRunning = false;
                    
                    // Continue auto-play if enabled
                    if (this.autoPlay) {
                        this.step();
                    }
                }, 1500);
            } else {
                this.isRunning = false;
                
                // Continue auto-play if enabled
                if (this.autoPlay) {
                    setTimeout(() => this.step(), 500);
                }
            }
        },
        
        // Start a new episode
        startNewEpisode: function() {
            // Reset agent position
            agent.reset();
            this.updateAgentPosition();
            
            // Reset episode counter
            this.stepsInEpisode = 0;
            this.currentEpisode++;
            
            // Clear episode logs
            this.episodeLog = [];
            this.qUpdateLog = [];
            
            // Update UI
            document.getElementById('episode-counter').textContent = this.currentEpisode;
            document.getElementById('episode-log').innerHTML = '<div class="text-gray-500 italic">New episode started...</div>';
            document.getElementById('q-learning-steps').innerHTML = '<div class="text-gray-500 italic">Q-updates will appear here...</div>';
            
            // Hide outcome screens
            document.getElementById('win-screen').classList.add('hidden');
            document.getElementById('fall-screen').classList.add('hidden');
            
            // Remove any agent animations
            const agentElement = document.getElementById('agent-element');
            agentElement.querySelector('.agent').classList.remove('winning-animation', 'falling-animation');
        },
        
        // Reset simulation
        reset: function() {
            // Stop auto-play if running
            this.autoPlay = false;
            document.getElementById('toggle-auto-btn').innerHTML = '<i class="fas fa-play mr-2"></i> Auto-Play';
            document.getElementById('toggle-auto-btn').classList.remove('bg-red-500', 'hover:bg-red-600');
            document.getElementById('toggle-auto-btn').classList.add('bg-primary', 'hover:bg-primary/90');
            
            // Reset parameters from UI
            this.updateAgentParameters();
            
            // Reset agent and Q-table
            agent.qTable = Array(GRID_SIZE * GRID_SIZE).fill().map(() => Array(ACTIONS.length).fill(0));
            agent.reset();
            
            // Reset simulation state
            this.currentEpisode = 0;
            this.totalEpisodes = 0;
            this.stepsInEpisode = 0;
            this.successfulEpisodes = 0;
            this.totalSteps = 0;
            this.totalUpdates = 0;
            this.previousQValues = new Map();
            
            // Update UI
            this.updateAgentPosition();
            this.updateQTableDisplay();
            this.updateStatistics();
            
            // Start fresh episode
            this.startNewEpisode();
        },
        
        // Toggle auto-play
        toggleAutoPlay: function() {
            this.autoPlay = !this.autoPlay;
            const autoBtn = document.getElementById('toggle-auto-btn');
            
            if (this.autoPlay) {
                autoBtn.innerHTML = '<i class="fas fa-pause mr-2"></i> Pause';
                autoBtn.classList.remove('bg-primary', 'hover:bg-primary/90');
                autoBtn.classList.add('bg-red-500', 'hover:bg-red-600');
                
                // Start stepping if not already running
                if (!this.isRunning) {
                    this.step();
                }
            } else {
                autoBtn.innerHTML = '<i class="fas fa-play mr-2"></i> Auto-Play';
                autoBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
                autoBtn.classList.add('bg-primary', 'hover:bg-primary/90');
            }
        },
        
        // Log action for display
        logAction: function(action, stateIndex) {
            const pos = environment.getPositionFromIndex(stateIndex);
            const logElement = document.getElementById('episode-log');
            
            // Format exploration vs exploitation
            const isExploring = Math.random() < agent.explorationRate;
            const decisionType = isExploring ? 
                '<span class="text-blue-500 font-semibold">Exploring</span>' : 
                '<span class="text-green-500 font-semibold">Exploiting</span>';
            
            const logEntry = `
                <div class="mb-3 pb-2 border-b border-gray-200">
                    <div class="flex items-center">
                        <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2 text-xs text-primary font-bold">
                            ${this.stepsInEpisode}
                        </div>
                        <div class="flex-1">
                            <div class="font-medium">Decision: ${decisionType}</div>
                            <div class="text-xs mt-1">State: (${pos.x},${pos.y}) → Action: <span class="font-semibold text-primary">${action.toUpperCase()}</span></div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add to log (prepend)
            if (this.episodeLog.length === 0) {
                logElement.innerHTML = logEntry;
            } else {
                logElement.innerHTML = logEntry + logElement.innerHTML;
            }
            
            this.episodeLog.push({ step: this.stepsInEpisode, state: stateIndex, action });
        },
        
        // Log Q-value update
        logQUpdate: function(stateIndex, action, reward, newStateIndex, updateResult) {
            const qLearningStepsElement = document.getElementById('q-learning-steps');
            const qUpdateFormulaElement = document.getElementById('q-update-formula');
            
            // Format the update in pseudocode
            const logEntry = `
                <div class="mb-3 pb-2 border-b border-gray-200">
                    <div class="flex items-start">
                        <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2 text-xs text-primary font-bold mt-1">
                            ${this.stepsInEpisode}
                        </div>
                        <div>
                            <div class="font-medium">Q-Value Update:</div>
                            <div class="font-mono text-xs overflow-x-auto whitespace-nowrap mt-1 bg-gray-100 p-1 rounded">
                                Q(s=${stateIndex},a=${action}) ← ${updateResult.oldQValue.toFixed(3)} + ${agent.learningRate} * [${reward} + ${agent.discountFactor} * ${updateResult.nextMaxQValue.toFixed(3)} - ${updateResult.oldQValue.toFixed(3)}]
                            </div>
                            <div class="font-mono text-xs mt-1 bg-primary/10 p-1 rounded">
                                = ${updateResult.oldQValue.toFixed(3)} + ${agent.learningRate} * ${updateResult.tdError.toFixed(3)} = <span class="font-bold text-primary">${updateResult.newQValue.toFixed(3)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Show formula in Q-update element
            qUpdateFormulaElement.innerHTML = `
                <div class="font-mono text-xs overflow-x-auto whitespace-nowrap">
                    Q(s=${stateIndex},a=${action}) ← ${updateResult.oldQValue.toFixed(3)} + ${agent.learningRate} * [${reward} + ${agent.discountFactor} * ${updateResult.nextMaxQValue.toFixed(3)} - ${updateResult.oldQValue.toFixed(3)}] = <span class="font-bold text-primary">${updateResult.newQValue.toFixed(3)}</span>
                </div>
            `;
            
            // Add to log (prepend)
            if (this.qUpdateLog.length === 0) {
                qLearningStepsElement.innerHTML = logEntry;
            } else {
                qLearningStepsElement.innerHTML = logEntry + qLearningStepsElement.innerHTML;
            }
            
            this.qUpdateLog.push({
                step: this.stepsInEpisode,
                stateIndex,
                action,
                reward,
                newStateIndex,
                ...updateResult
            });
        },
        
        // Show win screen
        showWinScreen: function() {
            document.getElementById('win-screen').classList.remove('hidden');
            
            // Add success animation to agent
            const agentElement = document.getElementById('agent-element');
            agentElement.querySelector('.agent').classList.add('winning-animation');
        },
        
        // Show fall screen
        showFallScreen: function() {
            document.getElementById('fall-screen').classList.remove('hidden');
            
            // Add falling animation to agent
            const agentElement = document.getElementById('agent-element');
            agentElement.querySelector('.agent').classList.add('falling-animation');
        },
        
        // Update agent parameters from UI
        updateAgentParameters: function() {
            agent.learningRate = parseFloat(document.getElementById('learning-rate').value);
            agent.discountFactor = parseFloat(document.getElementById('discount-factor').value);
            agent.explorationRate = parseFloat(document.getElementById('exploration-rate').value);
            agent.explorationDecay = parseFloat(document.getElementById('exploration-decay').value);
            
            // Update display values
            document.getElementById('learning-rate-value').textContent = agent.learningRate.toFixed(1);
            document.getElementById('discount-factor-value').textContent = agent.discountFactor.toFixed(2);
            document.getElementById('exploration-rate-value').textContent = agent.explorationRate.toFixed(2);
            document.getElementById('exploration-decay-value').textContent = agent.explorationDecay.toFixed(3);
        },
        
        // Update statistics
        updateStatistics: function() {
            // Game stats
            document.getElementById('stat-episodes').textContent = this.totalEpisodes;
            
            const successRate = this.totalEpisodes > 0 
                ? ((this.successfulEpisodes / this.totalEpisodes) * 100).toFixed(1) + '%'
                : '0%';
            document.getElementById('stat-success-rate').textContent = successRate;
            
            const avgSteps = this.totalEpisodes > 0
                ? (this.totalSteps / this.totalEpisodes).toFixed(1)
                : '0';
            document.getElementById('stat-avg-steps').textContent = avgSteps;
            
            document.getElementById('stat-current-epsilon').textContent = agent.explorationRate.toFixed(2);
            
            // Q-table visualization metrics
            const metricAvgSteps = document.getElementById('metric-avg-steps');
            const metricSuccessRate = document.getElementById('metric-success-rate');
            const metricCurrentEpsilon = document.getElementById('metric-current-epsilon');
            const metricTotalUpdates = document.getElementById('metric-total-updates');
            
            if (metricAvgSteps) metricAvgSteps.textContent = avgSteps;
            if (metricSuccessRate) metricSuccessRate.textContent = successRate;
            if (metricCurrentEpsilon) metricCurrentEpsilon.textContent = agent.explorationRate.toFixed(2);
            if (metricTotalUpdates) metricTotalUpdates.textContent = this.totalUpdates;
        },
        
        // Bind UI controls
        bindUIControls: function() {
            // Manual control buttons
            document.getElementById('move-up-btn').addEventListener('click', () => {
                if (!this.isRunning) this.moveAgent('up');
            });
            document.getElementById('move-right-btn').addEventListener('click', () => {
                if (!this.isRunning) this.moveAgent('right');
            });
            document.getElementById('move-down-btn').addEventListener('click', () => {
                if (!this.isRunning) this.moveAgent('down');
            });
            document.getElementById('move-left-btn').addEventListener('click', () => {
                if (!this.isRunning) this.moveAgent('left');
            });
            
            // Reset button
            document.getElementById('reset-simulation-btn').addEventListener('click', () => {
                this.reset();
            });
            
            // Auto-play toggle
            document.getElementById('toggle-auto-btn').addEventListener('click', () => {
                this.toggleAutoPlay();
            });
            
            // Parameter sliders
            const parameterInputs = [
                'learning-rate', 
                'discount-factor',
                'exploration-rate',
                'exploration-decay'
            ];
            
            parameterInputs.forEach(id => {
                const input = document.getElementById(id);
                const valueElement = document.getElementById(`${id}-value`);
                
                input.addEventListener('input', () => {
                    // Update displayed value
                    const value = parseFloat(input.value);
                    
                    // Format based on parameter type
                    if (id === 'learning-rate') {
                        valueElement.textContent = value.toFixed(1);
                    } else if (id === 'exploration-decay') {
                        valueElement.textContent = value.toFixed(3);
                    } else {
                        valueElement.textContent = value.toFixed(2);
                    }
                    
                    // Update agent parameters
                    this.updateAgentParameters();
                });
            });
            
            // State selector for Q-values
            document.getElementById('state-selector').addEventListener('change', (e) => {
                const stateIndex = parseInt(e.target.value);
                this.showStateQValues(stateIndex);
            });
            
            // Q-value display toggle
            const toggleQValuesBtn = document.getElementById('toggle-q-values-btn');
            if (toggleQValuesBtn) {
                toggleQValuesBtn.addEventListener('click', () => {
                    this.showQValues = !this.showQValues;
                    this.updateQValuesDisplay();
                });
            }
            
            // Best path toggle
            const toggleBestPathBtn = document.getElementById('toggle-best-path-btn');
            if (toggleBestPathBtn) {
                toggleBestPathBtn.addEventListener('click', () => {
                    this.showBestPath();
                });
            }
            
            // Full/Compact Q-table view toggle buttons
            const showFullQTableBtn = document.getElementById('show-full-qtable-btn');
            const showCompactQTableBtn = document.getElementById('show-compact-qtable-btn');
            
            if (showFullQTableBtn && showCompactQTableBtn) {
                showFullQTableBtn.addEventListener('click', () => {
                    document.querySelector('.q-table-wrapper').style.maxHeight = '600px';
                    showFullQTableBtn.classList.add('bg-primary/10', 'text-primary');
                    showFullQTableBtn.classList.remove('bg-gray-100', 'text-gray-700');
                    showCompactQTableBtn.classList.remove('bg-primary/10', 'text-primary');
                    showCompactQTableBtn.classList.add('bg-gray-100', 'text-gray-700');
                });
                
                showCompactQTableBtn.addEventListener('click', () => {
                    document.querySelector('.q-table-wrapper').style.maxHeight = '300px';
                    showCompactQTableBtn.classList.add('bg-primary/10', 'text-primary');
                    showCompactQTableBtn.classList.remove('bg-gray-100', 'text-gray-700');
                    showFullQTableBtn.classList.remove('bg-primary/10', 'text-primary');
                    showFullQTableBtn.classList.add('bg-gray-100', 'text-gray-700');
                });
            }
            
            // Keyboard controls
            document.addEventListener('keydown', (e) => {
                if (this.isRunning) return;
                
                switch (e.key) {
                    case 'ArrowUp':
                        this.moveAgent('up');
                        e.preventDefault();
                        break;
                    case 'ArrowRight':
                        this.moveAgent('right');
                        e.preventDefault();
                        break;
                    case 'ArrowDown':
                        this.moveAgent('down');
                        e.preventDefault();
                        break;
                    case 'ArrowLeft':
                        this.moveAgent('left');
                        e.preventDefault();
                        break;
                    case ' ': // Spacebar for step
                        this.step();
                        e.preventDefault();
                        break;
                }
            });
        },
        
        // Manual agent movement
        moveAgent: function(action) {
            // Set the action instead of using epsilon-greedy
            this.isRunning = true;
            
            // Get current state
            const currentStateIndex = environment.getStateIndex(agent.position.x, agent.position.y);
            const actionIndex = ACTIONS.indexOf(action);
            
            // Log the action
            this.logAction(action, currentStateIndex);
            
            // Calculate new position
            const delta = ACTION_DELTAS[action];
            const newX = agent.position.x + delta.x;
            const newY = agent.position.y + delta.y;
            
            // Default reward for moving
            let reward = REWARDS.move;
            let newStateIndex = currentStateIndex;
            let episodeEnd = false;
            
            // Check if move is valid
            if (environment.isValidPosition(newX, newY)) {
                // Update agent position
                agent.position.x = newX;
                agent.position.y = newY;
                this.updateAgentPosition();
                
                // Calculate new state index
                newStateIndex = environment.getStateIndex(newX, newY);
                
                // Check for special cells
                if (environment.isHole(newX, newY)) {
                    reward = REWARDS.hole;
                    episodeEnd = true;
                    this.showFallScreen();
                } else if (environment.isGoal(newX, newY)) {
                    reward = REWARDS.goal;
                    episodeEnd = true;
                    this.successfulEpisodes++;
                    this.showWinScreen();
                }
            } else {
                // Invalid move (hitting boundary)
                reward = REWARDS.invalid;
                // State doesn't change
            }
            
            // Update Q-value
            const updateResult = agent.updateQValue(currentStateIndex, actionIndex, reward, newStateIndex);
            this.totalUpdates++;
            
            // Log Q-value update
            this.logQUpdate(currentStateIndex, action, reward, newStateIndex, updateResult);
            
            // Update Q-table display
            this.updateQTableDisplay();
            
            // If episode ended, start a new one after delay
            if (episodeEnd) {
                this.totalSteps += this.stepsInEpisode;
                this.totalEpisodes++;
                
                // Decay exploration rate
                agent.decayExploration();
                
                // Update statistics
                this.updateStatistics();
                
                setTimeout(() => {
                    this.startNewEpisode();
                    this.isRunning = false;
                }, 1500);
            } else {
                this.isRunning = false;
            }
        },
        
        // Display Q-values for a selected state
        showStateQValues: function(stateIndex) {
            if (!stateIndex) {
                document.getElementById('state-q-values').innerHTML = 
                    '<div class="text-gray-500 italic text-center py-10 flex flex-col items-center"><i class="fas fa-hand-pointer text-2xl mb-3 text-primary opacity-50"></i>Select a state to view its Q-values</div>';
                return;
            }
            
            const pos = environment.getPositionFromIndex(stateIndex);
            const qValues = agent.qTable[stateIndex];
            const maxQValue = Math.max(...qValues);
            
            let cellType = 'Safe';
            if (environment.isGoal(pos.x, pos.y)) cellType = 'Goal';
            if (environment.isHole(pos.x, pos.y)) cellType = 'Hole';
            if (pos.x === environment.startPosition.x && pos.y === environment.startPosition.y) cellType = 'Start';
            
            let html = `
                <h4 class="font-semibold mb-4 flex items-center">
                    <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                        <i class="fas fa-map-marker-alt text-primary"></i>
                    </div>
                    <span>State (${pos.x},${pos.y}) - ${cellType}</span>
                </h4>
                <div class="grid grid-cols-3 gap-3 mb-4">
                    <div></div>
                    <div class="bg-white p-3 rounded-lg text-center shadow-sm border border-gray-100 ${qValues[0] === maxQValue && maxQValue !== 0 ? 'bg-primary/10 font-semibold' : ''}">
                        <div class="text-xs text-gray-500">Up</div>
                        <div>${qValues[0].toFixed(3)}</div>
                    </div>
                    <div></div>
                    
                    <div class="bg-white p-3 rounded-lg text-center shadow-sm border border-gray-100 ${qValues[3] === maxQValue && maxQValue !== 0 ? 'bg-primary/10 font-semibold' : ''}">
                        <div class="text-xs text-gray-500">Left</div>
                        <div>${qValues[3].toFixed(3)}</div>
                    </div>
                    <div class="bg-white p-3 rounded-lg text-center shadow-sm border border-gray-100">
                        <div class="text-xs text-gray-500">State</div>
                        <div class="font-semibold">${stateIndex}</div>
                    </div>
                    <div class="bg-white p-3 rounded-lg text-center shadow-sm border border-gray-100 ${qValues[1] === maxQValue && maxQValue !== 0 ? 'bg-primary/10 font-semibold' : ''}">
                        <div class="text-xs text-gray-500">Right</div>
                        <div>${qValues[1].toFixed(3)}</div>
                    </div>
                    
                    <div></div>
                    <div class="bg-white p-3 rounded-lg text-center shadow-sm border border-gray-100 ${qValues[2] === maxQValue && maxQValue !== 0 ? 'bg-primary/10 font-semibold' : ''}">
                        <div class="text-xs text-gray-500">Down</div>
                        <div>${qValues[2].toFixed(3)}</div>
                    </div>
                    <div></div>
                </div>
            `;
            
            // Add explanation
            html += `
                <div class="text-sm text-gray-700 clean-box">
                    <p class="mb-2">The Q-values represent the expected future rewards for taking each action from this state.</p>
                    <p>The highest Q-value (${maxQValue.toFixed(3)}) suggests the best action to take.</p>
                </div>
            `;
            
            document.getElementById('state-q-values').innerHTML = html;
        },
        
        // Update Q-values overlay on grid
        updateQValuesDisplay: function() {
            const qTableGridContainer = document.getElementById('q-table-grid-container');
            const cells = qTableGridContainer.querySelectorAll('.grid-cell');
            
            // Remove existing overlays
            qTableGridContainer.querySelectorAll('.q-value-overlay').forEach(overlay => overlay.remove());
            
            if (this.showQValues) {
                // Add q-value overlays to cells
                cells.forEach(cell => {
                    const x = parseInt(cell.getAttribute('data-x'));
                    const y = parseInt(cell.getAttribute('data-y'));
                    const stateIndex = environment.getStateIndex(x, y);
                    
                    const overlay = document.createElement('div');
                    overlay.classList.add('q-value-overlay', 'absolute', 'inset-0', 'bg-black/60', 'text-white', 'text-xs', 'p-1', 'grid', 'grid-cols-3', 'grid-rows-3');
                    
                    // Create divs for directional Q-values
                    const qValues = agent.qTable[stateIndex];
                    const maxQValue = Math.max(...qValues);
                    
                    overlay.innerHTML = `
                        <div></div>
                        <div class="flex justify-center items-center ${qValues[0] === maxQValue && maxQValue !== 0 ? 'font-bold text-primary' : ''}">${qValues[0].toFixed(2)}</div>
                        <div></div>
                        <div class="flex justify-center items-center ${qValues[3] === maxQValue && maxQValue !== 0 ? 'font-bold text-primary' : ''}">${qValues[3].toFixed(2)}</div>
                        <div class="flex justify-center items-center text-[0.6rem] text-gray-300">(${x},${y})</div>
                        <div class="flex justify-center items-center ${qValues[1] === maxQValue && maxQValue !== 0 ? 'font-bold text-primary' : ''}">${qValues[1].toFixed(2)}</div>
                        <div></div>
                        <div class="flex justify-center items-center ${qValues[2] === maxQValue && maxQValue !== 0 ? 'font-bold text-primary' : ''}">${qValues[2].toFixed(2)}</div>
                        <div></div>
                    `;
                    
                    cell.appendChild(overlay);
                });
                
                // Update button text
                document.getElementById('toggle-q-values-btn').innerHTML = '<i class="fas fa-eye-slash mr-2"></i> Hide Q-Values';
            } else {
                // Update button text
                document.getElementById('toggle-q-values-btn').innerHTML = '<i class="fas fa-eye mr-2"></i> Toggle Q-Values';
            }
        },
        
        // Show best path based on current Q-values
        showBestPath: function() {
            const qTableGridContainer = document.getElementById('q-table-grid-container');
            
            // Remove existing path markers
            qTableGridContainer.querySelectorAll('.best-path-marker').forEach(marker => marker.remove());
            
            // Start from initial position
            let currentPos = {...environment.startPosition};
            const visited = new Set();
            let pathFound = false;
            const maxIterations = GRID_SIZE * GRID_SIZE;
            let iterations = 0;
            
            while (!environment.isGoal(currentPos.x, currentPos.y) && iterations < maxIterations) {
                iterations++;
                const stateIndex = environment.getStateIndex(currentPos.x, currentPos.y);
                
                // Mark as visited
                visited.add(`${currentPos.x},${currentPos.y}`);
                
                // Find best action
                const qValues = agent.qTable[stateIndex];
                const maxQValue = Math.max(...qValues);
                const bestActionIndex = qValues.indexOf(maxQValue);
                const bestAction = ACTIONS[bestActionIndex];
                
                // Calculate next position
                const delta = ACTION_DELTAS[bestAction];
                const nextX = currentPos.x + delta.x;
                const nextY = currentPos.y + delta.y;
                
                // Add direction arrow
                const cell = qTableGridContainer.querySelector(`.grid-cell[data-x="${currentPos.x}"][data-y="${currentPos.y}"]`);
                
                if (cell) {
                    // Clear any existing markers in this cell
                    cell.querySelectorAll('.best-path-marker').forEach(marker => marker.remove());
                    
                    const marker = document.createElement('div');
                    marker.classList.add('best-path-marker', 'absolute', 'inset-0', 'flex', 'items-center', 'justify-center', 'pointer-events-none');
                    
                    let arrowIcon = '';
                    switch(bestAction) {
                        case 'up': arrowIcon = '↑'; break;
                        case 'right': arrowIcon = '→'; break;
                        case 'down': arrowIcon = '↓'; break;
                        case 'left': arrowIcon = '←'; break;
                    }
                    
                    marker.innerHTML = `
                        <div class="w-8 h-8 rounded-full bg-primary/70 border-2 border-primary flex items-center justify-center text-xl font-bold text-white shadow-md">
                            ${arrowIcon}
                        </div>
                    `;
                    
                    cell.appendChild(marker);
                }
                
                // Check if we've found the goal
                if (environment.isGoal(nextX, nextY)) {
                    pathFound = true;
                    break;
                }
                
                // Check if next position is valid
                if (!environment.isValidPosition(nextX, nextY) || 
                    environment.isHole(nextX, nextY) || 
                    visited.has(`${nextX},${nextY}`)) {
                    // Path leads to invalid state or cycle detected
                    break;
                }
                
                // Move to next position
                currentPos.x = nextX;
                currentPos.y = nextY;
            }
            
            // Show success or failure message
            const finalAnalysis = document.getElementById('final-analysis');
            if (finalAnalysis) {
                if (pathFound) {
                    finalAnalysis.innerHTML = `
                        <div class="flex items-start">
                            <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-3 flex-shrink-0">
                                <i class="fas fa-check text-green-500"></i>
                            </div>
                            <div>
                                <p class="text-green-600 font-semibold mb-2">Optimal Path Found!</p>
                                <p class="text-gray-700">The agent has successfully learned a path from start to goal position without falling into holes.</p>
                                <p class="mt-2 text-gray-700">This demonstrates how Q-learning converges to an optimal policy after sufficient exploration.</p>
                            </div>
                        </div>
                    `;
                } else {
                    finalAnalysis.innerHTML = `
                        <div class="flex items-start">
                            <div class="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center mr-3 flex-shrink-0">
                                <i class="fas fa-exclamation-triangle text-yellow-500"></i>
                            </div>
                            <div>
                                <p class="text-yellow-600 font-semibold mb-2">No Complete Path Found Yet</p>
                                <p class="text-gray-700">The agent has not yet learned a complete path from start to goal. More training episodes are needed.</p>
                                <p class="mt-2 text-gray-700">This is normal in early stages of learning, when the agent is still exploring the environment.</p>
                            </div>
                        </div>
                    `;
                }
            }
            
            // Update button text
            document.getElementById('toggle-best-path-btn').innerHTML = '<i class="fas fa-sync-alt mr-2"></i> Refresh Path';
        }
    };
    
    // Initialize simulation
    simulation.init();
    
    // Start with Home section active by default
    activateSection('home');
});