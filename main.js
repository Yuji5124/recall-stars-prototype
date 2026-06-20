import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const $ = (selector) => document.querySelector(selector);
const clamp = THREE.MathUtils.clamp;
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (array) => array[Math.floor(Math.random() * array.length)];
const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);
const pad = (n) => String(n).padStart(2, "0");
const distance2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const COLORS = [0x70f6ff, 0xff55cd, 0xffc857, 0x8d7dff, 0x63ff9b, 0xff6d72, 0x5da9ff];
const PATTERNS = ["星雲型", "ワイヤー惑星型", "ノイズ宇宙型", "小惑星帯型", "AI生成途中型"];
const AI_LABELS = { assault: "攻撃型", careful: "慎重型", rescue: "救援型", collector: "収集型", coward: "臆病型" };

const MEMBER_POOL = [
  ["火群 アキラ", "元消防士", 128, 7.2, .27, 12, "assault"],
  ["水城 ミオ", "中学生", 82, 8.8, .23, 8, "collector"],
  ["鷺沢 シノ", "看護師", 105, 7.4, .34, 9, "rescue"],
  ["久瀬 ガン", "元用心棒", 142, 6.2, .42, 17, "assault"],
  ["NEMU_03", "ゲーム配信者", 91, 8.2, .19, 8, "collector"],
  ["樫尾 源蔵", "退職者", 118, 5.8, .48, 15, "careful"],
  ["綴 ユウ", "無口な子供", 76, 9.3, .21, 7, "coward"],
  ["伊庭 レン", "重力研究員", 96, 7.0, .3, 13, "careful"],
  ["瀬戸 マコ", "コンビニ店員", 102, 7.8, .3, 11, "rescue"],
  ["六角 ダイ", "売れない芸人", 110, 7.1, .25, 10, "coward"],
  ["冬木 イサム", "元兵士", 135, 6.8, .22, 15, "assault"],
  ["麻生 ナナ", "迷子の会社員", 88, 8.6, .28, 9, "coward"],
  ["灰谷 スミ", "夜勤清掃員", 115, 7.5, .36, 12, "careful"],
  ["槙島 ソラ", "元宇宙飛行士", 121, 8.0, .26, 13, "rescue"],
  ["鳴海 トワ", "逃げ癖のある青年", 86, 9.5, .39, 8, "coward"]
];

function createTextSprite(text, color = "#aefaff", scale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "500 28px Segoe UI, Yu Gothic UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(2, 8, 16, .78)";
  ctx.fillRect(110, 14, 292, 54);
  ctx.strokeStyle = color;
  ctx.globalAlpha = .38;
  ctx.strokeRect(110.5, 14.5, 291, 53);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 51);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(4.8 * scale, .9 * scale, 1);
  return sprite;
}

function createGlowTexture(hex = "#8ff8ff") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(.12, hex);
  g.addColorStop(.42, `${hex}66`);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose?.());
    else child.material?.dispose?.();
  });
  object.removeFromParent();
}

class MissionGenerator {
  static generate() {
    const seed = Math.floor(100000 + Math.random() * 899999);
    const sectorRoots = ["水没軌道", "巨獣背面", "逆重力学校", "廃ビル星雲", "呼吸惑星", "雪葬遊園地", "旧東京模倣", "電波荒野", "砕月墓場", "落書き宇宙"];
    const sectorTails = ["第七码", "観測圏", "残響域", "空白帯", "深層", "模倣宙域", "未明区"];
    const missions = ["最奥のターゲットを排除せよ", "中央軌道の発光体を回収せよ", "転送座標を確保せよ", "星の心臓を停止せよ", "ノイズ母体を沈黙させよ", "敵性記憶の巣を破壊せよ", "記録層を防衛せよ"];
    const anomalies = [
      { name: "敵性反応が加速している", enemySpeed: 1.28 },
      { name: "回復信号が希薄", healRate: .42 },
      { name: "固定砲台が異常増殖", turretRate: 2.4 },
      { name: "背景ノイズ強度：危険域", shakeRate: 1 },
      { name: "撃破反応が空間を赤化", redShift: true },
      { name: "小隊判断系に軽度の混線", confusedAI: true },
      { name: "微小惑星密度が基準値超過", asteroidRate: 2 },
      { name: "巨大反応の到達予測が早い", earlyBoss: true }
    ];
    const enemyOrigins = ["通勤者の記憶をまねた群体", "廃棄された航路標識の自律集合", "眠る都市が吐き出した防衛反応", "観測者を探す未完成生命", "子供の声を圧縮した記号群", "古い遭難記録から育った擬態体"];
    const bosses = ["残響母体", "軌道の王", "背骨塔", "雪葬観覧車", "巨大な発光児", "空腹の校舎", "ノイズ衛星", "星喰いアーカイブ"];
    const type = pick(["水没軌道", "巨大生物の背面宇宙", "逆重力学校圏", "廃ビル星雲", "呼吸する肉質惑星", "雪に埋もれた遊園地軌道", "旧都市模倣宙域", "電波塔だらけの荒野星", "壊れた月の墓場", "子供の落書きのような宇宙"]);
    return {
      seed,
      sector: `${pick(sectorRoots)}${pick(sectorTails)}`,
      type,
      mission: pick(missions),
      anomaly: pick(anomalies),
      enemyOrigin: pick(enemyOrigins),
      bossName: pick(bosses),
      patternIndex: Math.floor(Math.random() * PATTERNS.length),
      enemyTint: pick(COLORS)
    };
  }
}

class StoryGenerator {
  static generate(mission) {
    const openings = [
      ["「ここ、どこだ？」", "「星図にない。けど帰還点は奥だ」", "「帰るぞ。全員で」"],
      ["「また知らない空だ」", "「空じゃない。誰かの記憶だ」", "「話は生き残ってからにしよう」"],
      ["「転送、完了したの？」", "「五人いる。今はそれでいい」", "「反応が来る。前を見ろ」"]
    ];
    const mid = ["改札に似たゲートが開き、記録にない離脱者の声が聞こえる。", "遠方の巨大構造物が一度だけ小隊の名前を表示した。", "星々が消え、数秒だけ懐かしい街の匂いがした。", "通信に六人目の呼吸音が混ざり始めた。"];
    return {
      opening: pick(openings).join("<br>"),
      mid: pick(mid),
      returnText: (alive) => `${alive}人が帰還した。記録は残ったが、誰も勝ったとは言わなかった。`,
      initialLog: `転送先 ${mission.sector} を仮固定`,
      syncLog: `敵性起源：${mission.enemyOrigin}`
    };
  }
}

