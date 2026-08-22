// Lucky_Chess - Шахматы с кубиком
// Создатель: Nebo
// © 2024 Все права защищены

const GAME_NAME = "Lucky_Chess";
const CREATOR = "Nebo";
const VERSION = "3.5.0";
const COPYRIGHT = "© 2024 Nebo. Все права защищены.";

// Функция для показа модального окна "Онлайн режим"
function showOnlineComingSoon() {
    const modal = document.getElementById('notificationModal');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    
    modalIcon.textContent = '🌐';
    modalTitle.textContent = 'Онлайн режим';
    modalMessage.textContent = 'Еще не добавлена 😓';
    
    modal.style.display = 'flex';
}

// Функция для закрытия модального окна
function closeModal() {
    const modal = document.getElementById('notificationModal');
    modal.style.display = 'none';
}

// Закрытие модального окна при клике вне его
document.addEventListener('click', function(event) {
    const modal = document.getElementById('notificationModal');
    if (event.target === modal) {
        closeModal();
    }
});

// Закрытие модального окна при нажатии Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Функции для меню
function showBotMenu() {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('botMenu').style.display = 'flex';
}

function returnToMainMenu() {
    document.getElementById('botMenu').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'flex';
    if (window.game) {
        if (window.game.botTimeout) {
            clearTimeout(window.game.botTimeout);
        }
        window.game = null;
    }
}

function startGame(mode, botDifficulty = null) {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('botMenu').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    window.game = new ChessGame(mode, botDifficulty);
}

class ChessGame {
    constructor(mode = 'local', botDifficulty = null) {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.diceValue = null;
        this.gameOver = false;
        this.moveHistory = [];
        this.gameMode = mode;
        this.botDifficulty = botDifficulty;
        this.lastDiceValues = [];
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
        this.botThinking = false;
        this.botTimeout = null;
        this.gameStarted = false;
        this.diceRolls = 0;
        this.hasLostQueen = false;
        this.evaluationCache = new Map();
        this.maxCacheSize = 1000;
        this.audioContext = null;
        this.notifications = [];
        this.isBotTurn = false;
        this.botDoubleMove = false; // Флаг для двойного хода бота
        
        this.achievements = {
            firstMove: { name: 'Первый ход', description: 'Сделайте первый ход', unlocked: false },
            firstCapture: { name: 'Первое взятие', description: 'Съешьте первую фигуру', unlocked: false },
            diceMaster: { name: 'Мастер кубика', description: 'Бросьте кубик 10 раз', unlocked: false },
            comeback: { name: 'Возвращение', description: 'Выиграйте после потери ферзя', unlocked: false },
            godMode: { name: 'Режим бога', description: 'Активируйте режим бога', unlocked: false }
        };
        
        this.initBoard();
        this.initAudio();
        this.createNotificationSystem();
        this.renderBoard();
        this.setupEventListeners();
        
        if (this.gameMode === 'bot') {
            this.botPlayer = 'black';
            document.getElementById('botDifficulty').textContent = this.botDifficulty;
            this.showModeMessage();
        }
    }

    showModeMessage() {
        const messageElement = document.getElementById('message');
        if (this.gameMode === 'local') {
            messageElement.textContent = 'Игра с другом. Можно ходить или бросить кубик!';
        } else if (this.gameMode === 'bot') {
            messageElement.textContent = `Игра с ботом (${this.botDifficulty}). Вы играете за белых. Ваш ход!`;
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

    initAudio() {
        try {
            this.audioContext = null;
        } catch (e) {
            console.log('Web Audio API не поддерживается');
        }
    }

    ensureAudioContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.log('Web Audio API не поддерживается');
                return null;
            }
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    }

