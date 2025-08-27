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
        if (cards.length !== 5) return { rank: 0, name: 'Invalid Hand', kickers: [] };
        
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
        
        // 获取按出现频次和牌值排序的kickers
        const getKickers = () => {
            const sortedByCount = Object.entries(valueCounts)
                .sort((a, b) => {
                    if (b[1] !== a[1]) return b[1] - a[1]; // 先按出现次数排序
                    return b[0] - a[0]; // 再按牌值排序
                })
                .map(entry => parseInt(entry[0]));
            return sortedByCount;
        };
        
        if (isStraight && isFlush) {
            if (values[0] === 14 && values[1] === 13) {
                return { rank: 10, name: '皇家同花顺', kickers: [14], allValues: values }; // 皇家同花顺以A为关键牌
            }
            return { rank: 9, name: '同花顺', kickers: [values[0]], allValues: values }; // 同花顺以最高牌为关键牌
        }
        
        if (counts[0] === 4) {
            const kickers = getKickers();
            return { rank: 8, name: '四条', kickers: kickers, allValues: values }; 
        }
        
        if (counts[0] === 3 && counts[1] === 2) {
            const kickers = getKickers();
            return { rank: 7, name: '葫芦', kickers: kickers, allValues: values }; 
        }
        
        if (isFlush) {
            return { rank: 6, name: '同花', kickers: values, allValues: values }; 
        }
        
        if (isStraight) {
            // A-2-3-4-5特殊处理
            if (values[0] === 14 && values[1] === 5) {
                return { rank: 5, name: '顺子', kickers: [5], allValues: [5, 4, 3, 2, 1] }; // A-2-3-4-5顺子，5是最高牌
            }
            return { rank: 5, name: '顺子', kickers: [values[0]], allValues: values }; // 其他顺子以最高牌为关键牌
        }
        
        if (counts[0] === 3) {
            const kickers = getKickers();
            return { rank: 4, name: '三条', kickers: kickers, allValues: values }; 
        }
        
        if (counts[0] === 2 && counts[1] === 2) {
            const kickers = getKickers();
            return { rank: 3, name: '两对', kickers: kickers, allValues: values }; 
        }
        
        if (counts[0] === 2) {
            const kickers = getKickers();
            return { rank: 2, name: '一对', kickers: kickers, allValues: values }; 
        }
        
        return { rank: 1, name: '高牌', kickers: values, allValues: values };
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
            totalWinnings: 0,
            netProfit: 0  // 新增净盈亏统计
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
        this.roundConfirmations = {};
        this.playersActedThisRound = new Set(); // 追踪本轮已行动的玩家
        this.lastPlayerToAct = null; // 追踪最后一个需要行动的玩家
    }
    
    addPlayer(player) {
        // 检查是否已经存在该玩家
        if (this.players.find(p => p.id === player.id)) {
            return false;
        }
        
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
        
        // 重置本轮已行动玩家记录
        this.playersActedThisRound.clear();
        
        this.postBlinds();
        this.dealHoleCards();
        
        // 在翻牌前，小盲和大盲是强制下注，但大盲在没有加注的情况下还可以行动
        // 所以不标记任何玩家为已行动，让大盲也有机会check或raise
        
        console.log(`新轮次开始 - 庄家: ${this.players[this.dealerIndex].name}, 小盲: ${this.players[this.smallBlindIndex].name}, 大盲: ${this.players[this.bigBlindIndex].name}`);
        this.logPreflopOrder(); // 显示完整的翻牌前下注顺序
        
        this.setFirstPlayerForPreflop();
        
        return true;
    }
    
    postBlinds() {
        const smallBlindPlayer = this.players[(this.dealerIndex + 1) % this.players.length];
        const bigBlindPlayer = this.players[(this.dealerIndex + 2) % this.players.length];
        
        this.smallBlindIndex = (this.dealerIndex + 1) % this.players.length;
        this.bigBlindIndex = (this.dealerIndex + 2) % this.players.length;
        
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
        
        // 调试信息：显示下一个行动的玩家
        if (this.stage === 'preflop') {
            const currentPlayer = this.players[this.currentPlayerIndex];
            const playerPosition = this.getPlayerPosition(this.currentPlayerIndex);
            console.log(`翻牌前下个行动玩家: ${currentPlayer.name} (${playerPosition}位置)`);
        }
    }
    
    // 辅助方法：获取玩家位置描述
    getPlayerPosition(playerIndex) {
        if (playerIndex === this.dealerIndex) return '庄家';
        if (playerIndex === this.smallBlindIndex) return '小盲';
        if (playerIndex === this.bigBlindIndex) return '大盲';
        
        // 计算相对于UTG的位置
        const utgIndex = (this.bigBlindIndex + 1) % this.players.length;
        if (playerIndex === utgIndex) return 'UTG';
        
        // 计算UTG后的位置
        const utg1Index = (utgIndex + 1) % this.players.length;
        if (playerIndex === utg1Index) return 'UTG+1';
        
        const utg2Index = (utgIndex + 2) % this.players.length;
        if (playerIndex === utg2Index) return 'UTG+2';
        
        return `位置${playerIndex}`;
    }
    
    // 显示翻牌前完整的下注顺序
    logPreflopOrder() {
        if (this.players.length === 2) {
            console.log(`翻牌前下注顺序 (2人桌): 小盲 → 大盲`);
            return;
        }
        
        // 3+人桌的完整顺序：从UTG开始，顺时针到大盲
        const order = [];
        const utgIndex = (this.bigBlindIndex + 1) % this.players.length;
        
        for (let i = 0; i < this.players.length; i++) {
            const playerIndex = (utgIndex + i) % this.players.length;
            const player = this.players[playerIndex];
            const position = this.getPlayerPosition(playerIndex);
            
            if (!player.folded && !player.isAllIn) {
                order.push(`${player.name}(${position})`);
            }
        }
        
        console.log(`翻牌前下注顺序: ${order.join(' → ')}`);
    }
    
    setFirstPlayerForPreflop() {
        // 翻牌前下注顺序规则：
        // - 2人桌：小盲先行动（庄家是小盲）
        // - 3+人桌：UTG玩家开始，顺时针依次行动（UTG → UTG+1 → ... → 庄家 → 小盲 → 大盲）
        if (this.players.length === 2) {
            // 只有2个玩家时，小盲（庄家）先行动
            this.currentPlayerIndex = this.smallBlindIndex;
            console.log(`翻牌前首次下注玩家: ${this.players[this.currentPlayerIndex].name} (小盲位置)`);
        } else {
            // 3个或更多玩家时，必须从UTG位置开始，顺时针依次行动
            const utgIndex = (this.bigBlindIndex + 1) % this.players.length;
            
            // 从UTG位置开始查找第一个可以行动的玩家
            for (let i = 0; i < this.players.length; i++) {
                const playerIndex = (utgIndex + i) % this.players.length;
                const player = this.players[playerIndex];
                
                if (!player.folded && !player.isAllIn) {
                    this.currentPlayerIndex = playerIndex;
                    const position = this.getPlayerPosition(playerIndex);
                    console.log(`翻牌前首次下注玩家: ${player.name} (${position}位置)`);
                    console.log(`预期下注顺序: UTG → UTG+1 → ... → 庄家 → 小盲 → 大盲`);
                    return;
                }
            }
        }
    }
    
    setFirstPlayerForPostFlop() {
        // 在翻牌圈及以后，第一个行动者应该是小盲位置（如果仍在游戏中）
        // 然后按顺时针方向找到第一个未弃牌且未全押的玩家
        let startIndex = this.smallBlindIndex;
        
        // 从小盲位置开始查找第一个可以行动的玩家
        for (let i = 0; i < this.players.length; i++) {
            const playerIndex = (startIndex + i) % this.players.length;
            const player = this.players[playerIndex];
            
            if (!player.folded && !player.isAllIn) {
                this.currentPlayerIndex = playerIndex;
                return;
            }
        }
        
        // 如果没有找到可以行动的玩家，结束这一轮
        this.endHand();
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
        
        // 记录玩家已在本轮行动
        this.playersActedThisRound.add(playerId);
        
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
                
                // 加注后，清空已行动玩家记录（除了当前玩家）
                this.playersActedThisRound.clear();
                this.playersActedThisRound.add(playerId);
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
        
        // 如果只有1个或0个活跃玩家，下注回合结束
        if (activePlayers.length <= 1) {
            console.log('下注回合结束：只剩1个或0个活跃玩家');
            return true;
        }
        
        // 检查所有活跃玩家的下注是否相等
        const allBetsEqual = activePlayers.every(p => p.currentBet === this.currentBet);
        if (!allBetsEqual) {
            console.log('下注回合未完成：玩家下注金额不相等');
            return false;
        }
        
        // 检查是否所有活跃玩家都已经在本轮行动过
        const allPlayersActed = activePlayers.every(p => this.playersActedThisRound.has(p.id));
        
        if (this.stage === 'preflop') {
            console.log(`翻牌前下注检查: 活跃玩家${activePlayers.length}人, 已行动玩家${this.playersActedThisRound.size}人`);
            
            // 翻牌前特殊逻辑：确保完整的UTG→大盲顺序完成
            if (this.currentBet === this.bigBlind) {
                // 没有加注的情况：所有人必须行动，包括大盲
                const bigBlindPlayer = this.players[this.bigBlindIndex];
                if (bigBlindPlayer && !bigBlindPlayer.folded && !bigBlindPlayer.isAllIn) {
                    if (!this.playersActedThisRound.has(bigBlindPlayer.id)) {
                        console.log('翻牌前未完成：等待大盲行动（无加注）');
                        return false;
                    }
                }
            }
            
            // 验证是否按照UTG开始的顺序完成了一轮
            if (!this.verifyPreflopOrderComplete()) {
                return false;
            }
        }
        
        const result = allPlayersActed;
        console.log(`下注回合${result ? '已完成' : '未完成'}：所有玩家已行动=${allPlayersActed}`);
        return result;
    }
    
    // 验证翻牌前是否按UTG顺序完成了完整一轮
    verifyPreflopOrderComplete() {
        if (this.players.length === 2) {
            // 2人桌：小盲和大盲都必须行动
            const smallBlindActed = this.playersActedThisRound.has(this.players[this.smallBlindIndex].id);
            const bigBlindActed = this.playersActedThisRound.has(this.players[this.bigBlindIndex].id);
            
            if (!smallBlindActed || !bigBlindActed) {
                console.log('翻牌前未完成：2人桌需要小盲和大盲都行动');
                return false;
            }
            return true;
        }
        
        // 3+人桌：验证从UTG开始的顺序
        const utgIndex = (this.bigBlindIndex + 1) % this.players.length;
        const expectedOrder = [];
        
        // 生成期望的行动顺序：UTG → ... → 大盲
        for (let i = 0; i < this.players.length; i++) {
            const playerIndex = (utgIndex + i) % this.players.length;
            const player = this.players[playerIndex];
            
            if (!player.folded && !player.isAllIn) {
                expectedOrder.push(player.id);
            }
        }
        
        // 检查是否所有期望的玩家都已行动
        const missingPlayers = expectedOrder.filter(playerId => !this.playersActedThisRound.has(playerId));
        
        if (missingPlayers.length > 0) {
            const missingNames = missingPlayers.map(id => {
                const player = this.players.find(p => p.id === id);
                return player ? player.name : 'Unknown';
            });
            console.log(`翻牌前未完成：还有${missingPlayers.length}个玩家未行动: ${missingNames.join(', ')}`);
            return false;
        }
        
        console.log('翻牌前顺序验证完成：所有玩家已按UTG开始的顺序行动');
        return true;
    }
    
    nextStage() {
        console.log(`=== 阶段转换: ${this.stage} → 下一阶段 ===`);
        
        this.players.forEach(player => {
            player.currentBet = 0;
        });
        
        // 重置本轮已行动玩家记录
        this.playersActedThisRound.clear();
        
        switch (this.stage) {
            case 'preflop':
                this.stage = 'flop';
                this.communityCards = [this.deck.dealCard(), this.deck.dealCard(), this.deck.dealCard()];
                console.log('✅ 翻牌前下注完成，发放翻牌：', this.communityCards.map(c => `${c.rank}${c.suit}`).join(' '));
                break;
                
            case 'flop':
                this.stage = 'turn';
                this.communityCards.push(this.deck.dealCard());
                console.log('✅ 翻牌下注完成，发放转牌：', this.communityCards[3].rank + this.communityCards[3].suit);
                break;
                
            case 'turn':
                this.stage = 'river';
                this.communityCards.push(this.deck.dealCard());
                console.log('✅ 转牌下注完成，发放河牌：', this.communityCards[4].rank + this.communityCards[4].suit);
                break;
                
            case 'river':
                console.log('✅ 河牌下注完成，进入摊牌阶段');
                this.endHand();
                return;
        }
        
        this.currentBet = 0;
        console.log(`新阶段开始: ${this.stage}，重置下注金额为0`);
        // 修复：在翻牌圈及以后，第一个行动者应该是小盲位置
        this.setFirstPlayerForPostFlop();
    }
    
    endHand() {
        this.stage = 'showdown';
        const activePlayers = this.players.filter(p => !p.folded);
        let roundResult = {
            type: 'round-end',
            pot: this.pot,
            winners: [],
            settlement: [],
            allHands: []
        };
        
        // 记录所有玩家的手牌
        this.players.forEach(player => {
            if (player.cards) {
                const handStrength = player.folded ? '弃牌' : 
                    HandEvaluator.getBestHand(player.cards, this.communityCards).evaluation.name;
                roundResult.allHands.push({
                    playerId: player.id,
                    playerName: player.name,
                    cards: player.cards,
                    handStrength: handStrength,
                    folded: player.folded
                });
            }
        });
        
        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            const winnings = this.pot;
            winner.chips += winnings;
            winner.stats.wins++;
            winner.stats.totalWinnings += winnings;
            
            roundResult.winners = [{
                playerId: winner.id,
                playerName: winner.name,
                winnings: winnings,
                handType: 'Fold Win'
            }];
            
            this.gameHistory.push({
                winner: winner.name,
                winnings: winnings,
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
            
            // 找出最高牌型的玩家
            const topRankPlayers = results.filter(r => r.evaluation.rank === results[0].evaluation.rank);
            
            // 如果只有一个玩家有最高牌型，直接获胜
            let winners;
            if (topRankPlayers.length === 1) {
                winners = topRankPlayers;
            } else {
                // 多个玩家牌型相同，需要比较踢脚牌
                winners = this.compareKickers(topRankPlayers);
            }
            
            const winnings = Math.floor(this.pot / winners.length);
            
            winners.forEach(winner => {
                winner.player.chips += winnings;
                winner.player.stats.wins++;
                winner.player.stats.totalWinnings += winnings;
                
                roundResult.winners.push({
                    playerId: winner.player.id,
                    playerName: winner.player.name,
                    winnings: winnings,
                    handType: winner.evaluation.name,
                    cards: winner.player.cards,
                    bestHand: winner.hand,
                    handCards: winner.player.cards,
                    communityCards: this.communityCards
                });
            });
            
            this.gameHistory.push({
                winners: winners.map(w => w.player.name),
                winnings,
                handType: results[0].evaluation.name,
                timestamp: new Date()
            });
        }
        
        // 生成结算清单
        this.players.forEach(player => {
            const change = (roundResult.winners.find(w => w.playerId === player.id)?.winnings || 0) - player.totalBet;
            // 更新净盈亏统计
            player.stats.netProfit += change;
            
            roundResult.settlement.push({
                playerId: player.id,
                playerName: player.name,
                change: change,
                totalBet: player.totalBet,
                newChips: player.chips
            });
            player.stats.gamesPlayed++;
        });
        
        // 初始化确认状态
        this.roundConfirmations = {};
        this.players.forEach(player => {
            this.roundConfirmations[player.id] = false;
        });
        
        // 发送轮次结果给所有玩家
        this.players.forEach(player => {
            if (player.socket) {
                player.socket.emit('round-result', {
                    ...roundResult,
                    communityCards: this.communityCards,
                    confirmations: this.roundConfirmations
                });
            }
        });
    }
    
    confirmRoundResult(playerId) {
        if (this.roundConfirmations && this.roundConfirmations.hasOwnProperty(playerId)) {
            this.roundConfirmations[playerId] = true;
            
            // 检查是否所有玩家都已确认
            const allConfirmed = Object.values(this.roundConfirmations).every(confirmed => confirmed);
            
            // 广播确认状态更新
            this.players.forEach(player => {
                if (player.socket) {
                    player.socket.emit('round-confirmations-update', {
                        confirmations: this.roundConfirmations,
                        allConfirmed: allConfirmed
                    });
                }
            });
            
            if (allConfirmed) {
                // 所有玩家都确认了，开始新局
                setTimeout(() => {
                    this.startNewRound();
                }, 1000);
            }
            
            return true;
        }
        return false;
    }
    
    startNewRound() {
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
                                cards: p.id === player.id ? p.cards : null,
                                stats: p.stats
                            })),
                            communityCards: this.communityCards,
                            pot: this.pot,
                            currentBet: this.currentBet,
                            currentPlayer: this.players[this.currentPlayerIndex]?.id,
                            stage: this.stage,
                            dealerIndex: this.dealerIndex,
                            smallBlindIndex: this.smallBlindIndex,
                            bigBlindIndex: this.bigBlindIndex,
                            roomId: this.id
                        });
                    }
                });
                // 广播房间列表更新
                broadcastRoomList();
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
            // 通知需要广播房间列表更新
            broadcastRoomList();
        }
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
    
    // 比较所有牌值来决定获胜者
    compareKickers(topRankPlayers) {
        // 对所有玩家进行完整的牌值比较排序
        const sortedPlayers = [...topRankPlayers].sort((a, b) => {
            // 首先比较踢脚牌（主要牌型特征）
            const kickersA = a.evaluation.kickers;
            const kickersB = b.evaluation.kickers;
            
            const maxKickerLength = Math.max(kickersA.length, kickersB.length);
            for (let i = 0; i < maxKickerLength; i++) {
                const kickerA = kickersA[i] || 0;
                const kickerB = kickersB[i] || 0;
                
                if (kickerA !== kickerB) {
                    return kickerB - kickerA; // 降序排列
                }
            }
            
            // 如果踢脚牌相同，比较所有牌值
            const allValuesA = a.evaluation.allValues || [];
            const allValuesB = b.evaluation.allValues || [];
            
            const maxAllLength = Math.max(allValuesA.length, allValuesB.length);
            for (let i = 0; i < maxAllLength; i++) {
                const valueA = allValuesA[i] || 0;
                const valueB = allValuesB[i] || 0;
                
                if (valueA !== valueB) {
                    return valueB - valueA; // 降序排列
                }
            }
            
            return 0; // 完全相同
        });
        
        // 找出牌值最好的玩家们
        const bestPlayer = sortedPlayers[0];
        const bestKickers = bestPlayer.evaluation.kickers;
        const bestAllValues = bestPlayer.evaluation.allValues || [];
        
        const winners = sortedPlayers.filter(player => {
            const currentKickers = player.evaluation.kickers;
            const currentAllValues = player.evaluation.allValues || [];
            
            // 检查踢脚牌是否完全相同
            if (currentKickers.length !== bestKickers.length) {
                return false;
            }
            
            for (let i = 0; i < bestKickers.length; i++) {
                if (currentKickers[i] !== bestKickers[i]) {
                    return false;
                }
            }
            
            // 检查所有牌值是否完全相同
            if (currentAllValues.length !== bestAllValues.length) {
                return false;
            }
            
            for (let i = 0; i < bestAllValues.length; i++) {
                if (currentAllValues[i] !== bestAllValues[i]) {
                    return false;
                }
            }
            
            return true;
        });
        
        // 如果只有一个获胜者，直接返回
        if (winners.length === 1) {
            return winners;
        }
        
        // 多个玩家所有牌值完全相同，检查是否可以平分池底
        const canSplitPot = this.canSplitPotByAllValues(winners);
        
        if (canSplitPot) {
            // 所有牌值完全相同且都来自公共牌，可以平分池底
            return winners;
        } else {
            // 不能平分池底，按座位顺序选择第一个玩家
            return [winners[0]];
        }
    }
    
    // 检查是否可以平分池底（踢脚牌是否完全相同且都来自公共牌）
    canSplitPot(players) {
        if (players.length <= 1) return true;
        
        // 第一步：确认所有玩家的踢脚牌完全相同
        const firstPlayerKickers = players[0].evaluation.kickers;
        for (let i = 1; i < players.length; i++) {
            const currentKickers = players[i].evaluation.kickers;
            
            // 检查踢脚牌数量是否相同
            if (currentKickers.length !== firstPlayerKickers.length) {
                return false;
            }
            
            // 检查每一位踢脚牌是否相同
            for (let j = 0; j < firstPlayerKickers.length; j++) {
                if (currentKickers[j] !== firstPlayerKickers[j]) {
                    return false;
                }
            }
        }
        
        // 第二步：检查踢脚牌是否都来自公共牌
        const communityValues = this.communityCards.map(card => {
            if (card.rank === 'A') return 14;
            if (card.rank === 'K') return 13;
            if (card.rank === 'Q') return 12;
            if (card.rank === 'J') return 11;
            return parseInt(card.rank);
        }).sort((a, b) => b - a);
        
        // 检查每个踢脚牌值是否都在公共牌中
        for (let i = 0; i < firstPlayerKickers.length; i++) {
            const kickerValue = firstPlayerKickers[i];
            
            // 需要确保公共牌中有足够数量的该牌值
            const kickerCountInCommunity = communityValues.filter(val => val === kickerValue).length;
            const kickerCountNeeded = firstPlayerKickers.filter(val => val === kickerValue).length;
            
            if (kickerCountInCommunity < kickerCountNeeded) {
                // 如果公共牌中该牌值数量不足，说明有踢脚牌来自手牌，不能平分
                return false;
            }
        }
        
        return true;
    }
    
    // 检查是否可以根据所有牌值平分池底（所有牌值是否完全相同且都来自公共牌）
    canSplitPotByAllValues(players) {
        if (players.length <= 1) return true;
        
        // 获取公共牌的牌值，并计算每个牌值的数量
        const communityValues = this.communityCards.map(card => {
            if (card.rank === 'A') return 14;
            if (card.rank === 'K') return 13;
            if (card.rank === 'Q') return 12;
            if (card.rank === 'J') return 11;
            return parseInt(card.rank);
        });
        
        const communityValueCounts = {};
        communityValues.forEach(value => {
            communityValueCounts[value] = (communityValueCounts[value] || 0) + 1;
        });
        
        // 获取第一个玩家的所有牌值作为基准
        const firstPlayerAllValues = players[0].evaluation.allValues || [];
        
        // 计算这些牌值需要的数量
        const requiredValueCounts = {};
        firstPlayerAllValues.forEach(value => {
            requiredValueCounts[value] = (requiredValueCounts[value] || 0) + 1;
        });
        
        // 检查公共牌是否包含足够数量的每个牌值
        for (const [value, requiredCount] of Object.entries(requiredValueCounts)) {
            const availableCount = communityValueCounts[parseInt(value)] || 0;
            if (availableCount < requiredCount) {
                // 如果公共牌中该牌值数量不足，说明有牌值来自手牌，不能平分
                return false;
            }
        }
        
        return true;
    }
}

