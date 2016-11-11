BasicGame.Game = function (game) {

};

BasicGame.Game.prototype = {

  preload: function() {
    // load image files
    this.load.image('sea', 'assets/sea.png');
    this.load.image('bullet', 'assets/bullet.png');
    this.load.spritesheet('greenEnemy', 'assets/enemy.png', 32, 32);
    this.load.spritesheet('explosion', 'assets/explosion.png', 32, 32);
    this.load.spritesheet('player', 'assets/player.png', 64, 64);
  },


  create: function () {
    this.setupBackground();
    this.setupPlayer();
    this.setupEnemies();
    this.setupBullets();
    this.setupExplosions();
    this.setupPlayerIcons();
    this.setupText();

    // Allow keyboard control
    this.cursors = this.input.keyboard.createCursorKeys();
  },

  checkCollisions: function() {
    this.physics.arcade.overlap(
      this.bulletPool, this.enemyPool, this.enemyHit, null, this);
    this.physics.arcade.overlap(
      this.player, this.enemyPool, this.playerHit, null, this
      );
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
  },
  

  update: function () {
    this.checkCollisions();
    this.spawnEnemies();
    this.processPlayerInput();
    this.processDelayedEffects();
  },


  // Callback when player fires bullet
  fire: function() {
    // If player dead or bullet just got fired, callback ends, i.e. bullet won't fire.
    if (!this.player.alive || this.nextShotAt > this.time.now) {
      return;
    }

    if (this.bulletPool.countDead() === 0) {
      return;
    }

    this.nextShotAt = this.time.now + this.shotDelay;

    // Find first dead bullet in the pool
    var bullet = this.bulletPool.getFirstExists(false);

    // Reset (revive) sprite and place it in new location
    bullet.reset(this.player.x, this.player.y - 20);

    bullet.body.velocity.y = -BasicGame.BULLET_VELOCITY;
  },

  // Callback when player and enemy collide
  playerHit: function(player, enemy) {

    // Check if this.ghostUntil is not not undefined or null
    if (this.ghostUntil && this.ghostUntil > this.time.now) {
      return;
    }
    // Crashing into enemy only deals 5 damages
    this.damageEnemy(enemy, BasicGame.CRASH_DAMAGE);
    var life = this.lives.getFirstAlive();
    if (life !== null) {
      life.kill();
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
  },

  setupEnemies: function() {
    // Add enemy sprite group
    this.enemyPool = this.add.group();
    this.enemyPool.enableBody = true;
    this.enemyPool.physicsBodyType = Phaser.Physics.ARCADE;
    this.enemyPool.createMultiple(50, 'greenEnemy');
    this.enemyPool.setAll('anchor.x', 0.5);
    this.enemyPool.setAll('anchor.y', 0.5);
    this.enemyPool.setAll('outOfBoundsKill', true);
    this.enemyPool.setAll('checkWorldBounds', true);
    this.enemyPool.setAll('reward', BasicGame.ENEMY_REWARD, false, false, 0, true);

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
  },

  setupBullets: function() {
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
      this.addToScore(enemy.reward);
    }
  },

  // Callback when player score changes
  addToScore: function(score) {
    this.score += score;
    this.scoreText.text = this.score;
    if (this.score >= 2000) {
      this.enemyPool.destroy();
      this.displayEnd(true);
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