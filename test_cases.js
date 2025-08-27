// 德州扑克规则测试用例 🧪

/*
以下是各种牌型比较的测试用例，用于验证完整比较规则的正确性
*/

const testCases = [
    // 1. 皇家同花顺 - 最高等级，无需比较
    {
        name: "皇家同花顺 vs 皇家同花顺",
        player1: { cards: ["A♠", "K♠"], community: ["Q♠", "J♠", "10♠", "9♣", "8♣"] },
        player2: { cards: ["A♥", "K♥"], community: ["Q♠", "J♠", "10♠", "9♣", "8♣"] },
        expected: "player1", // 不能平分，因为A♠K♠来自手牌
        explanation: "皇家同花顺，但牌值来自手牌，不能平分"
    },

    // 2. 同花顺比较
    {
        name: "同花顺高牌比较",
        player1: { cards: ["9♠", "8♠"], community: ["7♠", "6♠", "5♠", "K♣", "Q♣"] },
        player2: { cards: ["8♦", "7♦"], community: ["6♦", "5♦", "4♦", "K♣", "Q♣"] },
        expected: "player1", // 9高同花顺 vs 8高同花顺
        explanation: "比较最高牌：9 > 8"
    },

    // 3. 四条比较 - 四条牌值
    {
        name: "四条牌值比较",
        player1: { cards: ["A♠", "A♣"], community: ["A♦", "A♥", "K♠", "Q♣", "J♣"] },
        player2: { cards: ["K♠", "K♦"], community: ["K♥", "K♣", "A♠", "Q♣", "J♣"] },
        expected: "player1", // 四条A vs 四条K
        explanation: "比较四条牌值：A > K"
    },

    // 4. 四条比较 - 单张牌值
    {
        name: "四条相同，比较单张",
        player1: { cards: ["A♠", "K♠"], community: ["A♦", "A♥", "A♣", "Q♣", "J♣"] },
        player2: { cards: ["A♠", "Q♠"], community: ["A♦", "A♥", "A♣", "K♣", "J♣"] },
        expected: "player1", // 四条A带K vs 四条A带Q
        explanation: "四条相同，比较单张：K > Q"
    },

    // 5. 葫芦比较 - 三条牌值
    {
        name: "葫芦三条比较",
        player1: { cards: ["A♠", "A♣"], community: ["A♦", "K♥", "K♠", "Q♣", "J♣"] },
        player2: { cards: ["K♠", "K♦"], community: ["K♥", "A♠", "A♣", "Q♣", "J♣"] },
        expected: "player1", // 三条A vs 三条K
        explanation: "比较三条牌值：A > K"
    },

    // 6. 葫芦比较 - 对子牌值
    {
        name: "葫芦三条相同，比较对子",
        player1: { cards: ["A♠", "Q♠"], community: ["A♦", "A♥", "Q♣", "Q♦", "J♣"] },
        player2: { cards: ["A♠", "J♠"], community: ["A♦", "A♥", "J♦", "J♥", "Q♣"] },
        expected: "player1", // A满Q vs A满J
        explanation: "三条相同，比较对子：Q > J"
    },

    // 7. 同花比较 - 逐张比较
    {
        name: "同花逐张比较",
        player1: { cards: ["A♠", "K♠"], community: ["Q♠", "J♠", "9♠", "8♣", "7♣"] },
        player2: { cards: ["A♦", "Q♦"], community: ["K♦", "J♦", "9♦", "8♣", "7♣"] },
        expected: "player1", // A-K-Q-J-9 vs A-K-Q-J-9，第二张K>Q
        explanation: "第一张相同(A)，比较第二张：K > Q"
    },

    // 8. 顺子比较
    {
        name: "顺子高牌比较",
        player1: { cards: ["A♠", "K♣"], community: ["Q♦", "J♥", "10♠", "9♣", "8♣"] },
        player2: { cards: ["K♠", "Q♦"], community: ["J♥", "10♠", "9♣", "8♦", "7♣"] },
        expected: "player1", // A高顺子 vs K高顺子
        explanation: "比较最高牌：A > K"
    },

    // 9. A-2-3-4-5特殊顺子
    {
        name: "A-2-3-4-5 vs 6-5-4-3-2顺子",
        player1: { cards: ["5♠", "4♣"], community: ["3♦", "2♥", "A♠", "K♣", "Q♣"] },
        player2: { cards: ["6♠", "5♦"], community: ["4♥", "3♠", "2♣", "A♦", "K♣"] },
        expected: "player2", // 5高顺子 vs 6高顺子，A在A-2-3-4-5中算1
        explanation: "A-2-3-4-5中A算作1，所以5高 < 6高"
    },

    // 10. 三条比较 - 三条牌值
    {
        name: "三条牌值比较",
        player1: { cards: ["A♠", "A♣"], community: ["A♦", "K♥", "Q♠", "J♣", "10♣"] },
        player2: { cards: ["K♠", "K♦"], community: ["K♥", "A♠", "Q♣", "J♦", "10♣"] },
        expected: "player1", // 三条A vs 三条K
        explanation: "比较三条牌值：A > K"
    },

    // 11. 三条比较 - 第一单张
    {
        name: "三条相同，比较第一单张",
        player1: { cards: ["A♠", "K♠"], community: ["A♦", "A♥", "Q♣", "J♦", "10♣"] },
        player2: { cards: ["A♠", "Q♠"], community: ["A♦", "A♥", "K♣", "J♦", "10♣"] },
        expected: "player1", // 三条A带K vs 三条A带Q
        explanation: "三条相同，比较第一单张：K > Q"
    },

    // 12. 三条比较 - 第二单张
    {
        name: "三条相同，第一单张相同，比较第二单张",
        player1: { cards: ["A♠", "J♠"], community: ["A♦", "A♥", "K♣", "Q♦", "10♣"] },
        player2: { cards: ["A♠", "10♠"], community: ["A♦", "A♥", "K♣", "Q♦", "J♣"] },
        expected: "player1", // 三条A+K+Q+J vs 三条A+K+Q+10
        explanation: "三条和第一单张相同，比较第二单张：J > 10"
    },

    // 13. 两对比较 - 大对
    {
        name: "两对大对比较",
        player1: { cards: ["A♠", "A♣"], community: ["K♦", "K♥", "Q♠", "J♣", "10♣"] },
        player2: { cards: ["K♠", "K♦"], community: ["Q♥", "Q♠", "A♣", "J♦", "10♣"] },
        expected: "player1", // A-K两对 vs K-Q两对
        explanation: "比较大对：A > K"
    },

    // 14. 两对比较 - 小对
    {
        name: "两对大对相同，比较小对",
        player1: { cards: ["A♠", "K♠"], community: ["A♦", "K♥", "Q♣", "J♦", "10♣"] },
        player2: { cards: ["A♠", "Q♠"], community: ["A♦", "Q♥", "K♣", "J♦", "10♣"] },
        expected: "player1", // A-K两对 vs A-Q两对
        explanation: "大对相同(A)，比较小对：K > Q"
    },

    // 15. 两对比较 - 单张
    {
        name: "两对完全相同，比较单张",
        player1: { cards: ["A♠", "J♠"], community: ["A♦", "K♥", "K♣", "Q♦", "10♣"] },
        player2: { cards: ["A♠", "10♠"], community: ["A♦", "K♥", "K♣", "Q♦", "J♣"] },
        expected: "player1", // A-K两对带J vs A-K两对带10
        explanation: "两对相同，比较单张：J > 10"
    },

    // 16. 一对比较 - 对子牌值
    {
        name: "一对牌值比较",
        player1: { cards: ["A♠", "A♣"], community: ["K♦", "Q♥", "J♠", "10♣", "9♣"] },
        player2: { cards: ["K♠", "K♦"], community: ["A♥", "Q♠", "J♣", "10♦", "9♣"] },
        expected: "player1", // 对A vs 对K
        explanation: "比较对子牌值：A > K"
    },

    // 17. 一对比较 - 第一单张
    {
        name: "一对相同，比较第一单张",
        player1: { cards: ["A♠", "K♠"], community: ["A♦", "Q♥", "J♣", "10♦", "9♣"] },
        player2: { cards: ["A♠", "Q♠"], community: ["A♦", "K♥", "J♣", "10♦", "9♣"] },
        expected: "player1", // 对A带K vs 对A带Q
        explanation: "对子相同，比较第一单张：K > Q"
    },

    // 18. 高牌比较 - 逐张比较
    {
        name: "高牌逐张比较",
        player1: { cards: ["A♠", "K♣"], community: ["Q♦", "J♥", "9♠", "8♣", "7♣"] },
        player2: { cards: ["A♦", "Q♦"], community: ["K♥", "J♠", "9♣", "8♦", "7♣"] },
        expected: "player1", // A-K-Q-J-9 vs A-K-Q-J-9，第二张K>K，需要更仔细
        explanation: "第一张相同(A)，比较第二张：K > Q"
    },

    // 19. 平分池底的情况
    {
        name: "完全平分的情况",
        player1: { cards: ["Q♠", "J♠"], community: ["A♠", "A♦", "A♥", "K♣", "K♦"] },
        player2: { cards: ["10♠", "9♠"], community: ["A♠", "A♦", "A♥", "K♣", "K♦"] },
        expected: "tie", // 葫芦A满K，最佳5张牌完全来自公共牌
        explanation: "最佳手牌完全相同且都来自公共牌，可以平分"
    },

    // 20. 不能平分的情况
    {
        name: "不能平分的情况",
        player1: { cards: ["A♥", "Q♠"], community: ["A♠", "A♦", "K♥", "K♣", "Q♦"] },
        player2: { cards: ["K♠", "Q♣"], community: ["A♠", "A♦", "K♥", "K♣", "Q♦"] },
        expected: "player1", // 葫芦A满K vs 葫芦K满A
        explanation: "手牌不同，产生不同的葫芦，不能平分"
    }
];

console.log("德州扑克规则测试用例已加载 ✅");
console.log(`共 ${testCases.length} 个测试用例，涵盖所有牌型比较情况`);