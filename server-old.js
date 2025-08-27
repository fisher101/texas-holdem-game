const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }
    
    getValue() {
        if (this.rank === 'A') return 14;
        if (this.rank === 'K') return 13;
        if (this.rank === 'Q') return 12;
        if (this.rank === 'J') return 11;
        return parseInt(this.rank);
    }
    
    toString() {
        return `${this.rank}${this.suit}`;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.initializeDeck();
        this.shuffle();
    }
    
    initializeDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        for (let suit of suits) {
            for (let rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }
    
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    dealCard() {
        return this.cards.pop();
    }
}

class HandEvaluator {
    static evaluateHand(cards) {
        if (cards.length !== 5) return { rank: 0, name: 'Invalid Hand' };
        
        const sortedCards = cards.sort((a, b) => b.getValue() - a.getValue());
        const values = sortedCards.map(card => card.getValue());
        const suits = sortedCards.map(card => card.suit);
        
        const valueCounts = {};
        values.forEach(value => {
            valueCounts[value] = (valueCounts[value] || 0) + 1;
        });
        
        const counts = Object.values(valueCounts).sort((a, b) => b - a);
        const isFlush = suits.every(suit => suit === suits[0]);
        const isStraight = this.isStraight(values);
        
        if (isStraight && isFlush) {
            if (values[0] === 14 && values[1] === 13) {
                return { rank: 10, name: '皇家同花顺', kickers: values };
            }
            return { rank: 9, name: '同花顺', kickers: values };
        }
        
        if (counts[0] === 4) {
            return { rank: 8, name: '四条', kickers: values };
        }
        
        if (counts[0] === 3 && counts[1] === 2) {
            return { rank: 7, name: '葫芦', kickers: values };
        }
        
        if (isFlush) {
            return { rank: 6, name: '同花', kickers: values };
        }
        
        if (isStraight) {
            return { rank: 5, name: '顺子', kickers: values };
        }
        
        if (counts[0] === 3) {
            return { rank: 4, name: '三条', kickers: values };
        }
        
        if (counts[0] === 2 && counts[1] === 2) {
            return { rank: 3, name: '两对', kickers: values };
        }
        
        if (counts[0] === 2) {
            return { rank: 2, name: '一对', kickers: values };
        }
        
        return { rank: 1, name: '高牌', kickers: values };
    }
    
    static isStraight(values) {
        for (let i = 0; i < values.length - 1; i++) {
            if (values[i] - values[i + 1] !== 1) {
                if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
                    return true;
                }
                return false;
            }
        }
        return true;
    }
    
    static getBestHand(playerCards, communityCards) {
        const allCards = [...playerCards, ...communityCards];
        let bestHand = null;
        let bestEvaluation = { rank: 0 };
        
        for (let i = 0; i < allCards.length; i++) {
            for (let j = i + 1; j < allCards.length; j++) {
                for (let k = j + 1; k < allCards.length; k++) {
                    for (let l = k + 1; l < allCards.length; l++) {
                        for (let m = l + 1; m < allCards.length; m++) {
                            const hand = [allCards[i], allCards[j], allCards[k], allCards[l], allCards[m]];
                            const evaluation = this.evaluateHand(hand);
                            
                            if (evaluation.rank > bestEvaluation.rank) {
                                bestHand = hand;
                                bestEvaluation = evaluation;
                            }
                        }
                    }
                }
            }
        }
        
        return { hand: bestHand, evaluation: bestEvaluation };
    }
}

class Player {
    constructor(id, name, socket) {
        this.id = id;
        this.name = name;
        this.socket = socket;
        this.chips = 1000;
        this.cards = [];
        this.currentBet = 0;
        this.totalBet = 0;
        this.folded = false;
        this.isAllIn = false;
        this.stats = {
            gamesPlayed: 0,
            wins: 0,
            totalWinnings: 0
        };
    }
    
    resetForNewHand() {
        this.cards = [];
        this.currentBet = 0;
        this.totalBet = 0;
        this.folded = false;
        this.isAllIn = false;
    }
}