const games = new Map();

// 广播房间列表更新的全局函数
function broadcastRoomList() {
    const roomList = Array.from(games.values())
        .filter(game => game.players.length > 0) // 过滤掉空房间
        .map(game => ({
            id: game.id,
            playerCount: game.players.length,
            maxPlayers: 8,
            stage: game.stage
        }));
    io.emit('room-list', roomList);
}

// 定期广播房间列表更新（每10秒）
setInterval(() => {
    broadcastRoomList();
}, 10000);

io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);
    
    socket.on('get-room-list', () => {
        const roomList = Array.from(games.values())
            .filter(game => game.players.length > 0) // 过滤掉空房间
            .map(game => ({
                id: game.id,
                playerCount: game.players.length,
                maxPlayers: 8,
                stage: game.stage
            }));
        socket.emit('room-list', roomList);
    });
    
    socket.on('join-game', (data) => {
        const { gameId, playerName } = data;
        
        if (!games.has(gameId)) {
            games.set(gameId, new PokerGame(gameId));
        }
        
        const game = games.get(gameId);
        
        // 检查是否已经存在同名玩家（重连情况）
        let existingPlayer = game.players.find(p => p.name === playerName);
        
        if (existingPlayer) {
            // 重连现有玩家
            existingPlayer.socket = socket;
            existingPlayer.id = socket.id;
            socket.join(gameId);
            socket.emit('joined-game', { success: true, playerId: socket.id, roomId: gameId });
        } else {
            // 创建新玩家
            const player = new Player(socket.id, playerName, socket);
            
            if (game.addPlayer(player)) {
                socket.join(gameId);
                socket.emit('joined-game', { success: true, playerId: socket.id, roomId: gameId });
            } else {
                socket.emit('joined-game', { success: false, message: '房间已满' });
                return;
            }
        }
        
        // 广播房间列表更新
        broadcastRoomList();
        
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
                dealerIndex: game.dealerIndex,
                smallBlindIndex: game.smallBlindIndex,
                bigBlindIndex: game.bigBlindIndex,
                roomId: game.id
            });
        });
    });
    
    socket.on('start-game', () => {
        const game = Array.from(games.values()).find(g => g.players.some(p => p.id === socket.id));
        if (game && game.stage === 'waiting') {
            if (game.startGame()) {
                io.to(game.id).emit('game-started');
                // 广播房间列表更新
                broadcastRoomList();
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
                            cards: p.id === player.id ? p.cards : null,
                            stats: p.stats
                        })),
                        communityCards: game.communityCards,
                        pot: game.pot,
                        currentBet: game.currentBet,
                        currentPlayer: game.players[game.currentPlayerIndex]?.id,
                        stage: game.stage,
                        dealerIndex: game.dealerIndex,
                smallBlindIndex: game.smallBlindIndex,
                bigBlindIndex: game.bigBlindIndex,
                roomId: game.id
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
                            stats: p.stats
                        })),
                        communityCards: game.communityCards,
                        pot: game.pot,
                        currentBet: game.currentBet,
                        currentPlayer: game.players[game.currentPlayerIndex]?.id,
                        stage: game.stage,
                        dealerIndex: game.dealerIndex,
                        smallBlindIndex: game.smallBlindIndex,
                        bigBlindIndex: game.bigBlindIndex,
                        roomId: game.id,
                        lastAction: game.actionHistory[game.actionHistory.length - 1]
                    });
                });
            }
        }
    });
    
    socket.on('confirm-round-result', () => {
        const game = Array.from(games.values()).find(g => g.players.some(p => p.id === socket.id));
        if (game) {
            game.confirmRoundResult(socket.id);
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
                        isAllIn: p.isAllIn,
                        stats: p.stats
                    })),
                    communityCards: game.communityCards,
                    pot: game.pot,
                    currentBet: game.currentBet,
                    currentPlayer: game.players[game.currentPlayerIndex]?.id,
                    stage: game.stage,
                    dealerIndex: game.dealerIndex,
                smallBlindIndex: game.smallBlindIndex,
                bigBlindIndex: game.bigBlindIndex,
                roomId: game.id
                });
            }
        });
        // 广播房间列表更新
        broadcastRoomList();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`德州扑克服务器运行在端口 ${PORT}`);
    console.log(`访问地址: http://localhost:${PORT}`);
});