class SoundManager {
  constructor() { this.context = null; this.enabled = true; }
  unlock() {
    try {
      this.context ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === "suspended") this.context.resume();
    } catch { this.enabled = false; }
  }
  tone(type, frequency, duration = .08, volume = .035, slide = 0) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain).connect(this.context.destination);
    osc.start(now);
    osc.stop(now + duration);
  }
  shot() { this.tone("sine", 620, .055, .022, 310); }
  hit() { this.tone("square", 120, .08, .028, -50); }
  kill() { this.tone("triangle", 250, .14, .035, 480); }
  lost() { this.tone("sawtooth", 190, .65, .055, -130); }
  warning() { this.tone("square", 95, .6, .045, 5); }
  return() { this.tone("sine", 260, 1.4, .055, 780); }
  generate() { this.tone("triangle", 80, .8, .03, 420); }
}

class BackgroundGenerator {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.stars = null;
    this.patternIndex = 0;
    this.accent = new THREE.Color(0x70f6ff);
  }
  clear() {
    while (this.group.children.length) disposeObject(this.group.children[0]);
  }
  generate(index, seed = 1) {
    this.clear();
    this.patternIndex = index;
    const hue = ((seed % 360) / 360 + index * .13) % 1;
    this.accent.setHSL(hue, .82, .62);
    this.createStars(index === 0 ? 1800 : 1250);
    this.createStructure();
    if (index === 0) this.createNebula();
    if (index === 1) this.createWirePlanets();
    if (index === 2) this.createNoiseSpace();
    if (index === 3) this.createAsteroidBelt();
    if (index === 4) this.createConstructionSpace();
  }
  createStars(count) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const base = this.accent.clone();
    for (let i = 0; i < count; i++) {
      positions[i * 3] = rand(-42, 42);
      positions[i * 3 + 1] = rand(-22, 26);
      positions[i * 3 + 2] = rand(-135, 10);
      const c = base.clone().offsetHSL(rand(-.08, .08), rand(-.2, .1), rand(-.2, .25));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: .13, vertexColors: true, transparent: true, opacity: .92, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.stars = new THREE.Points(geometry, material);
    this.group.add(this.stars);
  }
  createStructure() {
    const structure = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: this.accent, transparent: true, opacity: .12, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 5; i++) {
      const radius = 4 + i * 1.9;
      const points = [];
      const sides = 5 + i;
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
      }
      const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat.clone());
      ring.rotation.z = i * .25;
      structure.add(ring);
    }
    structure.position.set(rand(-12, 12), rand(1, 9), -112);
    structure.userData.drift = .015;
    this.group.add(structure);
  }
  createNebula() {
    const colors = ["#d631ff", "#17d7ff", "#ff496e", "#6e52ff"];
    for (let i = 0; i < 11; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: createGlowTexture(pick(colors)), transparent: true, opacity: rand(.08, .19), depthWrite: false, blending: THREE.AdditiveBlending }));
      sprite.position.set(rand(-25, 25), rand(-9, 18), rand(-125, -25));
      const size = rand(12, 31);
      sprite.scale.set(size, size, 1);
      sprite.userData.drift = rand(.02, .08);
      this.group.add(sprite);
    }
  }
  createWirePlanets() {
    for (let i = 0; i < 7; i++) {
      const geo = new THREE.IcosahedronGeometry(rand(2.5, 7), 2);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: this.accent, wireframe: true, transparent: true, opacity: rand(.08, .26) }));
      mesh.position.set(rand(-24, 24), rand(-8, 17), rand(-120, -30));
      mesh.userData.spin = rand(-.12, .12);
      this.group.add(mesh);
    }
  }
  createNoiseSpace() {
    for (let i = 0; i < 26; i++) {
      const width = rand(1.5, 10);
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, rand(.1, 2), rand(.2, 5)));
      const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: i % 4 === 0 ? 0xff4ecb : this.accent, transparent: true, opacity: rand(.08, .35) }));
      line.position.set(rand(-25, 25), rand(-12, 17), rand(-120, -18));
      line.userData.glitch = true;
      this.group.add(line);
    }
    for (let i = 0; i < 8; i++) {
      const glyph = createTextSprite(pick(["ERR_404", "△NULL", "COORD?", "未定義", "MEM//LOST"]), "#ff6ed8", .8);
      glyph.position.set(rand(-18, 18), rand(-8, 14), rand(-90, -22));
      glyph.material.opacity = rand(.1, .34);
      this.group.add(glyph);
    }
  }
  createAsteroidBelt() {
    for (let i = 0; i < 58; i++) {
      const size = rand(.16, 1.2);
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), new THREE.MeshBasicMaterial({ color: i % 5 === 0 ? this.accent : 0x172332, wireframe: Math.random() < .18 }));
      mesh.position.set(rand(-22, 22), rand(-10, 17), rand(-125, -15));
      mesh.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
      mesh.userData.spin = rand(-.7, .7);
      this.group.add(mesh);
    }
  }
  createConstructionSpace() {
    const grid = new THREE.GridHelper(70, 35, this.accent, 0x183344);
    grid.position.set(0, -5.5, -45);
    grid.material.transparent = true;
    grid.material.opacity = .22;
    this.group.add(grid);
    for (let i = 0; i < 18; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(rand(-18, 18), rand(-8, 15), rand(-110, -15)),
        new THREE.Vector3(rand(-18, 18), rand(-8, 15), rand(-110, -15)),
        new THREE.Vector3(rand(-18, 18), rand(-8, 15), rand(-110, -15))
      ]);
      const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: this.accent, transparent: true, opacity: rand(.12, .36) }));
      line.userData.spin = rand(-.2, .2);
      this.group.add(line);
    }
  }
  update(dt, speed = 6) {
    if (this.stars) {
      const pos = this.stars.geometry.attributes.position.array;
      for (let i = 2; i < pos.length; i += 3) {
        pos[i] += dt * speed;
        if (pos[i] > 12) pos[i] = -135;
      }
      this.stars.geometry.attributes.position.needsUpdate = true;
    }
    const time = performance.now() * .001;
    this.group.children.forEach((child, i) => {
      if (child === this.stars) return;
      if (child.userData.spin) {
        child.rotation.x += child.userData.spin * dt * .3;
        child.rotation.y += child.userData.spin * dt;
      }
      if (child.userData.drift) child.rotation.z += child.userData.drift * dt;
      if (child.userData.glitch && Math.random() < .035) {
        child.visible = !child.visible;
        child.position.x += rand(-.35, .35);
      } else if (child.userData.glitch && Math.sin(time * 11 + i) > -.8) child.visible = true;
    });
  }
}

