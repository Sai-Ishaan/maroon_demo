/* ===================================================================
   MAROONED - Exact Training Output Simulation
   Matches screenshots with all game elements
   =================================================================== */

class MaroonedSimulation {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentLevel = 'ground';
        this.isPlaying = false;
        this.speed = 1;
        this.currentTurn = 0;
        this.currentDay = 1;
        this.shipProgress = 0;
        this.animationFrame = null;
        this.lastFrameTime = 0;
        
        // Seed for consistency
        this.seed = Date.now();
        
        // Agent setup (matches screenshots: Alice, Bob, Charlie, Diana, Eve)
        this.agentNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
        this.traitorIndex = this.seededRandom(0, this.agentNames.length);
        this.traitorName = this.agentNames[this.traitorIndex];
        
        this.agents = {};
        this.particles = [];
        
        // Map sizes (exact from training)
        this.maps = {
            ground: { width: 30, height: 30 },
            mountain: { width: 10, height: 10 },
            cave: { width: 15, height: 15 }
        };
        
        // Game state tracking
        this.basePosition = { x: 15, y: 15 }; // Base camp location
        this.resourceLocations = {};
        this.commonInventory = { wood: 0, metal: 0, fiber: 0, food: 0, antidote: 0 };
        this.shipComponents = { hull: 0, mast: 0, sail: 0, rudder: 0, supplies: 0 };
        
        // Voting system
        this.votingActive = false;
        this.votingDialogue = [];
        
        // Action types (exact from training)
        this.actionTypes = [
            'move_north', 'move_south', 'move_east', 'move_west',
            'move_northeast', 'move_northwest', 'move_southeast', 'move_southwest',
            'gather_resource', 'deposit_resource', 'build_component',
            'eat_food', 'climb_stairs', 'send_message',
            'call_vote', 'vote', 'sabotage', 'poison_food', 'frame_sailor', 'wait'
        ];
        