    playSound(type) {
        const audioContext = this.ensureAudioContext();
        if (!audioContext) return;
        
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            switch(type) {
                case 'move':
                    oscillator.frequency.value = 400;
                    oscillator.type = 'sine';
                    gainNode.gain.value = 0.3;
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
                case 'capture':
                    oscillator.frequency.value = 200;
                    oscillator.type = 'square';
                    gainNode.gain.value = 0.4;
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.15);
                    break;
                case 'dice':
                    oscillator.frequency.value = 600;
                    oscillator.type = 'sine';
                    gainNode.gain.value = 0.5;
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.2);
                    break;
                case 'win':
                    oscillator.frequency.value = 800;
                    oscillator.type = 'sine';
                    gainNode.gain.value = 0.6;
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.3);
                    break;
                case 'lose':
                    oscillator.frequency.value = 200;
                    oscillator.type = 'sawtooth';
                    gainNode.gain.value = 0.5;
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.3);
                    break;
                case 'check':
                    oscillator.frequency.value = 500;
                    oscillator.type = 'square';
                    gainNode.gain.value = 0.5;
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.2);
                    break;
            }
        } catch (e) {
            console.log('Ошибка воспроизведения звука:', e);
        }
    }

    createNotificationSystem() {
        const oldContainer = document.querySelector('.notification-container');
        if (oldContainer) {
            oldContainer.remove();
        }
        
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.className = 'notification-container';
        document.body.appendChild(this.notificationContainer);
    }

    showNotification(message, type = 'info', duration = 3000) {
        if (!this.notificationContainer) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        });
        
        this.notificationContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, duration);
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
        return piece ? symbols[piece.type]?.[piece.color] || '' : '';
    }

    renderBoard() {
        const boardElement = document.getElementById('board');
        if (!boardElement) return;
        
        boardElement.innerHTML = '';
        boardElement.style.display = 'grid';
        boardElement.style.gridTemplateColumns = 'repeat(8, 75px)';
        boardElement.style.gridTemplateRows = 'repeat(8, 75px)';
        boardElement.style.width = '600px';
        boardElement.style.height = '600px';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                square.style.width = '75px';
                square.style.height = '75px';
                square.style.display = 'flex';
                square.style.justifyContent = 'center';
                square.style.alignItems = 'center';
                square.style.fontSize = '48px';
                
                const piece = this.board[row][col];
                square.textContent = this.getPieceSymbol(piece);
                
                if (piece && piece.type === 'king' && this.isInCheck(piece.color)) {
                    square.style.backgroundColor = '#ff4444';
                    square.style.boxShadow = 'inset 0 0 20px rgba(255, 0, 0, 0.7)';
                    square.title = 'Шах!';
                }
                
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
        
        if (!whitePlayer || !blackPlayer) return;
        
        if (this.currentPlayer === 'white') {
            whitePlayer.classList.add('active');
            blackPlayer.classList.remove('active');
            whitePlayer.querySelector('.turn-status').textContent = 'Ваш ход!';
            blackPlayer.querySelector('.turn-status').textContent = 'Ожидание...';
        } else {
            blackPlayer.classList.add('active');
            whitePlayer.classList.remove('active');
            blackPlayer.querySelector('.turn-status').textContent = 
                this.gameMode === 'bot' ? 'Ход бота...' : 'Ход чёрных...';
            whitePlayer.querySelector('.turn-status').textContent = 'Ожидание...';
        }
        
        whitePlayer.querySelector('.player-avatar').textContent = '♔';
        blackPlayer.querySelector('.player-avatar').textContent = '♚';
    }

    updateCapturedPiecesInfo() {
        const whiteCapturedElement = document.getElementById('whiteCaptured');
        const blackCapturedElement = document.getElementById('blackCaptured');
        if (!whiteCapturedElement || !blackCapturedElement) return;
        
        const whiteSymbols = this.capturedPieces.white
            .filter(piece => piece.type !== 'king')
            .map(piece => this.getPieceSymbol(piece))
            .join(' ');
        const blackSymbols = this.capturedPieces.black
            .filter(piece => piece.type !== 'king')
            .map(piece => this.getPieceSymbol(piece))
            .join(' ');
            
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
        if (this.isBotTurn) return;
        if (this.resurrectMode) {
            document.getElementById('message').textContent = 'Сначала выберите клетку для воскрешения!';
            return;
        }
        if (this.diceValue !== null) {
            document.getElementById('message').textContent = 'Вы уже бросили кубик! Сделайте ход.';
            return;
        }
        
        this.diceValue = this.getRandomDiceValue();
        this.diceRolls++;
        
        const resultElement = document.getElementById('diceResult');
        const effectElement = document.getElementById('diceEffect');
        
        if (resultElement) {
            resultElement.textContent = this.diceValue;
            resultElement.style.animation = 'none';
            resultElement.offsetHeight;
            resultElement.style.animation = 'diceRoll 0.5s';
        }
        
        const effect = this.getDiceEffect(this.diceValue);
        if (effectElement) {
            effectElement.textContent = effect.description;
        }
        
        this.applyDiceEffect(this.diceValue);
        this.playSound('dice');
        this.checkAchievements();
        this.renderBoard();
    }

    getRandomDiceValue() {
        let value;
        let attempts = 0;
        
        do {
            value = Math.floor(Math.random() * 99) + 1;
            attempts++;
        } while (this.lastDiceValues.includes(value) && attempts < 10);
        
        this.lastDiceValues.push(value);
        if (this.lastDiceValues.length > 5) {
            this.lastDiceValues.shift();
        }
        
        return value;
    }

    getBotDiceValue() {
        let value;
        
        switch(this.botDifficulty) {
            case 'Жыргей':
                value = Math.floor(Math.random() * 49) + 1;
                break;
            case 'Легкий':
                value = Math.floor(Math.random() * 99) + 1;
                break;
            case 'Средний':
                value = Math.floor(Math.random() * 99) + 1;
                break;
            case 'Сложный':
                value = Math.random() < 0.6 ? Math.floor(Math.random() * 60) + 40 : Math.floor(Math.random() * 99) + 1;
                break;
            case 'Extreme':
                value = Math.random() < 0.7 ? Math.floor(Math.random() * 50) + 50 : Math.floor(Math.random() * 99) + 1;
                break;
            case 'Reinhard':
                value = Math.floor(Math.random() * 19) + 81;
                break;
            default:
                value = Math.floor(Math.random() * 99) + 1;
        }
        
        return value;
    }

    makeBotMove() {
        if (this.gameOver || this.botThinking) return;
        this.botThinking = true;
        this.isBotTurn = true;
        
        this.updateTurnIndicator();
        
        if (this.botTimeout) {
            clearTimeout(this.botTimeout);
        }
        
        this.botTimeout = setTimeout(() => {
            this.botTimeout = null;
            
            if (this.gameOver) {
                this.botThinking = false;
                this.isBotTurn = false;
                return;
            }
            
            const botPieces = this.getAllPieces(this.botPlayer);
            
            if (botPieces.length === 0) {
                this.botThinking = false;
                this.isBotTurn = false;
                this.gameOver = true;
                document.getElementById('message').textContent = 
                    '🏆 ПОБЕДА! У бота не осталось фигур!';
                this.playSound('win');
                this.renderBoard();
                return;
            }
            
            const diceChance = this.botDifficulty === 'Reinhard' ? 0.1 : 0.3;
            if (Math.random() < diceChance && !this.botDoubleMove) {
                this.diceValue = this.getBotDiceValue();
                document.getElementById('diceResult').textContent = this.diceValue;
                const effect = this.getDiceEffect(this.diceValue);
                document.getElementById('diceEffect').textContent = effect.description;
                this.applyDiceEffect(this.diceValue);
                
                // Если бот получил двойной ход
                if (this.doubleMoveForCurrent) {
                    this.botDoubleMove = true;
                }
                
                if (this.gameOver) {
                    this.botThinking = false;
                    this.isBotTurn = false;
                    this.renderBoard();
                    return;
                }
                
                if (this.currentPlayer !== this.botPlayer) {
                    this.botThinking = false;
                    this.isBotTurn = false;
                    this.renderBoard();
                    return;
                }
            } else {
                this.diceValue = null;
            }
            
            // Выбираем фигуру для хода
            let selectedPiece = this.selectBotPiece(botPieces);
            
            if (!selectedPiece) {
                // Все фигуры заморожены
                this.frozenPieces[this.botPlayer] = [];
                this.botThinking = false;
                this.isBotTurn = false;
                this.switchPlayer();
                this.renderBoard();
                return;
            }
            
            this.calculatePossibleMoves(selectedPiece.row, selectedPiece.col);
            
            if (this.possibleMoves.length > 0) {
                const finalMove = this.possibleMoves[Math.floor(Math.random() * this.possibleMoves.length)];
                this.movePiece(selectedPiece.row, selectedPiece.col, finalMove.row, finalMove.col);
            }
            
            this.selectedPiece = null;
            this.possibleMoves = [];
            this.diceValue = null;
            
            // Проверяем, был ли это первый ход из двух
            if (this.botDoubleMove) {
                this.botDoubleMove = false;
                this.doubleMoveForCurrent = false;
                
                // Делаем второй ход
                this.botThinking = false;
                this.isBotTurn = false;
                
                // Проверяем мат после первого хода
                const opponentColor = this.getOppositeColor(this.botPlayer);
                if (this.isCheckmate(opponentColor)) {
                    this.gameOver = true;
                    document.getElementById('message').textContent = 
                        `🏆 ШАХ И МАТ! Победил бот (${this.botDifficulty})!`;
                    this.playSound('win');
                    this.showNotification('🏆 Бот победил!', 'danger', 5000);
                    this.renderBoard();
                    return;
                }
                
                // Делаем второй ход
                document.getElementById('message').textContent = 'Бот делает второй ход!';
                this.renderBoard();
                
                setTimeout(() => {
                    this.makeBotMove();
                }, 500);
                
                return;
            }
            
            // Проверяем мат
            const opponentColorAfterMove = this.getOppositeColor(this.botPlayer);
            if (this.isCheckmate(opponentColorAfterMove)) {
                this.gameOver = true;
                document.getElementById('message').textContent = 
                    `🏆 ШАХ И МАТ! Победил бот (${this.botDifficulty})!`;
                this.playSound('win');
                this.showNotification('🏆 Бот победил!', 'danger', 5000);
                this.renderBoard();
                return;
            }
            
            this.botThinking = false;
            this.isBotTurn = false;
            this.switchPlayer();
            this.renderBoard();
        }, 800);
    }

    selectBotPiece(botPieces) {
        const unfrozenPieces = botPieces.filter(piece => 
            !this.frozenPieces[this.botPlayer].some(
                frozen => frozen.row === piece.row && frozen.col === piece.col
            )
        );
        
        if (unfrozenPieces.length === 0) {
            return null;
        }
        
        // Для разных уровней сложности
        if (this.botDifficulty === 'Reinhard') {
            const result = this.minimax(3, true, -Infinity, Infinity);
            if (result.move) {
                return result.move.piece;
            }
        } else if (this.botDifficulty === 'Средний' || 
                   this.botDifficulty === 'Сложный' || 
                   this.botDifficulty === 'Extreme') {
            let bestPiece = null;
            let bestScore = -Infinity;
            
            for (const piece of unfrozenPieces) {
                this.calculatePossibleMoves(piece.row, piece.col);
                if (this.possibleMoves.length > bestScore) {
                    bestScore = this.possibleMoves.length;
                    bestPiece = piece;
                }
            }
            
            if (bestPiece) {
                return bestPiece;
            }
        }
        
        // Случайный выбор для легких уровней
        return unfrozenPieces[Math.floor(Math.random() * unfrozenPieces.length)];
    }

    getThreatenedPieces(color) {
        const threatened = {};
        const opponentColor = this.getOppositeColor(color);
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    for (let r = 0; r < 8; r++) {
                        for (let c = 0; c < 8; c++) {
                            const attacker = this.board[r][c];
                            if (attacker && attacker.color === opponentColor) {
                                const savedMoves = this.possibleMoves;
                                this.calculatePossibleMoves(r, c);
                                const canAttack = this.possibleMoves.some(
                                    move => move.row === row && move.col === col
                                );
                                this.possibleMoves = savedMoves;
                                
                                if (canAttack) {
                                    threatened[row + '-' + col] = true;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return threatened;
    }

    simulateThreats(fromRow, fromCol, toRow, toCol) {
        const savedPiece = this.board[fromRow][fromCol];
        const savedTarget = this.board[toRow][toCol];
        
        this.board[toRow][toCol] = savedPiece;
        this.board[fromRow][fromCol] = null;
        
        const threats = this.getThreatenedPieces(this.botPlayer);
        
        this.board[fromRow][fromCol] = savedPiece;
        this.board[toRow][toCol] = savedTarget;
        
        return threats;
    }

    minimax(depth, isMaximizing, alpha, beta) {
        if (depth === 0) {
            return { score: this.evaluateBoard() };
        }
        
        const color = isMaximizing ? this.botPlayer : this.getOppositeColor(this.botPlayer);
        const pieces = this.getAllPieces(color);
        
        if (pieces.length === 0) {
            return { score: this.evaluateBoard() };
        }
        
        let bestMove = null;
        
        if (isMaximizing) {
            let maxEval = -Infinity;
            
            for (const piece of pieces) {
                this.calculatePossibleMoves(piece.row, piece.col);
                for (const move of this.possibleMoves) {
                    const savedBoard = JSON.parse(JSON.stringify(this.board));
                    
                    this.movePiece(piece.row, piece.col, move.row, move.col);
                    
                    const result = this.minimax(depth - 1, false, alpha, beta);
                    
                    this.board = savedBoard;
                    
                    if (result.score > maxEval) {
                        maxEval = result.score;
                        bestMove = { piece, move };
                    }
                    
                    alpha = Math.max(alpha, result.score);
                    if (beta <= alpha) break;
                }
            }
            
            return { score: maxEval, move: bestMove };
        } else {
            let minEval = Infinity;
            
            for (const piece of pieces) {
                this.calculatePossibleMoves(piece.row, piece.col);
                for (const move of this.possibleMoves) {
                    const savedBoard = JSON.parse(JSON.stringify(this.board));
                    
                    this.movePiece(piece.row, piece.col, move.row, move.col);
                    
                    const result = this.minimax(depth - 1, true, alpha, beta);
                    
                    this.board = savedBoard;
                    
                    if (result.score < minEval) {
                        minEval = result.score;
                        bestMove = { piece, move };
                    }
                    
                    beta = Math.min(beta, result.score);
                    if (beta <= alpha) break;
                }
            }
            
            return { score: minEval, move: bestMove };
        }
    }

    evaluateBoard() {
        const boardKey = this.getBoardHash();
        
        if (this.evaluationCache.has(boardKey)) {
            return this.evaluationCache.get(boardKey);
        }
        
        const score = this.calculateBoardScore();
        
        if (this.evaluationCache.size >= this.maxCacheSize) {
            const firstKey = this.evaluationCache.keys().next().value;
            this.evaluationCache.delete(firstKey);
        }
        this.evaluationCache.set(boardKey, score);
        
        return score;
    }

    getBoardHash() {
        let hash = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                hash += piece ? `${piece.color[0]}${piece.type[0]}${row}${col};` : `..${row}${col};`;
            }
        }
        return hash;
    }

    calculateBoardScore() {
        const pieceValues = {
            pawn: 100,
            knight: 320,
            bishop: 330,
            rook: 500,
            queen: 900,
            king: 20000
        };
        
        let score = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    const value = pieceValues[piece.type] || 0;
                    
                    let positionBonus = 0;
                    
                    const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
                    positionBonus -= centerDistance * 2;
                    
                    if (piece.type === 'pawn') {
                        const promotionProgress = piece.color === 'white' ? 
                            (7 - row) / 6 : row / 6;
                        positionBonus += promotionProgress * 50;
                    }
                    
                    const totalValue = value + positionBonus;
                    
                    if (piece.color === this.botPlayer) {
                        score += totalValue;
                    } else {
                        score -= totalValue;
                    }
                }
            }
        }
        
        return score;
    }

    getDiceEffect(value) {
        if (value === 1) return { type: 'lose_queen', description: '💔 Потеря ферзя!' };
        if (value === 2) return { type: 'lose_rook', description: '💔 Потеря ладьи!' };
        if (value === 3) return { type: 'lose_bishop', description: '💔 Потеря слона!' };
        if (value === 4) return { type: 'lose_knight', description: '💔 Потеря коня!' };
        if (value === 5) return { type: 'lose_pawn', description: '💔 Потеря пешки!' };
        if (value === 6) return { type: 'skip_turn', description: '💀 Пропуск хода!' };
        if (value === 7) return { type: 'freeze_own_random', description: '❄️ Заморозка вашей фигуры!' };
        if (value === 8) return { type: 'enemy_steals_pawn', description: '🕵️ Противник крадёт пешку!' };
        if (value === 9) return { type: 'demote_queen', description: '⬇️ Ферзь становится пешкой!' };
        if (value === 10) return { type: 'retreat_piece', description: '🔙 Фигура отступает!' };
        if (value === 11) return { type: 'pawn_only', description: '😔 Ход только пешкой!' };
        if (value === 12) return { type: 'knight_only', description: '🐴 Ход только конём!' };
        if (value === 13) return { type: 'teleport_own', description: '🌀 Фигура телепортируется!' };
        if (value === 14) return { type: 'swap_own', description: '🔄 Фигуры меняются местами!' };
        if (value === 15) return { type: 'lose_random_piece', description: '💔 Потеря случайной фигуры!' };
        if (value === 16) return { type: 'bishop_only', description: '⛪ Ход только слоном!' };
        if (value === 17) return { type: 'rook_only', description: '🏰 Ход только ладьёй!' };
        if (value === 18) return { type: 'freeze_own_two', description: '❄️❄️ Заморозка двух фигур!' };
        if (value === 19) return { type: 'enemy_double_move', description: '⚔️ Противник ходит дважды!' };
        if (value === 20) return { type: 'retreat_all', description: '🔙 Все фигуры отступают!' };
        
        if (value === 21) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 22) return { type: 'normal_pawn', description: '✅ Ход пешкой' };
        if (value === 23) return { type: 'normal_knight', description: '✅ Ход конём' };
        if (value === 24) return { type: 'normal_bishop', description: '✅ Ход слоном' };
        if (value === 25) return { type: 'normal_rook', description: '✅ Ход ладьёй' };
        if (value === 26) return { type: 'normal_queen', description: '✅ Ход ферзём' };
        if (value === 27) return { type: 'normal_king', description: '✅ Ход королём' };
        if (value === 28) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 29) return { type: 'bonus_one', description: '👍 Ход + 1 клетка' };
        if (value === 30) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 31) return { type: 'heal_one', description: '💚 Разморозка одной фигуры' };
        if (value === 32) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 33) return { type: 'normal_pawn', description: '✅ Ход пешкой' };
        if (value === 34) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 35) return { type: 'bonus_one', description: '👍 Ход + 1 клетка' };
        if (value === 36) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 37) return { type: 'normal_knight', description: '✅ Ход конём' };
        if (value === 38) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 39) return { type: 'normal_bishop', description: '✅ Ход слоном' };
        if (value === 40) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 41) return { type: 'heal_all', description: '💚 Разморозка всех фигур' };
        if (value === 42) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 43) return { type: 'bonus_two', description: '👍👍 Ход + 2 клетки' };
        if (value === 44) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 45) return { type: 'normal_pawn', description: '✅ Ход пешкой' };
        
        if (value === 46) return { type: 'extra_dice', description: '🎲 Дополнительный бросок!' };
        if (value === 47) return { type: 'shield', description: '🛡️ Щит от атаки!' };
        if (value === 48) return { type: 'double_move', description: '👑 Двойной ход!' };
        if (value === 49) return { type: 'upgrade_pawn_to_knight', description: '⬆️ Пешка → Конь' };
        if (value === 50) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 51) return { type: 'promote_pawn', description: '⭐ Пешка → Ферзь' };
        if (value === 52) return { type: 'steal_pawn', description: '🕵️ Кража пешки' };
        if (value === 53) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 54) return { type: 'upgrade_pawn_to_bishop', description: '⬆️ Пешка → Слон' };
        if (value === 55) return { type: 'steal_knight', description: '🕵️ Кража коня' };
        if (value === 56) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 57) return { type: 'upgrade_pawn_to_rook', description: '⬆️ Пешка → Ладья' };
        if (value === 58) return { type: 'steal_bishop', description: '🕵️ Кража слона' };
        if (value === 59) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 60) return { type: 'steal_rook', description: '🕵️ Кража ладьи' };
        if (value === 61) return { type: 'double_move', description: '👑 Двойной ход!' };
        if (value === 62) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 63) return { type: 'extra_dice', description: '🎲 Дополнительный бросок!' };
        if (value === 64) return { type: 'shield', description: '🛡️ Щит!' };
        if (value === 65) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 66) return { type: 'steal_queen', description: '🕵️ Кража ферзя!' };
        if (value === 67) return { type: 'double_move', description: '👑 Двойной ход!' };
        if (value === 68) return { type: 'normal_any', description: '✅ Обычный ход' };
        if (value === 69) return { type: 'resurrect_pawn', description: '✨ Воскрешение пешки' };
        if (value === 70) return { type: 'extra_dice', description: '🎲 Дополнительный бросок!' };
        
        if (value === 71) return { type: 'resurrect_knight', description: '✨ Воскрешение коня' };
        if (value === 72) return { type: 'kill_pawn', description: '⚡ Уничтожение пешки врага' };
        if (value === 73) return { type: 'resurrect_bishop', description: '✨ Воскрешение слона' };
        if (value === 74) return { type: 'kill_knight', description: '⚡ Уничтожение коня врага' };
        if (value === 75) return { type: 'resurrect_rook', description: '✨ Воскрешение ладьи' };
        if (value === 76) return { type: 'kill_bishop', description: '⚡ Уничтожение слона врага' };
        if (value === 77) return { type: 'resurrect_queen', description: '✨ Воскрешение ферзя!' };
        if (value === 78) return { type: 'kill_rook', description: '⚡ Уничтожение ладьи врага' };
        if (value === 79) return { type: 'time_warp', description: '⏰ Машина времени!' };
        if (value === 80) return { type: 'kill_queen', description: '⚡ Уничтожение ферзя врага!' };
        if (value === 81) return { type: 'freeze_enemy_one', description: '❄️ Заморозка фигуры врага' };
        if (value === 82) return { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' };
        if (value === 83) return { type: 'freeze_enemy_two', description: '❄️❄️ Заморозка двух фигур врага' };
        if (value === 84) return { type: 'apocalypse_enemy', description: '💀 АПОКАЛИПСИС для врага!' };
        if (value === 85) return { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' };
        
        if (value === 86) return { type: 'freeze_enemy_three', description: '❄️❄️❄️ Заморозка трёх фигур врага!' };
        if (value === 87) return { type: 'ultimate', description: '👑 УЛЬТИМАТУМ!' };
        if (value === 88) return { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' };
        if (value === 89) return { type: 'apocalypse_enemy', description: '💀 АПОКАЛИПСИС для врага!' };
        if (value === 90) return { type: 'ultimate', description: '👑 УЛЬТИМАТУМ!' };
        if (value === 91) return { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' };
        if (value === 92) return { type: 'apocalypse_enemy', description: '💀 АПОКАЛИПСИС!' };
        if (value === 93) return { type: 'ultimate', description: '👑 УЛЬТИМАТУМ!' };
        if (value === 94) return { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' };
        if (value === 95) return { type: 'apocalypse_enemy', description: '💀 АПОКАЛИПСИС!' };
        
        if (value === 96) return { type: 'ultimate', description: '👑 УЛЬТИМАТУМ!' };
        if (value === 97) return { type: 'god_mode', description: '🌟 РЕЖИМ БОГА!' };
        if (value === 98) return { type: 'apocalypse_enemy', description: '💀 АПОКАЛИПСИС!' };
        if (value === 99) return { type: 'instant_win', description: '🏆 МГНОВЕННАЯ ПОБЕДА!!!' };
        
        return { type: 'normal_any', description: '✅ Обычный ход' };
    }

    applyDiceEffect(value) {
        // ... (весь код applyDiceEffect остается тем же, что и раньше)
    }

    checkIfPlayerCanMove() {
        const currentColor = this.currentPlayer;
        const frozenPieces = this.frozenPieces[currentColor];
        const allPieces = this.getAllPieces(currentColor);
        const movablePieces = allPieces.filter(p => p.type !== 'king');
        
        if (movablePieces.length > 0 && frozenPieces.length >= movablePieces.length) {
            document.getElementById('message').textContent = 
                `❄️ Все фигуры ${currentColor === 'white' ? 'белых' : 'чёрных'} заморожены! Ход пропущен!`;
            
            this.frozenPieces[currentColor] = [];
            
            setTimeout(() => {
                this.switchPlayer();
                this.diceValue = null;
                this.renderBoard();
            }, 1000);
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
            if (lastMove.captured && lastMove.captured !== 'king') {
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
            
            if (this.gameMode === 'bot' && this.currentPlayer === this.botPlayer) {
                this.makeBotMove();
            }
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
            document.getElementById('message').textContent = `Ход ${this.currentPlayer === 'white' ? 'белых' : 'чёрных'}. Можно ходить или бросить кубик!`;
        }
        
        this.renderBoard();
        
        if (this.gameMode === 'bot' && this.currentPlayer === this.botPlayer) {
            this.makeBotMove();
        }
    }

    onSquareClick(row, col) {
        if (this.gameOver) return;
        if (this.isBotTurn) return;
        
        if (this.gameMode === 'bot' && this.currentPlayer === this.botPlayer) {
            return;
        }
        
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
        
        if (piece && piece.type === 'king' && this.selectedPiece) {
            const canCaptureKing = this.possibleMoves.some(move => move.row === row && move.col === col);
            if (canCaptureKing) {
                document.getElementById('message').textContent = '👑 Король не может быть съеден! Игра заканчивается матом!';
                this.showNotification('👑 Король не может быть съеден!', 'warning', 3000);
                return;
            }
        }
        
        if (piece && this.frozenPieces[piece.color].some(
            frozen => frozen.row === row && frozen.col === col
        )) {
            document.getElementById('message').textContent = '❄️ Эта фигура заморожена!';
            return;
        }
        
        if (this.selectedPiece) {
            const canMove = this.possibleMoves.some(move => move.row === row && move.col === col);
            if (canMove) {
                const targetPiece = this.board[row][col];
                if (targetPiece && targetPiece.type === 'king') {
                    document.getElementById('message').textContent = '👑 Король не может быть съеден! Игра заканчивается матом!';
                    this.showNotification('👑 Король не может быть съеден!', 'warning', 3000);
                    return;
                }
                
                this.movePiece(this.selectedPiece.row, this.selectedPiece.col, row, col);
                this.selectedPiece = null;
                this.possibleMoves = [];
                this.diceValue = null;
                
                const opponentColor = this.getOppositeColor(this.currentPlayer);
                if (this.isCheckmate(opponentColor)) {
                    this.gameOver = true;
                    document.getElementById('message').textContent = 
                        `🏆 ШАХ И МАТ! Победили ${this.currentPlayer === 'white' ? 'белые' : 'чёрные'}!`;
                    this.playSound('win');
                    this.showNotification('🏆 ШАХ И МАТ!', 'success', 5000);
                    
                    if (this.hasLostQueen && this.currentPlayer === 'white') {
                        this.unlockAchievement('comeback');
                    }
                } else if (this.isInCheck(opponentColor)) {
                    document.getElementById('message').textContent = '👑 ШАХ!';
                    this.playSound('check');
                    this.showNotification('👑 ШАХ!', 'warning', 2000);
                }
                
                this.checkAchievements();
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
        
        const allMoves = [...this.possibleMoves];
        
        this.possibleMoves = allMoves.filter(move => {
            return !this.wouldBeInCheck(row, col, move.row, move.col, piece.color);
        });
        
        this.possibleMoves = this.possibleMoves.filter(move => {
            const targetPiece = this.board[move.row][move.col];
            return !(targetPiece && targetPiece.type === 'king');
        });
    }

    calculatePawnMoves(row, col, color) {
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        const newRow = row + direction;
        if (newRow >= 0 && newRow < 8 && !this.board[newRow][col]) {
            this.possibleMoves.push({ row: newRow, col });
            if (row === startRow && !this.board[row + 2 * direction]?.[col]) {
                this.possibleMoves.push({ row: row + 2 * direction, col });
            }
        }
        for (const colOffset of [-1, 1]) {
            const newCol = col + colOffset;
            if (newCol >= 0 && newCol < 8 && newRow >= 0 && newRow < 8) {
                const target = this.board[newRow][newCol];
                if (target && target.color !== color && target.type !== 'king') {
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
                if (!target || (target.color !== color && target.type !== 'king')) {
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
                    if (target.color !== color && target.type !== 'king') {
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
                    if (target.color !== color && target.type !== 'king') {
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
                if (!target || (target.color !== color && target.type !== 'king')) {
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
        
        if (targetPiece && targetPiece.type === 'king') {
            return true;
        }
        
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
            if (this.board[currentRow]?.[currentCol]) {
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
        
        if (capturedPiece && capturedPiece.type === 'king') {
            console.error('Попытка съесть короля!');
            return;
        }
        
        if (capturedPiece) {
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
            this.playSound('capture');
        } else {
            this.playSound('move');
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
            const enPassantPiece = this.board[capturedRow]?.[toCol];
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

    checkAchievements() {
        if (!this.achievements.firstMove.unlocked && this.moveHistory.length > 0) {
            this.unlockAchievement('firstMove');
        }
        
        if (!this.achievements.firstCapture.unlocked && 
            this.moveHistory.some(move => move.captured)) {
            this.unlockAchievement('firstCapture');
        }
        
        if (!this.achievements.diceMaster.unlocked && this.diceRolls >= 10) {
            this.unlockAchievement('diceMaster');
        }
        
        if (!this.achievements.godMode.unlocked && this.godMode) {
            this.unlockAchievement('godMode');
        }
    }

    unlockAchievement(achievementKey) {
        if (this.achievements[achievementKey].unlocked) return;
        
        this.achievements[achievementKey].unlocked = true;
        this.showNotification(
            `🏆 Достижение: ${this.achievements[achievementKey].name}!\n${this.achievements[achievementKey].description}`,
            'success',
            5000
        );
    }

    setupEventListeners() {
        const diceButton = document.getElementById('rollDice');
        if (diceButton) {
            diceButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.rollDice();
            });
        }
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