class Bullet {
  constructor(game, position, velocity, friendly, power, color = 0x70f6ff) {
    this.game = game;
    this.friendly = friendly;
    this.power = power;
    this.life = 3.5;
    this.velocity = velocity.clone();
    this.mesh = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(friendly ? .11 : .15, 7, 7), new THREE.MeshBasicMaterial({ color }));
    const trail = new THREE.Mesh(new THREE.CylinderGeometry(.025, .08, friendly ? 1.2 : .7, 5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .45, blending: THREE.AdditiveBlending }));
    trail.rotation.x = Math.PI / 2;
    trail.position.z = friendly ? .5 : -.3;
    this.mesh.add(core, trail);
    this.mesh.position.copy(position);
    game.scene.add(this.mesh);
  }
  update(dt) { this.mesh.position.addScaledVector(this.velocity, dt); this.life -= dt; }
  destroy() { disposeObject(this.mesh); this.dead = true; }
}

class Particle {
  constructor(game, position, color, velocity, size = .18, life = .7) {
    this.game = game;
    this.life = life;
    this.maxLife = life;
    this.velocity = velocity;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: game.particleTexture, color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.sprite.position.copy(position);
    this.sprite.scale.setScalar(size);
    game.scene.add(this.sprite);
  }
  update(dt) {
    this.life -= dt;
    this.sprite.position.addScaledVector(this.velocity, dt);
    this.velocity.multiplyScalar(.975);
    const t = Math.max(0, this.life / this.maxLife);
    this.sprite.material.opacity = t;
    this.sprite.scale.multiplyScalar(.985);
  }
  destroy() { disposeObject(this.sprite); this.dead = true; }
}

