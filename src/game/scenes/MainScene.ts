export class MainScene extends Phaser.Scene {
  enemies!: Phaser.GameObjects.Group;
  towers!: Phaser.GameObjects.Group;
  bullets!: Phaser.GameObjects.Group;
  path!: Phaser.Curves.Path;
  towerCount: number = 0; // Counter for tower numbering
  points: number = 0;
  pointsLog: number = 1;
  nextPointsLog: number = 50;
  start: Date = new Date();
  hp: number = 100;
  nextSpawn: Date = new Date(Date.now() + 5000);
  blockBuildMenuUntil: Date = new Date();
  enemySpawnCount: number = 0; // Counter for enemies spawned
  enemyCountText!: Phaser.GameObjects.Text;
  gold: number = 300; // pointer minus everything used for towers, but starts with 300 for the first few towers
  goldText!: Phaser.GameObjects.Text;
  hpText!: Phaser.GameObjects.Text;
  pointsText!: Phaser.GameObjects.Text;
  castles!: Phaser.GameObjects.Group;
  readonly castleX: number = 50;
  readonly castleY: number = 500;
  castleLabel!: Phaser.GameObjects.Text;
  spawnEvent!: Phaser.Time.TimerEvent;
  buildButton: Phaser.GameObjects.Text;
  towerInfo: Phaser.GameObjects.Text;
  cancelButton: Phaser.GameObjects.Text;
  readonly pointsPerScoreLevel = 100;

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

    // castle is the end target for the enemies
    const castleGraphics = this.make.graphics({ x: 0, y: 0 });
    castleGraphics.fillStyle(0xeeee11, 1);
    castleGraphics.fillRect(0, 0, 96, 96);
    castleGraphics.generateTexture("castle", 96, 96);
  }

  create() {
    // Define a simple path for enemies to follow.
    this.path = new Phaser.Curves.Path(50, 100);
    this.path.lineTo(750, 100);
    this.path.lineTo(750, 500);
    this.path.lineTo(this.castleX, this.castleY);

    // Draw the path for visualization.
    const graphics = this.add.graphics();
    graphics.lineStyle(3, 0xffffff, 1);
    this.path.draw(graphics);

    this.castles = this.add.group();

    this.placeCastle(this.castleX, this.castleY);

    // Create groups to manage game objects.
    this.enemies = this.add.group();
    this.towers = this.add.group();
    this.bullets = this.add.group();

    // Create the enemy spawn counter text at the center top.
    this.enemyCountText = this.add.text(
      this.cameras.main.centerX - 150,
      10,
      "Enemies Spawned: 0",
      {
        fontSize: "20px",
        color: "#ffffff",
      }
    );
    this.enemyCountText.setOrigin(0.5, 0);
    this.pointsText = this.add.text(
      this.cameras.main.centerX + 150,
      10,
      "Points: 0",
      {
        fontSize: "20px",
        color: "#ffffff",
      }
    );
    this.pointsText.setOrigin(0.5, 0);
    this.goldText = this.add.text(80, 10, `Gold: ${this.gold}`, {
      fontSize: "20px",
      color: "#ffffff",
    });
    this.goldText.setOrigin(0.5, 0);
    this.hpText = this.add.text(
      this.cameras.main.centerX + 150,
      this.cameras.main.centerY * 2 - 40,
      "Health of the Castle: " + this.hp,
      {
        fontSize: "20px",
        color: "#ffffff",
      }
    );
    this.hpText.setOrigin(0.5, 0);

    // Spawn an enemy every 2 seconds.
    this.spawnEvent = this.time.addEvent({
      delay: 50,
      callback: this.potentiallySpawn,
      callbackScope: this,
      loop: true,
    });

    // Place a tower where the player clicks.
    this.input.on("pointerdown", this.placeTower, this);
  }

  private potentiallySpawn() {
    if (new Date() > this.nextSpawn) {
      if (this.points > this.nextPointsLog) {
        this.pointsLog = 0.9 * this.pointsLog;
        this.nextPointsLog = this.nextPointsLog * 1.5;
      }
      this.nextSpawn = new Date(
        Date.now() + (Math.random() * 100 + 1000 * this.pointsLog)
      );
      this.spawnEnemy();
    }
  }

  private spawnEnemy() {
    this.enemySpawnCount++;
    this.enemyCountText.setText(`Enemies Spawned: ${this.enemySpawnCount}`);

    // Create a follower that starts at the beginning of the path.
    const enemy = this.add.follower(this.path, 50, 100, "enemy");
    enemy.startFollow({
      duration: 10000,
      repeat: 0,
      rotateToPath: true,
    });
    this.enemies.add(enemy);

    const score = this.getRandomEnemyScoreFromPoints(this.points);
    // Create a text label with the number "1" that will follow the enemy.
    const enemyLabel = this.add.text(
      enemy.x,
      enemy.y - enemy.height / 2,
      `${score}`,
      {
        fontSize: "16px",
        color: "#ffffff",
      }
    );
    enemyLabel.setOrigin(0.5, 1);
    // Save the label as custom data on the enemy so we can update or remove it later.
    enemy.setData("label", enemyLabel);
    enemy.setData("score", score);
    enemy.setData("hp", score); // we start with hp equal to score
  }
  private getRandomEnemyScoreFromPoints(points: number) {
    const min = 1;
    const max = Math.ceil(points / this.pointsPerScoreLevel);
    return Math.floor(Math.random() * max) + min;
  }

  private placeTower(pointer: Phaser.Input.Pointer) {
    if (this.blockBuildMenuUntil > new Date()) {
      return;
    }
    // Only open a popup if one isn't already showing.
    if (
      this.children.list.some(
        (child) => child.getData && child.getData("isPopup")
      )
    ) {
      return;
    }

    // Check if clicking an existing tower.
    const clickedTower = this.towers
      .getChildren()
      .find(
        (tower) =>
          Phaser.Math.Distance.Between(
            pointer.x,
            pointer.y,
            (tower as Phaser.GameObjects.Sprite).x,
            (tower as Phaser.GameObjects.Sprite).y
          ) < 16
      ) as Phaser.GameObjects.Sprite | undefined;

    // Create popup background.
    const popup = this.add
      .rectangle(pointer.x, pointer.y, 120, 60, 0x000000, 0.8)
      .setOrigin(0.5, 0.5)
      .setDepth(10)
      .setData("isPopup", true);

    // If a tower was clicked, show its number.
    if (clickedTower) {
      const towerNumber = clickedTower.getData("towerNumber");
      const towerInfo = this.add
        .text(pointer.x, pointer.y - 10, `Tower #${towerNumber}`, {
          fontSize: "16px",
          color: "#ffffff",
        })
        .setOrigin(0.5, 0.5)
        .setDepth(11)
        .setData("isPopup", true);
      this.towerInfo = towerInfo;
    } else {
      // Show 'Build a Tower' button for empty space clicks.
      const buildButton = this.add
        .text(pointer.x, pointer.y - 10, "Build a Tower", {
          fontSize: "16px",
          color: "#ffffff",
        })
        .setOrigin(0.5, 0.5)
        .setDepth(11)
        .setInteractive()
        .setData("isPopup", true);

      buildButton.on("pointerdown", () => {
        this.buildTower(pointer.x, pointer.y);
        this.closePopup();
      });
      this.buildButton = buildButton;
    }

    // Create the cancel button.
    const cancelButton = this.add
      .text(pointer.x, pointer.y + 15, "Cancel", {
        fontSize: "16px",
        color: "#ff4444",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(11)
      .setInteractive()
      .setData("isPopup", true);
    this.cancelButton = cancelButton;

    cancelButton.on("pointerdown", () => {
      this.closePopup();
    });

    // Set up an outside click handler.
    // Note: Using input.on here instead of once so we can re‑attach it when needed.
    // this.input.on("pointerdown", this.outsideClickHandler, this);
    // Handle clicking outside the popup as a cancel action.
    // Delay setting the outside click event to avoid closing instantly.
    this.time.delayedCall(50, () => {
      this.input.once("pointerdown", this.outsideClickHandler, this);
    });
  }

  // Function to build a tower.
  buildTower(x: number, y: number) {
    this.towerCount++;
    const tower = this.add.sprite(x, y, "tower").setInteractive();
    tower.setData("towerNumber", this.towerCount);
    if (this.gold < 100) {
      return;
    }
    this.gold -= 100;
    tower.setData("range", 250);
    tower.setData("fireRate", 700); // milliseconds
    tower.setData("lastFired", 0);
    this.towers.add(tower);

    // Add tower label.
    this.add
      .text(x, y, `${this.towerCount}`, { fontSize: "16px", color: "#ffffff" })
      .setOrigin(0.5, 0.5)
      .setDepth(11);
  }
  outsideClickHandler(pointer: Phaser.Input.Pointer) {
    // Check if the click is outside the popup area.
    // For simplicity, if any popup exists and the click target is not one of its interactive children,
    // we close the popup.
    const popups = this.children.list.filter(
      (child) => child.getData && child.getData("isPopup")
    );
    if (popups.length > 0) {
      // Here you might add more logic to check if pointer is inside any popup bounds.
      // For now, we simply close the popup.
      this.closePopup();
    }
  }

  // Function to close all popups.
  closePopup() {
    // Remove all popup-related children.
    this.children.list.forEach((child) => {
      if (child.getData && child.getData("isPopup")) {
        child.destroy();
      }
    });
    // Remove the outside click handler so it doesn't interfere with future clicks.
    this.input.off("pointerdown", this.outsideClickHandler, this);

    this.buildButton?.destroy();
    this.towerInfo?.destroy();
    this.cancelButton?.destroy();
    this.blockBuildMenuUntil = new Date(Date.now() + 100);
  }

  private placeCastle(x: number, y: number) {
    const castle = this.add.sprite(x, y, "castle");
    castle.setInteractive();
    this.castles.add(castle);

    // Add the incrementing number as a text label on top of the tower.
    this.castleLabel = this.add.text(x, y, `${this.hp}`, {
      fontSize: "16px",
      color: "#ffffff",
    });
    this.castleLabel.setOrigin(0.5, 0.5);
  }

  update(time: number, delta: number) {
    // For each tower, check if an enemy is within range and if enough time has passed since the last shot.
    this.towers.getChildren().forEach((obj) => {
      const tower = obj as Phaser.GameObjects.Sprite;
      if (time > tower.getData("lastFired") + tower.getData("fireRate")) {
        const enemy = this.getEnemyInRange(tower);
        if (enemy) {
          this.fireBullet(tower, enemy, (single, all) => {
            return defaultOneHit(tower, single, all);
          });
          tower.setData("lastFired", time);
        }
      }
    });

    // Check for collisions between bullets and enemies using swept collision.
    this.bullets.getChildren().forEach((obj) => {
      const bullet = obj as Phaser.GameObjects.Sprite;
      if (!bullet.active) return;

      // Get the bullet's previous position (if not set, default to its current position).
      const prevX: number = bullet.getData("prevX") ?? bullet.x;
      const prevY: number = bullet.getData("prevY") ?? bullet.y;

      // For each enemy, check if its center is near the line segment from the bullet's previous to current position.
      this.enemies.getChildren().forEach((eObj) => {
        const enemy = eObj as Phaser.GameObjects.Sprite;
        const px = enemy.x,
          py = enemy.y;
        const ax = prevX,
          ay = prevY;
        const bx = bullet.x,
          by = bullet.y;

        // Compute the projection factor t of point P onto segment AB.
        const abx = bx - ax;
        const aby = by - ay;
        const abSquared = abx * abx + aby * aby;
        // Avoid division by zero.
        if (abSquared === 0) return;
        const apx = px - ax;
        const apy = py - ay;
        let t = (apx * abx + apy * aby) / abSquared;
        t = Phaser.Math.Clamp(t, 0, 1);

        // Find the closest point on the segment.
        const closestX = ax + t * abx;
        const closestY = ay + t * aby;

        // Compute the distance from the enemy to the closest point.
        const dist = Phaser.Math.Distance.Between(px, py, closestX, closestY);

        // If within hit radius (e.g., 10 pixels), consider it a hit.
        if (dist < 10) {
          this.enemyShot(bullet, enemy, this.enemies.getChildren() as Enemy[]);
        }
      });

      // Store current bullet position for swept collision in the next update.
      bullet.setData("prevX", bullet.x);
      bullet.setData("prevY", bullet.y);
    });

    this.enemies.getChildren().forEach((eObj) => {
      const enemy = eObj as Phaser.GameObjects.Sprite;
      if (
        Phaser.Math.Distance.Between(
          this.castleX,
          this.castleY,
          enemy.x,
          enemy.y
        ) < 48
      ) {
        this.enemyReachedCastle(enemy);
      }
    });

    // Update each enemy's label position so it stays on top of the enemy.
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.GameObjects.Sprite;
      const label = enemy.getData("label") as Phaser.GameObjects.Text;
      if (label) {
        label.setPosition(enemy.x, enemy.y); // - enemy.height / 2);
      }
    });
  }
  private enemyShot(
    bullet: Phaser.GameObjects.Sprite,
    enemy: Enemy,
    allEnemies: Enemy[]
  ) {
    const hitEffect = bullet.getData("hitEffect") as HitEffect;
    if (hitEffect(enemy, allEnemies)) {
      // destroy bullet
      bullet.destroy();
    }
    const remainingLife = enemy.getData("hp") as number;
    if (remainingLife > 0) {
      this.enemyWeakened(enemy);
    } else {
      this.enemyKilled(bullet, enemy);
    }
  }
  private enemyWeakened(enemy: Phaser.GameObjects.Sprite) {
    const remainingLife = enemy.getData("hp") as number;
    const label = enemy.getData("label") as Phaser.GameObjects.Text;
    label.setText(`${remainingLife}`);
  }
  private enemyReachedCastle(enemy: Phaser.GameObjects.GameObject) {
    const value = 1;
    // Remove the enemy's label before destroying the enemy.
    const label = enemy.getData("label") as Phaser.GameObjects.Text;
    if (label) {
      label.destroy();
    }
    enemy.destroy();
    this.hp -= value;
    if (this.hp <= 0) {
      this.gameOver();
    }
    this.castleLabel.setText(`${this.hp}`);
    this.hpText.setText(`Health of the Castle: ${this.hp}`);
  }
  private gameOver() {
    //TODO: implement
    this.spawnEvent.destroy();
    console.log("Game Over at " + this.hp);
    if (
      confirm(
        "Game Over, with points: " + this.points + "\nPress to reload page"
      )
    ) {
      window.location.reload();
    }
  }

  private enemyKilled(
    bullet: Phaser.GameObjects.Sprite,
    enemy: Phaser.GameObjects.Sprite
  ) {
    // Remove the enemy's label before destroying the enemy.
    const label = enemy.getData("label") as Phaser.GameObjects.Text;
    if (label) {
      label.destroy();
    }
    const score = enemy.getData("score") as number;

    bullet?.destroy();
    enemy.destroy();
    this.points += score;
    this.pointsText.setText(`Points: ${this.points}`);
    this.gold += score;
    this.goldText.setText(`Gold: ${this.gold}`);
  }

  public getEnemyInRange(
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

  private getSpeedOfEnemy(enemy: Phaser.GameObjects.Sprite) {
    return 180; // Based on the enemy's path duration and length. (1800px in 10s)
  }

  public fireBullet(
    tower: Phaser.GameObjects.Sprite,
    enemy: Phaser.GameObjects.Sprite,
    hitEffect: HitEffect
  ) {
    // Create a bullet at the tower's position.
    const bullet = this.add.sprite(tower.x, tower.y, "bullet");
    this.physics.add.existing(bullet);

    // Define speeds.
    const bulletSpeed = 800;
    const enemySpeed = this.getSpeedOfEnemy(enemy);

    // Compute the difference vector from the tower to the enemy.
    const deltaX = enemy.x - tower.x;
    const deltaY = enemy.y - tower.y;

    // Determine enemy's velocity using its rotation (which aligns with its path direction).
    const angle = enemy.rotation; // In radians.
    const vEx = Math.cos(angle) * enemySpeed;
    const vEy = Math.sin(angle) * enemySpeed;

    // Solve for time T such that:
    // || (deltaX, deltaY) + (vEx, vEy)*T || = bulletSpeed * T
    // This gives a quadratic equation: A*T^2 + B*T + C = 0.
    const A = vEx * vEx + vEy * vEy - bulletSpeed * bulletSpeed;
    const B = 2 * (deltaX * vEx + deltaY * vEy);
    const C = deltaX * deltaX + deltaY * deltaY;

    let T = 0;
    const discriminant = B * B - 4 * A * C;
    if (discriminant >= 0) {
      const sqrtDisc = Math.sqrt(discriminant);
      const t1 = (-B + sqrtDisc) / (2 * A);
      const t2 = (-B - sqrtDisc) / (2 * A);
      // Choose the smallest positive time.
      T = Math.min(t1, t2);
      if (T < 0) {
        T = Math.max(t1, t2);
      }
      if (T < 0) {
        T = 0;
      }
    } else {
      // If no solution, fallback to aiming directly at the current enemy position.
      T = 0;
    }

    // Compute the predicted enemy position at time T.
    const interceptX = enemy.x + vEx * T;
    const interceptY = enemy.y + vEy * T;

    // Compute the direction vector from the tower to the intercept point.
    const dirX = interceptX - tower.x;
    const dirY = interceptY - tower.y;
    const mag = Math.sqrt(dirX * dirX + dirY * dirY);
    const unitX = dirX / mag;
    const unitY = dirY / mag;

    // Compute the angle for the bullet.
    const bulletAngle = Math.atan2(unitY, unitX);

    // Set the bullet's velocity in that direction.
    this.physics.velocityFromRotation(
      bulletAngle,
      bulletSpeed,
      (bullet.body as Phaser.Physics.Arcade.Body).velocity
    );
    this.bullets.add(bullet);
    bullet.setData("hitEffect", hitEffect);

    // Destroy the bullet after 2 seconds if it doesn't hit.
    this.time.addEvent({
      delay: 1500,
      callback: () => bullet.destroy(),
    });
  }

  towerType: Record<string, TowerTypeClass> = {
    one: {
      behavior: {
        name: "One",
        findFirstTargetOrUndefined: function (
          enemies: Phaser.GameObjects.Sprite[],
          tower: Phaser.GameObjects.Sprite
        ): Phaser.GameObjects.Sprite | undefined {
          return defaultOneTargetting(enemies, tower);
        },
        isReadyToFire: function (
          time: number,
          tower: Phaser.GameObjects.Sprite,
          enemy: Phaser.GameObjects.Sprite
        ): boolean {
          return defaultFireReady(time, tower, enemy);
        },
        fireBullet: function (
          scene: MainScene,
          tower: Phaser.GameObjects.Sprite,
          enemy: Phaser.GameObjects.Sprite,
          conf: TowerShootModule
        ): void {
          defaultFireBullet(scene, tower, enemy, conf);
        },
        bulletHitEffect: function (
          tower: Phaser.GameObjects.Sprite,
          enemy: Phaser.GameObjects.Sprite,
          otherEnemies: Phaser.GameObjects.Sprite[]
        ): boolean {
          return defaultOneHit(tower, enemy, otherEnemies);
        },
      },
      upgrades: [
        {
          goldCost: 100,
          targetShooter: () => this.towerType.two.behavior,
          name: "Upgrade: 2-Factor",
        },
      ],
    },
    two: {
      behavior: this.buildPrimeBehavior(2),
      upgrades: [
        {
          goldCost: 25,
          targetShooter: () => this.towerType.one.behavior,
          name: "Downgrade to 1",
        },
        {
          goldCost: 100,
          targetShooter: () => this.towerType.three.behavior,
          name: "Upgrade: 3-Factor",
        },
      ],
    },
    three: {
      behavior: this.buildPrimeBehavior(3),
      upgrades: [
        {
          goldCost: 25,
          targetShooter: () => this.towerType.one.behavior,
          name: "Downgrade to 1",
        },
        {
          goldCost: 100,
          targetShooter: () => this.towerType.five.behavior,
          name: "Upgrade: 5-Factor",
        },
      ],
    },
    five: {
      behavior: this.buildPrimeBehavior(5),
      upgrades: [
        {
          goldCost: 25,
          targetShooter: () => this.towerType.one.behavior,
          name: "Downgrade to 1",
        },
      ],
    },
  };

  buildPrimeBehavior(prime: number): TowerShootModule {
    return {
      name: prime + "-Prime-Factor",
      findFirstTargetOrUndefined: function (
        enemies: Phaser.GameObjects.Sprite[],
        tower: Phaser.GameObjects.Sprite
      ): Phaser.GameObjects.Sprite | undefined {
        return defaultPrimeTargetting(prime, enemies, tower);
      },
      isReadyToFire: function (
        time: number,
        tower: Phaser.GameObjects.Sprite,
        enemy: Phaser.GameObjects.Sprite
      ): boolean {
        return defaultFireReady(time, tower, enemy);
      },
      fireBullet: function (
        scene: MainScene,
        tower: Phaser.GameObjects.Sprite,
        enemy: Phaser.GameObjects.Sprite,
        conf: TowerShootModule
      ): void {
        defaultFireBullet(scene, tower, enemy, conf);
      },
      bulletHitEffect: function (
        tower: Phaser.GameObjects.Sprite,
        enemy: Phaser.GameObjects.Sprite,
        otherEnemies: Phaser.GameObjects.Sprite[]
      ): boolean {
        return defaultPrimeHit(prime, tower, enemy, otherEnemies);
      },
    };
  }
}

