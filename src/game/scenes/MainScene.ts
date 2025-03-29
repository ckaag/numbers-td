export class MainScene extends Phaser.Scene {
  enemies!: Phaser.GameObjects.Group;
  towers!: Phaser.GameObjects.Group;
  bullets!: Phaser.GameObjects.Group;
  path!: Phaser.Curves.Path;
  towerCount: number = 0; // Counter for tower numbering

  constructor() {
    super({ key: "MainScene" });
  }

  preload() {
    // Create a red circle texture for the enemy.
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyGraphics.fillStyle(0xff0000, 1);
    enemyGraphics.fillCircle(16, 16, 16);
    enemyGraphics.generateTexture("enemy", 32, 32);

    // Create a blue square texture for the tower.
    const towerGraphics = this.make.graphics({ x: 0, y: 0 });
    towerGraphics.fillStyle(0x0000ff, 1);
    towerGraphics.fillRect(0, 0, 32, 32);
    towerGraphics.generateTexture("tower", 32, 32);

    // Create a small yellow circle texture for the bullet.
    const bulletGraphics = this.make.graphics({ x: 0, y: 0 });
    bulletGraphics.fillStyle(0xffff00, 1);
    bulletGraphics.fillCircle(4, 4, 4);
    bulletGraphics.generateTexture("bullet", 8, 8);
  }

  create() {
    // Define a simple path for enemies to follow.
    this.path = new Phaser.Curves.Path(50, 100);
    this.path.lineTo(750, 100);
    this.path.lineTo(750, 500);
    this.path.lineTo(50, 500);

    // Draw the path for visualization.
    const graphics = this.add.graphics();
    graphics.lineStyle(3, 0xffffff, 1);
    this.path.draw(graphics);

    // Create groups to manage game objects.
    this.enemies = this.add.group();
    this.towers = this.add.group();
    this.bullets = this.add.group();

    // Spawn an enemy every 2 seconds.
    this.time.addEvent({
      delay: 2000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });

    // Place a tower where the player clicks.
    this.input.on("pointerdown", this.placeTower, this);
  }

  spawnEnemy() {
    // Create a follower that starts at the beginning of the path.
    const enemy = this.add.follower(this.path, 50, 100, "enemy");
    enemy.startFollow({
      duration: 10000,
      repeat: 0,
      rotateToPath: true,
    });
    this.enemies.add(enemy);
  }

  placeTower(pointer: Phaser.Input.Pointer) {
    // Increment tower counter and create a tower sprite at the clicked position.
    this.towerCount++;
    const tower = this.add.sprite(pointer.x, pointer.y, "tower");
    tower.setInteractive();
    this.towers.add(tower);

    // Set custom properties for the tower.
    tower.setData("range", 150);
    tower.setData("fireRate", 1000); // milliseconds
    tower.setData("lastFired", 0);

    // Add the incrementing number as a text label on top of the tower.
    const towerLabel = this.add.text(
      pointer.x,
      pointer.y,
      `${this.towerCount}`,
      {
        fontSize: "16px",
        color: "#ffffff",
      }
    );
    towerLabel.setOrigin(0.5, 0.5);
  }

  update(time: number, delta: number) {
    // For each tower, check if an enemy is within range and if enough time has passed since the last shot.
    this.towers.getChildren().forEach((obj) => {
      const tower = obj as Phaser.GameObjects.Sprite;
      if (time > tower.getData("lastFired") + tower.getData("fireRate")) {
        const enemy = this.getEnemyInRange(tower);
        if (enemy) {
          this.fireBullet(tower, enemy);
          tower.setData("lastFired", time);
        }
      }
    });

    // Check for collisions between bullets and enemies.
    this.bullets.getChildren().forEach((obj) => {
      const bullet = obj as Phaser.GameObjects.Sprite;
      if (!bullet.active) return;
      this.enemies.getChildren().forEach((eObj) => {
        const enemy = eObj as Phaser.GameObjects.Sprite;
        if (
          Phaser.Math.Distance.Between(bullet.x, bullet.y, enemy.x, enemy.y) <
          10
        ) {
          bullet.destroy();
          enemy.destroy();
        }
      });
    });
  }

  getEnemyInRange(
    tower: Phaser.GameObjects.Sprite
  ): Phaser.GameObjects.Sprite | null {
    const range = tower.getData("range");
    const enemyArray =
      this.enemies.getChildren() as Phaser.GameObjects.Sprite[];
    for (let enemy of enemyArray) {
      if (
        Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y) <=
        range
      ) {
        return enemy;
      }
    }
    return null;
  }

  fireBullet(
    tower: Phaser.GameObjects.Sprite,
    enemy: Phaser.GameObjects.Sprite
  ) {
    // Create a bullet at the tower's position.
    const bullet = this.add.sprite(tower.x, tower.y, "bullet");
    this.physics.add.existing(bullet);

    // Move the bullet toward the enemy.
    this.physics.moveTo(bullet, enemy.x, enemy.y, 300);
    this.bullets.add(bullet);

    // Destroy the bullet after 2 seconds if it doesn't hit.
    this.time.addEvent({
      delay: 2000,
      callback: () => bullet.destroy(),
    });
  }
}