class Member {
  constructor(game, data, index) {
    this.game = game;
    [this.name, this.role, this.maxHp, this.speed, this.fireRate, this.bulletPower, this.aiType] = data;
    this.hp = this.maxHp;
    this.alive = true;
    this.isPlayer1 = index === 0;
    this.isPlayer2 = false;
    this.index = index;
    this.color = COLORS[index % COLORS.length];
    this.cooldown = rand(0, .4);
    this.aiClock = rand(.2, 1);
    this.aiWander = new THREE.Vector2(rand(-1, 1), rand(-1, 1));
    this.invulnerable = 0;
    this.group = this.createModel();
    this.group.position.set((index - 2) * 1.6, -.8 + Math.abs(index - 2) * .45, 4 + Math.abs(index - 2) * .15);
    game.scene.add(this.group);
  }
  createModel() {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    const dark = new THREE.MeshBasicMaterial({ color: 0x07121d, transparent: true, opacity: .9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.27, .7, 3, 7), material);
    body.position.y = .32;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.27, 1), material.clone());
    head.position.y = 1.12;
    const pack = new THREE.Mesh(new THREE.BoxGeometry(.48, .42, .35), dark);
    pack.position.set(0, .4, .22);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.5, .035, 5, 22), new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: .72, blending: THREE.AdditiveBlending }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -.22;
    const light = new THREE.Sprite(new THREE.SpriteMaterial({ map: createGlowTexture(`#${new THREE.Color(this.color).getHexString()}`), color: this.color, transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending }));
    light.scale.set(2, 2, 1);
    light.position.y = .35;
    const label = createTextSprite(`${this.index + 1} // ${this.name}`, `#${new THREE.Color(this.color).getHexString()}`, .64);
    label.position.y = 1.72;
    group.add(light, body, head, pack, ring, label);
    group.userData.body = body;
    group.userData.head = head;
    group.userData.ring = ring;
    return group;
  }
  update(dt) {
    if (!this.alive) return;
    this.cooldown -= dt;
    this.invulnerable -= dt;
    const isHuman = this.isPlayer1 || (this.isPlayer2 && this.game.coop);
    if (isHuman) this.updateHuman(dt);
    else this.updateAI(dt);
    this.group.position.x = clamp(this.group.position.x, -7.2, 7.2);
    this.group.position.y = clamp(this.group.position.y, -2.4, 5.1);
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, 0, dt * 7);
    this.group.userData.ring.rotation.z += dt * (this.hp < this.maxHp * .3 ? 6 : 2);
    const low = this.hp < this.maxHp * .28;
    this.group.visible = !low || Math.sin(performance.now() * .018) > -.35;
  }
  updateHuman(dt) {
    const p1 = this.isPlayer1;
    const k = this.game.keys;
    const left = p1 ? (k.KeyA || k.ArrowLeft) : k.KeyJ;
    const right = p1 ? (k.KeyD || k.ArrowRight) : k.KeyL;
    const up = p1 ? (k.KeyW || k.ArrowUp) : k.KeyI;
    const down = p1 ? (k.KeyS || k.ArrowDown) : k.KeyK;
    const fire = p1 ? k.Space : k.Enter;
    const dash = p1 ? (k.ShiftLeft || k.ShiftRight && !this.game.coop) : k.ShiftRight;
    const dir = new THREE.Vector2((right ? 1 : 0) - (left ? 1 : 0), (up ? 1 : 0) - (down ? 1 : 0));
    if (dir.lengthSq()) dir.normalize();
    const moveSpeed = this.speed * (dash ? 1.78 : 1);
    this.group.position.x += dir.x * moveSpeed * dt;
    this.group.position.y += dir.y * moveSpeed * dt;
    this.group.rotation.z = -dir.x * .18;
    if (fire) this.shoot();
  }
  updateAI(dt) {
    this.aiClock -= dt;
    if (this.aiClock <= 0) {
      this.aiClock = rand(.28, .85);
      this.aiWander.set(rand(-1, 1), rand(-1, 1));
      if (this.game.mission.anomaly.confusedAI && Math.random() < .4) this.aiWander.multiplyScalar(2.3);
    }
    const p1 = this.game.members.find((m) => m.isPlayer1 && m.alive) || this.game.members.find((m) => m.alive);
    if (!p1) return;
    const slotX = (this.index - 2) * 1.45;
    let target = new THREE.Vector2(p1.group.position.x + slotX, p1.group.position.y + (this.aiType === "careful" ? -1.1 : .1));
    const closestEnemy = this.game.closestEnemy(this.group.position);
    if (this.aiType === "assault" && closestEnemy) target.set(closestEnemy.mesh.position.x, clamp(closestEnemy.mesh.position.y, -1, 4.5));
    if (this.aiType === "rescue") {
      const hurt = [...this.game.members].filter((m) => m.alive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (hurt && hurt.hp < hurt.maxHp * .65) target.set(hurt.group.position.x + .7, hurt.group.position.y);
    }
    if (this.aiType === "collector") {
      const item = this.game.fieldObjects.find((o) => !o.dead && (o.type === "heal" || o.type === "energy"));
      if (item) target.set(item.mesh.position.x, item.mesh.position.y);
    }
    if (this.aiType === "coward" && closestEnemy && closestEnemy.mesh.position.z > -12) {
      target.x = this.group.position.x + Math.sign(this.group.position.x - closestEnemy.mesh.position.x || 1) * 4;
      target.y = -1.7;
    }
    target.addScaledVector(this.aiWander, .7);
    const delta = target.sub(new THREE.Vector2(this.group.position.x, this.group.position.y));
    if (delta.length() > .2) delta.normalize();
    const factor = this.aiType === "careful" ? .62 : .78;
    this.group.position.x += delta.x * this.speed * factor * dt;
    this.group.position.y += delta.y * this.speed * factor * dt;
    this.group.rotation.z = -delta.x * .12;
    const fireChance = this.aiType === "coward" ? .58 : 1;
    if (closestEnemy && Math.random() < fireChance) this.shoot();
  }
  shoot() {
    if (this.cooldown > 0 || this.game.bullets.filter((b) => b.friendly).length >= 100) return;
    this.cooldown = this.fireRate;
    const origin = this.group.position.clone().add(new THREE.Vector3(0, .58, -.65));
    this.game.bullets.push(new Bullet(this.game, origin, new THREE.Vector3(0, 0, -31), true, this.bulletPower, this.color));
    if (this.isPlayer1 || this.isPlayer2) this.game.sound.shot();
  }
  damage(amount) {
    if (!this.alive || this.invulnerable > 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerable = .28;
    this.game.cameraShake = Math.max(this.game.cameraShake, .17);
    this.game.sound.hit();
    this.game.burst(this.group.position, this.color, 7, .9);
    if (this.hp <= 0) this.withdraw();
  }
  heal(amount) {
    if (this.alive) this.hp = Math.min(this.maxHp, this.hp + amount);
  }
  withdraw() {
    this.alive = false;
    this.hp = 0;
    this.game.sound.lost();
    this.game.log(`${this.name} が戦線離脱`, true);
    this.game.burst(this.group.position, this.color, 32, 3.1);
    for (let i = 0; i < 18; i++) {
      const p = this.group.position.clone().add(new THREE.Vector3(rand(-.3,.3), rand(-.2,1.2), rand(-.2,.2)));
      this.game.particles.push(new Particle(this.game, p, this.color, new THREE.Vector3(rand(-.5,.5), rand(2,5), rand(-.5,.5)), rand(.12,.28), rand(.7,1.5)));
    }
    this.group.visible = false;
    if (!this.game.members.some((m) => m.alive)) this.game.gameOver();
  }
  destroy() { disposeObject(this.group); }
}

class Enemy {
  constructor(game, type = Math.floor(Math.random() * 5)) {
    this.game = game;
    this.type = type;
    this.maxHp = [28, 40, 34, 48, 72][type];
    this.hp = this.maxHp;
    this.speed = [7.2, 5.5, 6.2, 4.8, 2.6][type] * (game.mission.anomaly.enemySpeed || 1);
    this.age = 0;
    this.fireClock = rand(1.1, 2.5);
    this.phase = rand(0, Math.PI * 2);
    this.mesh = this.createModel();
    this.mesh.position.set(rand(-7, 7), rand(-1.6, 5.3), -58 - rand(0, 18));
    game.scene.add(this.mesh);
  }
  createModel() {
    const tint = this.game.mission.enemyTint;
    const group = new THREE.Group();
    let geometry;
    if (this.type === 0) geometry = new THREE.ConeGeometry(.55, 1.4, 5);
    if (this.type === 1) geometry = new THREE.OctahedronGeometry(.72, 0);
    if (this.type === 2) geometry = new THREE.TorusKnotGeometry(.36, .14, 32, 5);
    if (this.type === 3) geometry = new THREE.IcosahedronGeometry(.82, 1);
    if (this.type === 4) geometry = new THREE.CylinderGeometry(.72, 1, 1.15, 6);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: tint, wireframe: this.type === 2, transparent: true, opacity: .92 }));
    mesh.rotation.x = Math.PI / 2;
    const eye = new THREE.Sprite(new THREE.SpriteMaterial({ map: createGlowTexture(this.type === 3 ? "#ff335f" : `#${new THREE.Color(tint).getHexString()}`), transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
    eye.scale.setScalar(this.type === 3 ? 2.9 : 1.8);
    group.add(eye, mesh);
    group.userData.core = mesh;
    return group;
  }
  update(dt) {
    this.age += dt;
    this.fireClock -= dt;
    const target = this.game.closestMember(this.mesh.position);
    if (this.type === 1 && target) {
      this.mesh.position.x += clamp(target.group.position.x - this.mesh.position.x, -1, 1) * dt * 2.4;
      this.mesh.position.y += clamp(target.group.position.y - this.mesh.position.y, -1, 1) * dt * 1.7;
    }
    if (this.type === 2) this.mesh.position.x += Math.sin(this.age * 4 + this.phase) * dt * 5.2;
    if (this.type === 3 && target && this.mesh.position.z > -15) this.speed += dt * 11;
    if (this.type === 4) {
      if (this.mesh.position.z < -18) this.mesh.position.z += this.speed * dt;
      else if (this.fireClock <= 0 && target) { this.shoot(target); this.fireClock = rand(1.2, 2); }
    } else this.mesh.position.z += this.speed * dt;
    this.mesh.rotation.z += dt * (.7 + this.type * .2);
    if (this.mesh.position.z > 7) {
      if (this.type === 3) this.explode();
      this.destroy();
    }
  }
  shoot(target) {
    if (this.game.bullets.filter((b) => !b.friendly).length >= 80) return;
    const origin = this.mesh.position.clone();
    const velocity = target.group.position.clone().sub(origin).normalize().multiplyScalar(12);
    this.game.bullets.push(new Bullet(this.game, origin, velocity, false, 10, 0xff476f));
  }
  explode() {
    this.game.members.filter((m) => m.alive && distance2D(m.group.position, this.mesh.position) < 3.3).forEach((m) => m.damage(22));
    this.game.burst(this.mesh.position, 0xff476f, 25, 4);
  }
  damage(amount) {
    this.hp -= amount;
    this.mesh.scale.setScalar(1 + Math.min(.22, amount * .008));
    setTimeout(() => { if (!this.dead) this.mesh.scale.setScalar(1); }, 45);
    if (this.hp <= 0) {
      this.game.kills++;
      this.game.sound.kill();
      this.game.burst(this.mesh.position, this.game.mission.enemyTint, 15, 2.5);
      if (this.game.mission.anomaly.redShift) this.game.redShift = Math.min(.32, this.game.redShift + .009);
      this.destroy();
    }
  }
  destroy() { if (!this.dead) disposeObject(this.mesh); this.dead = true; }
}

class Boss {
  constructor(game) {
    this.game = game;
    this.maxHp = 1900;
    this.hp = this.maxHp;
    this.age = 0;
    this.fireClock = 1.3;
    this.mesh = this.createModel();
    this.mesh.position.set(0, 2.2, -56);
    game.scene.add(this.mesh);
  }
  createModel() {
    const group = new THREE.Group();
    const color = this.game.mission.enemyTint;
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .82 }));
    const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 1), new THREE.MeshBasicMaterial({ color: 0xff3d73, wireframe: true, transparent: true, opacity: .4 }));
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(4.3, .08, 6, 52), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .7 }));
    const ringB = ringA.clone();
    ringA.rotation.x = Math.PI / 2;
    ringB.rotation.y = Math.PI / 2;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: createGlowTexture("#ff346b"), transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(10);
    group.add(glow, ringA, ringB, cage, core);
    group.userData.core = core;
    group.userData.cage = cage;
    group.userData.rings = [ringA, ringB];
    return group;
  }
  update(dt) {
    this.age += dt;
    this.fireClock -= dt;
    if (this.mesh.position.z < -24) this.mesh.position.z += dt * 5;
    this.mesh.position.x = Math.sin(this.age * .7) * 3.5;
    this.mesh.position.y = 2 + Math.sin(this.age * 1.1) * 1.1;
    this.mesh.userData.core.rotation.y += dt * .7;
    this.mesh.userData.cage.rotation.x -= dt * .35;
    this.mesh.userData.rings[0].rotation.z += dt;
    this.mesh.userData.rings[1].rotation.x += dt * .8;
    if (this.mesh.position.z >= -25 && this.fireClock <= 0) {
      this.attack();
      this.fireClock = this.hp < this.maxHp * .5 ? .7 : 1.15;
    }
  }
  attack() {
    const living = this.game.members.filter((m) => m.alive);
    if (!living.length) return;
    const origin = this.mesh.position.clone();
    const enraged = this.hp < this.maxHp * .5;
    if (Math.floor(this.age) % 2 === 0) {
      const target = pick(living);
      const base = target.group.position.clone().sub(origin).normalize();
      const count = enraged ? 7 : 5;
      for (let i = 0; i < count; i++) {
        const velocity = base.clone();
        velocity.x += (i - (count - 1) / 2) * .105;
        velocity.normalize().multiplyScalar(enraged ? 15 : 12);
        this.game.bullets.push(new Bullet(this.game, origin, velocity, false, 9, 0xff375f));
      }
    } else {
      living.slice(0, enraged ? 5 : 3).forEach((target) => {
        const velocity = target.group.position.clone().sub(origin).normalize().multiplyScalar(enraged ? 17 : 13);
        this.game.bullets.push(new Bullet(this.game, origin, velocity, false, 12, 0xffa13d));
      });
    }
  }
  damage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.game.burst(this.mesh.position.clone().add(new THREE.Vector3(rand(-2,2), rand(-2,2), 1)), this.game.mission.enemyTint, 3, 1.3);
    if (this.hp <= 0) {
      this.game.kills++;
      this.game.burst(this.mesh.position, 0xffffff, 80, 7);
      this.game.sound.return();
      disposeObject(this.mesh);
      this.dead = true;
      this.game.completeMission();
    }
  }
}