type Enemy = Phaser.GameObjects.Sprite;
type Bullet = Phaser.GameObjects.Sprite;
type Tower = Phaser.GameObjects.Sprite;

function defaultOneHit(
  tower: Phaser.GameObjects.Sprite,
  enemy: Enemy,
  otherEnemies: Enemy[]
): boolean {
  const hp = enemy.getData("hp");
  const newHp = hp - 1;
  enemy.setData("hp", newHp);
  return true;
}

function defaultOneTargetting(
  enemies: Enemy[],
  tower: Phaser.GameObjects.Sprite
): Enemy | undefined {
  return defaultPrimeTargetting(1, enemies, tower);
}

type HitEffect = (enemy: Enemy, allEnemies: Enemy[]) => boolean;

function defaultFireBullet(
  scene: MainScene,
  tower: Phaser.GameObjects.Sprite,
  enemy: Phaser.GameObjects.Sprite,
  conf: TowerShootModule
): void {
  scene.fireBullet(tower, enemy, (b, c) => conf.bulletHitEffect(tower, b, c));
}

function defaultFireReady(
  time: number,
  tower: Phaser.GameObjects.Sprite,
  enemy: Phaser.GameObjects.Sprite
): boolean {
  return time > tower.getData("lastFired") + tower.getData("fireRate");
}

