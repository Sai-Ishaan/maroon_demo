/* ===================================================================
   MAROONED - Enhanced Simulation with Smooth Animations
   Agents move smoothly and show activity animations
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
        
        // Agent data with animation states
        this.agents = {
            alice: { 
                x: 15, y: 15, targetX: 15, targetY: 15, 
                energy: 100, health: 100, color: '#667eea', 
                role: 'colonist', name: 'Alice',
                animating: false, currentActivity: 'idle',
                activityProgress: 0
            },
            bob: { 
                x: 16, y: 15, targetX: 16, targetY: 15,
                energy: 100, health: 100, color: '#4facfe', 
                role: 'colonist', name: 'Bob',
                animating: false, currentActivity: 'idle',
                activityProgress: 0
            },
            charlie: { 
                x: 14, y: 15, targetX: 14, targetY: 15,
                energy: 100, health: 100, color: '#43e97b', 
                role: 'colonist', name: 'Charlie',
                animating: false, currentActivity: 'idle',
                activityProgress: 0
            },
            diana: { 
                x: 15, y: 16, targetX: 15, targetY: 16,
                energy: 100, health: 100, color: '#fa709a', 
                role: 'colonist', name: 'Diana',
                animating: false, currentActivity: 'idle',
                activityProgress: 0
            },
            eve: { 
                x: 15, y: 14, targetX: 15, targetY: 14,
                energy: 100, health: 100, color: '#f5576c', 
                role: 'traitor', name: 'Eve',
                animating: false, currentActivity: 'idle',
                activityProgress: 0
            }
        };
        
        // Animation particles for effects
        this.particles = [];
        
        // Map configurations
        this.maps = {
            ground: { width: 30, height: 30 },
            mountain: { width: 10, height: 10 },
            cave: { width: 15, height: 15 }
        };
        
        // Simulation data
        this.trainingSequence = this.generateTrainingSequence();
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.generateTerrain();
        this.startRenderLoop();
    }
    
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
                this.generateTerrain();
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
    
    generateTerrain() {
        const map = this.maps[this.currentLevel];
        this.terrain = [];
        
        for (let y = 0; y < map.height; y++) {
            const row = [];
            for (let x = 0; x < map.width; x++) {
                let type = 'land';
                
                const rand = Math.random();
                if (rand < 0.05) type = 'water';
                else if (rand < 0.08) type = 'rock';
                else if (rand < 0.12) type = 'tree';
                
                if (this.currentLevel === 'ground' && x === 15 && y === 15) {
                    type = 'base';
                }
                
                let resource = null;
                if (type === 'land' && Math.random() < 0.1) {
                    const resources = ['wood', 'food', 'metal', 'berries'];
                    resource = resources[Math.floor(Math.random() * resources.length)];
                }
                
                row.push({ type, resource });
            }
            this.terrain.push(row);
        }
    }
    
    generateTrainingSequence() {
        const sequence = [];
        const agents = ['alice', 'bob', 'charlie', 'diana', 'eve'];
        
        for (let i = 0; i < 100; i++) {
            const agent = agents[i % agents.length];
            
            // Traitor special actions
            if (agent === 'eve' && Math.random() < 0.2) {
                sequence.push({
                    turn: i + 1,
                    day: Math.floor(i / 5) + 1,
                    agent: agent,
                    action: 'SABOTAGE',
                    reasoning: 'Secretly sabotaging ship progress while alone',
                    message: 'Working on the ship!',
                    energy: -5,
                    reward: 2.0,
                    shipProgress: -15
                });
            } else {
                const actions = [
                    { type: 'MOVE', weight: 3 },
                    { type: 'GATHER', weight: 2 },
                    { type: 'DEPOSIT', weight: 1 },
                    { type: 'BUILD', weight: 1 },
                    { type: 'EAT', weight: 1 }
                ];
                
                const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
                let random = Math.random() * totalWeight;
                let action = 'MOVE';
                
                for (const a of actions) {
                    random -= a.weight;
                    if (random <= 0) {
                        action = a.type;
                        break;
                    }
                }
                
                const movements = [
                    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
                    { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
                    { dx: 1, dy: 1 }, { dx: -1, dy: -1 },
                    { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
                ];
                const move = movements[Math.floor(Math.random() * movements.length)];
                
                sequence.push({
                    turn: i + 1,
                    day: Math.floor(i / 5) + 1,
                    agent: agent,
                    action: action,
                    target: action === 'GATHER' ? 'WOOD' + Math.floor(Math.random() * 100) : null,
                    reasoning: this.generateReasoning(action),
                    message: this.generateMessage(action, agent),
                    energy: action === 'MOVE' ? -3 : action === 'GATHER' ? -5 : action === 'BUILD' ? -4 : -2,
                    reward: action === 'GATHER' ? 0.2 : action === 'BUILD' ? 0.5 : action === 'DEPOSIT' ? 0.3 : -0.01,
                    move: action === 'MOVE' ? move : null,
                    shipProgress: action === 'BUILD' ? 3 : action === 'DEPOSIT' ? 1 : 0
                });
            }
        }
        
        return sequence;
    }
    
    generateReasoning(action) {
        const reasonings = {
            'MOVE': ['Exploring nearby areas', 'Searching for resources', 'Patrolling the area'],
            'GATHER': ['Collecting resources', 'Found materials nearby', 'Gathering for construction'],
            'DEPOSIT': ['Returning to base', 'Depositing materials', 'Contributing to storage'],
            'BUILD': ['Working on ship', 'Constructing components', 'Making progress'],
            'EAT': ['Restoring energy', 'Taking a break', 'Consuming food'],
            'SABOTAGE': ['Delaying progress', 'Sabotaging quietly', 'Acting suspiciously']
        };
        const options = reasonings[action] || ['Performing action'];
        return options[Math.floor(Math.random() * options.length)];
    }
    
    generateMessage(action, agent) {
        const messages = {
            'MOVE': ['Heading out', 'Moving around', 'Exploring'],
            'GATHER': ['Found something!', 'Collecting this', 'This will help'],
            'DEPOSIT': ['At base', 'Dropping off supplies'],
            'BUILD': ['Working hard', 'Making progress!', 'Coming together'],
            'EAT': ['Need food', 'Restoring energy'],
        };
        const options = messages[action] || ['...'];
        return options[Math.floor(Math.random() * options.length)];
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
            this.addMessage('system', 'System', 'Episode complete! Press restart to replay.', '🏁');
            this.isPlaying = false;
            document.querySelector('.icon-play').classList.remove('hidden');
            document.querySelector('.icon-pause').classList.add('hidden');
            return;
        }
        
        const step = this.trainingSequence[this.currentTurn];
        this.executeStep(step);
        
        setTimeout(() => {
            this.startSimulation();
        }, 1500 / this.speed);
    }
    
    executeStep(step) {
        const agent = this.agents[step.agent];
        
        // Update day/turn
        this.currentDay = step.day;
        this.currentTurn++;
        document.getElementById('day-counter').textContent = `Day ${this.currentDay}`;
        document.getElementById('turn-counter').textContent = `Turn ${this.currentTurn}`;
        
        // Set activity animation
        agent.currentActivity = step.action.toLowerCase();
        agent.activityProgress = 0;
        agent.animating = true;
        
        // Move agent smoothly
        if (step.move) {
            const newX = agent.x + step.move.dx;
            const newY = agent.y + step.move.dy;
            const map = this.maps[this.currentLevel];
            
            agent.targetX = Math.max(0, Math.min(map.width - 1, newX));
            agent.targetY = Math.max(0, Math.min(map.height - 1, newY));
        }
        
        // Update energy
        agent.energy = Math.max(0, Math.min(100, agent.energy + step.energy));
        
        // Update ship progress
        if (step.shipProgress) {
            this.shipProgress = Math.max(0, Math.min(100, this.shipProgress + step.shipProgress));
            this.updateShipProgress();
            
            // Create particles for ship progress
            if (step.shipProgress > 0) {
                this.createParticles(agent, 'build', 15);
            } else if (step.shipProgress < 0) {
                this.createParticles(agent, 'sabotage', 20);
            }
        }
        
        // Create activity particles
        if (step.action === 'GATHER') {
            this.createParticles(agent, 'gather', 10);
        } else if (step.action === 'EAT') {
            this.createParticles(agent, 'eat', 8);
        }
        
        // Update UI
        this.updateAgentCard(step.agent, agent);
        
        // Add messages
        this.addMessage('action', agent.name, `🧠 ${step.action}${step.target ? ' ' + step.target : ''}`, '📍');
        this.addMessage('dialogue', agent.name, `💭 ${step.reasoning}`, '💭');
        if (step.message) {
            this.addMessage('dialogue', agent.name, `💬 "${step.message}"`, '💬');
        }
        this.addMessage('reward', agent.name, `⚡ ${agent.energy}/100 | 🎁 ${step.reward > 0 ? '+' : ''}${step.reward}`, '⚡');
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
            eat: ['#ffb86c', '#fbbf24', '#f1fa8c']
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
                color: particleColors[Math.floor(Math.random() * particleColors.length)],
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
            energyText.textContent = `${agentData.energy}/100`;
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
        while (container.children.length > 50) {
            container.removeChild(container.children[1]);
        }
    }
    
    restart() {
        this.currentTurn = 0;
        this.currentDay = 1;
        this.shipProgress = 0;
        this.isPlaying = false;
        this.particles = [];
        
        // Reset agents
        Object.keys(this.agents).forEach((id, index) => {
            this.agents[id].x = 15 + (index % 3) - 1;
            this.agents[id].y = 15 + Math.floor(index / 3);
            this.agents[id].targetX = this.agents[id].x;
            this.agents[id].targetY = this.agents[id].y;
            this.agents[id].energy = 100;
            this.agents[id].health = 100;
            this.agents[id].animating = false;
            this.agents[id].currentActivity = 'idle';
            this.agents[id].activityProgress = 0;
            this.updateAgentCard(id, this.agents[id]);
        });
        
        document.getElementById('day-counter').textContent = 'Day 1';
        document.getElementById('turn-counter').textContent = 'Turn 1';
        document.querySelector('.icon-play').classList.remove('hidden');
        document.querySelector('.icon-pause').classList.add('hidden');
        this.updateShipProgress();
        
        const container = document.getElementById('messages-container');
        container.innerHTML = '<div class="message system"><div class="message-icon">🎮</div><div class="message-content"><div class="message-header">System</div><div class="message-text">Episode restarted. Press play to begin.</div></div></div>';
    }
    
    // ===================================================================
    // ANIMATION AND RENDERING LOOP
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
        
        // Draw particles (behind agents)
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
        
        // Draw agents with animations
        Object.values(this.agents).forEach(agent => {
            this.drawAgent(agent, tileSize);
        });
    }
    
    drawTile(x, y, tile, size) {
        const colors = {
            land: '#1a1a2e',
            water: '#2a5c8f',
            rock: '#3a3a4a',
            tree: '#2d5016',
            base: '#667eea'
        };
        
        this.ctx.fillStyle = colors[tile.type] || colors.land;
        this.ctx.fillRect(x * size, y * size, size, size);
        
        // Draw resource with pulse animation
        if (tile.resource) {
            const resourceColors = {
                wood: '#8b4513',
                food: '#50fa7b',
                metal: '#8be9fd',
                berries: '#ff79c6'
            };
            
            const pulse = Math.sin(Date.now() / 500) * 0.1 + 1;
            this.ctx.fillStyle = resourceColors[tile.resource];
            this.ctx.beginPath();
            this.ctx.arc(x * size + size/2, y * size + size/2, (size/4) * pulse, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawAgent(agent, tileSize) {
        const x = agent.x * tileSize + tileSize/2;
        const y = agent.y * tileSize + tileSize/2;
        const radius = tileSize * 0.35;
        
        // Bounce animation when moving
        const isMoving = agent.x !== agent.targetX || agent.y !== agent.targetY;
        const bounce = isMoving ? Math.sin(Date.now() / 100) * 2 : 0;
        
        // Activity-specific animations
        let scale = 1;
        let rotation = 0;
        
        if (agent.animating) {
            switch (agent.currentActivity) {
                case 'gather':
                    scale = 1 + Math.sin(agent.activityProgress * Math.PI * 4) * 0.1;
                    break;
                case 'build':
                    rotation = Math.sin(agent.activityProgress * Math.PI * 2) * 0.2;
                    break;
                case 'sabotage':
                    scale = 1 + Math.sin(agent.activityProgress * Math.PI * 6) * 0.15;
                    rotation = Math.sin(agent.activityProgress * Math.PI * 4) * 0.3;
                    break;
                case 'eat':
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
        
        // Visor (Among Us style)
        this.ctx.fillStyle = 'rgba(150, 200, 255, 0.7)';
        this.ctx.beginPath();
        this.ctx.ellipse(-radius * 0.15, -radius * 0.2, radius * 0.4, radius * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(-radius/3, -radius/3, radius/4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Border (traitor has red, colonist has blue)
        this.ctx.strokeStyle = agent.role === 'traitor' ? '#ef4444' : '#4a9eff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Activity indicator
        if (agent.animating) {
            const iconSize = radius * 0.6;
            this.ctx.font = `${iconSize}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const icons = {
                gather: '🌿',
                build: '🔨',
                sabotage: '💣',
                eat: '🍎',
                move: '👣'
            };
            
            const icon = icons[agent.currentActivity] || '';
            if (icon) {
                this.ctx.globalAlpha = Math.sin(agent.activityProgress * Math.PI);
                this.ctx.fillText(icon, 0, -radius * 1.3);
                this.ctx.globalAlpha = 1;
            }
        }
        
        this.ctx.restore();
        
        // Name label
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 11px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(agent.name, x, y + radius + 16);
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
            const agentX = agent.x * tileSize + tileSize/2;
            const agentY = agent.y * tileSize + tileSize/2;
            const radius = tileSize * 0.35;
            
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
        this.addMessage('system', 'System', `Focused on ${agent.name} (${agent.role})`, '🎯');
    }
}

// Initialize simulation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.simulation = new MaroonedSimulation();
});