class FieldObject {
  constructor(game, type) {
    this.game = game;
    this.type = type;
    this.speed = rand(4, 7);
    this.mesh = this.createModel();
    this.mesh.position.set(rand(-8, 8), rand(-2, 5.5), rand(-70, -50));
    game.scene.add(this.mesh);
  }
  createModel() {
    if (this.type === "heal" || this.type === "energy") {
      const color = this.type === "heal" ? 0x64ff9b : 0x5da9ff;
      const group = new THREE.Group();
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(.48), new THREE.MeshBasicMaterial({ color }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.78, .035, 5, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .7 }));
      ring.rotation.x = Math.PI / 2;
      group.add(core, ring);
      return group;
    }
    const color = this.type === "crystal" ? 0xff66dc : 0x263548;
    return new THREE.Mesh(this.type === "crystal" ? new THREE.OctahedronGeometry(rand(.65, 1.1)) : new THREE.DodecahedronGeometry(rand(.55, 1.3)), new THREE.MeshBasicMaterial({ color, wireframe: this.type === "asteroid" && Math.random() < .3 }));
  }
  update(dt) {
    this.mesh.position.z += this.speed * dt;
    this.mesh.rotation.x += dt * .5;
    this.mesh.rotation.y += dt * .8;
    const member = this.game.closestMember(this.mesh.position);
    if (member && this.mesh.position.z > 2.7 && this.mesh.position.z < 6 && distance2D(member.group.position, this.mesh.position) < 1.1) {
      if (this.type === "heal") { member.heal(32); this.game.log(`${member.name} のHPを再構成`); }
      else if (this.type === "energy") { member.cooldown = -1; this.game.log(`${member.name} の射撃系を加速`); }
      else member.damage(this.type === "crystal" ? 14 : 19);
      this.game.burst(this.mesh.position, this.type === "heal" ? 0x64ff9b : 0xff66dc, 12, 2);
      this.destroy();
    }
    if (this.mesh.position.z > 9) this.destroy();
  }
  destroy() { if (!this.dead) disposeObject(this.mesh); this.dead = true; }
}

