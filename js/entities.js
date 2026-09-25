/**
 * Space Invaders Entity Classes
 * Designed for easy future image replacement via image elements.
 */

// Base Entity Class
class Entity {
  constructor(x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.image = null; // Set image HTMLImageElement here in future for custom graphics!
  }

  get bounds() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    };
  }

  intersects(other) {
    const a = this.bounds;
    const b = other.bounds;
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  draw(ctx) {
    if (this.image && this.image.complete && this.image.naturalWidth !== 0) {
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      // Retro glow outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
  }
}

// Player (Green Box)
class Player extends Entity {
  constructor(canvasWidth, canvasHeight) {
    const width = 40;
    const height = 40; // Made square
    const x = (canvasWidth - width) / 2;
    const y = canvasHeight - height - 30;
    super(x, y, width, height, '#00ff66');

    this.stepDistance = 16; // Step jump distance in px
    this.moveCooldown = 90; // ms interval between steps when holding key
    this.lastMoveTime = 0;
    this.canvasWidth = canvasWidth;
    this.isDead = false;
    this.respawnTimer = 0;
    this.invincibleUntil = 0;
    
    // Image configuration
    this.image = new Image();
    this.image.src = 'images/OIP.png';
  }

  get bounds() {
    // Collision bounds are 15px narrower (7.5px each side)
    const boundsWidth = 25;
    const offsetX = (this.width - boundsWidth) / 2;
    return {
      left: this.x + offsetX,
      right: this.x + offsetX + boundsWidth,
      top: this.y,
      bottom: this.y + this.height
    };
  }

  moveLeft(now) {
    if (now - this.lastMoveTime >= this.moveCooldown) {
      this.x = Math.max(10, this.x - this.stepDistance);
      this.lastMoveTime = now;
      return true;
    }
    return false;
  }

  moveRight(now) {
    if (now - this.lastMoveTime >= this.moveCooldown) {
      this.x = Math.min(this.canvasWidth - this.width - 10, this.x + this.stepDistance);
      this.lastMoveTime = now;
      return true;
    }
    return false;
  }

  resetMoveTimer() {
    this.lastMoveTime = 0;
  }

  moveAnalog(factor, speedMultiplier = 1.0) {
    const maxSpeed = 3 * speedMultiplier;
    this.x = Math.max(10, Math.min(this.canvasWidth - this.width - 10, this.x + factor * maxSpeed));
  }

  draw(ctx) {
    const isInvincible = performance.now() < this.invincibleUntil;
    
    ctx.save();
    if (isInvincible) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 10;
    }

    if (this.image && this.image.complete && this.image.naturalWidth !== 0) {
      // Draw image with potential red shadow if invincible
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    } else {
      // Green Cube Player with cannon turret
      ctx.fillStyle = '#00ff66';
      if (!isInvincible) {
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 10;
      }
      
      // Main Body (Green Box)
      ctx.fillRect(this.x, this.y + 8, this.width, this.height - 8);
      
      // Top Turret Cannon
      ctx.fillRect(this.x + (this.width / 2) - 4, this.y, 8, 8);
    }
    ctx.restore();
  }
}

// Invader Class (Standard Red, Green, Yellow)
class Invader extends Entity {
  /**
   * @param {number} x 
   * @param {number} y 
   * @param {string} color 
   * @param {number} points 
   */
  constructor(x, y, color = '#ff3355', points = 10) {
    const width = 22; // 18 * 1.2
    const height = 22; // 18 * 1.2

    super(x, y, width, height, color);

    this.isLarge = false;
    this.maxHp = 1;
    this.hp = 1;
    this.points = points;

    // Load appropriate image based on color
    this.image = new Image();
    if (color === '#ffff00') {
      this.image.src = 'images/142.burger.png';
    } else if (color === '#00ff66') {
      this.image.src = 'images/donut.png';
    } else {
      this.image.src = 'images/R.png';
    }

    // Animation frame flag
    this.animFrame = 0;
  }

  get bounds() {
    // Collision bounds are 20% wider
    const boundsWidth = 26.4;
    const offsetX = (this.width - boundsWidth) / 2;
    return {
      left: this.x + offsetX,
      right: this.x + offsetX + boundsWidth,
      top: this.y,
      bottom: this.y + this.height
    };
  }

  draw(ctx) {
    if (this.image && this.image.complete && this.image.naturalWidth !== 0) {
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    } else {
      ctx.save();
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;

      // Base Box Fill
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);

      // Inner accents / Eyes for classic arcade look
      ctx.fillStyle = '#000000';
      const eyeSize = 3;
      const eyeY = this.y + (this.height * 0.25);
      
      ctx.fillRect(this.x + (this.width * 0.2), eyeY, eyeSize, eyeSize);
      ctx.fillRect(this.x + (this.width * 0.8) - eyeSize, eyeY, eyeSize, eyeSize);

      ctx.restore();
    }
  }
}

// Bullet Class
class Bullet extends Entity {
  constructor(x, y, vy, isPlayer = true) {
    const width = isPlayer ? 8 : 5;
    const height = isPlayer ? 12 : 10;
    const color = isPlayer ? '#37e637' : '#ffaa00';
    super(x, y, width, height, color);

    this.vy = vy;
    this.isPlayer = isPlayer;
  }

  update() {
    this.y += this.vy;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.isPlayer ? this.color : '#ffdd88';
    ctx.shadowBlur = this.isPlayer ? 8 : 50;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.shadowBlur = 0;
  }
}

// Shield (Greenhouse / Defense Barrier)
class Shield {
  constructor(x, y, width = 60, height = 40) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.blockSize = 5;
    this.rows = Math.floor(height / this.blockSize);
    this.cols = Math.floor(width / this.blockSize);
    
    // Grid of blocks (1 = healthy, 0 = destroyed)
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        // Arch cut-out at bottom middle
        if (r >= this.rows - 3 && c >= 4 && c <= this.cols - 5) {
          row.push(0);
        } else {
          row.push(1);
        }
      }
      this.grid.push(row);
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#00cc66';
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === 1) {
          ctx.fillRect(
            this.x + c * this.blockSize,
            this.y + r * this.blockSize,
            this.blockSize,
            this.blockSize
          );
        }
      }
    }
  }

  // Check collision with bullet
  checkCollision(bullet) {
    const bb = bullet.bounds;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === 1) {
          const bx = this.x + c * this.blockSize;
          const by = this.y + r * this.blockSize;
          if (
            bb.right >= bx &&
            bb.left <= bx + this.blockSize &&
            bb.bottom >= by &&
            bb.top <= by + this.blockSize
          ) {
            // Destroy block & adjacent blocks (impact radius)
            this.destroyRadius(r, c);
            return true;
          }
        }
      }
    }
    return false;
  }

  destroyRadius(centerR, centerC) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = centerR + dr;
        const nc = centerC + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          if (Math.random() < 0.75) {
            this.grid[nr][nc] = 0;
          }
        }
      }
    }
  }
}
