// Matter.jsをインポート
import Matter from 'https://esm.sh/matter-js';

if (!Matter) {
    console.error('Matter.js failed to load from CDN.');
}

// --- Constants & Config ---
const ENGINE_CONFIG = {
    width: 400,
    height: 600,
    monsterInitialY: 50,
    dropDelay: 1000,
    continuousDropDelay: 500,
};

const MONSTERS = [
    { id: 1, radius: 15, score: 2, color: '#ffadad', image: new URL('./assets/monsters/monster1.png', import.meta.url).href },
    { id: 2, radius: 25, score: 4, color: '#ffd6a5', image: new URL('./assets/monsters/monster2.png', import.meta.url).href },
    { id: 3, radius: 35, score: 8, color: '#fdffb6', image: new URL('./assets/monsters/monster3.png', import.meta.url).href },
    { id: 4, radius: 45, score: 16, color: '#caffbf', image: new URL('./assets/monsters/monster4.png', import.meta.url).href },
    { id: 5, radius: 55, score: 32, color: '#9bf6ff', image: new URL('./assets/monsters/monster5.png', import.meta.url).href },
    { id: 6, radius: 70, score: 64, color: '#a0c4ff', image: new URL('./assets/monsters/monster6.png', import.meta.url).href },
    { id: 7, radius: 85, score: 128, color: '#bdb2ff', image: new URL('./assets/monsters/monster7.png', import.meta.url).href },
    { id: 8, radius: 100, score: 256, color: '#ffc6ff', image: new URL('./assets/monsters/monster8.png', import.meta.url).href },
    { id: 9, radius: 120, score: 512, color: '#fffffc', image: new URL('./assets/monsters/monster9.png', import.meta.url).href },
    { id: 10, radius: 150, score: 1024, color: '#8d99ae', image: new URL('./assets/monsters/monster10.png', import.meta.url).href },
];

/**
 * Game Class
 */
class MonsterGame {
    constructor() {
        this.engine = Matter.Engine.create();
        this.render = null;
        this.runner = Matter.Runner.create();

        this.currentMonster = null;
        this.nextMonsterIndex = this.getRandomMonsterIndex();
        this.isDropping = false;
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('monster-best-score')) || 0;
        this.isBgmOn = true;
        this.isContinuous = false;
        this.isGameOver = false;

        this.dropTimer = null;
        this.isMouseDown = false;

        // Sounds
        this.soundAssets = {
            drop: new URL('./assets/sounds/drop.wav', import.meta.url).href,
            merge: new URL('./assets/sounds/merge.wav', import.meta.url).href,
            bgm: new URL('./assets/sounds/bgm.mp3', import.meta.url).href
        };

        this.sounds = {
            drop: new Audio(this.soundAssets.drop),
            merge: new Audio(this.soundAssets.merge),
            bgm: new Audio(this.soundAssets.bgm)
        };

        // BGM Settings
        this.sounds.bgm.loop = true;
        this.sounds.bgm.volume = 0.3;

