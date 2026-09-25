/**
 * Space Invaders Core Game Engine
 * Manages game loop, state transitions, invaders grid movement, collision detection, and user inputs.
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // DOM Elements
    this.scoreEl = document.getElementById('score-val');
    this.highScoreEl = document.getElementById('high-score-val');
    this.waveEl = document.getElementById('wave-val');
    this.livesEl = document.getElementById('lives-val');
    this.overlay = document.getElementById('overlay-screen');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlaySubtitle = document.getElementById('overlay-subtitle');
    this.startBtn = document.getElementById('start-btn');
    this.fireRateValEl = document.getElementById('fire-rate-val');
    this.fireRateSliderEl = document.getElementById('fire-rate-slider');

    // Canvas Constants
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    // Game States: 'IDLE', 'PLAYING', 'GAMEOVER', 'VICTORY'
    this.state = 'IDLE';

    // Core Entities & Collections
    this.player = null;
    this.invaders = [];
    this.playerBullets = [];
    this.enemyBullets = [];
    this.shields = [];

    // Game Metrics
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('yasai_invaders_highscore') || '0', 10);
    this.wave = 1;
    this.lives = 5;

    // Invader Movement Mechanics
    this.invaderDirection = 1; // 1: Right, -1: Left
    this.invaderDropDistance = 16;
    this.lastInvaderStepTime = 0;
    this.invaderNeedDrop = false;
    this.invaderFireTimer = 0;

    // Input States
    this.keys = {
      left: false,
      right: false,
      fire: false
    };
    this.joystickVal = 0; // -1.0 (left) to 1.0 (right)

    this.lastFireTime = 0;
    this.baseFireCooldown = 250; // ms (baseline at state 1 = 4 shots/sec)
    this.fireRateSetting = -2.0;
    this.fireCooldown = 250; // ms
    this.speedMultiplier = 1.0;

    this.speedSliderEl = document.getElementById('speed-slider');
    this.speedValEl = document.getElementById('speed-val');

    // Debug collision visualization
    this.showCollisionBounds = false;

    this.initEvents();
    this.updateHUD();
    this.updateFireCooldown();
    
    // Auto-start or click to start immediately
    this.showStartPrompt();
    
    // Start main animation loop
    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  showStartPrompt() {
    this.overlayTitle.innerText = "クリックしてスタート";
    this.overlaySubtitle.innerText = "";
    this.startBtn.innerText = "ゲームスタート";
    this.overlay.classList.remove('hidden');
  }

  initEvents() {
    // Keyboard listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (!this.keys.left && this.player) this.player.resetMoveTimer();
        this.keys.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (!this.keys.right && this.player) this.player.resetMoveTimer();
        this.keys.right = true;
      }
      if (e.key === ' ' || e.key === 'Spacebar') {
        this.keys.fire = true;
        if (this.state !== 'PLAYING') {
          this.startGame();
        }
      }
      if (e.key === 'd' || e.key === 'D') {
        this.showCollisionBounds = !this.showCollisionBounds;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = false;
      }
      if (e.key === ' ' || e.key === 'Spacebar') {
        this.keys.fire = false;
      }
    });

    // Start / Click listeners for immediate play
    const triggerStart = () => {
      if (this.state !== 'PLAYING') {
        this.startGame();
      }
    };

    this.overlay.addEventListener('click', triggerStart);
    this.startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerStart();
    });

    // Touch controls setup (Joystick + Fire)
    const btnFire = document.getElementById('btn-fire');
    const bindFire = (btn) => {
      if (!btn) return;
      const trigger = (e) => {
        e.preventDefault();
        this.keys.fire = true;
        if (this.state !== 'PLAYING') triggerStart();
      };
      const release = (e) => {
        e.preventDefault();
        this.keys.fire = false;
      };
      btn.addEventListener('touchstart', trigger, {passive: false});
      btn.addEventListener('touchend', release, {passive: false});
      btn.addEventListener('mousedown', trigger);
      btn.addEventListener('mouseup', release);
    };
    bindFire(btnFire);

    // Joystick Logic
    const joystickZone = document.getElementById('joystick-zone');
    const joystickStick = document.getElementById('joystick-stick');
    const joystickBase = document.getElementById('joystick-base');
    if (joystickZone && joystickStick && joystickBase) {
      let isDragging = false;
      let centerX = 0;
      const maxDist = 30; // Max movement distance of stick

      const startDrag = (e) => {
        e.preventDefault();
        isDragging = true;
        const rect = joystickBase.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        updateStick(e);
      };

      const moveDrag = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        updateStick(e);
      };

      const endDrag = (e) => {
        e.preventDefault();
        isDragging = false;
        joystickStick.style.transform = `translate(0px, 0px)`;
        this.joystickVal = 0;
      };

      const updateStick = (e) => {
        let clientX = e.clientX;
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
        }
        let deltaX = clientX - centerX;
        
        // Clamp
        if (deltaX > maxDist) deltaX = maxDist;
        if (deltaX < -maxDist) deltaX = -maxDist;

        joystickStick.style.transform = `translate(${deltaX}px, 0px)`;

        // Set analog value (-1.0 to 1.0)
        this.joystickVal = deltaX / maxDist;
      };

      joystickZone.addEventListener('mousedown', startDrag);
      window.addEventListener('mousemove', moveDrag);
      window.addEventListener('mouseup', endDrag);

      joystickZone.addEventListener('touchstart', startDrag, {passive: false});
      window.addEventListener('touchmove', moveDrag, {passive: false});
      window.addEventListener('touchend', endDrag, {passive: false});
    }

    // Fire Rate Slider Listener
    if (this.fireRateSliderEl) {
      this.fireRateSliderEl.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.fireRateSetting = val;
        if (this.fireRateValEl) {
          this.fireRateValEl.innerText = val.toFixed(2);
        }
        this.updateFireCooldown();
      });
    }

    // Speed Slider Listener
    if (this.speedSliderEl) {
      this.speedSliderEl.addEventListener('input', (e) => {
        this.speedMultiplier = parseFloat(e.target.value);
        if (this.speedValEl) {
          this.speedValEl.innerText = this.speedMultiplier.toFixed(2);
        }
      });
    }
  }

  updateFireCooldown() {
    const val = this.fireRateSetting;
    // Default baseline at val = 1.00 is 250ms cooldown (4 shots/sec)
    // Range is from -5.00 to 1.00 with step 0.05
    // For val > 0: cooldown = 250 / val
    // For val <= 0: cooldown = 250 * (1 + Math.abs(val))
    if (val > 0) {
      this.fireCooldown = Math.max(20, this.baseFireCooldown / val);
    } else {
      this.fireCooldown = this.baseFireCooldown * (1 + Math.abs(val));
    }
  }

  startGame() {
    this.state = 'PLAYING';
    this.overlay.classList.add('hidden');

    this.score = 0;
    this.wave = 1;
    this.lives = 5;

    this.resetWave();
    this.updateHUD();
  }

  nextWave() {
    this.wave++;
    this.resetWave();
    this.updateHUD();
    audio.playVictory();
  }

  resetWave() {
    this.player = new Player(this.width, this.height);
    this.playerBullets = [];
    this.enemyBullets = [];
    this.invaders = [];
    this.shields = [];

    // Create 4 defense shields
    const shieldWidth = 60;
    const spacing = (this.width - (4 * shieldWidth)) / 5;
    for (let i = 0; i < 4; i++) {
      const sx = spacing + i * (shieldWidth + spacing);
      const sy = this.height - 110;
      this.shields.push(new Shield(sx, sy, shieldWidth, 40));
    }

    // Create Invader Grid (6 Rows x 12 Columns, 1/3 spacing)
    // Rows 0-1 (Top): Yellow Invaders (30 pts)
    // Rows 2-3 (Middle): Green Invaders (20 pts)
    // Rows 4-5 (Bottom): Red Invaders (10 pts)
    const rows = 6;
    const cols = 12;
    const startX = 248;
    const startY = 50;
    const spacingX = 8;  // 1/3 spacing
    const spacingY = 5;  // 1/3 spacing

    for (let r = 0; r < rows; r++) {
      let color = '#ff3355'; // Bottom: Red
      let points = 10;

      if (r === 0 || r === 1) {
        color = '#ffff00'; // Top: Yellow
        points = 30;
      } else if (r === 2 || r === 3) {
        color = '#00ff66'; // Middle: Green
        points = 20;
      } else {
        color = '#ff3355'; // Bottom: Red
        points = 10;
      }

      for (let c = 0; c < cols; c++) {
        const ix = startX + c * (22 + spacingX);
        const iy = startY + r * (22 + spacingY);
        this.invaders.push(new Invader(ix, iy, color, points));
      }
    }

    // Adjust invader step timing based on wave level
    this.invaderDirection = 1;
    this.lastInvaderStepTime = 0;
    this.invaderNeedDrop = false;
    this.invaderFireTimer = 0;
  }

  update(now) {
    if (this.state !== 'PLAYING') return;

    // 1. Handle Player Inputs (Analog & Step Movement)
    if (this.joystickVal !== 0) {
      this.player.moveAnalog(this.joystickVal, this.speedMultiplier);
    } else if (this.keys.left) {
      this.player.moveLeft(now);
    } else if (this.keys.right) {
      this.player.moveRight(now);
    }
    
    if (this.keys.fire) {
      this.firePlayerBullet(now);
    }

    // 2. Update Bullets
    this.playerBullets.forEach(b => b.update());
    this.enemyBullets.forEach(b => b.update());

    // Filter out-of-bounds bullets
    this.playerBullets = this.playerBullets.filter(b => b.y > -20);
    this.enemyBullets = this.enemyBullets.filter(b => b.y < this.height + 20);

    // 3. Update Invaders Grid Step Movement (Choppy / Arcade Step Tick)
    if (this.invaders.length > 0) {
      // Dynamic step interval calculation based on surviving invaders ratio and wave
      const maxInvaders = 72; // 6 rows * 12 cols
      const aliveRatio = Math.max(1, this.invaders.length) / maxInvaders;
      // Step interval adjusted for 2/3 movement speed (1.5x longer interval between steps: from ~675ms down to ~95ms)
      const baseInterval = Math.max(95, 675 * aliveRatio / (1 + (this.wave - 1) * 0.15));

      if (now - this.lastInvaderStepTime >= baseInterval) {
        this.lastInvaderStepTime = now;

        if (this.invaderNeedDrop) {
          // Change direction & drop down on edge step
          this.invaderDirection *= -1;
          for (const invader of this.invaders) {
            invader.y += this.invaderDropDistance;
          }
          this.invaderNeedDrop = false;
        } else {
          // Step jump horizontally
          const invaderStepX = 14;
          let hitEdge = false;

          for (const invader of this.invaders) {
            invader.x += this.invaderDirection * invaderStepX;

            if (
              (this.invaderDirection > 0 && invader.x + invader.width >= this.width - 10) ||
              (this.invaderDirection < 0 && invader.x <= 10)
            ) {
              hitEdge = true;
            }
          }

          if (hitEdge) {
            this.invaderNeedDrop = true;
          }
        }

        // Check if any invader reached shield / player bottom line
        for (const invader of this.invaders) {
          if (invader.y + invader.height >= this.player.y) {
            this.triggerGameOver();
            return;
          }
        }
      }

      // Enemy Fire Logic
      this.invaderFireTimer++;
      const fireInterval = Math.round(Math.max(30, 90 - (this.wave * 10)) * 1.21);
      if (this.invaderFireTimer >= fireInterval) {
        this.invaderFireTimer = 0;
        this.fireEnemyBullet();
      }
    } else {
      // All invaders destroyed -> Wave Cleared!
      this.nextWave();
      return;
    }

    // 4. Collisions Detection
    this.handleCollisions();
  }

  firePlayerBullet(now) {
    if (now - this.lastFireTime > this.fireCooldown) {
      this.lastFireTime = now;
      const bx = this.player.x + (this.player.width / 2) - 4;
      const by = this.player.y - 10;
      this.playerBullets.push(new Bullet(bx, by, -8, true));
      audio.playShoot();
    }
  }

  fireEnemyBullet() {
    if (this.invaders.length === 0) return;
    
    // Pick random invader from bottom-most row of columns
    const randomInvader = this.invaders[Math.floor(Math.random() * this.invaders.length)];
    const bx = randomInvader.x + (randomInvader.width / 2) - 2;
    const by = randomInvader.y + randomInvader.height;
    
    // Enemy bullet speed reduced to 3/5 (0.6x)
    const enemyBulletSpeed = (4 + (this.wave * 0.4)) * 0.6;
    this.enemyBullets.push(new Bullet(bx, by, enemyBulletSpeed, false));
    audio.playEnemyShoot();
  }

  handleCollisions() {
    // A. Player Bullets vs Invaders
    for (let bi = this.playerBullets.length - 1; bi >= 0; bi--) {
      const pBullet = this.playerBullets[bi];
      let bulletRemoved = false;

      for (let ii = this.invaders.length - 1; ii >= 0; ii--) {
        const inv = this.invaders[ii];

        if (pBullet.intersects(inv)) {
          inv.hp--;
          audio.playHit(inv.isLarge);

          if (inv.hp <= 0) {
            this.score += inv.points;
            if (this.score > this.highScore) {
              this.highScore = this.score;
              localStorage.setItem('yasai_invaders_highscore', this.highScore.toString());
            }
            this.updateHUD();
            this.invaders.splice(ii, 1);
          }

          this.playerBullets.splice(bi, 1);
          bulletRemoved = true;
          break;
        }
      }

      if (bulletRemoved) continue;

      // B. Player Bullets vs Shields
      for (const shield of this.shields) {
        if (shield.checkCollision(pBullet)) {
          this.playerBullets.splice(bi, 1);
          break;
        }
      }
    }

    // C. Enemy Bullets vs Shields & Player
    for (let bi = this.enemyBullets.length - 1; bi >= 0; bi--) {
      const eBullet = this.enemyBullets[bi];

      // Enemy Bullets vs Shields
      let hitShield = false;
      for (const shield of this.shields) {
        if (shield.checkCollision(eBullet)) {
          this.enemyBullets.splice(bi, 1);
          hitShield = true;
          break;
        }
      }
      if (hitShield) continue;

      // Enemy Bullets vs Player
      if (eBullet.intersects(this.player)) {
        if (performance.now() < this.player.invincibleUntil) {
          continue; // Ignore hit if invincible
        }

        this.enemyBullets.splice(bi, 1);
        this.lives--;
        this.updateHUD();
        audio.playPlayerHit();

        if (this.lives <= 0) {
          this.triggerGameOver();
        } else {
          // 3 seconds invincibility
          this.player.invincibleUntil = performance.now() + 3000;
        }
        break;
      }
    }
  }

  triggerGameOver() {
    this.state = 'GAMEOVER';
    audio.playGameOver();

    this.overlayTitle.innerText = "GAME OVER";
    this.overlaySubtitle.innerText = `FINAL SCORE: ${this.score}`;
    this.startBtn.innerText = "もう一度プレイ";
    this.overlay.classList.remove('hidden');
  }

  updateHUD() {
    this.scoreEl.innerText = this.score;
    this.highScoreEl.innerText = this.highScore;
    this.waveEl.innerText = this.wave;

    // Render green life boxes
    this.livesEl.innerHTML = '';
    for (let i = 0; i < this.lives; i++) {
      const icon = document.createElement('span');
      icon.className = 'life-icon';
      this.livesEl.appendChild(icon);
    }
  }

  drawDangerLine() {
    const lineY = this.player ? this.player.y : (this.height - 54);

    this.ctx.save();
    // Red glowing dashed danger line
    this.ctx.strokeStyle = 'rgba(255, 51, 85, 0.7)';
    this.ctx.shadowColor = '#ff3355';
    this.ctx.shadowBlur = 10;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 8]);

    this.ctx.beginPath();
    this.ctx.moveTo(0, lineY);
    this.ctx.lineTo(this.width, lineY);
    this.ctx.stroke();

    // DANGER text labels on left and right
    this.ctx.font = '10px "Press Start 2P", monospace';
    this.ctx.fillStyle = '#ff3355';
    this.ctx.fillText('DEFENSE LINE', 15, lineY - 6);
    this.ctx.fillText('DEFENSE LINE', this.width - 145, lineY - 6);

    this.ctx.restore();
  }

  drawCollisionBounds() {
    if (!this.showCollisionBounds) return;

    this.ctx.save();

    // Draw player collision bounds
    if (this.player) {
      const bounds = this.player.bounds;
      this.ctx.strokeStyle = '#00ff00';
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.7;
      this.ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);

      // Draw center point
      const centerX = (bounds.left + bounds.right) / 2;
      const centerY = (bounds.top + bounds.bottom) / 2;
      this.ctx.fillStyle = '#00ff00';
      this.ctx.globalAlpha = 1;
      this.ctx.fillRect(centerX - 2, centerY - 2, 4, 4);
    }

    // Draw invader collision bounds
    for (const inv of this.invaders) {
      const bounds = inv.bounds;
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = 1;
      this.ctx.globalAlpha = 0.5;
      this.ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
    }

    // Draw bullet collision bounds
    for (const bullet of this.playerBullets) {
      const bounds = bullet.bounds;
      this.ctx.strokeStyle = '#00ff00';
      this.ctx.lineWidth = 1;
      this.ctx.globalAlpha = 0.5;
      this.ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
    }

    for (const bullet of this.enemyBullets) {
      const bounds = bullet.bounds;
      this.ctx.strokeStyle = '#ffaa00';
      this.ctx.lineWidth = 1;
      this.ctx.globalAlpha = 0.5;
      this.ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
    }

    this.ctx.restore();
  }

  render() {
    // Clear canvas with space dark background
    this.ctx.fillStyle = '#000005';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw Defense / Danger Line
    this.drawDangerLine();

    // Draw Shields
    this.shields.forEach(s => s.draw(this.ctx));

    // Draw Player
    if (this.player && this.state === 'PLAYING') {
      this.player.draw(this.ctx);
    }

    // Draw Invaders
    this.invaders.forEach(inv => inv.draw(this.ctx));

    // Draw Bullets
    this.playerBullets.forEach(b => b.draw(this.ctx));
    this.enemyBullets.forEach(b => b.draw(this.ctx));

    // Draw collision bounds (debug mode)
    this.drawCollisionBounds();
  }

  loop(timestamp) {
    this.update(timestamp);
    this.render();
    requestAnimationFrame((ts) => this.loop(ts));
  }
}

// Instantiate game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