class UIManager {
  constructor(game) { this.game = game; }
  showHUD(show) {
    ["#top-hud", "#squad-hud", "#intel-hud", "#crosshair"].forEach((id) => $(id).classList.toggle("hidden", !show));
  }
  updateTitle() {
    const { mission, story, members } = this.game;
    $("#title-seed").textContent = mission.seed;
    $("#title-sector").textContent = mission.sector;
    $("#title-type").textContent = mission.type;
    $("#title-mission").textContent = mission.mission;
    $("#title-anomaly").textContent = mission.anomaly.name;
    $("#title-enemy").textContent = mission.enemyOrigin;
    $("#title-background").textContent = PATTERNS[mission.patternIndex];
    $("#opening-dialogue").innerHTML = story.opening;
    $("#roster-preview").innerHTML = members.map((m, i) => `<div class="roster-chip" style="--member-color:#${new THREE.Color(m.color).getHexString()}"><b>0${i + 1}</b><span>${m.name}</span></div>`).join("");
  }
  buildSquad() {
    $("#member-list").innerHTML = this.game.members.map((m, i) => `<div class="member-row" id="member-${i}" style="--member-color:#${new THREE.Color(m.color).getHexString()}"><span class="member-index">0${i + 1}</span><div class="member-info"><div class="name"><span>${m.name}</span><small>${i === 0 ? "1P" : AI_LABELS[m.aiType]}</small></div><div class="hp-track"><i></i></div></div><span class="member-state">LINK</span></div>`).join("");
  }
  start() {
    this.showHUD(true);
    $("#controls").classList.remove("hidden");
    setTimeout(() => $("#controls").classList.add("hidden"), 6500);
    $("#seed-label").textContent = this.game.mission.seed;
    $("#sector-name").textContent = this.game.mission.sector;
    $("#mission-name").textContent = this.game.mission.mission;
    $("#directive-text").textContent = this.game.mission.mission;
    $("#anomaly-text").textContent = this.game.mission.anomaly.name;
    this.buildSquad();
  }
  update() {
    const g = this.game;
    const alive = g.members.filter((m) => m.alive).length;
    $("#alive-count").textContent = `${pad(alive)} / 05`;
    $("#coop-status").textContent = g.coop ? "2P LINKED" : "SOLO LINK";
    g.members.forEach((m, i) => {
      const row = $(`#member-${i}`);
      if (!row) return;
      row.classList.toggle("lost", !m.alive);
      row.querySelector(".hp-track i").style.width = `${Math.max(0, m.hp / m.maxHp * 100)}%`;
      row.querySelector(".member-state").textContent = m.alive ? (m.isPlayer1 ? "1P" : m.isPlayer2 && g.coop ? "2P" : "AI") : "LOST";
      row.querySelector(".name small").textContent = m.isPlayer1 ? "1P" : m.isPlayer2 && g.coop ? "2P" : AI_LABELS[m.aiType];
    });
    if (g.boss && !g.boss.dead) {
      $("#boss-hud").classList.remove("hidden");
      $("#boss-name").textContent = g.mission.bossName;
      $("#boss-bar-fill").style.width = `${g.boss.hp / g.boss.maxHp * 100}%`;
    }
  }
  toggleHelp() { $("#controls").classList.toggle("hidden"); }
  result(won) {
    this.showHUD(false);
    $("#boss-hud").classList.add("hidden");
    $("#controls").classList.add("hidden");
    const alive = this.game.members.filter((m) => m.alive).map((m) => m.name);
    const lost = this.game.members.filter((m) => !m.alive).map((m) => m.name);
    $("#result-code").textContent = won ? "TRANSFER COMPLETE // ARCHIVE RETURNED" : "CONNECTION LOST // ARCHIVE ONLY";
    $("#result-title").textContent = won ? "帰還記録" : "全員戦線離脱";
    $("#result-message").textContent = won ? this.game.story.returnText(alive.length) : "記録だけが帰還した。";
    $("#result-sector").textContent = this.game.mission.sector;
    $("#result-mission").textContent = this.game.mission.mission;
    $("#result-survivors").textContent = alive.join(" / ") || "なし";
    $("#result-lost").textContent = lost.join(" / ") || "なし";
    $("#result-kills").textContent = this.game.kills;
    $("#result-time").textContent = `${pad(Math.floor(this.game.elapsed / 60))}:${pad(Math.floor(this.game.elapsed % 60))}`;
    $("#result-background").textContent = PATTERNS[this.game.mission.patternIndex];
    $("#result-screen").classList.add("active");
  }
}

