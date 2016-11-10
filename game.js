
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

    // Add sea background
    this.sea = this.add.tileSprite(0, 0, 800, 600, 'sea');

    // Add player sprite
    this.player = this.add.sprite(400, 550, 'player');
    this.player.anchor.setTo(0.5, 0.5);
    this.player.animations.add('fly', [0, 1, 2], 20, true);
    this.player.play('fly');
    this.physics.enable(this.player, Phaser.Physics.ARCADE);
    this.player.speed = 300;
    this.player.body.collideWorldBounds = true;

    // Reduce player hitbox to 20 x 20, centered a little higher than center
    this.player.body.setSize(20, 20, 0, -5);

    // Add enemy sprite group
    this.enemyPool = this.add.group();
    this.enemyPool.enableBody = true;
    this.enemyPool.physicsBodyType = Phaser.Physics.ARCADE;
    this.enemyPool.createMultiple(50, 'greenEnemy');
    this.enemyPool.setAll('anchor.x', 0.5);
    this.enemyPool.setAll('anchor.y', 0.5);
    this.enemyPool.setAll('outOfBoundsKill', true);
    this.enemyPool.setAll('checkWorldBounds', true);

    // Set animation for each sprite
    this.enemyPool.forEach(function(enemy) {
      enemy.animations.add('fly', [0, 1, 2], 20, true);
    });

    // Set time value for when next enemy spawns
    this.nextEnemyAt = 0;
    this.enemyDelay = 1000;


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
    this.shotDelay = 100;

    // Allow keyboard control
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add game instruction on screen
    this.instructions = this.add.text(400, 500,
      'Use Arrow Keys to Move, Press Z to Fire\n' +
      'Tapping/clicking does both',
      { font: '20px monospace', fill: '#fff', align: 'center' }
      );
    this.instructions.anchor.setTo(0.5, 0.5);
    this.instExpire = this.time.now + 10000;
  },


  update: function () {

    //
    this.sea.tilePosition.y += 0.2;

    // Detect collision between player bullet and enemy
    this.physics.arcade.overlap(
      this.bulletPool, this.enemyPool, this.enemyHit, null, this);

    // Detect collision bewtween player and enemy
    this.physics.arcade.overlap(
      this.player, this.enemyPool, this.playerHit, null, this);

    if (this.nextEnemyAt < this.time.now && this.enemyPool.countDead() > 0) {
      this.nextEnemyAt = this.time.now + this.enemyDelay;

      // Find first dead enemy in pool
      var enemy = this.enemyPool.getFirstExists(false);
      
      // spawn at random location top of screen
      enemy.reset(this.rnd.integerInRange(20, 780), 0);
      
      // randomize speed
      enemy.body.velocity.y = this.rnd.integerInRange(30, 60);
      enemy.play('fly');
    }

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
      this.fire();
    }

    // Set when on-screen instruction disappears
    if (this.instructions.exists && this.time.now > this.instExpire) {
      this.instructions.destroy();
    }
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

    bullet.body.velocity.y = -500;
  },

  // Callback when player and enemy collide
  playerHit: function(player, enemy) {
    enemy.kill();
    var explosion = this.add.sprite(player.x, player.y, 'explosion');
    explosion.anchor.setTo(0.5, 0.5);
    explosion.animations.add('boom');
    explosion.play('boom', 15, false, true);
    player.kill();
  },


  render: function() {
    // Show player sprite hitbox size
    // this.game.debug.body(this.player);
  },


  // When bullet hits enemy
  enemyHit: function(bullet, enemy) {
    bullet.kill();
    enemy.kill();
    var explosion = this.add.sprite(enemy.x, enemy.y, 'explosion');
    explosion.anchor.setTo(0.5, 0.5);
    explosion.animations.add('boom');
    explosion.play('boom', 15, false, true);
  },


  quitGame: function (pointer) {

    //  Here you should destroy anything you no longer need.
    //  Stop music, delete sprites, purge caches, free resources, all that good stuff.

    //  Then let's go back to the main menu.
    this.state.start('MainMenu');

  }

};