        this.init();
    }

    init() {
        try {
            console.log('Initializing UI elements...');
            // UI Elements
            this.currentScoreEl = document.getElementById('current-score');
            this.bestScoreEl = document.getElementById('best-score');
            if (this.bestScoreEl) this.bestScoreEl.textContent = this.bestScore;

            this.nextPreviewEl = document.getElementById('next-monster-preview');
            this.cloudContainer = document.getElementById('cloud-container');
            this.hangingMonsterEl = document.getElementById('hanging-monster');
            this.gameContainer = document.getElementById('game-container');
            this.gameOverEl = document.getElementById('game-over');
            this.finalScoreEl = document.getElementById('final-score');

            if (!this.gameContainer) {
                throw new Error('game-container not found!');
            }

            console.log('Setting up Matter.js...');
            // Setup Canvas
            const containerWidth = this.gameContainer.clientWidth || 400;
            const containerHeight = this.gameContainer.clientHeight || 600;

            this.render = Matter.Render.create({
                element: this.gameContainer,
                engine: this.engine,
                options: {
                    width: containerWidth,
                    height: containerHeight,
                    wireframes: false,
                    background: 'transparent',
                }
            });

            // Create Walls
            const wallOptions = { isStatic: true, render: { visible: false } };
            const ground = Matter.Bodies.rectangle(containerWidth / 2, containerHeight + 30, containerWidth, 60, wallOptions);
            const leftWall = Matter.Bodies.rectangle(-30, containerHeight / 2, 60, containerHeight, wallOptions);
            const rightWall = Matter.Bodies.rectangle(containerWidth + 30, containerHeight / 2, 60, containerHeight, wallOptions);

            Matter.World.add(this.engine.world, [ground, leftWall, rightWall]);

            // Events
            Matter.Events.on(this.engine, 'collisionStart', (event) => this.handleCollision(event));

            window.addEventListener('click', (e) => this.handleClick(e));
            window.addEventListener('touchstart', (e) => this.handleClick(e));
            window.addEventListener('mousemove', (e) => this.updateCloudPosition(e));
            window.addEventListener('touchmove', (e) => this.updateCloudPosition(e));

            // Long press support for continuous drop
            window.addEventListener('mousedown', (e) => this.handlePointerDown(e));
            window.addEventListener('touchstart', (e) => this.handlePointerDown(e));
            window.addEventListener('mouseup', () => this.handlePointerUp());
            window.addEventListener('touchend', () => this.handlePointerUp());
            window.addEventListener('mouseleave', () => this.handlePointerUp());

            const toggleBgmBtn = document.getElementById('toggle-bgm');
            if (toggleBgmBtn) toggleBgmBtn.addEventListener('click', () => this.toggleBgm());

            const toggleContBtn = document.getElementById('toggle-continuous');
            if (toggleContBtn) toggleContBtn.addEventListener('click', () => this.toggleContinuous());

            const restartBtn = document.getElementById('restart-btn');
            if (restartBtn) restartBtn.addEventListener('click', () => location.reload());

            // Interaction to enable audio (due to browser policy)
            // Interaction to enable audio (due to browser policy)
            const enableAudio = () => {
                if (this.isBgmOn && this.sounds.bgm.paused) {
                    this.sounds.bgm.play()
                        .then(() => {
                            console.log('BGM started via user interaction');
                            // 再生に成功したらリスナーを解除
                            window.removeEventListener('click', enableAudio);
                            window.removeEventListener('touchstart', enableAudio);
                            window.removeEventListener('pointerdown', enableAudio);
                            window.removeEventListener('keydown', enableAudio);
                        })
                        .catch(e => {
                            console.log('Initial BGM play failed (will retry):', e);
                            // 失敗した場合はリスナーを解除せず、次の操作で再試行させる
                        });
                }
            };
            // より広範なイベントで発火させる
            window.addEventListener('click', enableAudio);
            window.addEventListener('touchstart', enableAudio);
            window.addEventListener('pointerdown', enableAudio);
            window.addEventListener('keydown', enableAudio);

            // Start
            Matter.Render.run(this.render);
            Matter.Runner.run(this.runner, this.engine);

            this.prepareNextMonster();
            console.log('Game initialized successfully.');
        } catch (error) {
            console.error('Critical initialization error:', error);
            alert('ゲームの起動に失敗しました。コンソールログを確認してください。');
        }
    }

    getRandomMonsterIndex() {
        return Math.floor(Math.random() * 5);
    }

    prepareNextMonster() {
        if (this.isGameOver) return;

        const monsterInfo = MONSTERS[this.nextMonsterIndex];
        this.nextMonsterIndex = this.getRandomMonsterIndex();
        this.updateNextPreview();

        this.showHangingMonster(monsterInfo);
        this.isDropping = false;
    }

    updateNextPreview() {
        if (this.isGameOver) return;
        const nextMonster = MONSTERS[this.nextMonsterIndex];
        console.log('Loading next preview:', nextMonster.image);
        this.nextPreviewEl.innerHTML = `<img src="${nextMonster.image}" style="width: 40px; height: 40px; object-fit: contain;" alt="Next" onerror="this.style.display='none'">`;
        this.nextPreviewEl.style.backgroundColor = nextMonster.color;
        this.nextPreviewEl.style.borderRadius = '50%';
    }

    showHangingMonster(monsterInfo) {
        console.log('Hanging monster image:', monsterInfo.image);
        this.hangingMonsterEl.innerHTML = `<img src="${monsterInfo.image}" style="width: ${monsterInfo.radius * 2}px; height: ${monsterInfo.radius * 2}px; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));" alt="Monster" onerror="this.parentElement.style.backgroundColor='${monsterInfo.color}'; this.style.display='none';">`;
        this.hangingMonsterEl.dataset.monsterId = monsterInfo.id;
        this.hangingMonsterEl.style.borderRadius = '50%';
        this.hangingMonsterEl.style.backgroundColor = 'transparent';
    }

    updateCloudPosition(e) {
        if (this.isDropping || this.isGameOver) return;

        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const rect = this.gameContainer.getBoundingClientRect();
        let relativeX = x - rect.left;

        const monsterId = parseInt(this.hangingMonsterEl.dataset.monsterId);
        if (isNaN(monsterId)) return;
        const radius = MONSTERS[monsterId - 1].radius;
        const minX = radius;
        const maxX = (this.gameContainer.clientWidth || 400) - radius;

        if (relativeX < minX) relativeX = minX;
        if (relativeX > maxX) relativeX = maxX;

        this.cloudContainer.style.left = `${(relativeX / (this.gameContainer.clientWidth || 400)) * 100}%`;

    }

    handleClick(e) {
        // Prevent click if we're handling via pointer down/up for long press
        if (this.isContinuous) return;
        if (e.target.closest('#ui-overlay') || e.target.closest('.modal')) return;
        if (this.isDropping || this.isGameOver) return;
        this.dropMonster();
    }

    handlePointerDown(e) {
        if (e.target.closest('#ui-overlay') || e.target.closest('.modal')) return;
        if (this.isGameOver) return;

        this.isMouseDown = true;
        this.updateCloudPosition(e);

        if (this.isContinuous) {
            this.startContinuousDrop();
        } else if (!this.isDropping) {
            this.dropMonster();
        }
    }

    handlePointerUp() {
        this.isMouseDown = false;
        this.stopContinuousDrop();
    }

    startContinuousDrop() {
        if (this.dropTimer) return;

        const dropLoop = () => {
            if (!this.isMouseDown || !this.isContinuous || this.isGameOver) {
                this.stopContinuousDrop();
                return;
            }

            if (!this.isDropping) {
                this.dropMonster();
            }

            this.dropTimer = setTimeout(dropLoop, ENGINE_CONFIG.continuousDropDelay);
        };

        dropLoop();
    }

    stopContinuousDrop() {
        if (this.dropTimer) {
            clearTimeout(this.dropTimer);
            this.dropTimer = null;
        }
    }

    dropMonster() {
        this.isDropping = true;
        const monsterId = parseInt(this.hangingMonsterEl.dataset.monsterId);
        const monsterInfo = MONSTERS[monsterId - 1];

        const rect = this.gameContainer.getBoundingClientRect();
        const cloudRect = this.cloudContainer.getBoundingClientRect();
        const x = cloudRect.left + cloudRect.width / 2 - rect.left;
        const y = 0;

        const monster = Matter.Bodies.circle(x, y, monsterInfo.radius, {
            label: `monster-${monsterId}`,
            restitution: 0.4,
            friction: 0.1,
            render: {
                fillStyle: monsterInfo.color,
                strokeStyle: '#ffffff',
                lineWidth: 2,
                sprite: {
                    texture: monsterInfo.image,
                    xScale: (monsterInfo.radius * 2) / 100,
                    yScale: (monsterInfo.radius * 2) / 100
                }
            }
        });

        Matter.World.add(this.engine.world, monster);
        this.hangingMonsterEl.innerHTML = '';
        this.playSound('drop');

        const delay = this.isContinuous ? ENGINE_CONFIG.continuousDropDelay : ENGINE_CONFIG.dropDelay;
        setTimeout(() => this.prepareNextMonster(), delay);

        this.checkGameOver(monster);
    }

    handleCollision(event) {
        const pairs = event.pairs;
        pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;
            if (bodyA.label === bodyB.label && bodyA.label.startsWith('monster-')) {
                const id = parseInt(bodyA.label.split('-')[1]);
                if (id < MONSTERS.length) {
                    this.mergeMonsters(bodyA, bodyB, id);
                }
            }
        });
    }

    mergeMonsters(bodyA, bodyB, currentId) {
        if (bodyA.isStatic || bodyB.isStatic) return;

        const midX = (bodyA.position.x + bodyB.position.x) / 2;
        const midY = (bodyA.position.y + bodyB.position.y) / 2;
        const nextMonsterInfo = MONSTERS[currentId];

        const newMonster = Matter.Bodies.circle(midX, midY, nextMonsterInfo.radius, {
            label: `monster-${nextMonsterInfo.id}`,
            render: {
                fillStyle: nextMonsterInfo.color,
                strokeStyle: '#ffffff',
                lineWidth: 2,
                sprite: {
                    texture: nextMonsterInfo.image,
                    xScale: (nextMonsterInfo.radius * 2) / 100,
                    yScale: (nextMonsterInfo.radius * 2) / 100
                }
            }
        });

        Matter.World.remove(this.engine.world, [bodyA, bodyB]);
        Matter.World.add(this.engine.world, newMonster);

        this.addScore(nextMonsterInfo.score);
        this.playSound('merge');
        this.createFusionEffect(midX, midY, nextMonsterInfo.color);
    }

    createFusionEffect(x, y, color) {
        const particleCount = 12; // パーティクルの数
        const wrapper = document.getElementById('game-container');

        // Matter.jsのレンダリング要素の位置調整が必要な場合があるが、
        // 今回は game-container 内に絶対配置でパーティクルを置く
        // 座標変換: Matter.jsの座標系はCanvas左上が(0,0)で、CSSもそれに従う（Canvasがコンテナいっぱいに広がっている前提）

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle-flower');

            // ランダムな飛び散る方向と距離
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            const rot = Math.random() * 360 + 720; // 回転

            // 色を反映
            particle.style.backgroundColor = color;
            particle.style.boxShadow = `0 0 8px ${color}`;

            // 位置設定
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;

            // アニメーション変数をCSSに渡す
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);
            particle.style.setProperty('--rot', `${rot}deg`);

            // アニメーション適用
            particle.style.animation = `particle-fade-out 0.8s ease-out forwards`;

            wrapper.appendChild(particle);

            // 終了後に削除
            setTimeout(() => {
                particle.remove();
            }, 800);
        }
    }

    addScore(points) {
        this.score += points;
        this.currentScoreEl.textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreEl.textContent = this.bestScore;
            localStorage.setItem('monster-best-score', this.bestScore);
        }
    }

    checkGameOver(monster) {
        setTimeout(() => {
            if (this.isGameOver) return;
            if (monster.position.y < 50 && Math.abs(monster.velocity.y) < 0.1) {
                this.triggerGameOver();
            }
        }, 2000);
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.finalScoreEl.textContent = this.score;
        this.gameOverEl.classList.remove('hidden');
        Matter.Runner.stop(this.runner);
    }

    toggleBgm() {
        this.isBgmOn = !this.isBgmOn;
        const btn = document.getElementById('toggle-bgm');
        if (btn) btn.textContent = this.isBgmOn ? '🔊' : '🔇';

        if (this.isBgmOn) {
            this.sounds.bgm.play().catch(e => console.log('BGM play failed:', e));
        } else {
            this.sounds.bgm.pause();
        }
    }

    playSound(type) {
        if (!this.isBgmOn) return;

        const sound = this.sounds[type];
        if (sound) {
            // 連続再生を可能にするため、再生位置をリセット
            sound.currentTime = 0;
            sound.play().catch(e => console.log(`${type} sound play failed:`, e));
        }
    }

    toggleContinuous() {
        this.isContinuous = !this.isContinuous;
        document.getElementById('toggle-continuous').textContent = this.isContinuous ? '連続投下: ON' : '通常投下';
        document.getElementById('toggle-continuous').style.background = this.isContinuous ? '#ff6b6b' : 'rgba(255, 255, 255, 0.2)';
    }
}

window.onload = () => {
    try {
        console.log('Starting MonsterGame...');
        new MonsterGame();
    } catch (error) {
        console.error('Failed to start MonsterGame:', error);
    }
};
