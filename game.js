BasicGame.Game = function (game) {

};

BasicGame.Game.prototype = {

  preload: function() {
    // load image files
    this.load.image('sea', 'assets/sea.png');
    this.load.image('bullet', 'assets/bullet.png');
    this.load.image('enemyBullet', 'assets/enemy-bullet.png');
    this.load.image('powerup1', 'assets/powerup1.png');
    this.load.spritesheet('greenEnemy', 'assets/enemy.png', 32, 32);
    this.load.spritesheet('whiteEnemy', 'assets/shooting-enemy.png', 32, 32);
    this.load.spritesheet('boss', 'assets/boss.png', 93, 75);
    this.load.spritesheet('explosion', 'assets/explosion.png', 32, 32);
    this.load.spritesheet('player', 'assets/player.png', 64, 64);
    this.load.audio('explosion', ['assets/explosion.ogg', 'assets/explosion.wav']);
    this.load.audio('playerExplosion', ['assets/player-explosion.ogg', 'assets/player-explosion.wav']);
    this.load.audio('enemyFire', ['assets/enemy-fire.ogg', 'assets/enemy-fire.wav']);
    this.load.audio('playerFire', ['assets/player-fire.ogg', 'assets/player-fire.wav']);
    this.load.audio('powerUp', ['assets/powerup.ogg', 'assets/powerup.wav']);
  },


  create: function () {
    this.setupBackground();
    this.setupPlayer();
    this.setupEnemies();
    this.setupBullets();
    this.setupExplosions();
    this.setupPlayerIcons();
    this.setupText();
    this.setupAudio();

    // Allow keyboard control
    this.cursors = this.input.keyboard.createCursorKeys();
  },

  checkCollisions: function() {
    this.physics.arcade.overlap(
      this.bulletPool, this.enemyPool, this.enemyHit, null, this);

    this.physics.arcade.overlap(
      this.bulletPool, this.shooterPool, this.enemyHit, null, this);

    this.physics.arcade.overlap(
      this.player, this.enemyPool, this.playerHit, null, this);

    this.physics.arcade.overlap(
      this.player, this.shooterPool, this.playerHit, null, this);

    this.physics.arcade.overlap(
      this.player, this.enemyBulletPool, this.playerHit, null, this);

    this.physics.arcade.overlap(
      this.player, this.powerUpPool, this.playerPowerUp, null, this);

    if (this.bossApproaching === false) {
      this.physics.arcade.overlap(
        this.bulletPool, this.bossPool, this.enemyHit, null, this);

      this.physics.arcade.overlap(
        this.player, this.bossPool, this.playerHit, null, this);
    }
  },

  spawnEnemies: function() {
    if (this.nextEnemyAt < this.time.now && this.enemyPool.countDead() > 0) {
      this.nextEnemyAt = this.time.now + this.enemyDelay;
      // Find first dead enemy in pool
      var enemy = this.enemyPool.getFirstExists(false);
      // spawn at random location top of screen
      enemy.reset(
        this.rnd.integerInRange(20, this.game.width - 20), 0,
        BasicGame.ENEMY_HEALTH);
      // randomize speed
      enemy.body.velocity.y = this.rnd.integerInRange(BasicGame.ENEMY_MIN_Y_VELOCITY, BasicGame.ENEMY_MAX_Y_VELOCITY);
      enemy.play('fly');      
    }

    if (this.nextShooterAt < this.time.now && this.shooterPool.countDead() > 0) {
      this.nextShooterAt = this.time.now + this.shooterDelay;
      var shooter = this.shooterPool.getFirstExists(false);

      // Spawn at random location top of screen
      shooter.reset(
        this.rnd.integerInRange(20, this.game.width - 20), 0,
        BasicGame.SHOOTER_HEALTH
        );

      // Choose random target location at bottom
      var target = this.rnd.integerInRange(20, this.game.width - 20);

      // Move to target and rotate sprite accordingly
      shooter.rotation = this.physics.arcade.moveToXY(
        shooter, target, this.game.height,
        this.rnd.integerInRange(
          BasicGame.SHOOTER_MIN_VELOCITY, BasicGame.SHOOTER_MAX_VELOCITY)
        ) - Math.PI / 2;

      shooter.play('fly');

      // Each shooter has its own shot timer
      shooter.nextShotAt = 0;
    }
  },

  processPlayerInput: function() {
    // Set player movement control via keyboard
    this.player.body.velocity.x = 0;
    this.player.body.velocity.y = 0;

    if (this.cursors.left.isDown) {
      this.player.body.velocity.x = -this.player.speed;
    } else if (this.cursors.right.isDown) {
      this.player.body.velocity.x = this.player.speed;
    }

    if (this.cursors.up.isDown) {
      this.player.body.velocity.y = -this.player.speed;
    } else if (this.cursors.down.isDown) {
      this.player.body.velocity.y = this.player.speed;
    }

    // Set player movement control via mouse/pointer
    if (this.input.activePointer.isDown &&
      this.physics.arcade.distanceToPointer(this.player) > 15) {
      this.physics.arcade.moveToPointer(this.player, this.player.speed);
    }

    // Set player bullet-firing control
    if (this.input.keyboard.isDown(Phaser.Keyboard.Z) ||
      this.input.activePointer.isDown) {

      // If game is over, quit. Otherwise, fire bullet
      if (this.returnText && this.returnText.exists) {
        this.quitGame();
      } else {
      this.fire();
      }
    }
  },

  processDelayedEffects: function() {
    // Set when on-screen instruction disappears
    if (this.instructions.exists && this.time.now > this.instExpire) {
      this.instructions.destroy();
    }
    // Set when player 'ghost mode' expires
    if (this.ghostUntil && this.ghostUntil < this.time.now) {
      this.ghostUntil = null;
      this.player.play('fly');
    }

    if (this.showReturn && this.time.now > this.showReturn) {
      this.returnText = this.add.text(
        this.game.width / 2, this.game.height / 2 + 20,
        'Press Z or Tap Game to go back to Main Menu',
        { font: '16px sans-serif', fill: '#fff'}
        );
      this.returnText.anchor.setTo(0.5, 0.5);
      this.showReturn = false;
    }

    // Set when boss 'invincibility mode' expires
    if (this.bossApproaching && this.boss.y > 80) {
      this.bossApproaching = false;
      this.boss.nextShotAt = 0;

      this.boss.body.velocity.y = 0;
      this.boss.body.velocity.x = BasicGame.BOSS_X_VELOCITY;

      // Allow bouncing off world bounds
      this.boss.body.bounce.x = 1;
      this.boss.body.collideWorldBounds = true;
    }
  },
  

  update: function () {
    this.checkCollisions();
    this.spawnEnemies();
    this.enemyFire();
    this.processPlayerInput();
    this.processDelayedEffects();
  },


  // Callback when player fires bullet
  fire: function() {
    // If player dead or bullet just got fired, callback ends, i.e. bullet won't fire.
    if (!this.player.alive || this.nextShotAt > this.time.now) {
      return;
    }

    this.nextShotAt = this.time.now + this.shotDelay;
    this.playerFireSFX.play();

    var bullet;
    if (this.weaponLevel === 0) {
      if (this.bulletPool.countDead() === 0) {
        return;
      }
      bullet = this.bulletPool.getFirstExists(false);
      bullet.reset(this.player.x, this.player.y - 20);
      bullet.body.velocity.y = -BasicGame.BULLET_VELOCITY;
    } else {
      if (this.bulletPool.countDead() < this.weaponLevel * 2) {
        return;
      }
    for (var i = 0; i < this.weaponLevel; i++) {
      bullet = this.bulletPool.getFirstExists(false);
      // Spawn left bullet slightly left off center
      bullet.reset(this.player.x - (10 + i * 6), this.player.y - 20);
      // Left bullets spread from -95 degrees to -135 degrees
      this.physics.arcade.velocityFromAngle(
        -95 - i * 10, BasicGame.BULLET_VELOCITY, bullet.body.velocity
        );

      bullet = this.bulletPool.getFirstExists(false);
      // Spawn right bullet slight right off center
      bullet.reset(this.player.x + (10 + i * 6), this.player.y - 20);
      // Right bullets spread fro -85 degrees to -45
      this.physics.arcade.velocityFromAngle(
        -85 + i * 10, BasicGame.BULLET_VELOCITY, bullet.body.velocity
        );
    }
  }
},

  enemyFire: function() {
    this.shooterPool.forEachAlive(function(enemy) {
      if (this.time.now > enemy.nextShotAt && this.enemyBulletPool.countDead() > 0) {
        var bullet = this.enemyBulletPool.getFirstExists(false);
        bullet.reset(enemy.x, enemy.y);
        this.physics.arcade.moveToObject(
          bullet, this.player, BasicGame.ENEMY_BULLET_VELOCITY
          );
        enemy.nextShotAt = this.time.now + BasicGame.SHOOTER_SHOT_DELAY;
        this.enemyFireSFX.play();
      }
    }, this);

    if (this.bossApproaching === false && this.boss.alive &&
      this.boss.nextShotAt < this.time.now &&
      this.enemyBulletPool.countDead() >= 10) {

      this.boss.nextShotAt = this.time.now + BasicGame.BOSS_SHOT_DELAY;
      this.enemyFireSFX.play();

    for (var i = 0; i < 5; i++) {
      // Process 2 bullets at a time
      var leftBullet = this.enemyBulletPool.getFirstExists(false);
      leftBullet.reset(this.boss.x - 10 - i * 10, this.boss.y + 20);
      var rightBullet = this.enemyBulletPool.getFirstExists(false);
      rightBullet.reset(this.boss.x + 10 + i * 10, this.boss.y + 20);

      if (this.boss.health > BasicGame.BOSS_HEALTH /2) {
        // Aim directly at player
        this.physics.arcade.moveToObject(
          leftBullet, this.player, BasicGame.ENEMY_BULLET_VELOCITY);
        this.physics.arcade.moveToObject(
          rightBullet, this.player, BasicGame.ENEMY_BULLET_VELOCITY);
      } else {
        // Aim slightly off player's center
        this.physics.arcade.moveToXY(
          leftBullet, this.player.x - i * 100, this.player.y,
          BasicGame.ENEMY_BULLET_VELOCITY);
        this.physics.arcade.moveToXY(
          rightBullet, this.player.x + i * 100, this.player.y,
          BasicGame.ENEMY_BULLET_VELOCITY);
      }
    }
    }
  },

  // Callback when player and enemy collide
  playerHit: function(player, enemy) {

    // Check if this.ghostUntil is not not undefined or null
    if (this.ghostUntil && this.ghostUntil > this.time.now) {
      return;
    }

    this.playerExplosionSFX.play();

    // Crashing into enemy only deals 5 damages
    this.damageEnemy(enemy, BasicGame.CRASH_DAMAGE);
    var life = this.lives.getFirstAlive();
    if (life !== null) {
      life.kill();
      this.weaponLevel = 0;
      this.ghostUntil = this.time.now + BasicGame.PLAYER_GHOST_TIME;
      this.player.play('ghost');
    } else {
    this.explode(player);
    player.kill();
    this.displayEnd(false);
    }
  },


  render: function() {
    // Show player sprite hitbox size
    // this.game.debug.body(this.player);
  },

  setupBackground: function() {
    // Add sea background
    this.sea = this.add.tileSprite(0, 0, this.game.width, this.game.height, 'sea');
    this.sea.autoScroll(0, BasicGame.SEA_SCROLL_SPEED);  
  },

  setupPlayer: function() {
    // Add player sprite
    this.player = this.add.sprite(this.game.width / 2, this.game.height - 50, 'player');
    this.player.anchor.setTo(0.5, 0.5);
    this.player.animations.add('fly', [0, 1, 2], 20, true);
    this.player.animations.add('ghost', [3, 0, 3, 1], 20, true);
    this.player.play('fly');
    this.physics.enable(this.player, Phaser.Physics.ARCADE);
    this.player.speed = BasicGame.PLAYER_SPEED;
    this.player.body.collideWorldBounds = true;

    // Reduce player hitbox to 20 x 20, centered a little higher than center
    this.player.body.setSize(20, 20, 0, -5);
    this.weaponLevel = 0;
  },

  setupEnemies: function() {
    // Add green enemy sprite group
    this.enemyPool = this.add.group();
    this.enemyPool.enableBody = true;
    this.enemyPool.physicsBodyType = Phaser.Physics.ARCADE;
    this.enemyPool.createMultiple(50, 'greenEnemy');
    this.enemyPool.setAll('anchor.x', 0.5);
    this.enemyPool.setAll('anchor.y', 0.5);
    this.enemyPool.setAll('outOfBoundsKill', true);
    this.enemyPool.setAll('checkWorldBounds', true);
    this.enemyPool.setAll('reward', BasicGame.ENEMY_REWARD, false, false, 0, true);
    this.enemyPool.setAll(
      'dropRate', BasicGame.ENEMY_DROP_RATE, false, false, 0, true
      );

    // Set animation for each sprite
    this.enemyPool.forEach(function(enemy) {
      enemy.animations.add('fly', [0, 1, 2], 20, true);
      enemy.animations.add('hit', [ 3, 1, 3, 2], 20, false);
      enemy.events.onAnimationComplete.add(function(e) {
        e.play('fly');
      }, this);
    });

    // Set time value for when next enemy spawns
    this.nextEnemyAt = 0;
    this.enemyDelay = BasicGame.SPAWN_ENEMY_DELAY;

    // Add white enemy sprite group
    this.shooterPool = this.add.group();    
    this.shooterPool.enableBody= true;
    this.shooterPool.physicsBodyType = Phaser.Physics.ARCADE;
    this.shooterPool.createMultiple(20, 'whiteEnemy');
    this.shooterPool.setAll('anchor.x', 0.5);
    this.shooterPool.setAll('anchor.y', 0.5);
    this.shooterPool.setAll('outOfBoundsKill', true);
    this.shooterPool.setAll('checkWorldBounds', true);
    this.shooterPool.setAll(
      'reward', BasicGame.SHOOTER_REWARD, false, false, 0, true);
    this.shooterPool.setAll(
      'dropRate', BasicGame.SHOOTER_DROP_RATE, false, false, 0, true
      );

    // Set animation for each sprite
    this.shooterPool.forEach(function(enemy) {
      enemy.animations.add('fly', [0, 1, 2], 20, true);
      enemy.animations.add('hit', [3, 1, 3, 2], 20, false);
      enemy.events.onAnimationComplete.add(function(e) {
        e.play('fly');
      }, this);
    });

    // start spawning 5 seconds into game
    this.nextShooterAt = this.time.now + Phaser.Timer.SECOND * 5;
    this.shooterDelay = BasicGame.SPAWN_SHOOTER_DELAY;

    // Add boss enemy sprite group
    this.bossPool = this.add.group();
    this.bossPool.enableBody = true;
    this.bossPool.physicsBodyType = Phaser.Physics.ARCADE;
    this.bossPool.createMultiple(1, 'boss');
    this.bossPool.setAll('anchor.x', 0.5);
    this.bossPool.setAll('anchor.y', 0.5);
    this.bossPool.setAll('outOfBoundsKill', true);
    this.bossPool.setAll('checkWorldBounds', true);
    this.bossPool.setAll('reward', BasicGame.BOSS_REWARD, false, false, 0, true);
    this.bossPool.setAll(
      'dropRate', BasicGame.BOSS_DROP_RATE, false, false, 0, true
      );

    this.bossPool.forEach(function(enemy) {
      enemy.animations.add('fly', [0, 1, 2], 20, true);
      enemy.animations.add('hit', [3, 1, 3, 2], 20, false);
      enemy.events.onAnimationComplete.add(function(e) {
        e.play('fly');
      }, this);
    });

    this.boss = this.bossPool.getTop();
    this.bossApproaching = false;

  },

  setupBullets: function() {

    // Add enemy bullets
    this.enemyBulletPool = this.add.group();
    this.enemyBulletPool.enableBody = true;
    this.enemyBulletPool.physicsBodyType = Phaser.Physics.ARCADE;
    this.enemyBulletPool.createMultiple(100, 'enemyBullet');
    this.enemyBulletPool.setAll('anchor.x', 0.5);
    this.enemyBulletPool.setAll('anchor.y', 0.5);
    this.enemyBulletPool.setAll('outOfBoundsKill', true);
    this.enemyBulletPool.setAll('checkWorldBounds', true);
    this.enemyBulletPool.setAll('reward', 0, false, false, 0, true);    

    // Add empty sprite group into game
    this.bulletPool = this.add.group();

    // Enable physics to whole sprite group
    this.bulletPool.enableBody = true;
    this.bulletPool.physicsBodyType = Phaser.Physics.ARCADE;

    // Add 100 bullet sprites into group
    // This uses first frame in sprite sheet by default
    // Sets inital state as non-existing (killed/dead)
    this.bulletPool.createMultiple(100, 'bullet');

    // Sets anchors of all sprites
    this.bulletPool.setAll('anchor.x', 0.5);
    this.bulletPool.setAll('anchor.y', 0.5);

    // Automatically kill bullet sprites when they go out of bound
    this.bulletPool.setAll('outOfBoundsKill', true);
    this.bulletPool.setAll('checkWorldBounds', true);

    // Set time value for when the next bullet can be fired
    this.nextShotAt = 0;
    this.shotDelay = BasicGame.SHOT_DELAY;
  },

  setupExplosions: function() {
    // Add empty explosion sprite group
    this.explosionPool = this.add.group();    
    this.explosionPool.enableBody = true;
    this.explosionPool.physicsBodyType = Phaser.Physics.ARCADE;
    this.explosionPool.createMultiple(100, 'explosion');
    this.explosionPool.setAll('anchor.x', 0.5);
    this.explosionPool.setAll('anchor.y', 0.5);
    this.explosionPool.forEach(function(explosion) {
      explosion.animations.add('boom');
    });
  },

  setupPlayerIcons: function() {

    this.powerUpPool = this.add.group();
    this.powerUpPool.enableBody = true;
    this.powerUpPool.physicsBodyType = Phaser.Physics.ARCADE;
    this.powerUpPool.createMultiple(5, 'powerup1');
    this.powerUpPool.setAll('anchor.x', 0.5);
    this.powerUpPool.setAll('anchor.y', 0.5);
    this.powerUpPool.setAll('outOfBoundsKill', true);
    this.powerUpPool.setAll('checkWorldBounds', true);
    this.powerUpPool.setAll(
      'reward', BasicGame.POWERUP_REWARD, false, false, 0, true
      );

    this.lives = this.add.group();
    // calculate location of first life icon
    var firstLifeIconX = this.game.width - 10 - (BasicGame.PLAYER_EXTRA_LIVES * 30);
    for (var i = 0; i < BasicGame.PLAYER_EXTRA_LIVES; i++) {
      var life = this.lives.create(firstLifeIconX + (30 * i), 30, 'player');
      life.scale.setTo(0.5, 0.5);
      life.anchor.setTo(0.5, 0.5);
    }
  },

  setupText: function() {
    // Add game instruction on screen
    this.instructions = this.add.text(this.game.width / 2, this.game.height - 100,
      'Use Arrow Keys to Move, Press Z to Fire\n' +
      'Tapping/clicking does both',
      { font: '20px monospace', fill: '#fff', align: 'center' }
      );
    this.instructions.anchor.setTo(0.5, 0.5);
    this.instExpire = this.time.now + BasicGame.INSTRUCTION_EXPIRE;

    // Add player score on screen
    this.score = 0;
    this.scoreText = this.add.text(
      this.game.width / 2, 30, '' + this.score,
      { font: '20px monospace', fill: '#fff', align: 'center' }
      );
    this.scoreText.anchor.setTo(0.5, 0.5);
  },

  setupAudio: function() {
    this.sound.volume = 0.3;
    this.explosionSFX = this.add.audio('explosion');
    this.playerExplosionSFX = this.add.audio('playerExplosion');
    this.enemyFireSFX = this.add.audio('enemyFire');
    this.playerFireSFX = this.add.audio('playerFire');
    this.powerUpSFX = this.add.audio('powerUp');    
  },


  // When bullet hits enemy
  enemyHit: function(bullet, enemy) {
    bullet.kill();
    this.damageEnemy(enemy, BasicGame.BULLET_DAMAGE);
  },

  // Callback when something explodes
  explode: function(sprite) {
    if (this.explosionPool.countDead() === 0) {
      return;
    }
    var explosion = this.explosionPool.getFirstExists(false);
    explosion.reset(sprite.x, sprite.y);
    explosion.play('boom', 15, false, true);

    // Add original sprite's velocity to explosion
    explosion.body.velocity.x = sprite.body.velocity.x;
    explosion.body.velocity.y = sprite.body.velocity.y;
  },

  // Callback when enemy takes damage
  damageEnemy: function(enemy, damage) {
    enemy.damage(damage);
    if (enemy.alive) {
      enemy.play('hit');
    } else {
      this.explode(enemy);
      this.explosionSFX.play();
      this.spawnPowerUp(enemy);
      this.addToScore(enemy.reward);

      // Check if enemy is boss
      if (enemy.key === 'boss') {
        this.enemyPool.destroy();
        this.shooterPool.destroy();
        this.bossPool.destroy();
        this.enemyBulletPool.destroy();
        this.displayEnd(true);
      }
    }
  },

  spawnPowerUp: function(enemy) {
    if (this.powerUpPool.countDead() === 0 || this.weaponLevel === 5) {
      return;
    }

    if (this.rnd.frac() < enemy.dropRate) {
      var powerUp = this.powerUpPool.getFirstExists(false);
      powerUp.reset(enemy.x, enemy.y);
      powerUp.body.velocity.y = BasicGame.POWERUP_VELOCITY;
    }
  },

  // Callback when player score changes
  addToScore: function(score) {
    this.score += score;
    this.scoreText.text = this.score;
    
    // Spawn boss when player gets 20,000 score points.
    if (this.score >= 20000 && this.bossPool.countDead() == 1) {
      this.spawnBoss();
    }
  },

  spawnBoss: function() {
    this.bossApproaching = true;
    this.boss.reset(this.game.width / 2, 0, BasicGame.BOSS_HEALTH);
    this.physics.enable(this.boss, Phaser.Physics.ARCADE);
    this.boss.body.velocity.y = BasicGame.BOSS_Y_VELOCITY;
    this.boss.play('fly');
  },

  // Callback when weapon level increases
  playerPowerUp: function(player, powerUp) {
    this.addToScore(powerUp.reward);
    powerUp.kill();
    this.powerUpSFX.play();
    if (this.weaponLevel < 5) {
      this.weaponLevel++;
    }
  },

  // Callback when game ends
  displayEnd: function(win) {
    // Players can't win and lose at the same time
    if (this.endText && this.endText.exists) {
      return;
    }

    var msg = win ? 'You Win!!!' : 'Game Over!';
    this.endText = this.add.text(
      this.game.width / 2, this.game.height / 2 - 60, msg,
      { font: '72px serif', fill: '#fff' }
      );
    this.endText.anchor.setTo(0.5, 0);
    this.showReturn = this.time.now + BasicGame.RETURN_MESSAGE_DELAY;
  },


  quitGame: function (pointer) {

    //  Here you should destroy anything you no longer need.
    //  Stop music, delete sprites, purge caches, free resources, all that good stuff.
    this.sea.destroy();    
    this.player.destroy();
    this.enemyPool.destroy();
    this.bulletPool.destroy();
    this.explosionPool.destroy();
    this.instructions.destroy();
    this.scoreText.destroy();
    this.endText.destroy();
    this.returnText.destroy();    
    //  Then let's go back to the main menu.
    this.state.start('MainMenu');
  }
};