        this.init();
    }
    
    seededRandom(min, max) {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return Math.floor(min + (this.seed / 233280) * (max - min));
    }
    
    async init() {
        this.setupEventListeners();
        this.initializeAgents();
        this.generateExactMap();
        this.trainingSequence = this.generateRealisticSequence();
        
        this.addMessage('system', 'System', `🎭 Traitor: ${this.traitorName}`, '🎲');
        this.addMessage('system', 'System', `🗺️ Island map generated with ${Object.keys(this.resourceLocations).length} resource clusters`, '🗺️');
        this.addMessage('system', 'System', `Total turns: ${this.trainingSequence.length}. Press play to start.`, '🎮');
        
        this.updateAgentRolesUI();
        this.startRenderLoop();
    }
    
    initializeAgents() {
        const colors = ['#667eea', '#4facfe', '#43e97b', '#fa709a', '#f5576c'];
        
        this.agentNames.forEach((name, index) => {
            const isTraitor = (index === this.traitorIndex);
            const id = name.toLowerCase();
            
            this.agents[id] = {
                name: name,
                id: id,
                role: isTraitor ? 'traitor' : 'honest',
                x: this.basePosition.x,
                y: this.basePosition.y,
                targetX: this.basePosition.x,
                targetY: this.basePosition.y,
                level: 'ground',
                energy: 100,
                health: 100,
                color: colors[index],
                backpack: { wood: 0, metal: 0, food: 0, berries: 0, fiber: 0, poison: 0, antidote: 0 },
                isPoisoned: false,
                suspicionLevel: 0,
                animating: false,
                currentActivity: 'idle',
                activityProgress: 0,
                alive: true
            };
        });
    }
    
    // ===================================================================
    // EXACT MAP GENERATION (Matching Screenshots)
    // ===================================================================
    
    generateExactMap() {
        const level = this.currentLevel;
        const map = this.maps[level];
        this.terrain = [];
        this.resourceLocations = {
            wood: [], food: [], metal: [], berries: [], 
            antidote: [], poison: [], fiber: []
        };
        
        // Initialize empty land
        for (let y = 0; y < map.height; y++) {
            const row = [];
            for (let x = 0; x < map.width; x++) {
                row.push({ type: 'land', resource: null, emoji: '🟫' });
            }
            this.terrain.push(row);
        }
        
        if (level === 'ground') {
            this.generateGroundLevel();
        } else if (level === 'cave') {
            this.generateCaveLevel();
        } else if (level === 'mountain') {
            this.generateMountainLevel();
        }
    }
    
    generateGroundLevel() {
        const map = this.maps.ground;
        
        // Base camp (center)
        this.terrain[15][15] = { type: 'base', resource: null, emoji: '🏠' };
        
        // Stairs (exact positions from screenshot)
        this.terrain[1][8] = { type: 'stairs_down', resource: null, emoji: '⬇️' };
        this.terrain[0][1] = { type: 'stairs_up', resource: null, emoji: '⬆️' };
        
        // Water clusters (from screenshot patterns)
        const waterClusters = [
            { cx: 7, cy: 2, size: 8 },
            { cx: 20, cy: 8, size: 6 },
            { cx: 5, cy: 18, size: 5 }
        ];
        waterClusters.forEach(cluster => {
            for (let i = 0; i < cluster.size; i++) {
                const x = cluster.cx + this.seededRandom(-2, 3);
                const y = cluster.cy + this.seededRandom(-2, 3);
                if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
                    this.terrain[y][x] = { type: 'water', resource: null, emoji: '🌊' };
                }
            }
        });
        
        // Trees (scattered)
        for (let i = 0; i < 25; i++) {
            const x = this.seededRandom(0, map.width);
            const y = this.seededRandom(0, map.height);
            if (this.terrain[y][x].type === 'land') {
                this.terrain[y][x] = { type: 'tree', resource: null, emoji: '🌲' };
            }
        }
        
        // Rocks (scattered)
        for (let i = 0; i < 20; i++) {
            const x = this.seededRandom(0, map.width);
            const y = this.seededRandom(0, map.height);
            if (this.terrain[y][x].type === 'land') {
                this.terrain[y][x] = { type: 'rock', resource: null, emoji: '🪨' };
            }
        }
        
        // Resources (clustered like training)
        this.placeResourceCluster('wood', 20, '🪵');
        this.placeResourceCluster('food', 25, '🍎');
        this.placeResourceCluster('metal', 15, '⚙️');
        this.placeResourceCluster('berries', 12, '🫐');
        this.placeResourceCluster('fiber', 10, '🌾');
        
        // Poison tablets (sparse, dangerous)
        for (let i = 0; i < 8; i++) {
            const x = this.seededRandom(0, map.width);
            const y = this.seededRandom(0, map.height);
            if (this.terrain[y][x].type === 'land' && !this.terrain[y][x].resource) {
                this.terrain[y][x].resource = 'poison';
                this.terrain[y][x].emoji = '☠️';
                this.resourceLocations.poison.push({ x, y });
            }
        }
        
        // Antidote (rare)
        for (let i = 0; i < 3; i++) {
            const x = this.seededRandom(0, map.width);
            const y = this.seededRandom(0, map.height);
            if (this.terrain[y][x].type === 'land' && !this.terrain[y][x].resource) {
                this.terrain[y][x].resource = 'antidote';
                this.terrain[y][x].emoji = '💊';
                this.resourceLocations.antidote.push({ x, y });
            }
        }
    }
    
    generateCaveLevel() {
        const map = this.maps.cave;
        
        // Stairs up (entrance)
        this.terrain[0][0] = { type: 'stairs_up', resource: null, emoji: '⬆️' };
        
        // Cave walls (rocky terrain)
        for (let i = 0; i < 15; i++) {
            const x = this.seededRandom(0, map.width);
            const y = this.seededRandom(0, map.height);
            if (this.terrain[y][x].type === 'land') {
                this.terrain[y][x] = { type: 'rock', resource: null, emoji: '🪨' };
            }
        }
        
        // Metal rich (caves have more metal)
        this.placeResourceCluster('metal', 20, '⚙️');
        this.placeResourceCluster('wood', 5, '🪵');
        this.placeResourceCluster('poison', 6, '☠️');
    }
    
    generateMountainLevel() {
        const map = this.maps.mountain;
        
        // Stairs down (entrance)
        this.terrain[0][0] = { type: 'stairs_down', resource: null, emoji: '⬇️' };
        
        // Mountain terrain (rocky)
        for (let i = 0; i < 10; i++) {
            const x = this.seededRandom(0, map.width);
            const y = this.seededRandom(0, map.height);
            if (this.terrain[y][x].type === 'land') {
                this.terrain[y][x] = { type: 'rock', resource: null, emoji: '🪨' };
            }
        }
        
        // Antidote herbs (rare, only in mountains)
        this.placeResourceCluster('antidote', 8, '💊');
        this.placeResourceCluster('berries', 6, '🫐');
        this.placeResourceCluster('metal', 5, '⚙️');
    }
    
    placeResourceCluster(resourceType, count, emoji) {
        const map = this.maps[this.currentLevel];
        
        for (let i = 0; i < count; i++) {
            const x = this.seededRandom(0, map.width);
            const y = this.seededRandom(0, map.height);
            
            if (this.terrain[y][x].type === 'land' && !this.terrain[y][x].resource) {
                this.terrain[y][x].resource = resourceType;
                this.terrain[y][x].emoji = emoji;
                this.resourceLocations[resourceType].push({ x, y, level: this.currentLevel });
            }
        }
    }
    
    // ===================================================================
    // REALISTIC ACTION SEQUENCE (Exact Training Logic)
    // ===================================================================
    
    generateRealisticSequence() {
        const sequence = [];
        const agentIds = Object.keys(this.agents);
        const maxTurns = 150;
        
        for (let turn = 0; turn < maxTurns; turn++) {
            const day = Math.floor(turn / 20) + 1;
            
            // Each agent takes a turn
            agentIds.forEach(agentId => {
                const agent = this.agents[agentId];
                if (!agent.alive) return;
                
                const action = this.selectRealisticAction(agent, turn, day);
                if (action) {
                    sequence.push({
                        turn: sequence.length + 1,
                        day: day,
                        agent: agentId,
                        ...action
                    });
                }
            });
            
            // Voting phase every 30 turns
            if (turn > 0 && turn % 30 === 0 && turn < 120) {
                const votingActions = this.generateVotingPhase(day);
                sequence.push(...votingActions);
            }
        }
        
        return sequence;
    }
    
    selectRealisticAction(agent, turn, day) {
        // Diverse action pool (NO GENERIC MOVES)
        const possibleActions = [];
        
        // Movement actions (8 directions)
        if (agent.energy > 10) {
            const directions = [
                { action: 'move_north', dx: 0, dy: -1, msg: 'Moving north' },
                { action: 'move_south', dx: 0, dy: 1, msg: 'Moving south' },
                { action: 'move_east', dx: 1, dy: 0, msg: 'Moving east' },
                { action: 'move_west', dx: -1, dy: 0, msg: 'Moving west' },
                { action: 'move_northeast', dx: 1, dy: -1, msg: 'Moving northeast' },
                { action: 'move_northwest', dx: -1, dy: -1, msg: 'Moving northwest' },
                { action: 'move_southeast', dx: 1, dy: 1, msg: 'Moving southeast' },
                { action: 'move_southwest', dx: -1, dy: 1, msg: 'Moving southwest' }
            ];
            possibleActions.push(...directions.map(d => ({
                type: d.action,
                weight: 3,
                execute: () => ({
                    action: d.action,
                    reasoning: `Exploring area, ${d.msg}`,
                    message: d.msg,
                    energy: -3,
                    reward: -0.01,
                    move: { dx: d.dx, dy: d.dy }
                })
            })));
        }
        
        // Gathering (if near resources)
        const nearbyResource = this.findNearbyResource(agent);
        if (nearbyResource && agent.energy > 5) {
            possibleActions.push({
                type: 'gather_resource',
                weight: 5,
                execute: () => ({
                    action: 'gather_resource',
                    target: nearbyResource.type.toUpperCase(),
                    reasoning: `Found ${nearbyResource.type} nearby, gathering for construction`,
                    message: `Collecting ${nearbyResource.type}!`,
                    energy: -5,
                    reward: 0.2,
                    gather: nearbyResource.type
                })
            });
        }
        
        // Depositing (if has resources and near base)
        const hasResources = Object.values(agent.backpack).some(v => v > 0);
        const atBase = (agent.x === this.basePosition.x && agent.y === this.basePosition.y);
        
        if (hasResources && atBase) {
            possibleActions.push({
                type: 'deposit_resource',
                weight: 8,
                execute: () => {
                    const deposited = this.depositResources(agent);
                    return {
                        action: 'deposit_resource',
                        reasoning: `Depositing ${deposited.join(', ')} to common inventory`,
                        message: 'Adding to our supplies',
                        energy: -2,
                        reward: 0.3
                    };
                }
            });
        }
        
        // Building (if at base and have materials in common inventory)
        if (atBase && (this.commonInventory.wood > 0 || this.commonInventory.metal > 0)) {
            possibleActions.push({
                type: 'build_component',
                weight: 10,
                execute: () => {
                    const component = this.buildShipComponent();
                    return {
                        action: 'build_component',
                        target: component,
                        reasoning: `Working on ${component} for the ship`,
                        message: 'Making progress on the ship!',
                        energy: -4,
                        reward: 0.5,
                        shipProgress: 2
                    };
                }
            });
        }
        
        // Eating (if low energy)
        if (agent.energy < 40 && agent.backpack.food > 0) {
            possibleActions.push({
                type: 'eat_food',
                weight: 7,
                execute: () => {
                    agent.backpack.food--;
                    return {
                        action: 'eat_food',
                        reasoning: 'Energy running low, consuming food',
                        message: 'Restoring energy',
                        energy: 20,
                        reward: -0.1
                    };
                }
            });
        }
        
        // Send message (communication)
        if (this.seededRandom(0, 100) < 15) {
            possibleActions.push({
                type: 'send_message',
                weight: 2,
                execute: () => ({
                    action: 'send_message',
                    reasoning: 'Sharing information with team',
                    message: this.generateDialogue(agent),
                    energy: 0,
                    reward: 0
                })
            });
        }
        
        // TRAITOR-SPECIFIC ACTIONS
        if (agent.role === 'traitor') {
            // Sabotage
            if (atBase && this.shipProgress > 20 && this.seededRandom(0, 100) < 25) {
                possibleActions.push({
                    type: 'sabotage',
                    weight: 15,
                    execute: () => ({
                        action: 'sabotage',
                        reasoning: 'Secretly damaging ship components while alone',
                        message: 'Working on the ship!', // Deceptive
                        energy: -5,
                        reward: 2.0,
                        shipProgress: -30
                    })
                });
            }
            
            // Poison food
            if (agent.backpack.poison > 0 && this.seededRandom(0, 100) < 10) {
                possibleActions.push({
                    type: 'poison_food',
                    weight: 12,
                    execute: () => {
                        const target = this.selectPoisonTarget(agent);
                        return {
                            action: 'poison_food',
                            target: target,
                            reasoning: `Poisoning ${target}'s food supply`,
                            message: 'Preparing food for everyone',
                            energy: -3,
                            reward: 10.0
                        };
                    }
                });
            }
            
            // Frame innocent
            if (this.seededRandom(0, 100) < 5 && turn > 50) {
                possibleActions.push({
                    type: 'frame_sailor',
                    weight: 8,
                    execute: () => {
                        const target = this.selectFrameTarget(agent);
                        return {
                            action: 'frame_sailor',
                            target: target,
                            reasoning: `Planting false evidence against ${target}`,
                            message: `I saw ${target} acting suspiciously...`,
                            energy: -2,
                            reward: 1.5
                        };
                    }
                });
            }
        }
        
        // Wait (fallback)
        possibleActions.push({
            type: 'wait',
            weight: 1,
            execute: () => ({
                action: 'wait',
                reasoning: 'Observing surroundings',
                message: 'N/A',
                energy: -1,
                reward: -1.0
            })
        });
        
        // Weighted random selection
        const totalWeight = possibleActions.reduce((sum, a) => sum + a.weight, 0);
        let random = this.seededRandom(0, totalWeight * 100) / 100;
        
        for (const action of possibleActions) {
            random -= action.weight;
            if (random <= 0) {
                return action.execute();
            }
        }
        
        return possibleActions[possibleActions.length - 1].execute();
    }
    
    findNearbyResource(agent) {
        const searchRadius = 3;
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const x = agent.x + dx;
                const y = agent.y + dy;
                const map = this.maps[this.currentLevel];
                
                if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
                    const tile = this.terrain[y][x];
                    if (tile.resource && ['wood', 'metal', 'food', 'berries', 'fiber'].includes(tile.resource)) {
                        return { x, y, type: tile.resource };
                    }
                }
            }
        }
        return null;
    }
    
    depositResources(agent) {
        const deposited = [];
        Object.keys(agent.backpack).forEach(resource => {
            if (agent.backpack[resource] > 0) {
                this.commonInventory[resource] = (this.commonInventory[resource] || 0) + agent.backpack[resource];
                deposited.push(resource);
                agent.backpack[resource] = 0;
            }
        });
        return deposited;
    }
    
    buildShipComponent() {
        const components = ['hull', 'mast', 'sail', 'rudder', 'supplies'];
        const available = components.filter(c => (this.shipComponents[c] || 0) < 100);
        if (available.length === 0) return 'hull';
        
        const component = available[this.seededRandom(0, available.length)];
        this.shipComponents[component] = (this.shipComponents[component] || 0) + 10;
        
        // Consume resources
        this.commonInventory.wood = Math.max(0, this.commonInventory.wood - 1);
        this.commonInventory.metal = Math.max(0, this.commonInventory.metal - 1);
        
        return component;
    }
    
    selectPoisonTarget(agent) {
        const others = Object.values(this.agents).filter(a => a.id !== agent.id && a.alive);
        if (others.length === 0) return 'unknown';
        return others[this.seededRandom(0, others.length)].name;
    }
    
    selectFrameTarget(agent) {
        const others = Object.values(this.agents).filter(a => a.id !== agent.id && a.role === 'honest' && a.alive);
        if (others.length === 0) return 'unknown';
        return others[this.seededRandom(0, others.length)].name;
    }
    
    generateDialogue(agent) {
        const dialogues = [
            `I found ${this.seededRandom(1, 5)} wood near coordinates (${this.seededRandom(10, 20)}, ${this.seededRandom(10, 20)})`,
            `The ship is at ${Math.floor(this.shipProgress)}% completion`,
            `I'm heading to gather more resources`,
            `Anyone need food? I have some to share`,
            `We should focus on building the hull first`,
            `Has anyone seen metal deposits?`,
            `I'll scout the mountain level next`,
            `Let's coordinate our efforts better`
        ];
        
        if (agent.role === 'traitor') {
            const traitorDialogues = [
                `I'm working hard on the ship! (lying)`,
                `I saw someone acting suspiciously...`,
                `We need more resources, I'll gather`,
                `The ship needs repairs (subtle sabotage hint)`
            ];
            dialogues.push(...traitorDialogues);
        }
        
        return dialogues[this.seededRandom(0, dialogues.length)];
    }
    
    // ===================================================================
    // VOTING SYSTEM (Dialogue Box)
    // ===================================================================
    
    generateVotingPhase(day) {
        const votingActions = [];
        const agentIds = Object.keys(this.agents).filter(id => this.agents[id].alive);
        
        // Someone calls a vote
        const caller = agentIds[this.seededRandom(0, agentIds.length)];
        votingActions.push({
            turn: -1,
            day: day,
            agent: caller,
            action: 'call_vote',
            reasoning: 'Calling emergency meeting to discuss suspicions',
            message: `I'm calling a vote. We need to identify the traitor!`,
            energy: 0,
            reward: 0,
            voting: true
        });
        
        // Each agent discusses (dialogue)
        agentIds.forEach(agentId => {
            const agent = this.agents[agentId];
            const dialogue = this.generateVotingDialogue(agent);
            
            votingActions.push({
                turn: -1,
                day: day,
                agent: agentId,
                action: 'discuss',
                reasoning: 'Sharing suspicions during voting phase',
                message: dialogue,
                energy: 0,
                reward: 0,
                voting: true
            });
        });
        
        // Each agent votes
        agentIds.forEach(agentId => {
            const agent = this.agents[agentId];
            const votedFor = this.selectVoteTarget(agent, agentIds);
            
            votingActions.push({
                turn: -1,
                day: day,
                agent: agentId,
                action: 'vote',
                target: votedFor,
                reasoning: `Voting for ${votedFor} based on suspicions`,
                message: `I vote for ${votedFor}`,
                energy: 0,
                reward: 0,
                voting: true
            });
        });
        
        return votingActions;
    }
    
    generateVotingDialogue(agent) {
        if (agent.role === 'traitor') {
            const traitorDialogues = [
                `I've been working hard! I think it's ${this.selectFrameTarget(agent)}`,
                `I saw someone near the ship when it was damaged`,
                `We should vote carefully, don't want to lose an innocent person`,
                `I'm not the traitor! I've been gathering resources all day`
            ];
            return traitorDialogues[this.seededRandom(0, traitorDialogues.length)];
        } else {
            const honestDialogues = [
                `I'm suspicious of the person who's always alone`,
                `Someone's been lying about their locations`,
                `I found evidence of sabotage near the ship`,
                `We need to analyze who's been contributing least`,
                `I trust ${this.selectRandomAlly(agent)}, they've been helpful`
            ];
            return honestDialogues[this.seededRandom(0, honestDialogues.length)];
        }
    }
    
    selectVoteTarget(agent, agentIds) {
        // Remove self from options
        const others = agentIds.filter(id => id !== agent.id);
        if (others.length === 0) return 'abstain';
        
        // Traitors vote strategically (frame innocents)
        if (agent.role === 'traitor') {
            const innocents = others.filter(id => this.agents[id].role === 'honest');
            if (innocents.length > 0) {
                return this.agents[innocents[this.seededRandom(0, innocents.length)]].name;
            }
        }
        
        // Honest agents vote with some accuracy (60% chance to vote traitor)
        const traitor = agentIds.find(id => this.agents[id].role === 'traitor');
        if (traitor && this.seededRandom(0, 100) < 60) {
            return this.agents[traitor].name;
        }
        
        // Random vote otherwise
        return this.agents[others[this.seededRandom(0, others.length)]].name;
    }
    
    selectRandomAlly(agent) {
        const allies = Object.values(this.agents).filter(a => a.id !== agent.id && a.role === 'honest' && a.alive);
        if (allies.length === 0) return 'no one';
        return allies[this.seededRandom(0, allies.length)].name;
    }
    
        // ===================================================================
    // EVENT HANDLERS & UI CONTROLS
    // ===================================================================
    
    setupEventListeners() {
        // Play/Pause
        document.getElementById('play-pause').addEventListener('click', () => {
            this.togglePlayback();
        });
        
        // Restart
        document.getElementById('restart').addEventListener('click', () => {
            this.restart();
        });
        
        // Speed control
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.speed = parseFloat(e.target.dataset.speed);
            });
        });
        
        // Level selector
        document.querySelectorAll('.level-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentLevel = e.target.dataset.level;
                this.generateExactMap();
            });
        });
        
        // Canvas hover
        this.canvas.addEventListener('mousemove', (e) => {
            this.handleCanvasHover(e);
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            document.getElementById('agent-tooltip').classList.add('hidden');
        });
        
        // Clear messages
        document.getElementById('clear-messages').addEventListener('click', () => {
            const container = document.getElementById('messages-container');
            container.innerHTML = '<div class="message system"><div class="message-icon">🎮</div><div class="message-content"><div class="message-header">System</div><div class="message-text">Messages cleared.</div></div></div>';
        });
        
        // Agent card clicks
        document.querySelectorAll('.agent-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const agentId = card.dataset.agent;
                this.focusOnAgent(agentId);
            });
        });
    }
    
    updateAgentRolesUI() {
        Object.keys(this.agents).forEach(id => {
            const agent = this.agents[id];
            const card = document.querySelector(`.agent-card[data-agent="${id}"]`);
            if (card) {
                const roleSpan = card.querySelector('.agent-role');
                roleSpan.textContent = agent.role === 'traitor' ? 'Traitor' : 'Colonist';
                roleSpan.className = `agent-role ${agent.role === 'traitor' ? 'traitor' : 'colonist'}`;
                
                const energyBar = card.querySelector('.energy-bar');
                if (agent.role === 'traitor') {
                    energyBar.classList.add('traitor-bar');
                } else {
                    energyBar.classList.remove('traitor-bar');
                }
            }
        });
    }
    
    togglePlayback() {
        this.isPlaying = !this.isPlaying;
        
        const playIcon = document.querySelector('.icon-play');
        const pauseIcon = document.querySelector('.icon-pause');
        
        if (this.isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
            this.startSimulation();
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }
    
    startSimulation() {
        if (!this.isPlaying) return;
        
        if (this.currentTurn >= this.trainingSequence.length) {
            this.addMessage('system', 'System', '🏁 Episode complete!', '🏁');
            this.isPlaying = false;
            document.querySelector('.icon-play').classList.remove('hidden');
            document.querySelector('.icon-pause').classList.add('hidden');
            return;
        }
        
        const step = this.trainingSequence[this.currentTurn];
        this.executeStep(step);
        
        // Adjust timing based on action type
        const delay = step.voting ? 2000 : (1500 / this.speed);
        
        setTimeout(() => {
            this.startSimulation();
        }, delay);
    }
    
    executeStep(step) {
        const agent = this.agents[step.agent];
        if (!agent || !agent.alive) return;
        
        this.currentDay = step.day;
        this.currentTurn++;
        document.getElementById('day-counter').textContent = `Day ${this.currentDay}`;
        document.getElementById('turn-counter').textContent = `Turn ${this.currentTurn}`;
        
        // Voting phase (show modal)
        if (step.voting) {
            this.handleVotingAction(step);
            return;
        }
        
        // Set activity animation
        agent.currentActivity = step.action;
        agent.activityProgress = 0;
        agent.animating = true;
        
        // Move agent
        if (step.move) {
            const newX = agent.x + step.move.dx;
            const newY = agent.y + step.move.dy;
            const map = this.maps[this.currentLevel];
            
            agent.targetX = Math.max(0, Math.min(map.width - 1, newX));
            agent.targetY = Math.max(0, Math.min(map.height - 1, newY));
        }
        
        // Gather resource
        if (step.gather) {
            agent.backpack[step.gather] = (agent.backpack[step.gather] || 0) + 1;
            this.createParticles(agent, 'gather', 10);
        }
        
        // Update energy
        agent.energy = Math.max(0, Math.min(100, agent.energy + step.energy));
        
        // Update ship progress
        if (step.shipProgress) {
            this.shipProgress = Math.max(0, Math.min(100, this.shipProgress + step.shipProgress));
            this.updateShipProgress();
            
            if (step.shipProgress > 0) {
                this.createParticles(agent, 'build', 15);
            } else if (step.shipProgress < 0) {
                this.createParticles(agent, 'sabotage', 20);
            }
        }
        
        // Activity-specific particles
        if (step.action === 'eat_food') {
            this.createParticles(agent, 'eat', 8);
        } else if (step.action === 'poison_food') {
            this.createParticles(agent, 'poison', 12);
        }
        
        // Update UI
        this.updateAgentCard(step.agent, agent);
        
        // Add messages (exact format from training)
        const roleLabel = agent.role === 'traitor' ? 'TRAITOR' : agent.role.toUpperCase();
        this.addMessage('action', agent.name, `[${agent.name}] ${step.action} | Reward: ${step.reward || 0}`, '📍');
        
        // Show reasoning as chat message
        if (step.reasoning && step.reasoning !== 'N/A') {
            this.addMessage('dialogue', agent.name, `💭 ${step.reasoning}`, '💭');
        }
        
        // Show dialogue message
        if (step.message && step.message !== 'N/A') {
            this.addMessage('dialogue', agent.name, `💬 ${step.message}`, '💬');
        }
    }
    
    handleVotingAction(step) {
        const agent = this.agents[step.agent];
        
        if (step.action === 'call_vote') {
            this.showVotingModal(step);
        } else if (step.action === 'discuss') {
            this.addVotingDialogue(agent, step.message);
        } else if (step.action === 'vote') {
            this.addVotingDialogue(agent, `Votes for: ${step.target}`);
        }
    }
    
    showVotingModal(step) {
        // Create voting modal overlay
        let modal = document.getElementById('voting-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'voting-modal';
            modal.className = 'voting-modal';
            modal.innerHTML = `
                <div class="voting-content">
                    <div class="voting-header">
                        <h3>🗳️ Emergency Meeting</h3>
                        <p class="voting-subtitle">Discuss and vote to eliminate the traitor</p>
                    </div>
                    <div class="voting-dialogue" id="voting-dialogue">
                        <div class="dialogue-message system">
                            <strong>System:</strong> ${step.message}
                        </div>
                    </div>
                    <button class="close-voting" onclick="window.simulation.closeVotingModal()">Close</button>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        modal.classList.add('active');
        const dialogueContainer = document.getElementById('voting-dialogue');
        dialogueContainer.innerHTML = `
            <div class="dialogue-message system">
                <strong>${this.agents[step.agent].name}:</strong> ${step.message}
            </div>
        `;
        
        this.votingActive = true;
    }
    
    addVotingDialogue(agent, message) {
        const dialogueContainer = document.getElementById('voting-dialogue');
        if (!dialogueContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `dialogue-message ${agent.role}`;
        messageDiv.innerHTML = `<strong>${agent.name}:</strong> ${message}`;
        dialogueContainer.appendChild(messageDiv);
        dialogueContainer.scrollTop = dialogueContainer.scrollHeight;
    }
    
    closeVotingModal() {
        const modal = document.getElementById('voting-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.votingActive = false;
    }
    
    createParticles(agent, type, count) {
        const map = this.maps[this.currentLevel];
        const tileSize = this.canvas.width / map.width;
        const centerX = agent.x * tileSize + tileSize / 2;
        const centerY = agent.y * tileSize + tileSize / 2;
        
        const colors = {
            gather: ['#50fa7b', '#43e97b', '#38f9d7'],
            build: ['#4a9eff', '#667eea', '#8be9fd'],
            sabotage: ['#ff5555', '#f5576c', '#ff79c6'],
            eat: ['#ffb86c', '#fbbf24', '#f1fa8c'],
            poison: ['#ff0000', '#cc0000', '#990000']
        };
        
        const particleColors = colors[type] || colors.gather;
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 2 + Math.random() * 3;
            
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: particleColors[this.seededRandom(0, particleColors.length)],
                life: 1.0,
                size: 3 + Math.random() * 3
            });
        }
    }
    
    updateAgentCard(agentId, agentData) {
        const card = document.querySelector(`.agent-card[data-agent="${agentId}"]`);
        if (card) {
            const energyFill = card.querySelector('.energy-bar .fill');
            const energyText = card.querySelector('.energy-text');
            energyFill.style.width = agentData.energy + '%';
            energyText.textContent = `${Math.floor(agentData.energy)}/100`;
        }
    }
    
    updateShipProgress() {
        const fill = document.getElementById('progress-fill');
        const percentage = document.getElementById('progress-percentage');
        fill.style.width = this.shipProgress + '%';
        percentage.textContent = Math.floor(this.shipProgress) + '%';
    }
    
    addMessage(type, sender, text, icon) {
        const container = document.getElementById('messages-container');
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.innerHTML = `
            <div class="message-icon">${icon}</div>
            <div class="message-content">
                <div class="message-header">${sender}</div>
                <div class="message-text">${text}</div>
            </div>
        `;
        container.appendChild(message);
        container.scrollTop = container.scrollHeight;
        
        // Limit messages
        while (container.children.length > 100) {
            container.removeChild(container.children[1]);
        }
    }
    
    async restart() {
        this.currentTurn = 0;
        this.currentDay = 1;
        this.shipProgress = 0;
        this.isPlaying = false;
        this.particles = [];
        this.commonInventory = { wood: 0, metal: 0, fiber: 0, food: 0, antidote: 0 };
        this.shipComponents = { hull: 0, mast: 0, sail: 0, rudder: 0, supplies: 0 };
        
        // Reassign traitor
        this.seed = Date.now();
        this.traitorIndex = this.seededRandom(0, this.agentNames.length);
        this.traitorName = this.agentNames[this.traitorIndex];
        
        // Reinitialize
        this.initializeAgents();
        this.generateExactMap();
        this.trainingSequence = this.generateRealisticSequence();
        
        // Update UI
        this.updateAgentRolesUI();
        
        document.getElementById('day-counter').textContent = 'Day 1';
        document.getElementById('turn-counter').textContent = 'Turn 1';
        document.querySelector('.icon-play').classList.remove('hidden');
        document.querySelector('.icon-pause').classList.add('hidden');
        this.updateShipProgress();
        
        const container = document.getElementById('messages-container');
        container.innerHTML = '<div class="message system"><div class="message-icon">🎮</div><div class="message-content"><div class="message-header">System</div><div class="message-text">Episode restarted.</div></div></div>';
        
        this.addMessage('system', 'System', `🎭 NEW Traitor: ${this.traitorName}`, '🎲');
        this.addMessage('system', 'System', `🗺️ Map regenerated with resources`, '🗺️');
    }
    
    // ===================================================================
    // ANIMATION LOOP
    // ===================================================================
    
    startRenderLoop() {
        const animate = (timestamp) => {
            const deltaTime = timestamp - this.lastFrameTime;
            this.lastFrameTime = timestamp;
            
            this.update(deltaTime);
            this.render();
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }
    
    update(deltaTime) {
        // Update agent positions (smooth movement)
        Object.values(this.agents).forEach(agent => {
            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0.01) {
                const speed = 0.05;
                agent.x += dx * speed;
                agent.y += dy * speed;
            } else {
                agent.x = agent.targetX;
                agent.y = agent.targetY;
            }
            
            // Update activity progress
            if (agent.animating) {
                agent.activityProgress += 0.02;
                if (agent.activityProgress >= 1) {
                    agent.animating = false;
                    agent.currentActivity = 'idle';
                    agent.activityProgress = 0;
                }
            }
        });
        
        // Update particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // Gravity
            p.life -= 0.02;
            p.size *= 0.98;
            return p.life > 0;
        });
    }
    
    render() {
        const map = this.maps[this.currentLevel];
        const tileSize = this.canvas.width / map.width;
        
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw terrain
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = this.terrain[y][x];
                this.drawTile(x, y, tile, tileSize);
            }
        }
        
        // Draw grid
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= map.width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * tileSize, 0);
            this.ctx.lineTo(x * tileSize, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= map.height; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * tileSize);
            this.ctx.lineTo(this.canvas.width, y * tileSize);
            this.ctx.stroke();
        }
        
        // Draw particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
        
        // Draw agents
        Object.values(this.agents).forEach(agent => {
            if (agent.alive && agent.level === this.currentLevel) {
                this.drawAgent(agent, tileSize);
            }
        });
    }
    
    drawTile(x, y, tile, size) {
        const colors = {
            land: '#4a5568',
            water: '#2b6cb0',
            rock: '#2d3748',
            tree: '#2f855a',
            base: '#805ad5',
            stairs_up: '#4299e1',
            stairs_down: '#ed8936'
        };
        
        this.ctx.fillStyle = colors[tile.type] || colors.land;
        this.ctx.fillRect(x * size, y * size, size, size);
        
        // Draw emoji for special tiles
        if (tile.emoji && size > 15) {
            this.ctx.font = `${size * 0.5}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(tile.emoji, x * size + size/2, y * size + size/2);
        }
    }
    
    drawAgent(agent, tileSize) {
        const x = agent.x * tileSize + tileSize/2;
        const y = agent.y * tileSize + tileSize/2;
        const radius = tileSize * 0.4;
        
        const isMoving = Math.abs(agent.x - agent.targetX) > 0.01 || Math.abs(agent.y - agent.targetY) > 0.01;
        const bounce = isMoving ? Math.sin(Date.now() / 100) * 2 : 0;
        
        let scale = 1;
        let rotation = 0;
        
        if (agent.animating) {
            switch (agent.currentActivity) {
                case 'gather_resource':
                    scale = 1 + Math.sin(agent.activityProgress * Math.PI * 4) * 0.1;
                    break;
                case 'build_component':
                    rotation = Math.sin(agent.activityProgress * Math.PI * 2) * 0.2;
                    break;
                case 'sabotage':
                    scale = 1 + Math.sin(agent.activityProgress * Math.PI * 6) * 0.15;
                    rotation = Math.sin(agent.activityProgress * Math.PI * 4) * 0.3;
                    break;
                case 'eat_food':
                    scale = 1 - Math.sin(agent.activityProgress * Math.PI) * 0.1;
                    break;
            }
        }
        
        this.ctx.save();
        this.ctx.translate(x, y + bounce);
        this.ctx.rotate(rotation);
        this.ctx.scale(scale, scale);
        
        // Shadow
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.ellipse(0, radius * 0.8, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        
        // Agent body (Among Us style)
        this.ctx.fillStyle = agent.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Visor
        this.ctx.fillStyle = 'rgba(150, 200, 255, 0.7)';
        this.ctx.beginPath();
        this.ctx.ellipse(-radius * 0.15, -radius * 0.2, radius * 0.4, radius * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(-radius/3, -radius/3, radius/4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Border (traitor=red, honest=blue)
        this.ctx.strokeStyle = agent.role === 'traitor' ? '#ef4444' : '#4a9eff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Activity icon
        if (agent.animating) {
            const icons = {
                gather_resource: '🌿',
                build_component: '🔨',
                sabotage: '💣',
                eat_food: '🍎',
                poison_food: '☠️',
                deposit_resource: '📦'
            };
            
            const icon = icons[agent.currentActivity];
            if (icon) {
                this.ctx.globalAlpha = Math.sin(agent.activityProgress * Math.PI);
                this.ctx.font = `${radius * 0.6}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(icon, 0, -radius * 1.3);
                this.ctx.globalAlpha = 1;
            }
        }
        
        this.ctx.restore();
        
        // Name label
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 10px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(agent.name, x, y + radius + 14);
        this.ctx.shadowBlur = 0;
    }
    
    handleCanvasHover(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const map = this.maps[this.currentLevel];
        const tileSize = this.canvas.width / map.width;
        
        let hoveredAgent = null;
        Object.values(this.agents).forEach(agent => {
            if (agent.level !== this.currentLevel || !agent.alive) return;
            
            const agentX = agent.x * tileSize + tileSize/2;
            const agentY = agent.y * tileSize + tileSize/2;
            const radius = tileSize * 0.4;
            
            const dist = Math.sqrt((x - agentX)**2 + (y - agentY)**2);
            if (dist < radius) {
                hoveredAgent = agent;
            }
        });
        
        const tooltip = document.getElementById('agent-tooltip');
        if (hoveredAgent) {
            tooltip.classList.remove('hidden');
            tooltip.style.left = (e.clientX - rect.left + 20) + 'px';
            tooltip.style.top = (e.clientY - rect.top - 80) + 'px';
            
            tooltip.querySelector('.tooltip-name').textContent = hoveredAgent.name;
            const roleSpan = tooltip.querySelector('.tooltip-role');
            roleSpan.textContent = hoveredAgent.role.toUpperCase();
            roleSpan.className = `tooltip-role ${hoveredAgent.role}`;
            
            tooltip.querySelector('.energy').textContent = `${Math.floor(hoveredAgent.energy)}/100`;
            tooltip.querySelector('.health').textContent = `${hoveredAgent.health}/100`;
            tooltip.querySelector('.position').textContent = `(${Math.floor(hoveredAgent.x)}, ${Math.floor(hoveredAgent.y)})`;
        } else {
            tooltip.classList.add('hidden');
        }
    }
    
    focusOnAgent(agentId) {
        const agent = this.agents[agentId];
        this.addMessage('system', 'System', `🎯 Focused on ${agent.name} (${agent.role})`, '🎯');
    }
}

// Initialize simulation
document.addEventListener('DOMContentLoaded', () => {
    window.simulation = new MaroonedSimulation();
});
