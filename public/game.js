class PokerGameClient {
    constructor() {
        this.socket = io();
        this.gameId = null;
        this.playerId = null;
        this.playerName = null;
        this.gameState = null;
        this.myStats = {
            gamesPlayed: 0,
            wins: 0,
            totalWinnings: 0
        };
        
        // 动物头像列表
        this.animalEmojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐺', '🐴', '🦄', '🐧', '🐦'];
        
        this.initializeEventListeners();
        this.setupSocketEvents();
        this.loadRoomList();
    }
    
    initializeEventListeners() {
        // 加入游戏
        document.getElementById('joinBtn').addEventListener('click', () => {
            this.joinGame();
        });
        
        // 开始游戏
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        // 游戏操作
        document.getElementById('foldBtn').addEventListener('click', () => {
            this.playerAction('fold');
        });
        
        document.getElementById('checkBtn').addEventListener('click', () => {
            this.playerAction('check');
        });
        
        document.getElementById('callBtn').addEventListener('click', () => {
            this.playerAction('call');
        });
        
        document.getElementById('raiseBtn').addEventListener('click', () => {
            const amount = parseInt(document.getElementById('raiseAmount').value);
            this.playerAction('raise', amount);
        });
        
        // 加注滑块同步
        const raiseSlider = document.getElementById('raiseSlider');
        const raiseAmount = document.getElementById('raiseAmount');
        
        raiseSlider.addEventListener('input', (e) => {
            raiseAmount.value = e.target.value;
        });
        
        raiseAmount.addEventListener('input', (e) => {
            raiseSlider.value = e.target.value;
        });
        
        // 聊天功能
        document.getElementById('sendChatBtn').addEventListener('click', () => {
            this.sendChatMessage();
        });
        
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });
        
        // 预设文案
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const message = e.target.getAttribute('data-message');
                if (message) {
                    this.socket.emit('chat-message', { message });
                }
            });
        });
        
        // 侧边栏折叠
        document.getElementById('toggleChat').addEventListener('click', () => {
            this.toggleSection('chat');
        });
        
        document.getElementById('toggleStats').addEventListener('click', () => {
            this.toggleSection('stats');
        });
        
        document.getElementById('toggleHistory').addEventListener('click', () => {
            this.toggleSection('history');
        });
        
        // 新游戏按钮
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.closeModal();
            this.startGame();
        });
        
        // 确认轮次结果按钮
        document.getElementById('confirm-round-btn').addEventListener('click', () => {
            this.confirmRoundResult();
        });
        
        // 离开房间按钮
        document.getElementById('leaveRoomBtn').addEventListener('click', () => {
            this.leaveRoom();
        });
        
        // 刷新房间列表按钮
        document.getElementById('refreshRoomsBtn').addEventListener('click', () => {
            this.loadRoomList();
        });
        
        // Enter键支持
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('gameId').focus();
        });
        
        document.getElementById('gameId').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinGame();
        });
    }
    
    setupSocketEvents() {
        // 页面加载完成后立即请求房间列表
        setTimeout(() => {
            this.loadRoomList();
        }, 500);
        
        this.socket.on('joined-game', (data) => {
            if (data.success) {
                this.playerId = data.playerId;
                this.gameRoomId = data.roomId; // 保存房间ID
                
                // 显示房间号
                document.getElementById('room-id-display').textContent = data.roomId;
                
                this.showGameScreen();
                this.showToast(`成功加入房间 ${data.roomId}!`, 'success');
            } else {
                this.showToast(data.message || '加入游戏失败', 'error');
            }
        });
        
        this.socket.on('game-started', () => {
            this.showToast('新局开始!', 'success');
        });
        
        this.socket.on('game-ended', (data) => {
            this.showToast(data.message, 'info');
            this.showModal('🎮 游戏结束', this.generateFinalStatsHtml(data.finalStats));
        });
        
        this.socket.on('game-state', (gameState) => {
            this.gameState = gameState;
            
            // 确保房间号显示（如果游戏状态中有roomId信息）
            if (gameState.roomId && !this.gameRoomId) {
                this.gameRoomId = gameState.roomId;
                document.getElementById('room-id-display').textContent = gameState.roomId;
            }
            
            this.updateGameDisplay();
            
            // 如果是摊牌阶段，显示结果
            if (gameState.stage === 'showdown') {
                setTimeout(() => {
                    this.showHandResults();
                }, 1000);
            }
        });
        
        this.socket.on('chat-message', (message) => {
            this.addChatMessage(message);
        });
        
        this.socket.on('round-result', (roundResult) => {
            this.showRoundResultModal(roundResult);
        });
        
        this.socket.on('round-confirmations-update', (data) => {
            this.updateRoundConfirmations(data);
        });
        
        this.socket.on('disconnect', () => {
            this.showToast('连接断开，请刷新页面重新连接', 'error');
        });
        
        this.socket.on('room-list', (rooms) => {
            this.updateRoomList(rooms);
        });
    }
    
    joinGame() {
        const playerName = document.getElementById('playerName').value.trim();
        const gameId = document.getElementById('gameId').value.trim() || this.generateGameId();
        
        if (!playerName) {
            this.showToast('请输入玩家昵称', 'error');
            return;
        }
        
        if (playerName.length > 20) {
            this.showToast('昵称不能超过20个字符', 'error');
            return;
        }
        
        this.playerName = playerName;
        this.gameId = gameId;
        
        this.socket.emit('join-game', { gameId, playerName });
    }
    
    generateGameId() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    startGame() {
        this.socket.emit('start-game');
    }
    
    playerAction(action, amount = 0) {
        // 检查游戏是否已开始
        if (!this.gameState || this.gameState.stage === 'waiting') {
            this.showToast('游戏还未开始，请等待开始游戏', 'warning');
            return;
        }
        
        if (!this.isMyTurn()) {
            this.showToast('还没轮到您操作', 'warning');
            return;
        }
        
        this.socket.emit('player-action', { action, amount });
    }
    
    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (message) {
            this.socket.emit('chat-message', { message });
            input.value = '';
        }
    }
    
    showGameScreen() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'grid';
        
        // 确保房间号显示
        if (this.gameRoomId) {
            document.getElementById('room-id-display').textContent = this.gameRoomId;
        }
        
        // 根据游戏状态显示开始按钮
        this.updateStartGameButton();
        
        // 初始化时确保操作按钮被正确禁用
        this.updateActionButtons();
    }
    
    updateStartGameButton() {
        const startBtn = document.getElementById('startGameBtn');
        if (!this.gameState) return;
        
        if (this.gameState.stage === 'waiting' && this.gameState.players.length >= 2) {
            startBtn.style.display = 'inline-block';
        } else {
            startBtn.style.display = 'none';
        }
    }
    
    updateGameDisplay() {
        if (!this.gameState) return;
        
        // 更新基本信息
        document.getElementById('pot-amount').textContent = this.gameState.pot || 0;
        document.getElementById('current-bet').textContent = this.gameState.currentBet || 0;
        document.getElementById('stage-text').textContent = this.getStageText(this.gameState.stage);
        document.getElementById('game-stage').textContent = this.getStageText(this.gameState.stage);
        
        // 更新开始游戏按钮显示状态
        this.updateStartGameButton();
        
        // 更新社区牌
        this.updateCommunityCards();
        
        // 更新玩家信息
        this.updatePlayers();
        
        // 更新自己的手牌
        this.updatePlayerHand();
        
        // 更新操作按钮状态
        this.updateActionButtons();
        
        // 更新操作历史
        if (this.gameState.lastAction) {
            this.addActionToHistory(this.gameState.lastAction);
        }
        
        // 更新统计信息
        this.updateStats();
    }
    
    updateCommunityCards() {
        const cards = this.gameState.communityCards || [];
        console.log('Community cards:', cards); // 调试日志
        
        for (let i = 0; i < 5; i++) {
            const cardElement = document.querySelector(`.community-cards .card[data-index="${i}"]`);
            if (cards[i]) {
                this.displayCard(cardElement, cards[i]);
            } else {
                cardElement.className = 'card empty';
                cardElement.textContent = '';
            }
        }
    }
    
    updatePlayers() {
        const container = document.getElementById('players-container');
        container.innerHTML = '';
        
        const players = this.gameState.players || [];
        const positions = this.calculatePlayerPositions(players.length);
        
        players.forEach((player, index) => {
            const playerElement = this.createPlayerElement(player, index);
            const position = positions[index];
            
            playerElement.style.left = position.x + '%';
            playerElement.style.top = position.y + '%';
            playerElement.style.transform = 'translate(-50%, -50%)';
            
            container.appendChild(playerElement);
        });
    }
    
    createPlayerElement(player, index) {
        const element = document.createElement('div');
        element.className = 'player-seat';
        element.id = `player-${player.id}`;
        
        // 玩家信息
        const info = document.createElement('div');
        info.className = 'player-info';
        
        if (player.id === this.gameState.currentPlayer) {
            info.classList.add('current-player');
        }
        
        if (index === this.gameState.dealerIndex) {
            info.classList.add('dealer');
            const dealerButton = document.createElement('div');
            dealerButton.className = 'dealer-button';
            dealerButton.textContent = '庄'; // 改为中文"庄"
            info.appendChild(dealerButton);
        }
        
        // 显示大盲小盲标识（只在游戏开始后显示）
        if (this.gameState.stage !== 'waiting' && this.gameState.smallBlindIndex !== undefined && index === this.gameState.smallBlindIndex) {
            const blindButton = document.createElement('div');
            blindButton.className = 'blind-button small-blind';
            blindButton.textContent = '小盲';
            info.appendChild(blindButton);
        }
        
        if (this.gameState.stage !== 'waiting' && this.gameState.bigBlindIndex !== undefined && index === this.gameState.bigBlindIndex) {
            const blindButton = document.createElement('div');
            blindButton.className = 'blind-button big-blind';
            blindButton.textContent = '大盲';
            info.appendChild(blindButton);
        }
        
        const name = document.createElement('div');
        name.className = 'player-name';
        name.innerHTML = `${this.getPlayerAvatar(player.id)} ${player.name}`;
        info.appendChild(name);
        
        const chips = document.createElement('div');
        chips.className = 'player-chips';
        chips.textContent = `💰 ${player.chips}`;
        info.appendChild(chips);
        
        // 显示玩家实时状态
        if (player.id === this.gameState.currentPlayer && this.gameState.stage !== 'waiting') {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'player-status';
            statusDiv.textContent = '下注中';
            info.appendChild(statusDiv);
        }
        
        if (player.currentBet > 0) {
            const bet = document.createElement('div');
            bet.className = 'player-bet';
            bet.textContent = `下注: ${player.currentBet}`;
            info.appendChild(bet);
        }
        
        element.appendChild(info);
        
        // 玩家状态
        if (player.folded || player.isAllIn) {
            const status = document.createElement('div');
            status.className = `player-status ${player.folded ? 'folded' : 'all-in'}`;
            status.textContent = player.folded ? '已弃牌' : 'ALL-IN';
            element.appendChild(status);
        }
        
        // 玩家手牌（只在摊牌时显示所有人的牌，平时不显示其他玩家的牌）
        if (player.cards && this.gameState.stage === 'showdown' && !player.folded) {
            const cards = document.createElement('div');
            cards.className = 'player-cards';
            
            player.cards.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'card';
                this.displayCard(cardElement, card);
                cards.appendChild(cardElement);
            });
            
            element.appendChild(cards);
        }
        
        return element;
    }
    
    getPlayerAvatar(playerId) {
        // 根据玩家ID生成固定的头像
        const hash = this.hashString(playerId);
        return this.animalEmojis[hash % this.animalEmojis.length];
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    
    calculatePlayerPositions(playerCount) {
        const positions = [];
        const centerX = 50;
        const centerY = 50;
        const radiusX = 40; // 适当调整半径
        const radiusY = 32; // 适当调整半径
        
        for (let i = 0; i < playerCount; i++) {
            const angle = (i * 2 * Math.PI) / playerCount - Math.PI / 2;
            const x = centerX + radiusX * Math.cos(angle);
            const y = centerY + radiusY * Math.sin(angle);
            positions.push({ x, y });
        }
        
        return positions;
    }
    
    updatePlayerHand() {
        const myPlayer = this.gameState.players.find(p => p.id === this.playerId);
        if (!myPlayer || !myPlayer.cards || myPlayer.cards.length < 2) {
            console.log('No cards found for player:', myPlayer);
            return;
        }
        
        const card1 = document.getElementById('hand-card-1');
        const card2 = document.getElementById('hand-card-2');
        
        console.log('Player cards:', myPlayer.cards); // 调试日志
        
        this.displayCard(card1, myPlayer.cards[0], 'medium');
        this.displayCard(card2, myPlayer.cards[1], 'medium');
        
        // 评估手牌强度（简单实现）
        if (this.gameState.communityCards && this.gameState.communityCards.length >= 3) {
            const handStrength = this.evaluateHandStrength(myPlayer.cards, this.gameState.communityCards);
            document.getElementById('hand-strength').textContent = handStrength;
        } else {
            document.getElementById('hand-strength').textContent = '等待翻牌...';
        }
    }
    
    displayCard(element, card, size = 'normal') {
        if (!card) {
            console.log('No card to display');
            element.className = `card empty ${size}`;
            element.innerHTML = '';
            return;
        }
        
        console.log('Displaying card:', card); // 调试日志
        
        element.className = `card ${size}`;
        
        // 简洁的牌面内容 - 只显示一次点数和花色，避免重复
        const cardContent = document.createElement('div');
        cardContent.className = 'card-content';
        
        // 主要点数和花色显示（左上角）
        const mainInfo = document.createElement('div');
        mainInfo.className = 'card-main';
        
        const rank = document.createElement('span');
        rank.className = 'card-rank';
        rank.textContent = card.rank;
        
        const suit = document.createElement('span');
        suit.className = 'card-suit';
        suit.textContent = card.suit;
        
        mainInfo.appendChild(rank);
        mainInfo.appendChild(suit);
        
        // 中央装饰性花色（可选，更精美）
        const centerSuit = document.createElement('div');
        centerSuit.className = 'card-center';
        centerSuit.textContent = card.suit;
        
        cardContent.appendChild(mainInfo);
        cardContent.appendChild(centerSuit);
        
        element.innerHTML = '';
        element.appendChild(cardContent);
        
        // 添加颜色样式
        const suitSymbol = card.suit;
        if (suitSymbol === '♥' || suitSymbol === '♦') {
            element.classList.add('red');
        } else {
            element.classList.add('black');
        }
        
        // 添加翻转动画
        element.classList.add('flipping');
        setTimeout(() => {
            element.classList.remove('flipping');
        }, 600);
    }
    
    updateActionButtons() {
        // 如果游戏还未开始，禁用所有操作按钮
        if (!this.gameState || this.gameState.stage === 'waiting') {
            this.disableAllActionButtons();
            return;
        }
        
        const isMyTurn = this.isMyTurn();
        const myPlayer = this.gameState.players.find(p => p.id === this.playerId);
        
        if (!myPlayer || !isMyTurn) {
            this.disableAllActionButtons();
            return;
        }
        
        const callAmount = this.gameState.currentBet - myPlayer.currentBet;
        const canCheck = callAmount === 0;
        const canCall = callAmount > 0 && callAmount <= myPlayer.chips;
        const canRaise = myPlayer.chips > callAmount;
        
        // 弃牌按钮始终可用
        document.getElementById('foldBtn').disabled = false;
        document.getElementById('foldBtn').textContent = '弃牌 (Fold)';
        
        // 过牌/跟注按钮
        document.getElementById('checkBtn').disabled = !canCheck;
        document.getElementById('checkBtn').textContent = '过牌 (Check)';
        document.getElementById('callBtn').disabled = !canCall;
        document.getElementById('callBtn').innerHTML = `跟注 (Call) <span id="call-amount">${callAmount}</span>`;
        
        // 加注按钮和滑块
        document.getElementById('raiseBtn').disabled = !canRaise;
        document.getElementById('raiseBtn').textContent = '加注 (Raise)';
        document.getElementById('raiseSlider').disabled = !canRaise;
        document.getElementById('raiseAmount').disabled = !canRaise;
        
        if (canRaise) {
            const minRaise = Math.max(this.gameState.currentBet * 2, this.gameState.currentBet + 10);
            const maxRaise = myPlayer.chips + myPlayer.currentBet;
            
            document.getElementById('raiseSlider').min = minRaise;
            document.getElementById('raiseSlider').max = maxRaise;
            document.getElementById('raiseAmount').min = minRaise;
            document.getElementById('raiseAmount').max = maxRaise;
            
            if (parseInt(document.getElementById('raiseAmount').value) < minRaise) {
                document.getElementById('raiseAmount').value = minRaise;
                document.getElementById('raiseSlider').value = minRaise;
            }
        }
    }
    
    disableAllActionButtons() {
        document.getElementById('foldBtn').disabled = true;
        document.getElementById('checkBtn').disabled = true;
        document.getElementById('callBtn').disabled = true;
        document.getElementById('raiseBtn').disabled = true;
        document.getElementById('raiseSlider').disabled = true;
        document.getElementById('raiseAmount').disabled = true;
        
        // 更新按钮文字提示，让玩家知道需要等待游戏开始
        if (this.gameState && this.gameState.stage === 'waiting') {
            document.getElementById('foldBtn').textContent = '弃牌 (等待开始)';
            document.getElementById('checkBtn').textContent = '过牌 (等待开始)';
            document.getElementById('callBtn').innerHTML = '跟注 (等待开始) <span id="call-amount">0</span>';
            document.getElementById('raiseBtn').textContent = '加注 (等待开始)';
        }
    }
    
    isMyTurn() {
        return this.gameState && 
               this.gameState.stage !== 'waiting' && 
               this.gameState.currentPlayer === this.playerId;
    }
    
    evaluateHandStrength(playerCards, communityCards) {
        // 简单的手牌强度评估
        const allCards = [...playerCards, ...communityCards];
        const ranks = allCards.map(card => {
            if (card.rank === 'A') return 14;
            if (card.rank === 'K') return 13;
            if (card.rank === 'Q') return 12;
            if (card.rank === 'J') return 11;
            return parseInt(card.rank);
        });
        
        const suits = allCards.map(card => card.suit);
        
        // 检查对子
        const rankCounts = {};
        ranks.forEach(rank => {
            rankCounts[rank] = (rankCounts[rank] || 0) + 1;
        });
        
        const maxCount = Math.max(...Object.values(rankCounts));
        
        if (maxCount >= 4) return '四条';
        if (maxCount >= 3) {
            const pairs = Object.values(rankCounts).filter(count => count >= 2).length;
            if (pairs >= 2) return '葫芦';
            return '三条';
        }
        if (maxCount >= 2) {
            const pairCount = Object.values(rankCounts).filter(count => count >= 2).length;
            if (pairCount >= 2) return '两对';
            return '一对';
        }
        
        // 检查同花
        const suitCounts = {};
        suits.forEach(suit => {
            suitCounts[suit] = (suitCounts[suit] || 0) + 1;
        });
        
        if (Math.max(...Object.values(suitCounts)) >= 5) return '同花';
        
        return '高牌';
    }
    
    addChatMessage(message) {
        const container = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message fade-in';
        
        const time = new Date(message.timestamp).toLocaleTimeString();
        messageElement.innerHTML = `
            <span class="sender">${message.playerName}:</span>
            <span class="content">${this.escapeHtml(message.message)}</span>
            <span class="timestamp">${time}</span>
        `;
        
        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
    }
    
    addActionToHistory(action) {
        const container = document.getElementById('action-history');
        const actionElement = document.createElement('div');
        actionElement.className = 'action-item fade-in';
        
        const time = new Date(action.timestamp).toLocaleTimeString();
        let actionText = '';
        
        switch (action.action) {
            case 'fold':
                actionText = '弃牌';
                break;
            case 'check':
                actionText = '过牌';
                break;
            case 'call':
                actionText = '跟注';
                break;
            case 'raise':
                actionText = `加注到 ${action.amount}`;
                break;
        }
        
        actionElement.innerHTML = `
            <span class="player">${action.playerName}</span>
            <span class="action">${actionText}</span>
            <span class="timestamp">${time}</span>
        `;
        
        container.insertBefore(actionElement, container.firstChild);
        
        // 限制历史记录数量
        while (container.children.length > 50) {
            container.removeChild(container.lastChild);
        }
    }
    
    updateStats() {
        if (!this.gameState || !this.gameState.players) return;
        
        const statsContainer = document.getElementById('players-stats-list');
        statsContainer.innerHTML = '';
        
        // 按筹码数量排序玩家
        const sortedPlayers = [...this.gameState.players].sort((a, b) => b.chips - a.chips);
        
        sortedPlayers.forEach(player => {
            const stats = player.stats || {
                gamesPlayed: 0,
                wins: 0,
                totalWinnings: 0,
                netProfit: 0
            };
            
            const playerStatsItem = document.createElement('div');
            playerStatsItem.className = 'player-stats-item';
            
            // 高亮当前玩家
            if (player.id === this.playerId) {
                playerStatsItem.classList.add('current-player');
            }
            
            const winRate = stats.gamesPlayed > 0 ? 
                Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
            
            const profitClass = stats.netProfit > 0 ? 'positive' : 
                               stats.netProfit < 0 ? 'negative' : 'neutral';
            
            playerStatsItem.innerHTML = `
                <div class="player-stats-header">
                    <div class="player-stats-name">${player.name}</div>
                    <div class="player-stats-chips">💰 ${player.chips}</div>
                </div>
                <div class="player-stats-details">
                    <div class="player-stat">
                        <span class="player-stat-label">局数:</span>
                        <span class="player-stat-value neutral">${stats.gamesPlayed}</span>
                    </div>
                    <div class="player-stat">
                        <span class="player-stat-label">胜局:</span>
                        <span class="player-stat-value neutral">${stats.wins}</span>
                    </div>
                    <div class="player-stat">
                        <span class="player-stat-label">胜率:</span>
                        <span class="player-stat-value neutral">${winRate}%</span>
                    </div>
                    <div class="player-stat">
                        <span class="player-stat-label">盈亏:</span>
                        <span class="player-stat-value ${profitClass}">${stats.netProfit > 0 ? '+' : ''}${stats.netProfit}</span>
                    </div>
                </div>
            `;
            
            statsContainer.appendChild(playerStatsItem);
        });
        
        console.log('Updated player stats display'); // 调试日志
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    showModal(title, content) {
        const modal = document.getElementById('game-end-modal');
        modal.querySelector('h2').textContent = title;
        modal.querySelector('#game-result').innerHTML = content;
        modal.style.display = 'flex';
    }
    
    closeModal() {
        document.getElementById('game-end-modal').style.display = 'none';
    }
    
    toggleSection(section) {
        const content = document.querySelector(`.${section}-content`);
        const button = document.getElementById(`toggle${section.charAt(0).toUpperCase() + section.slice(1)}`);
        
        if (content.style.display === 'none') {
            content.style.display = 'flex';
            button.textContent = '-';
        } else {
            content.style.display = 'none';
            button.textContent = '+';
        }
    }
    
    getStageText(stage) {
        const stageTexts = {
            'waiting': '等待开始',
            'preflop': '翻牌前',
            'flop': '翻牌圈',
            'turn': '转牌圈', 
            'river': '河牌圈',
            'showdown': '摊牌'
        };
        return stageTexts[stage] || '未知状态';
    }
    
    showHandResults() {
        if (!this.gameState || this.gameState.stage !== 'showdown') return;
        
        const activePlayers = this.gameState.players.filter(p => !p.folded);
        let resultHtml = '<div class="hand-results">';
        
        activePlayers.forEach(player => {
            if (player.cards) {
                const handStrength = this.evaluateHandStrength(player.cards, this.gameState.communityCards);
                resultHtml += `
                    <div class="player-result">
                        <strong>${player.name}:</strong> 
                        ${player.cards.map(card => `${card.rank}${card.suit}`).join(' ')} 
                        - ${handStrength}
                    </div>
                `;
            }
        });
        
        resultHtml += '</div>';
        this.showToast('查看摊牌结果', 'info');
    }
    
    generateFinalStatsHtml(finalStats) {
        let html = '<div class="final-stats">';
        html += '<h3>最终统计</h3>';
        
        // 按筹码数排序
        finalStats.sort((a, b) => b.chips - a.chips);
        
        finalStats.forEach((player, index) => {
            html += `
                <div class="player-final-stat">
                    <div class="rank">#${index + 1}</div>
                    <div class="player-name">${this.getPlayerAvatar(player.id)} ${player.name}</div>
                    <div class="chips">💰 ${player.chips}</div>
                    <div class="stats">
                        胜率: ${player.stats.gamesPlayed > 0 ? Math.round((player.stats.wins / player.stats.gamesPlayed) * 100) : 0}%
                        (${player.stats.wins}/${player.stats.gamesPlayed})
                        | 净盈亏: ${player.stats.netProfit > 0 ? '+' : ''}${player.stats.netProfit}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showRoundResultModal(roundResult) {
        console.log('Round result:', roundResult);
        
        // 显示获胜者信息
        this.displayWinners(roundResult.winners);
        
        // 显示结算清单
        this.displaySettlement(roundResult.settlement);
        
        // 显示所有玩家手牌
        this.displayAllHands(roundResult.allHands, roundResult.communityCards);
        
        // 显示确认状态
        this.updateRoundConfirmations({ confirmations: roundResult.confirmations, allConfirmed: false });
        
        // 显示模态框
        document.getElementById('round-result-modal').style.display = 'flex';
    }
    
    displayWinners(winners) {
        const winnerSection = document.getElementById('winner-section');
        winnerSection.innerHTML = '';
        
        winners.forEach(winner => {
            const winnerDiv = document.createElement('div');
            winnerDiv.className = 'winner-info';
            
            let winnerHtml = `
                <div>
                    <h3>🏆 ${this.getPlayerAvatar(winner.playerId)} ${winner.playerName}</h3>
                    <div class="winner-hand-type">${winner.handType}</div>
                    <div>获得: <strong>+${winner.winnings}</strong> 筹码</div>
                </div>
            `;
            
            // 显示最佳5张牌组合
            if (winner.bestHand && winner.bestHand.length === 5) {
                const bestHandSection = document.createElement('div');
                bestHandSection.className = 'winner-best-hand';
                
                // 添加标题
                const handTitle = document.createElement('div');
                handTitle.className = 'best-hand-title';
                handTitle.textContent = '最佳牌型:';
                bestHandSection.appendChild(handTitle);
                
                // 创建最佳5张牌的显示容器
                const bestHandCards = document.createElement('div');
                bestHandCards.className = 'winner-best-hand-cards';
                
                // 获取玩家手牌和公共牌以便区分
                const playerCards = winner.handCards || [];
                const communityCards = winner.communityCards || [];
                
                winner.bestHand.forEach(card => {
                    const cardElement = document.createElement('div');
                    this.displayCard(cardElement, card, 'small');
                    
                    // 判断这张牌是来自手牌还是公共牌
                    const isFromHand = this.isCardInArray(card, playerCards);
                    const isFromCommunity = this.isCardInArray(card, communityCards);
                    
                    if (isFromHand) {
                        cardElement.classList.add('hand-card');
                        cardElement.title = '手牌';
                    } else if (isFromCommunity) {
                        cardElement.classList.add('community-card');
                        cardElement.title = '公共牌';
                    }
                    
                    cardElement.classList.add('winner');
                    bestHandCards.appendChild(cardElement);
                });
                
                bestHandSection.appendChild(bestHandCards);
                
                // 添加图例说明
                const legend = document.createElement('div');
                legend.className = 'card-legend';
                legend.innerHTML = `
                    <small>
                        <span class="legend-hand">■ 手牌</span>
                        <span class="legend-community">■ 公共牌</span>
                    </small>
                `;
                bestHandSection.appendChild(legend);
                
                winnerDiv.innerHTML = winnerHtml;
                winnerDiv.appendChild(bestHandSection);
            } else {
                // 如果没有最佳牌组合信息，显示原来的手牌
                if (winner.cards) {
                    const winnerCards = document.createElement('div');
                    winnerCards.className = 'winner-cards';
                    winner.cards.forEach(card => {
                        const cardElement = document.createElement('div');
                        this.displayCard(cardElement, card, 'small');
                        cardElement.classList.add('winner');
                        winnerCards.appendChild(cardElement);
                    });
                    winnerDiv.innerHTML = winnerHtml;
                    winnerDiv.appendChild(winnerCards);
                } else {
                    winnerDiv.innerHTML = winnerHtml;
                }
            }
            
            winnerSection.appendChild(winnerDiv);
        });
    }
    
    // 辅助方法：检查卡牌是否在数组中
    isCardInArray(targetCard, cardArray) {
        return cardArray.some(card => 
            card.suit === targetCard.suit && card.rank === targetCard.rank
        );
    }
    
    displaySettlement(settlement) {
        const settlementSection = document.getElementById('round-settlement');
        settlementSection.innerHTML = '<h3>💰 本轮结算</h3>';
        
        settlement.forEach(item => {
            const settlementItem = document.createElement('div');
            settlementItem.className = 'settlement-item';
            
            const changeClass = item.change > 0 ? 'positive' : 'negative';
            const changeSymbol = item.change > 0 ? '+' : '';
            
            settlementItem.innerHTML = `
                <div class="settlement-player">${this.getPlayerAvatar(item.playerId)} ${item.playerName}</div>
                <div>
                    <span>下注: ${item.totalBet}</span>
                    <span class="settlement-change ${changeClass}">${changeSymbol}${item.change}</span>
                    <span>余额: ${item.newChips}</span>
                </div>
            `;
            
            settlementSection.appendChild(settlementItem);
        });
    }
    
    displayAllHands(allHands, communityCards) {
        const allHandsSection = document.getElementById('all-hands-display');
        allHandsSection.innerHTML = '<h3>🃏 所有玩家手牌</h3>';
        
        // 显示公共牌
        const communitySection = document.createElement('div');
        communitySection.innerHTML = '<h4>公共牌:</h4>';
        const communityCardsDiv = document.createElement('div');
        communityCardsDiv.className = 'player-hand-cards';
        communityCardsDiv.style.justifyContent = 'center';
        communityCardsDiv.style.marginBottom = '20px';
        
        communityCards.forEach(card => {
            const cardElement = document.createElement('div');
            this.displayCard(cardElement, card, 'small');
            communityCardsDiv.appendChild(cardElement);
        });
        
        communitySection.appendChild(communityCardsDiv);
        allHandsSection.appendChild(communitySection);
        
        // 创建网格容器用于每行显示两个玩家
        const playersGrid = document.createElement('div');
        playersGrid.className = 'players-grid';
        
        // 显示每个玩家的手牌
        allHands.forEach(hand => {
            const handDisplay = document.createElement('div');
            handDisplay.className = `player-hand-display ${hand.folded ? 'folded' : ''}`;
            
            const isWinner = document.getElementById('winner-section').textContent.includes(hand.playerName);
            if (isWinner) {
                handDisplay.classList.add('winner');
            }
            
            const handInfo = document.createElement('div');
            handInfo.className = 'player-hand-info';
            
            const nameAndStrength = document.createElement('div');
            nameAndStrength.innerHTML = `
                <div><strong>${this.getPlayerAvatar(hand.playerId)} ${hand.playerName}</strong></div>
                <div class="player-hand-strength">${hand.handStrength}</div>
            `;
            
            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'player-hand-cards';
            
            if (!hand.folded && hand.cards) {
                hand.cards.forEach(card => {
                    const cardElement = document.createElement('div');
                    this.displayCard(cardElement, card, 'small');
                    cardsDiv.appendChild(cardElement);
                });
            } else {
                cardsDiv.innerHTML = '<div class="card small empty">弃牌</div>';
            }
            
            handInfo.appendChild(nameAndStrength);
            handDisplay.appendChild(handInfo);
            handDisplay.appendChild(cardsDiv);
            
            playersGrid.appendChild(handDisplay);
        });
        
        allHandsSection.appendChild(playersGrid);
    }
    
    updateRoundConfirmations(data) {
        const confirmationStatus = document.getElementById('confirmation-status');
        const confirmBtn = document.getElementById('confirm-round-btn');
        
        if (data.allConfirmed) {
            confirmationStatus.textContent = '所有玩家已确认，即将开始下一轮...';
            confirmBtn.disabled = true;
            confirmBtn.textContent = '已确认';
            
            // 3秒后关闭模态框
            setTimeout(() => {
                this.closeRoundResultModal();
            }, 2000);
        } else {
            const confirmedCount = Object.values(data.confirmations).filter(confirmed => confirmed).length;
            const totalCount = Object.keys(data.confirmations).length;
            confirmationStatus.textContent = `等待确认 (${confirmedCount}/${totalCount})`;
            
            // 检查当前玩家是否已确认
            const hasConfirmed = data.confirmations[this.playerId];
            if (hasConfirmed) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = '已确认';
            }
            
            // 显示确认状态
            this.displayConfirmationStatus(data.confirmations);
        }
    }
    
    displayConfirmationStatus(confirmations) {
        const existingStatus = document.querySelector('.confirmed-players');
        if (existingStatus) existingStatus.remove();
        
        const statusDiv = document.createElement('div');
        statusDiv.className = 'confirmed-players';
        
        // 找到对应的玩家名称
        if (this.gameState && this.gameState.players) {
            Object.keys(confirmations).forEach(playerId => {
                const player = this.gameState.players.find(p => p.id === playerId);
                if (player) {
                    const playerStatus = document.createElement('div');
                    playerStatus.className = confirmations[playerId] ? 'confirmed-player' : 'pending-player';
                    playerStatus.textContent = `${this.getPlayerAvatar(playerId)} ${player.name}` + (confirmations[playerId] ? ' ✓' : ' ...');
                    statusDiv.appendChild(playerStatus);
                }
            });
        }
        
        document.getElementById('confirmation-status').appendChild(statusDiv);
    }
    
    confirmRoundResult() {
        // 防止重复点击
        const confirmBtn = document.getElementById('confirm-round-btn');
        if (confirmBtn.disabled) {
            return;
        }
        
        this.socket.emit('confirm-round-result');
        confirmBtn.disabled = true;
        confirmBtn.textContent = '已确认';
    }
    
    closeRoundResultModal() {
        const modal = document.getElementById('round-result-modal');
        modal.style.display = 'none';
        
        // 重置确认按钮状态，为下一轮做准备
        const confirmBtn = document.getElementById('confirm-round-btn');
        confirmBtn.disabled = false;
        confirmBtn.textContent = '确认结果';
    }
    
    leaveRoom() {
        if (confirm('确定要离开当前房间吗？')) {
            this.socket.disconnect();
            this.socket.connect();
            
            // 重置游戏状态
            this.gameId = null;
            this.playerId = null;
            this.gameState = null;
            
            // 返回首页
            document.getElementById('game-screen').style.display = 'none';
            document.getElementById('loading-screen').style.display = 'flex';
            
            // 重新加载房间列表
            this.loadRoomList();
            
            this.showToast('已离开房间', 'info');
        }
    }
    
    loadRoomList() {
        // 显示加载提示
        const roomList = document.getElementById('room-list');
        roomList.innerHTML = '<div class="no-rooms">🔄 刷新中...</div>';
        
        this.socket.emit('get-room-list');
    }
    
    updateRoomList(rooms) {
        const roomList = document.getElementById('room-list');
        
        if (!rooms || rooms.length === 0) {
            roomList.innerHTML = '<div class="no-rooms">暂无活跃房间</div>';
            return;
        }
        
        roomList.innerHTML = '';
        rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';
            
            const roomId = document.createElement('div');
            roomId.className = 'room-id';
            roomId.textContent = `房间: ${room.id}`;
            
            const roomPlayers = document.createElement('div');
            roomPlayers.className = 'room-players';
            roomPlayers.textContent = `玩家: ${room.playerCount}/8`;
            
            const roomStatus = document.createElement('div');
            roomStatus.className = `room-status ${room.stage === 'waiting' ? 'waiting' : 'playing'}`;
            roomStatus.textContent = room.stage === 'waiting' ? '等待中' : '游戏中';
            
            roomItem.appendChild(roomId);
            roomItem.appendChild(roomPlayers);
            roomItem.appendChild(roomStatus);
            
            // 点击加入房间
            roomItem.addEventListener('click', () => {
                const playerName = document.getElementById('playerName').value.trim();
                if (!playerName) {
                    this.showToast('请先输入玩家昵称', 'error');
                    document.getElementById('playerName').focus();
                    return;
                }
                
                document.getElementById('gameId').value = room.id;
                this.joinGame();
            });
            
            roomList.appendChild(roomItem);
        });
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new PokerGameClient();
    window.pokerGame = game; // 用于调试
});