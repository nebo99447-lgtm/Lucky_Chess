// Lucky_Chess - Шахматы с кубиком
// Создатель: Nebo
// © 2024 Все права защищены

const GAME_NAME = "Lucky_Chess";
const CREATOR = "Nebo";
const VERSION = "2.1.0";
const COPYRIGHT = "© 2024 Nebo. Все права защищены.";

// Функции для меню
function startGame(mode) {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    window.game = new ChessGame(mode);
}

function returnToMenu() {
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'flex';
    if (window.game) {
        window.game = null;
    }
}

class ChessGame {
    constructor(mode = 'local') {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.diceValue = null;
        this.gameOver = false;
        this.moveHistory = [];
        this.gameMode = mode;
        this.castlingRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };
        this.enPassantTarget = null;
        this.doubleMovePending = false;
        this.doubleMoveForCurrent = false;
        this.extraDicePending = false;
        this.capturedPieces = { white: [], black: [] };
        this.resurrectMode = false;
        this.resurrectPiece = null;
        this.frozenPieces = { white: [], black: [] };
        this.shieldActive = false;
        this.godMode = false;
        this.bonusMove = false;
        this.restrictedPiece = null;
        this.initBoard();
        this.renderBoard();
        this.setupEventListeners();
        if (this.gameMode === 'bot') {
            this.botPlayer = 'black';
            this.showModeMessage();
        }
    }

    showModeMessage() {
        const messageElement = document.getElementById('message');
        if (this.gameMode === 'local') {
            messageElement.textContent = 'Игра с другом. Ход белых. Бросьте кубик!';
        } else if (this.gameMode === 'bot') {
            messageElement.textContent = 'Игра с ботом. Вы играете за белых. Бросьте кубик!';
        } else if (this.gameMode === 'online') {
            messageElement.textContent = 'Онлайн режим. Ожидание подключения...';
        }
    }

    initBoard() {
        const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let row = 0; row < 8; row++) {
            this.board[row] = [];
            for (let col = 0; col < 8; col++) {
                this.board[row][col] = null;
            }
        }
        for (let col = 0; col < 8; col++) {
            this.board[0][col] = { type: backRow[col], color: 'black', hasMoved: false };
            this.board[1][col] = { type: 'pawn', color: 'black', hasMoved: false };
            this.board[6][col] = { type: 'pawn', color: 'white', hasMoved: false };
            this.board[7][col] = { type: backRow[col], color: 'white', hasMoved: false };
        }
    }

    getPieceSymbol(piece) {
        const symbols = {
            'king': { white: '♔', black: '♚' },
            'queen': { white: '♕', black: '♛' },
            'rook': { white: '♖', black: '♜' },
            'bishop': { white: '♗', black: '♝' },
            'knight': { white: '♘', black: '♞' },
            'pawn': { white: '♙', black: '♟' }
        };
        return piece ? symbols[piece.type][piece.color] : '';
    }

    renderBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';
        boardElement.style.display = 'grid';
        boardElement.style.gridTemplateColumns = 'repeat(8, 60px)';
        boardElement.style.gridTemplateRows = 'repeat(8, 60px)';
        boardElement.style.width = '480px';
        boardElement.style.height = '480px';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                square.style.width = '60px';
                square.style.height = '60px';
                square.style.display = 'flex';
                square.style.justifyContent = 'center';
                square.style.alignItems = 'center';
                square.style.fontSize = '38px';
                
                const piece = this.board[row][col];
                square.textContent = this.getPieceSymbol(piece);
                
                if (piece && this.frozenPieces[piece.color].some(
                    frozen => frozen.row === row && frozen.col === col
                )) {
                    square.style.backgroundColor = '#87ceeb';
                    square.title = 'Заморожена!';
                }
                
                if (this.selectedPiece && 
                    this.selectedPiece.row === row && 
                    this.selectedPiece.col === col) {
                    square.classList.add('selected');
                }
                
                if (this.possibleMoves.some(move => move.row === row && move.col === col)) {
                    square.classList.add('possible-move');
                    if (this.board[row][col]) {
                        square.style.backgroundColor = '#ff6b6b';
                    }
                }
                
                if (this.resurrectMode && !piece) {
                    square.style.backgroundColor = '#a8d8a8';
                    square.style.cursor = 'pointer';
                }
                
                square.addEventListener('click', () => this.onSquareClick(row, col));
                boardElement.appendChild(square);
            }
        }
        
        const whitePieces = this.countPieces('white');
        const blackPieces = this.countPieces('black');
        document.getElementById('whitePieces').textContent = whitePieces;
        document.getElementById('blackPieces').textContent = blackPieces;
        this.updateTurnIndicator();
        this.updateCapturedPiecesInfo();
    }

    updateTurnIndicator() {
        const whitePlayer = document.getElementById('whitePlayer');
        const blackPlayer = document.getElementById('blackPlayer');
        
        if (this.currentPlayer === 'white') {
            whitePlayer.classList.add('active');
            blackPlayer.classList.remove('active');
            whitePlayer.querySelector('.turn-status').textContent = 'Ваш ход!';
            blackPlayer.querySelector('.turn-status').textContent = 'Ожидание...';
        } else {
            blackPlayer.classList.add('active');
            whitePlayer.classList.remove('active');
            blackPlayer.querySelector('.turn-status').textContent = 'Ваш ход!';
            whitePlayer.querySelector('.turn-status').textContent = 'Ожидание...';
        }
        
        whitePlayer.querySelector('.player-avatar').textContent = '♔';
        blackPlayer.querySelector('.player-avatar').textContent = '♚';
    }

    updateCapturedPiecesInfo() {
        const whiteCapturedElement = document.getElementById('whiteCaptured');
        const blackCapturedElement = document.getElementById('blackCaptured');
        const whiteSymbols = this.capturedPieces.white.map(piece => this.getPieceSymbol(piece)).join(' ');
        const blackSymbols = this.capturedPieces.black.map(piece => this.getPieceSymbol(piece)).join(' ');
        whiteCapturedElement.textContent = whiteSymbols || 'Нет';
        blackCapturedElement.textContent = blackSymbols || 'Нет';
    }

    countPieces(color) {
        let count = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] && this.board[row][col].color === color) {
                    count++;
                }
            }
        }
        return count;
    }

    rollDice() {
        if (this.gameOver) return;
        if (this.resurrectMode) {
            document.getElementById('message').textContent = 'Сначала выберите клетку для воскрешения!';
            return;
        }
        if (this.diceValue !== null) {
            document.getElementById('message').textContent = 'Вы уже бросили кубик! Сделайте ход.';
            return;
        }
        
        this.diceValue = Math.floor(Math.random() * 99) + 1;
        const resultElement = document.getElementById('diceResult');
        const effectElement = document.getElementById('diceEffect');
        const messageElement = document.getElementById('message');
        
        resultElement.textContent = this.diceValue;
        resultElement.style.animation = 'none';
        resultElement.offsetHeight;
        resultElement.style.animation = 'diceRoll 0.5s';
        
        const effect = this.getDiceEffect(this.diceValue);
        effectElement.textContent = effect.description;
        
        this.applyDiceEffect(this.diceValue);
        this.renderBoard();
        
        if (this.gameMode === 'bot' && this.currentPlayer === this.botPlayer) {
            setTimeout(() => this.makeBotMove(), 1000);
        }
    }

    getDiceEffect(value) {
        const effects = {
            1: { type: 'lose_queen', description: '💔 Потеря ферзя!' },
            2: { type: 'lose_rook', description: '💔 Потеря ладьи!' },
            3: { type: 'lose_bishop', description: '💔 Потеря слона!' },
            4: { type: 'lose_knight', description: '💔 Потеря коня!' },
            5: { type: 'lose_two_pawns', description: '💔💔 Потеря двух пешек!' },
            6: { type: 'skip_turn', description: '💀 Пропуск хода!' },
            7: { type: 'freeze_all_own', description: '❄️ Все ваши фигуры заморожены!' },
            8: { type: 'enemy_steals_queen', description: '🕵️ Противник крадёт вашего ферзя!' },
            9: { type: 'demote_queen', description: '⬇️ Ваш ферзь становится пешкой!' },
            10: { type: 'enemy_double_move', description: '⚔️ Противник ходит дважды!' },
            11: { type: 'retreat_all', description: '🔙 Все ваши фигуры отступают!' },
            12: { type: 'teleport_own', description: '🌀 Ваша фигура телепортируется!' },
            13: { type: 'swap_own', description: '🔄 Ваши фигуры меняются местами!' },
            14: { type: 'pawn_only', description: '😔 Ход только пешкой!' },
            15: { type: 'knight_only', description: '🐴 Ход только конём!' },
            16: { type: 'bishop_only', description: '⛪ Ход только слоном!' },
            17: { type: 'rook_only', description: '🏰 Ход только ладьёй!' },
            18: { type: 'queen_only', description: '👑 Ход только ферзём!' },
            19: { type: 'king_only', description: '🤴 Ход только королём!' },
            20: { type: 'freeze_own_random', description: '❄️ Заморозка вашей фигуры!' },
            21: { type: 'lose_random_piece', description: '💔 Потеря случайной фигуры!' },
            22: { type: 'normal_pawn', description: '✅ Обычный ход пешкой' },
            23: { type: 'normal_knight', description: '✅ Ход конём' },
            24: { type: 'normal_bishop', description: '✅ Ход слоном' },
            25: { type: 'normal_rook', description: '✅ Ход ладьёй' },
            26: { type: 'normal_queen', description: '✅ Ход ферзём' },
            27: { type: 'normal_king', description: '✅ Ход королём' },
            28: { type: 'normal_any', description: '✅ Обычный ход' },
            29: { type: 'bonus_one', description: '👍 Ход + 1 клетка' },
            30: { type: 'bonus_two', description: '👍👍 Ход + 2 клетки' },
            31: { type: 'heal_one', description: '💚 Разморозка одной фигуры' },
            32: { type: 'heal_all', description: '💚💚 Разморозка всех фигур' },
            33: { type: 'extra_dice', description: '🎲 Дополнительный бросок!' },
            34: { type: 'shield', description: '🛡️ Щит от атаки!' },
            35: { type: 'double_move', description: '👑 Двойной ход!' },
            36: { type: 'upgrade_pawn_to_knight', description: '⬆️ Пешка → Конь' },
            37: { type: 'upgrade_pawn_to_bishop', description: '⬆️ Пешка → Слон' },
            38: { type: 'upgrade_pawn_to_rook', description: '⬆️ Пешка → Ладья' },
            39: { type: 'promote_pawn', description: '⭐ Пешка → Ферзь' },
            40: { type: 'steal_pawn', description: '🕵️ Кража пешки противника' },
            41: { type: 'steal_knight', description: '🕵️ Кража коня противника' },
            42: { type: 'steal_bishop', description: '🕵️ Кража слона противника' },
            43: { type: 'steal_rook', description: '🕵️ Кража ладьи противника' },
            44: { type: 'steal_queen', description: '🕵️ Кража ферзя противника!' },
            45: { type: 'resurrect_pawn', description: '✨ Воскрешение пешки' },
            46: { type: 'resurrect_knight', description: '✨ Воскрешение коня' },
            47: { type: 'resurrect_bishop', description: '✨ Воскрешение слона' },
            48: { type: 'resurrect_rook', description: '✨ Воскрешение ладьи' },
            49: { type: 'resurrect_queen', description: '✨ Воскрешение ферзя!' },
            50: { type: 'time_warp', description: '⏰ Машина времени!' },
            51: { type: 'kill_pawn', description: '⚡ Уничтожение пешки врага' },
            52: { type: 'kill_knight', description: '⚡ Уничтожение коня врага' },
            53: { type: 'kill_bishop', description: '⚡ Уничтожение слона врага' },
            54: { type: 'kill_rook', description: '⚡ Уничтожение ладьи врага' },
            55: { type: 'kill_queen', description: '⚡ Уничтожение ферзя врага!' },
            56: { type: 'freeze_enemy_one', description: '❄️ Заморозка фигуры врага' },
            57: { type: 'freeze_enemy_two', description: '❄️❄️ Заморозка двух фигур врага' },
            58: { type: 'freeze_enemy_three', description: '❄️❄️❄️ Заморозка трёх фигур врага!' },
            59: { type: 'apocalypse_enemy', description: '💀 АПОКАЛИПСИС для врага!' },
            60: { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' },
            61: { type: 'normal_any', description: '✅ Обычный ход' },
            62: { type: 'bonus_one', description: '👍 Ход + 1 клетка' },
            63: { type: 'double_move', description: '👑 Двойной ход!' },
            64: { type: 'extra_dice', description: '🎲 Дополнительный бросок!' },
            65: { type: 'shield', description: '🛡️ Щит!' },
            66: { type: 'normal_any', description: '✅ Обычный ход' },
            67: { type: 'steal_queen', description: '🕵️ Кража ферзя!' },
            68: { type: 'kill_queen', description: '⚡ Уничтожение ферзя!' },
            69: { type: 'resurrect_queen', description: '✨ Воскрешение ферзя!' },
            70: { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' },
            71: { type: 'normal_any', description: '✅ Обычный ход' },
            72: { type: 'bonus_two', description: '👍👍 Ход + 2 клетки' },
            73: { type: 'double_move', description: '👑 Двойной ход!' },
            74: { type: 'extra_dice', description: '🎲 Дополнительный бросок!' },
            75: { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' },
            76: { type: 'normal_any', description: '✅ Обычный ход' },
            77: { type: 'kill_queen', description: '⚡ Уничтожение ферзя!' },
            78: { type: 'apocalypse_enemy', description: '💀 АПОКАЛИПСИС!' },
            79: { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' },
            80: { type: 'ultimate', description: '👑 УЛЬТИМАТУМ!' },
            81: { type: 'normal_any', description: '✅ Обычный ход' },
            82: { type: 'steal_queen', description: '🕵️ Кража ферзя!' },
            83: { type: 'time_warp', description: '⏰ Машина времени!' },
            84: { type: 'bonus_two', description: '👍👍 Ход + 2 клетки' },
            85: { type: 'resurrect_queen', description: '✨ Воскрешение ферзя!' },
            86: { type: 'normal_any', description: '✅ Обычный ход' },
            87: { type: 'kill_queen', description: '⚡ Уничтожение ферзя!' },
            88: { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' },
            89: { type: 'apocalypse_enemy', description: '💀 АПОКАЛИПСИС!' },
            90: { type: 'ultimate', description: '👑 УЛЬТИМАТУМ!' },
            91: { type: 'normal_any', description: '✅ Обычный ход' },
            92: { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' },
            93: { type: 'kill_queen', description: '⚡ Уничтожение ферзя!' },
            94: { type: 'apocalypse_enemy', description: '💀 АПОКАЛИПСИС!' },
            95: { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' },
            96: { type: 'ultimate', description: '👑 УЛЬТИМАТУМ!' },
            97: { type: 'apocalypse_enemy', description: '💀 АПОКАЛИПСИС!' },
            98: { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' },
            99: { type: 'instant_win', description: '🏆 МГНОВЕННАЯ ПОБЕДА!!!' }
        };
        
        return effects[value] || { type: 'normal_any', description: '✅ Обычный ход' };
    }

    applyDiceEffect(value) {
        const messageElement = document.getElementById('message');
        const currentColor = this.currentPlayer;
        const opponentColor = this.getOppositeColor(currentColor);
        const effect = this.getDiceEffect(value);
        const type = effect.type;
        let effectApplied = false;
        
        if (type.startsWith('lose_')) {
            const pieceType = type.replace('lose_', '');
            if (pieceType === 'two_pawns') {
                let lost = 0;
                for (let i = 0; i < 2; i++) {
                    const pawn = this.findFirstPiece(currentColor, 'pawn');
                    if (pawn) {
                        this.board[pawn.row][pawn.col] = null;
                        this.capturedPieces[currentColor].push(pawn);
                        lost++;
                    }
                }
                if (lost > 0) {
                    messageElement.textContent = `💔 Потеряно пешек: ${lost}`;
                    effectApplied = true;
                }
            } else {
                const piece = this.findFirstPiece(currentColor, pieceType);
                if (piece) {
                    this.board[piece.row][piece.col] = null;
                    this.capturedPieces[currentColor].push(piece);
                    messageElement.textContent = `💔 Потеряна фигура: ${pieceType}!`;
                    effectApplied = true;
                }
            }
        }
        else if (type === 'skip_turn') {
            messageElement.textContent = '💀 Пропуск хода!';
            this.switchPlayer();
            this.diceValue = null;
            effectApplied = true;
        }
        else if (type === 'freeze_all_own') {
            this.frozenPieces[currentColor] = this.getAllPieces(currentColor);
            messageElement.textContent = '❄️ Все ваши фигуры заморожены! Ход пропущен!';
            this.switchPlayer();
            this.diceValue = null;
            effectApplied = true;
        }
        else if (type.startsWith('enemy_steals_')) {
            const pieceType = type.replace('enemy_steals_', '');
            const piece = this.findFirstPiece(currentColor, pieceType);
            if (piece) {
                const emptySquare = this.getRandomEmptySquare();
                if (emptySquare) {
                    this.board[emptySquare.row][emptySquare.col] = {
                        type: pieceType,
                        color: opponentColor,
                        hasMoved: true
                    };
                    this.board[piece.row][piece.col] = null;
                    messageElement.textContent = `🕵️ Противник украл: ${pieceType}!`;
                    effectApplied = true;
                }
            }
        }
        else if (type === 'demote_queen') {
            const queen = this.findFirstPiece(currentColor, 'queen');
            if (queen) {
                this.board[queen.row][queen.col].type = 'pawn';
                messageElement.textContent = '⬇️ Ферзь стал пешкой!';
                effectApplied = true;
            }
        }
        else if (type === 'enemy_double_move') {
            messageElement.textContent = '⚔️ Противник ходит дважды!';
            this.doubleMovePending = true;
            effectApplied = true;
        }
        else if (type === 'retreat_all') {
            const pieces = this.getAllPieces(currentColor);
            pieces.forEach(piece => this.retreatPiece(piece));
            messageElement.textContent = '🔙 Все фигуры отступили!';
            effectApplied = true;
        }
        else if (type === 'teleport_own') {
            const piece = this.getRandomPiece(currentColor);
            if (piece) {
                const emptySquare = this.getRandomEmptySquare();
                if (emptySquare) {
                    this.board[emptySquare.row][emptySquare.col] = this.board[piece.row][piece.col];
                    this.board[piece.row][piece.col] = null;
                    messageElement.textContent = '🌀 Фигура телепортировалась!';
                    effectApplied = true;
                }
            }
        }
        else if (type === 'swap_own') {
            const pieces = this.getAllPieces(currentColor);
            if (pieces.length >= 2) {
                const p1 = pieces[Math.floor(Math.random() * pieces.length)];
                const p2 = pieces[Math.floor(Math.random() * pieces.length)];
                if (p1.row !== p2.row || p1.col !== p2.col) {
                    const temp = this.board[p1.row][p1.col];
                    this.board[p1.row][p1.col] = this.board[p2.row][p2.col];
                    this.board[p2.row][p2.col] = temp;
                    messageElement.textContent = '🔄 Фигуры поменялись!';
                    effectApplied = true;
                }
            }
        }
        else if (type.endsWith('_only')) {
            const pieceType = type.replace('_only', '');
            messageElement.textContent = `Ход только: ${pieceType}!`;
            this.restrictedPiece = pieceType;
            effectApplied = true;
        }
        else if (type === 'freeze_own_random') {
            const piece = this.getRandomPiece(currentColor);
            if (piece) {
                this.frozenPieces[currentColor].push(piece);
                messageElement.textContent = `❄️ Заморожена: ${piece.type}!`;
                effectApplied = true;
            }
        }
        else if (type === 'lose_random_piece') {
            const piece = this.getRandomPiece(currentColor, ['king']);
            if (piece) {
                this.board[piece.row][piece.col] = null;
                this.capturedPieces[currentColor].push(piece);
                messageElement.textContent = `💔 Потеряна: ${piece.type}!`;
                effectApplied = true;
            }
        }
        else if (type.startsWith('normal_')) {
            const pieceType = type.replace('normal_', '');
            if (pieceType === 'any') {
                messageElement.textContent = '✅ Обычный ход';
            } else {
                messageElement.textContent = `✅ Ход: ${pieceType}`;
                this.restrictedPiece = pieceType;
            }
            effectApplied = true;
        }
        else if (type === 'bonus_one') {
            messageElement.textContent = '👍 +1 клетка!';
            this.bonusMove = 1;
            effectApplied = true;
        }
        else if (type === 'bonus_two') {
            messageElement.textContent = '👍👍 +2 клетки!';
            this.bonusMove = 2;
            effectApplied = true;
        }
        else if (type === 'heal_one') {
            if (this.frozenPieces[currentColor].length > 0) {
                this.frozenPieces[currentColor].pop();
                messageElement.textContent = '💚 Одна фигура разморожена!';
                effectApplied = true;
            }
        }
        else if (type === 'heal_all') {
            this.frozenPieces[currentColor] = [];
            messageElement.textContent = '💚 Все фигуры разморожены!';
            effectApplied = true;
        }
        else if (type === 'extra_dice') {
            messageElement.textContent = '🎲 Дополнительный бросок!';
            this.extraDicePending = true;
            effectApplied = true;
        }
        else if (type === 'shield') {
            messageElement.textContent = '🛡️ Щит активирован!';
            this.shieldActive = true;
            effectApplied = true;
        }
        else if (type === 'double_move') {
            messageElement.textContent = '👑 Двойной ход!';
            this.doubleMoveForCurrent = true;
            effectApplied = true;
        }
        else if (type.startsWith('upgrade_pawn_to_')) {
            const newType = type.replace('upgrade_pawn_to_', '');
            const pawn = this.findFirstPiece(currentColor, 'pawn');
            if (pawn) {
                this.board[pawn.row][pawn.col].type = newType;
                messageElement.textContent = `⬆️ Пешка → ${newType}!`;
                effectApplied = true;
            }
        }
        else if (type === 'promote_pawn') {
            const pawn = this.findFirstPiece(currentColor, 'pawn');
            if (pawn) {
                this.board[pawn.row][pawn.col].type = 'queen';
                messageElement.textContent = '⭐ Пешка → Ферзь!';
                effectApplied = true;
            }
        }
        else if (type.startsWith('steal_')) {
            const pieceType = type.replace('steal_', '');
            const piece = this.findFirstPiece(opponentColor, pieceType);
            if (piece) {
                const emptySquare = this.getRandomEmptySquare();
                if (emptySquare) {
                    this.board[emptySquare.row][emptySquare.col] = {
                        type: pieceType,
                        color: currentColor,
                        hasMoved: true
                    };
                    this.board[piece.row][piece.col] = null;
                    messageElement.textContent = `🕵️ Украдена: ${pieceType}!`;
                    effectApplied = true;
                }
            }
        }
        else if (type.startsWith('resurrect_')) {
            const pieceType = type.replace('resurrect_', '');
            const capturedList = this.capturedPieces[currentColor];
            const pieceIndex = capturedList.findIndex(p => p.type === pieceType);
            if (pieceIndex > -1) {
                this.resurrectMode = true;
                this.resurrectPiece = capturedList[pieceIndex];
                messageElement.textContent = `✨ Выберите клетку для ${pieceType}!`;
                effectApplied = true;
            }
        }
        else if (type === 'time_warp') {
            if (this.moveHistory.length > 0) {
                this.undoLastMove();
                messageElement.textContent = '⏰ Последний ход отменён!';
                effectApplied = true;
            }
        }
        else if (type.startsWith('kill_')) {
            const pieceType = type.replace('kill_', '');
            const piece = this.findFirstPiece(opponentColor, pieceType);
            if (piece) {
                if (this.shieldActive) {
                    messageElement.textContent = '🛡️ Щит заблокировал!';
                    this.shieldActive = false;
                } else {
                    this.board[piece.row][piece.col] = null;
                    this.capturedPieces[opponentColor].push(piece);
                    messageElement.textContent = `⚡ Уничтожена: ${pieceType}!`;
                }
                effectApplied = true;
            }
        }
        else if (type.startsWith('freeze_enemy_')) {
            const count = type === 'freeze_enemy_one' ? 1 : type === 'freeze_enemy_two' ? 2 : 3;
            let frozen = 0;
            for (let i = 0; i < count; i++) {
                const piece = this.getRandomPiece(opponentColor);
                if (piece) {
                    this.frozenPieces[opponentColor].push(piece);
                    frozen++;
                }
            }
            if (frozen > 0) {
                messageElement.textContent = `❄️ Заморожено фигур: ${frozen}!`;
                effectApplied = true;
            }
        }
        else if (type === 'apocalypse_enemy') {
            this.frozenPieces[opponentColor] = this.getAllPieces(opponentColor);
            messageElement.textContent = '💀 АПОКАЛИПСИС! Все фигуры врага заморожены!';
            effectApplied = true;
        }
        else if (type === 'god_mode') {
            messageElement.textContent = '🌟 РЕЖИМ БОГА! Двойной ход!';
            this.doubleMoveForCurrent = true;
            this.godMode = true;
            effectApplied = true;
        }
        else if (type === 'ultimate') {
            let destroyed = 0;
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = this.board[row][col];
                    if (piece && piece.color === opponentColor && piece.type !== 'king') {
                        this.capturedPieces[opponentColor].push(piece);
                        this.board[row][col] = null;
                        destroyed++;
                    }
                }
            }
            messageElement.textContent = `👑 УЛЬТИМАТУМ! Уничтожено: ${destroyed}!`;
            effectApplied = true;
        }
        else if (type === 'instant_win') {
            messageElement.textContent = `🏆 ${currentColor === 'white' ? 'БЕЛЫЕ' : 'ЧЁРНЫЕ'} ПОБЕДИЛИ!!!`;
            this.gameOver = true;
            effectApplied = true;
        }
        
        if (!effectApplied) {
            messageElement.textContent = `Выпало ${value}. Можно ходить.`;
        }
        
        this.checkIfPlayerCanMove();
    }

    checkIfPlayerCanMove() {
        const currentColor = this.currentPlayer;
        const frozenPieces = this.frozenPieces[currentColor];
        const allPieces = this.getAllPieces(currentColor);
        
        if (allPieces.length > 0 && frozenPieces.length >= allPieces.length) {
            document.getElementById('message').textContent = 
                `❄️ Все фигуры ${currentColor === 'white' ? 'белых' : 'чёрных'} заморожены! Ход пропущен!`;
            
            this.frozenPieces[currentColor] = [];
            
            setTimeout(() => {
                this.switchPlayer();
                this.diceValue = null;
                this.renderBoard();
            }, 1500);
        }
    }

    getAllPieces(color) {
        const pieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    pieces.push({ row, col, ...piece });
                }
            }
        }
        return pieces;
    }

    getRandomEmptySquare() {
        const emptySquares = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (!this.board[row][col]) {
                    emptySquares.push({ row, col });
                }
            }
        }
        return emptySquares.length > 0 ? 
            emptySquares[Math.floor(Math.random() * emptySquares.length)] : null;
    }

    undoLastMove() {
        if (this.moveHistory.length === 0) return;
        const lastMove = this.moveHistory.pop();
        const piece = this.board[lastMove.to.row][lastMove.to.col];
        if (piece) {
            this.board[lastMove.from.row][lastMove.from.col] = piece;
            this.board[lastMove.to.row][lastMove.to.col] = null;
            if (lastMove.captured) {
                const capturedPiece = {
                    type: lastMove.captured,
                    color: this.getOppositeColor(lastMove.color),
                    hasMoved: true
                };
                this.board[lastMove.to.row][lastMove.to.col] = capturedPiece;
                const capturedList = this.capturedPieces[this.getOppositeColor(lastMove.color)];
                const index = capturedList.findIndex(p => p.type === lastMove.captured);
                if (index > -1) {
                    capturedList.splice(index, 1);
                }
            }
        }
    }

    makeBotMove() {
        if (this.gameOver) return;
        const botPieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === this.botPlayer) {
                    botPieces.push({ row, col, piece });
                }
            }
        }
        if (botPieces.length === 0) return;
        const randomPiece = botPieces[Math.floor(Math.random() * botPieces.length)];
        this.diceValue = Math.floor(Math.random() * 99) + 1;
        document.getElementById('diceResult').textContent = this.diceValue;
        const effect = this.getDiceEffect(this.diceValue);
        document.getElementById('diceEffect').textContent = effect.description;
        this.applyDiceEffect(this.diceValue);
        this.selectedPiece = { row: randomPiece.row, col: randomPiece.col };
        this.calculatePossibleMoves(randomPiece.row, randomPiece.col);
        if (this.possibleMoves.length > 0) {
            const randomMove = this.possibleMoves[Math.floor(Math.random() * this.possibleMoves.length)];
            this.movePiece(randomPiece.row, randomPiece.col, randomMove.row, randomMove.col);
        }
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.diceValue = null;
        this.switchPlayer();
        this.renderBoard();
    }

    getRandomPiece(color, excludeTypes = []) {
        const pieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color && !excludeTypes.includes(piece.type)) {
                    pieces.push({ row, col, ...piece });
                }
            }
        }
        return pieces.length > 0 ? pieces[Math.floor(Math.random() * pieces.length)] : null;
    }

    findFirstPiece(color, type) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color && piece.type === type) {
                    return { row, col, ...piece };
                }
            }
        }
        return null;
    }

    retreatPiece(piece) {
        const direction = piece.color === 'white' ? 1 : -1;
        const newRow = piece.row + direction;
        if (newRow >= 0 && newRow < 8 && !this.board[newRow][piece.col]) {
            this.board[newRow][piece.col] = this.board[piece.row][piece.col];
            this.board[piece.row][piece.col] = null;
            this.board[newRow][piece.col].hasMoved = true;
        }
    }

    getOppositeColor(color) {
        return color === 'white' ? 'black' : 'white';
    }

    switchPlayer() {
        if (this.doubleMoveForCurrent) {
            this.doubleMoveForCurrent = false;
            this.diceValue = null;
            this.selectedPiece = null;
            this.possibleMoves = [];
            document.getElementById('message').textContent = 'Сделайте второй ход!';
            this.renderBoard();
            return;
        }
        if (this.doubleMovePending) {
            this.doubleMovePending = false;
            this.doubleMoveForCurrent = true;
            this.currentPlayer = this.getOppositeColor(this.currentPlayer);
            this.diceValue = null;
            this.selectedPiece = null;
            this.possibleMoves = [];
            document.getElementById('message').textContent = 'Противник ходит дважды!';
            this.renderBoard();
            return;
        }
        this.currentPlayer = this.getOppositeColor(this.currentPlayer);
        this.diceValue = null;
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.bonusMove = false;
        this.restrictedPiece = null;
        if (this.extraDicePending) {
            this.extraDicePending = false;
            document.getElementById('message').textContent = 'Дополнительный бросок!';
        } else {
            document.getElementById('message').textContent = `Ход ${this.currentPlayer === 'white' ? 'белых' : 'чёрных'}. Бросьте кубик!`;
        }
        this.renderBoard();
        if (this.gameMode === 'bot' && this.currentPlayer === this.botPlayer) {
            setTimeout(() => this.makeBotMove(), 1000);
        }
    }

    onSquareClick(row, col) {
        if (this.gameOver) return;
        
        const allPieces = this.getAllPieces(this.currentPlayer);
        const frozenPieces = this.frozenPieces[this.currentPlayer];
        
        if (allPieces.length > 0 && frozenPieces.length >= allPieces.length) {
            document.getElementById('message').textContent = '❄️ Все ваши фигуры заморожены! Ход пропущен!';
            this.frozenPieces[this.currentPlayer] = [];
            this.switchPlayer();
            this.renderBoard();
            return;
        }
        
        if (this.resurrectMode && this.resurrectPiece) {
            if (!this.board[row][col]) {
                this.board[row][col] = {
                    type: this.resurrectPiece.type,
                    color: this.resurrectPiece.color,
                    hasMoved: true
                };
                const capturedList = this.capturedPieces[this.currentPlayer];
                const index = capturedList.indexOf(this.resurrectPiece);
                if (index > -1) {
                    capturedList.splice(index, 1);
                }
                this.resurrectMode = false;
                this.resurrectPiece = null;
                this.diceValue = null;
                document.getElementById('message').textContent = 'Фигура воскрешена!';
                this.switchPlayer();
                this.renderBoard();
                return;
            } else {
                document.getElementById('message').textContent = 'Выберите пустую клетку!';
                return;
            }
        }
        const piece = this.board[row][col];
        
        if (piece && this.frozenPieces[piece.color].some(
            frozen => frozen.row === row && frozen.col === col
        )) {
            document.getElementById('message').textContent = '❄️ Эта фигура заморожена!';
            return;
        }
        
        if (this.selectedPiece) {
            const canMove = this.possibleMoves.some(move => move.row === row && move.col === col);
            if (canMove) {
                this.movePiece(this.selectedPiece.row, this.selectedPiece.col, row, col);
                this.selectedPiece = null;
                this.possibleMoves = [];
                const opponentColor = this.getOppositeColor(this.currentPlayer);
                if (this.isCheckmate(opponentColor)) {
                    this.gameOver = true;
                    document.getElementById('message').textContent = 
                        `🏆 ШАХ И МАТ! Победили ${this.currentPlayer === 'white' ? 'белые' : 'чёрные'}!`;
                } else if (this.isInCheck(opponentColor)) {
                    document.getElementById('message').textContent = '👑 ШАХ!';
                }
                this.switchPlayer();
                this.renderBoard();
                return;
            }
        }
        
        if (piece && piece.color === this.currentPlayer) {
            if (this.restrictedPiece && piece.type !== this.restrictedPiece) {
                document.getElementById('message').textContent = `Вы можете ходить только: ${this.restrictedPiece}!`;
                return;
            }
            this.selectedPiece = { row, col };
            this.calculatePossibleMoves(row, col);
            this.renderBoard();
        }
    }

    calculatePossibleMoves(row, col) {
        this.possibleMoves = [];
        const piece = this.board[row][col];
        if (!piece) return;
        switch (piece.type) {
            case 'pawn': this.calculatePawnMoves(row, col, piece.color); break;
            case 'knight': this.calculateKnightMoves(row, col, piece.color); break;
            case 'bishop': this.calculateBishopMoves(row, col, piece.color); break;
            case 'rook': this.calculateRookMoves(row, col, piece.color); break;
            case 'queen': this.calculateQueenMoves(row, col, piece.color); break;
            case 'king': this.calculateKingMoves(row, col, piece.color); break;
        }
        this.possibleMoves = this.possibleMoves.filter(move => {
            return !this.wouldBeInCheck(row, col, move.row, move.col, piece.color);
        });
    }

    calculatePawnMoves(row, col, color) {
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        const newRow = row + direction;
        if (newRow >= 0 && newRow < 8 && !this.board[newRow][col]) {
            this.possibleMoves.push({ row: newRow, col });
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                this.possibleMoves.push({ row: row + 2 * direction, col });
            }
        }
        for (const colOffset of [-1, 1]) {
            const newCol = col + colOffset;
            if (newCol >= 0 && newCol < 8 && newRow >= 0 && newRow < 8) {
                const target = this.board[newRow][newCol];
                if (target && target.color !== color) {
                    this.possibleMoves.push({ row: newRow, col: newCol });
                }
                if (this.enPassantTarget && 
                    this.enPassantTarget.row === newRow && 
                    this.enPassantTarget.col === newCol) {
                    this.possibleMoves.push({ row: newRow, col: newCol, enPassant: true });
                }
            }
        }
    }

    calculateKnightMoves(row, col, color) {
        const moves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [rowOffset, colOffset] of moves) {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;
            if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== color) {
                    this.possibleMoves.push({ row: newRow, col: newCol });
                }
            }
        }
    }

    calculateBishopMoves(row, col, color) {
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [rowDir, colDir] of directions) {
            let newRow = row + rowDir;
            let newCol = col + colDir;
            while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const target = this.board[newRow][newCol];
                if (!target) {
                    this.possibleMoves.push({ row: newRow, col: newCol });
                } else {
                    if (target.color !== color) {
                        this.possibleMoves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                newRow += rowDir;
                newCol += colDir;
            }
        }
    }

    calculateRookMoves(row, col, color) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [rowDir, colDir] of directions) {
            let newRow = row + rowDir;
            let newCol = col + colDir;
            while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const target = this.board[newRow][newCol];
                if (!target) {
                    this.possibleMoves.push({ row: newRow, col: newCol });
                } else {
                    if (target.color !== color) {
                        this.possibleMoves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                newRow += rowDir;
                newCol += colDir;
            }
        }
    }

    calculateQueenMoves(row, col, color) {
        this.calculateBishopMoves(row, col, color);
        this.calculateRookMoves(row, col, color);
    }

    calculateKingMoves(row, col, color) {
        const moves = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        for (const [rowOffset, colOffset] of moves) {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;
            if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== color) {
                    this.possibleMoves.push({ row: newRow, col: newCol });
                }
            }
        }
        if (!this.board[row][col].hasMoved && !this.isInCheck(color)) {
            if (this.castlingRights[color].kingSide) {
                const rookCol = 7;
                const rook = this.board[row][rookCol];
                if (rook && rook.type === 'rook' && !rook.hasMoved) {
                    let canCastle = true;
                    for (let c = col + 1; c < rookCol; c++) {
                        if (this.board[row][c]) { canCastle = false; break; }
                    }
                    if (canCastle && !this.wouldBeInCheck(row, col, row, col + 1, color) && 
                        !this.wouldBeInCheck(row, col, row, col + 2, color)) {
                        this.possibleMoves.push({ row, col: col + 2, castling: 'kingSide' });
                    }
                }
            }
            if (this.castlingRights[color].queenSide) {
                const rookCol = 0;
                const rook = this.board[row][rookCol];
                if (rook && rook.type === 'rook' && !rook.hasMoved) {
                    let canCastle = true;
                    for (let c = col - 1; c > rookCol; c--) {
                        if (this.board[row][c]) { canCastle = false; break; }
                    }
                    if (canCastle && !this.wouldBeInCheck(row, col, row, col - 1, color) && 
                        !this.wouldBeInCheck(row, col, row, col - 2, color)) {
                        this.possibleMoves.push({ row, col: col - 2, castling: 'queenSide' });
                    }
                }
            }
        }
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {
        const movingPiece = this.board[fromRow][fromCol];
        const targetPiece = this.board[toRow][toCol];
        this.board[toRow][toCol] = movingPiece;
        this.board[fromRow][fromCol] = null;
        const inCheck = this.isInCheck(color);
        this.board[fromRow][fromCol] = movingPiece;
        this.board[toRow][toCol] = targetPiece;
        return inCheck;
    }

    isInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;
        const opponentColor = this.getOppositeColor(color);
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === opponentColor) {
                    if (this.canPieceAttackKing(row, col, kingPos.row, kingPos.col, piece)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    canPieceAttackKing(fromRow, fromCol, kingRow, kingCol, piece) {
        const rowDiff = kingRow - fromRow;
        const colDiff = kingCol - fromCol;
        switch (piece.type) {
            case 'pawn':
                const direction = piece.color === 'white' ? -1 : 1;
                return rowDiff === direction && Math.abs(colDiff) === 1;
            case 'knight':
                return (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) ||
                       (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2);
            case 'bishop':
                if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
                return this.isPathClear(fromRow, fromCol, kingRow, kingCol);
            case 'rook':
                if (rowDiff !== 0 && colDiff !== 0) return false;
                return this.isPathClear(fromRow, fromCol, kingRow, kingCol);
            case 'queen':
                if (Math.abs(rowDiff) !== Math.abs(colDiff) && rowDiff !== 0 && colDiff !== 0) return false;
                return this.isPathClear(fromRow, fromCol, kingRow, kingCol);
            case 'king':
                return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;
            default:
                return false;
        }
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = fromRow === toRow ? 0 : (toRow > fromRow ? 1 : -1);
        const colStep = fromCol === toCol ? 0 : (toCol > fromCol ? 1 : -1);
        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;
        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol]) {
                return false;
            }
            currentRow += rowStep;
            currentCol += colStep;
        }
        return true;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    isCheckmate(color) {
        if (!this.isInCheck(color)) return false;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const savedMoves = this.possibleMoves;
                    this.calculatePossibleMoves(row, col);
                    const hasValidMove = this.possibleMoves.length > 0;
                    this.possibleMoves = savedMoves;
                    if (hasValidMove) return false;
                }
            }
        }
        return true;
    }

    movePiece(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        if (capturedPiece) {
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
        }
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        piece.hasMoved = true;
        const move = this.possibleMoves.find(m => m.row === toRow && m.col === toCol);
        if (move && move.castling) {
            const row = toRow;
            if (move.castling === 'kingSide') {
                this.board[row][5] = this.board[row][7];
                this.board[row][7] = null;
                this.board[row][5].hasMoved = true;
            } else if (move.castling === 'queenSide') {
                this.board[row][3] = this.board[row][0];
                this.board[row][0] = null;
                this.board[row][3].hasMoved = true;
            }
        }
        if (move && move.enPassant) {
            const capturedRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
            const enPassantPiece = this.board[capturedRow][toCol];
            if (enPassantPiece) {
                this.capturedPieces[enPassantPiece.color].push(enPassantPiece);
            }
            this.board[capturedRow][toCol] = null;
        }
        this.enPassantTarget = null;
        if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
            this.enPassantTarget = {
                row: (fromRow + toRow) / 2,
                col: fromCol
            };
        }
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            piece.type = 'queen';
        }
        if (piece.type === 'king') {
            this.castlingRights[piece.color].kingSide = false;
            this.castlingRights[piece.color].queenSide = false;
        }
        if (piece.type === 'rook') {
            if (fromCol === 0) this.castlingRights[piece.color].queenSide = false;
            if (fromCol === 7) this.castlingRights[piece.color].kingSide = false;
        }
        this.moveHistory.push({
            piece: piece.type,
            color: piece.color,
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            captured: capturedPiece ? capturedPiece.type : null
        });
    }

    setupEventListeners() {
        const diceButton = document.getElementById('rollDice');
        diceButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.rollDice();
        });
        const style = document.createElement('style');
        style.textContent = `
            @keyframes diceRoll {
                0% { transform: rotate(0deg); }
                25% { transform: rotate(90deg); }
                50% { transform: rotate(180deg); }
                75% { transform: rotate(270deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Защита от удаления имени создателя
Object.defineProperty(window, 'GAME_NAME', {
    value: 'Lucky_Chess',
    writable: false,
    configurable: false
});

Object.defineProperty(window, 'CREATOR', {
    value: 'Nebo',
    writable: false,
    configurable: false
});

console.log('%c🎲 Lucky_Chess', 'font-size: 24px; font-weight: bold; color: #667eea;');
console.log('%cШахматы с кубиком', 'font-size: 16px; color: #764ba2;');
console.log('%cСоздатель: Nebo', 'font-size: 14px; color: #333;');
console.log('%c© 2024 Все права защищены', 'font-size: 12px; color: #999;');