class PokerGame {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.deck = null;
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.currentPlayerIndex = 0;
        this.dealerIndex = 0;
        this.stage = 'waiting';
        this.gameHistory = [];
        this.chatMessages = [];
        this.actionHistory = [];
        this.smallBlind = 5;
        this.bigBlind = 10;
    }
    
    addPlayer(player) {
        if (this.players.length < 8) {
            this.players.push(player);
            return true;
        }
        return false;
    }
    
    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
    }
    
    startGame() {
        if (this.players.length < 2) return false;
        
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = this.bigBlind;
        this.stage = 'preflop';
        
        this.players.forEach(player => player.resetForNewHand());
        
        this.postBlinds();
        this.dealHoleCards();
        this.setNextPlayer();
        
        return true;
    }
    
    postBlinds() {
        const smallBlindPlayer = this.players[this.dealerIndex + 1] || this.players[0];
        const bigBlindPlayer = this.players[this.dealerIndex + 2] || this.players[(this.dealerIndex + 2) % this.players.length];
        
        smallBlindPlayer.currentBet = this.smallBlind;
        smallBlindPlayer.chips -= this.smallBlind;
        smallBlindPlayer.totalBet += this.smallBlind;
        
        bigBlindPlayer.currentBet = this.bigBlind;
        bigBlindPlayer.chips -= this.bigBlind;
        bigBlindPlayer.totalBet += this.bigBlind;
        
        this.pot = this.smallBlind + this.bigBlind;
    }
    
    dealHoleCards() {
        this.players.forEach(player => {
            player.cards = [this.deck.dealCard(), this.deck.dealCard()];
        });
    }
    
    setNextPlayer() {
        const activePlayers = this.players.filter(p => !p.folded && !p.isAllIn);
        if (activePlayers.length <= 1) {
            this.endHand();
            return;
        }
        
        let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
        while (this.players[nextIndex].folded || this.players[nextIndex].isAllIn) {
            nextIndex = (nextIndex + 1) % this.players.length;
        }
        this.currentPlayerIndex = nextIndex;
    }
    
    playerAction(playerId, action, amount = 0) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.id !== this.players[this.currentPlayerIndex].id) {
            return false;
        }
        
        const actionRecord = {
            playerId,
            playerName: player.name,
            action,
            amount,
            timestamp: new Date()
        };
        
        switch (action) {
            case 'fold':
                player.folded = true;
                break;
                
            case 'check':
                if (player.currentBet < this.currentBet) return false;
                break;
                
            case 'call':
                const callAmount = this.currentBet - player.currentBet;
                if (callAmount > player.chips) {
                    player.isAllIn = true;
                    this.pot += player.chips;
                    player.totalBet += player.chips;
                    player.currentBet += player.chips;
                    player.chips = 0;
                } else {
                    player.chips -= callAmount;
                    player.currentBet += callAmount;
                    player.totalBet += callAmount;
                    this.pot += callAmount;
                }
                break;
                
            case 'raise':
                const raiseAmount = amount - player.currentBet;
                if (raiseAmount > player.chips) return false;
                if (amount <= this.currentBet) return false;
                
                player.chips -= raiseAmount;
                player.currentBet = amount;
                player.totalBet += raiseAmount;
                this.pot += raiseAmount;
                this.currentBet = amount;
                break;
                
            default:
                return false;
        }
        
        this.actionHistory.push(actionRecord);
        
        if (this.checkBettingRoundComplete()) {
            this.nextStage();
        } else {
            this.setNextPlayer();
        }
        
        return true;
    }
    
    checkBettingRoundComplete() {
        const activePlayers = this.players.filter(p => !p.folded && !p.isAllIn);
        return activePlayers.every(p => p.currentBet === this.currentBet) && activePlayers.length > 0;
    }
    
    nextStage() {
        this.players.forEach(player => {
            player.currentBet = 0;
        });
        
        switch (this.stage) {
            case 'preflop':
                this.stage = 'flop';
                this.communityCards = [this.deck.dealCard(), this.deck.dealCard(), this.deck.dealCard()];
                break;
                
            case 'flop':
                this.stage = 'turn';
                this.communityCards.push(this.deck.dealCard());
                break;
                
            case 'turn':
                this.stage = 'river';
                this.communityCards.push(this.deck.dealCard());
                break;
                
            case 'river':
                this.endHand();
                return;
        }
        
        this.currentBet = 0;
        this.setNextPlayer();
    }
    
    endHand() {
        this.stage = 'showdown';
        const activePlayers = this.players.filter(p => !p.folded);
        
        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            winner.chips += this.pot;
            winner.stats.wins++;
            winner.stats.totalWinnings += this.pot;
            this.gameHistory.push({
                winner: winner.name,
                winnings: this.pot,
                handType: 'Fold Win',
                timestamp: new Date()
            });
        } else {
            const results = activePlayers.map(player => {
                const bestHand = HandEvaluator.getBestHand(player.cards, this.communityCards);
                return {
                    player,
                    ...bestHand
                };
            });
            
            results.sort((a, b) => {
                if (a.evaluation.rank !== b.evaluation.rank) {
                    return b.evaluation.rank - a.evaluation.rank;
                }
                
                for (let i = 0; i < a.evaluation.kickers.length; i++) {
                    if (a.evaluation.kickers[i] !== b.evaluation.kickers[i]) {
                        return b.evaluation.kickers[i] - a.evaluation.kickers[i];
                    }
                }
                return 0;
            });
            
            const winners = results.filter(r => r.evaluation.rank === results[0].evaluation.rank);
            const winnings = Math.floor(this.pot / winners.length);
            
            winners.forEach(winner => {
                winner.player.chips += winnings;
                winner.player.stats.wins++;
                winner.player.stats.totalWinnings += winnings;
            });
            
            this.gameHistory.push({
                winners: winners.map(w => w.player.name),
                winnings,
                handType: results[0].evaluation.name,
                timestamp: new Date()
            });
        }
        
        this.players.forEach(player => {
            player.stats.gamesPlayed++;
        });
        
        // 5秒后自动开始新局
        setTimeout(() => {
            this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
            
            // 检查是否还有足够的玩家和筹码继续游戏
            const validPlayers = this.players.filter(p => p.chips >= this.bigBlind);
            if (validPlayers.length >= 2) {
                // 自动开始新局
                if (this.startGame()) {
                    // 广播新局开始
                    this.players.forEach(player => {
                        if (player.socket) {
                            player.socket.emit('game-started');
                            player.socket.emit('game-state', {
                                players: this.players.map(p => ({
                                    id: p.id,
                                    name: p.name,
                                    chips: p.chips,
                                    currentBet: p.currentBet,
                                    folded: p.folded,
                                    isAllIn: p.isAllIn,
                                    cards: p.id === player.id ? p.cards : null
                                })),
                                communityCards: this.communityCards,
                                pot: this.pot,
                                currentBet: this.currentBet,
                                currentPlayer: this.players[this.currentPlayerIndex]?.id,
                                stage: this.stage,
                                dealerIndex: this.dealerIndex
                            });
                        }
                    });
                }
            } else {
                // 游戏结束，没有足够的玩家继续
                this.stage = 'waiting';
                this.players.forEach(player => {
                    if (player.socket) {
                        player.socket.emit('game-ended', {
                            message: '游戏结束，筹码不足或玩家人数不够',
                            finalStats: this.players.map(p => ({
                                name: p.name,
                                chips: p.chips,
                                stats: p.stats
                            }))
                        });
                    }
                });
            }
        }, 5000);
    }
    
    addChatMessage(playerId, message) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            const chatMessage = {
                playerId,
                playerName: player.name,
                message,
                timestamp: new Date()
            };
            this.chatMessages.push(chatMessage);
            return chatMessage;
        }
        return null;
    }
}