function defaultPrimeHit(
  prime: number,
  tower: Phaser.GameObjects.Sprite,
  enemy: Phaser.GameObjects.Sprite,
  otherEnemies: Phaser.GameObjects.Sprite[]
): boolean {
  const hp = enemy.getData("hp");
  if (hp % prime !== 0) {
    return false;
  }
  const newHp = Math.ceil(hp / prime);
  enemy.setData("hp", newHp);
  return true;
}

function defaultPrimeTargetting(
  prime: number,
  enemies: Phaser.GameObjects.Sprite[],
  tower: Phaser.GameObjects.Sprite
): Enemy | undefined {
  const range = tower.getData("range");
  const enemyArray = enemies;
  for (let enemy of enemyArray) {
    if (
      scoreOfEnemyHasFactor(enemy, prime) &&
      Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y) <= range
    ) {
      return enemy;
    }
  }
  return undefined;
}

type TowerShootModule = {
  name: string;
  findFirstTargetOrUndefined: (
    enemies: Phaser.GameObjects.Sprite[],
    tower: Phaser.GameObjects.Sprite
  ) => Phaser.GameObjects.Sprite | undefined;
  isReadyToFire: (
    time: number,
    tower: Phaser.GameObjects.Sprite,
    enemy: Phaser.GameObjects.Sprite
  ) => boolean;
  fireBullet: (
    scene: MainScene,
    tower: Phaser.GameObjects.Sprite,
    enemy: Phaser.GameObjects.Sprite,
    conf: TowerShootModule
  ) => void;
  bulletHitEffect: (
    tower: Phaser.GameObjects.Sprite,
    enemy: Phaser.GameObjects.Sprite,
    otherEnemies: Phaser.GameObjects.Sprite[]
  ) => boolean;
};

type TowerUpgradePath = {
  goldCost: number;
  name: string;
  targetShooter: () => TowerShootModule;
};

type AvailabeUpgrades = TowerUpgradePath[];
type TowerTypeClass = {
  behavior: TowerShootModule;
  upgrades: AvailabeUpgrades;
};
function scoreOfEnemyHasFactor(
  enemy: Phaser.GameObjects.Sprite,
  prime: number
): boolean {
  if (prime < 2) {
    // early return for faster computation of one-turrets
    return true;
  }
  const hp = enemy.getData("hp");
  return hp % prime === 0;
}