class Game {
  constructor() {
    this.root = $("#game-root");
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x01030a);
    this.scene.fog = new THREE.FogExp2(0x020612, .013);
    this.camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, .1, 180);
    this.camera.position.set(0, 8.5, 16.5);
    this.camera.lookAt(0, 1.2, -15);
    this.baseCamera = this.camera.position.clone();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.root.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();
    this.background = new BackgroundGenerator(this.scene);
    this.sound = new SoundManager();
    this.ui = new UIManager(this);
    this.particleTexture = createGlowTexture("#ffffff");
    this.keys = {};
    this.members = [];
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.fieldObjects = [];
    this.logs = [];
    this.state = "title";
    this.coop = false;
    this.cameraShake = 0;
    this.redShift = 0;
    this.bindEvents();
    this.generateMission();
    this.animate();
  }
  bindEvents() {
    addEventListener("resize", () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    addEventListener("keydown", (event) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(event.code)) event.preventDefault();
      this.keys[event.code] = true;
      if (event.repeat) return;
      this.sound.unlock();
      if (event.code === "KeyP") this.toggleCoop();
      if (event.code === "KeyH") this.ui.toggleHelp();
      if (event.code === "KeyB") this.cycleBackground();
      if (event.code === "KeyR") this.restart();
      if (event.code === "KeyM") this.generateMission(this.state !== "title");
    });
    addEventListener("keyup", (event) => { this.keys[event.code] = false; });
    addEventListener("blur", () => { this.keys = {}; });
    $("#start-button").addEventListener("click", () => { this.sound.unlock(); this.start(); });
    $("#next-button").addEventListener("click", () => { this.sound.unlock(); this.generateMission(true); });
  }
  generateMission(autoStart = false) {
    this.cleanupActors();
    this.mission = MissionGenerator.generate();
    this.story = StoryGenerator.generate(this.mission);
    this.rosterData = shuffle(MEMBER_POOL).slice(0, 5).map((m) => [...m]);
    this.background.generate(this.mission.patternIndex, this.mission.seed);
    this.createMembers();
    this.ui.updateTitle();
    this.sound.generate();
    if (autoStart) this.start();
  }
  createMembers() {
    this.members.forEach((m) => m.destroy());
    this.members = this.rosterData.map((data, i) => new Member(this, data, i));
    this.members[1].isPlayer2 = true;
  }
  cleanupActors() {
    [...(this.members || [])].forEach((o) => o.destroy?.());
    [...(this.enemies || []), ...(this.bullets || []), ...(this.particles || []), ...(this.fieldObjects || [])].forEach((o) => o.destroy?.());
    if (this.boss && !this.boss.dead) disposeObject(this.boss.mesh);
    this.members = []; this.enemies = []; this.bullets = []; this.particles = []; this.fieldObjects = []; this.boss = null;
  }
  start() {
    this.cleanupCombatOnly();
    this.createMembers();
    this.state = "playing";
    this.elapsed = 0;
    this.kills = 0;
    this.enemyClock = .8;
    this.fieldClock = 2.5;
    this.bossTriggered = false;
    this.midTriggered = false;
    this.redShift = 0;
    this.logs = [];
    $("#title-screen").classList.remove("active");
    $("#result-screen").classList.remove("active");
    $("#boss-hud").classList.add("hidden");
    this.ui.start();
    this.log(this.story.initialLog);
    this.log(this.story.syncLog);
    this.showStory(this.story.opening.replaceAll("<br>", "　"), 5200);
  }
  cleanupCombatOnly() {
    [...this.enemies, ...this.bullets, ...this.particles, ...this.fieldObjects].forEach((o) => o.destroy?.());
    if (this.boss && !this.boss.dead) disposeObject(this.boss.mesh);
    this.enemies = []; this.bullets = []; this.particles = []; this.fieldObjects = []; this.boss = null;
  }
  restart() {
    if (!this.mission) return;
    if (this.state === "title") this.start();
    else this.start();
  }
  toggleCoop() {
    this.coop = !this.coop;
    if (this.members[1]) this.members[1].isPlayer2 = true;
    this.log(this.coop ? `${this.members[1]?.name || "2P"} に2P操作を接続` : "2P接続を解除、AI制御へ移行");
  }
  cycleBackground() {
    this.mission.patternIndex = (this.mission.patternIndex + 1) % PATTERNS.length;
    this.background.generate(this.mission.patternIndex, this.mission.seed + this.mission.patternIndex * 17);
    this.scene.fog.color.set(this.background.accent).multiplyScalar(.08);
    this.log(`宇宙生成モデル：${PATTERNS[this.mission.patternIndex]}`);
    this.sound.generate();
    if (this.state === "title") this.ui.updateTitle();
  }
  closestMember(position) {
    return this.members.filter((m) => m.alive).sort((a, b) => distance2D(a.group.position, position) - distance2D(b.group.position, position))[0];
  }
  closestEnemy(position) {
    const targets = this.enemies.filter((e) => !e.dead);
    if (this.boss && !this.boss.dead) targets.push({ mesh: this.boss.mesh });
    return targets.sort((a, b) => distance2D(a.mesh.position, position) - distance2D(b.mesh.position, position))[0];
  }
  spawnEnemy() {
    let type = Math.floor(Math.random() * 5);
    if (this.mission.anomaly.turretRate && Math.random() < .55) type = 4;
    this.enemies.push(new Enemy(this, type));
  }
  spawnField() {
    const healChance = .2 * (this.mission.anomaly.healRate || 1);
    const r = Math.random();
    const type = r < healChance ? "heal" : r < healChance + .09 ? "energy" : r < .5 ? "crystal" : "asteroid";
    this.fieldObjects.push(new FieldObject(this, type));
  }
  spawnBoss() {
    this.bossTriggered = true;
    $("#warning-name").textContent = this.mission.bossName;
    $("#warning-banner").classList.remove("hidden");
    this.sound.warning();
    this.cameraShake = .4;
    this.log(`巨大反応「${this.mission.bossName}」が実体化`, true);
    setTimeout(() => {
      if (this.state !== "playing") return;
      $("#warning-banner").classList.add("hidden");
      this.boss = new Boss(this);
    }, 2200);
  }
  update(dt) {
    this.background.update(dt, this.state === "playing" ? 8.5 : 2.1);
    if (this.state !== "playing") {
      this.members.forEach((m, i) => {
        if (m.alive) {
          m.group.rotation.y += dt * .22;
          m.group.position.y += Math.sin(performance.now() * .0015 + i) * dt * .08;
        }
      });
      return;
    }
    this.elapsed += dt;
    this.enemyClock -= dt;
    this.fieldClock -= dt;
    const bossTime = this.mission.anomaly.earlyBoss ? 34 : 45;
    if (!this.bossTriggered && this.elapsed >= bossTime) this.spawnBoss();
    if (!this.bossTriggered && this.enemyClock <= 0) {
      this.spawnEnemy();
      this.enemyClock = Math.max(.48, rand(.8, 1.35) - this.elapsed * .006);
    }
    if (this.fieldClock <= 0) {
      this.spawnField();
      if (this.mission.anomaly.asteroidRate && Math.random() < .7) this.fieldObjects.push(new FieldObject(this, "asteroid"));
      this.fieldClock = rand(3.8, 6.2) / (this.mission.anomaly.asteroidRate || 1);
    }
    if (!this.midTriggered && this.elapsed > bossTime * .52) {
      this.midTriggered = true;
      this.showStory(this.story.mid, 6200);
      this.log("未登録の記憶波形を受信");
    }
    if (this.mission.anomaly.shakeRate && Math.floor(this.elapsed) % 9 === 0 && Math.random() < .025) this.cameraShake = .28;
    this.members.forEach((m) => m.update(dt));
    this.enemies.forEach((e) => e.update(dt));
    this.bullets.forEach((b) => b.update(dt));
    this.particles.forEach((p) => p.update(dt));
    this.fieldObjects.forEach((o) => o.update(dt));
    if (this.boss && !this.boss.dead) this.boss.update(dt);
    this.handleCollisions();
    this.cleanupArrays();
    this.ui.update();
    this.updateCamera(dt);
    if (this.mission.anomaly.redShift) this.scene.background.setRGB(.01 + this.redShift * .2, .008, .025);
  }
  handleCollisions() {
    for (const bullet of this.bullets) {
      if (bullet.dead) continue;
      if (bullet.friendly) {
        let hit = null;
        for (const enemy of this.enemies) {
          if (!enemy.dead && bullet.mesh.position.distanceToSquared(enemy.mesh.position) < 1.15) { hit = enemy; break; }
        }
        if (hit) { hit.damage(bullet.power); bullet.destroy(); continue; }
        if (this.boss && !this.boss.dead && bullet.mesh.position.distanceToSquared(this.boss.mesh.position) < 12) {
          this.boss.damage(bullet.power); bullet.destroy();
        }
      } else {
        for (const member of this.members) {
          if (member.alive && bullet.mesh.position.distanceToSquared(member.group.position.clone().add(new THREE.Vector3(0,.45,0))) < .72) {
            member.damage(bullet.power); bullet.destroy(); break;
          }
        }
      }
    }
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.mesh.position.z < 2.4 || enemy.mesh.position.z > 6.6) continue;
      const member = this.closestMember(enemy.mesh.position);
      if (member && distance2D(member.group.position, enemy.mesh.position) < 1.05) {
        if (enemy.type === 3) enemy.explode();
        else member.damage(15);
        enemy.destroy();
      }
    }
  }
  cleanupArrays() {
    this.bullets.forEach((b) => { if (!b.dead && (b.life <= 0 || Math.abs(b.mesh.position.z) > 90)) b.destroy(); });
    this.particles.forEach((p) => { if (!p.dead && p.life <= 0) p.destroy(); });
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead).slice(-240);
    this.fieldObjects = this.fieldObjects.filter((o) => !o.dead);
  }
  burst(position, color, count = 10, speed = 2) {
    const room = Math.max(0, 240 - this.particles.length);
    for (let i = 0; i < Math.min(count, room); i++) {
      const velocity = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(.4, speed));
      this.particles.push(new Particle(this, position.clone(), color, velocity, rand(.08, .3), rand(.35, 1)));
    }
  }
  updateCamera(dt) {
    this.cameraShake = Math.max(0, this.cameraShake - dt * 1.8);
    const lead = this.members.find((m) => m.isPlayer1 && m.alive);
    const followX = lead ? lead.group.position.x * .045 : 0;
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, followX, dt * 2.5);
    this.camera.position.y = this.baseCamera.y;
    this.camera.position.z = this.baseCamera.z;
    if (this.cameraShake > 0) {
      this.camera.position.x += rand(-this.cameraShake, this.cameraShake);
      this.camera.position.y += rand(-this.cameraShake, this.cameraShake);
      this.camera.position.z += rand(-this.cameraShake, this.cameraShake);
    }
    this.camera.lookAt(followX * .25, 1.2, -15);
  }
  log(message, alert = false) {
    this.logs.unshift({ message, alert });
    this.logs = this.logs.slice(0, 5);
    $("#mission-log").innerHTML = this.logs.map((l) => `<div class="log-line ${l.alert ? "alert" : ""}">${l.message}</div>`).join("");
  }
  showStory(text, duration) {
    $("#story-text").innerHTML = text;
    $("#story-toast").classList.remove("hidden");
    clearTimeout(this.storyTimer);
    this.storyTimer = setTimeout(() => $("#story-toast").classList.add("hidden"), duration);
  }
  completeMission() {
    if (this.state !== "playing") return;
    this.state = "result";
    $("#flash").style.opacity = .75;
    setTimeout(() => { $("#flash").style.opacity = 0; this.ui.result(true); }, 850);
  }
  gameOver() {
    if (this.state !== "playing") return;
    this.state = "gameover";
    setTimeout(() => this.ui.result(false), 1100);
  }
  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), .035);
    try { this.update(dt); } catch (error) { console.error("RECALL STARS update recovered:", error); }
    this.renderer.render(this.scene, this.camera);
  }
}

const recallStars = new Game();
window.recallStars = recallStars;

// Headless QA and demo captures can skip the title without changing normal play.
if (new URLSearchParams(location.search).has("autostart")) {
  setTimeout(() => recallStars.start(), 500);
}