const games = new Map();

io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);
    
    socket.on('join-game', (data) => {
        const { gameId, playerName } = data;
        
        if (!games.has(gameId)) {
            games.set(gameId, new PokerGame(gameId));
        }
        
        const game = games.get(gameId);
        const player = new Player(socket.id, playerName, socket);
        
        if (game.addPlayer(player)) {
            socket.join(gameId);
            socket.emit('joined-game', { success: true, playerId: socket.id });
            // 为每个玩家发送个性化的游戏状态
            game.players.forEach(p => {
                p.socket.emit('game-state', {
                    players: game.players.map(player => ({
                        id: player.id,
                        name: player.name,
                        chips: player.chips,
                        currentBet: player.currentBet,
                        folded: player.folded,
                        isAllIn: player.isAllIn,
                        cards: player.id === p.id ? player.cards : null,
                        stats: player.stats
                    })),
                    communityCards: game.communityCards,
                    pot: game.pot,
                    currentBet: game.currentBet,
                    currentPlayer: game.players[game.currentPlayerIndex]?.id,
                    stage: game.stage,
                    dealerIndex: game.dealerIndex
                });
            });
        } else {
            socket.emit('joined-game', { success: false, message: '房间已满' });
        }
    });
    
    socket.on('start-game', () => {
        const game = Array.from(games.values()).find(g => g.players.some(p => p.id === socket.id));
        if (game && game.stage === 'waiting') {
            if (game.startGame()) {
                io.to(game.id).emit('game-started');
                // 为每个玩家发送个性化的游戏状态（包含自己的手牌）
                game.players.forEach(player => {
                    player.socket.emit('game-state', {
                        players: game.players.map(p => ({
                            id: p.id,
                            name: p.name,
                            chips: p.chips,
                            currentBet: p.currentBet,
                            folded: p.folded,
                            isAllIn: p.isAllIn,
                            cards: p.id === player.id ? p.cards : null, // 只发送自己的牌
                            stats: p.stats
                        })),
                        communityCards: game.communityCards,
                        pot: game.pot,
                        currentBet: game.currentBet,
                        currentPlayer: game.players[game.currentPlayerIndex]?.id,
                        stage: game.stage,
                        dealerIndex: game.dealerIndex
                    });
                });
            }
        }
    });
    
    socket.on('player-action', (data) => {
        const game = Array.from(games.values()).find(g => g.players.some(p => p.id === socket.id));
        if (game) {
            const { action, amount } = data;
            if (game.playerAction(socket.id, action, amount)) {
                // 为每个玩家发送个性化的游戏状态
                game.players.forEach(player => {
                    player.socket.emit('game-state', {
                        players: game.players.map(p => ({
                            id: p.id,
                            name: p.name,
                            chips: p.chips,
                            currentBet: p.currentBet,
                            folded: p.folded,
                            isAllIn: p.isAllIn,
                            cards: (p.id === player.id || game.stage === 'showdown') ? p.cards : null,
                            stats: p.stats // 确保传递统计数据
                        })),
                        communityCards: game.communityCards,
                        pot: game.pot,
                        currentBet: game.currentBet,
                        currentPlayer: game.players[game.currentPlayerIndex]?.id,
                        stage: game.stage,
                        dealerIndex: game.dealerIndex,
                        lastAction: game.actionHistory[game.actionHistory.length - 1]
                    });
                });
            }
        }
    });
    
    socket.on('chat-message', (data) => {
        const game = Array.from(games.values()).find(g => g.players.some(p => p.id === socket.id));
        if (game) {
            const chatMessage = game.addChatMessage(socket.id, data.message);
            if (chatMessage) {
                io.to(game.id).emit('chat-message', chatMessage);
            }
        }
    });
    
    socket.on('disconnect', () => {
        console.log('用户断开连接:', socket.id);
        games.forEach(game => {
            game.removePlayer(socket.id);
            if (game.players.length === 0) {
                games.delete(game.id);
            } else {
                io.to(game.id).emit('game-state', {
                    players: game.players.map(p => ({
                        id: p.id,
                        name: p.name,
                        chips: p.chips,
                        currentBet: p.currentBet,
                        folded: p.folded,
                        isAllIn: p.isAllIn
                    })),
                    communityCards: game.communityCards,
                    pot: game.pot,
                    currentBet: game.currentBet,
                    currentPlayer: game.players[game.currentPlayerIndex]?.id,
                    stage: game.stage,
                    dealerIndex: game.dealerIndex
                });
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`德州扑克服务器运行在端口 ${PORT}`);
    console.log(`访问地址: http://localhost:${PORT}`);
});