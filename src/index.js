import _, { functionsIn } from 'lodash';
import * as THREE from 'three';
import './style.css';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GUI } from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import Robot from './RobotExpressive.glb';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Direction from './components/direction';
import caseImg from './img/case.jpg';
import sandImg from './img/sand.jpg';

function main() {
  const textureLoader = new THREE.TextureLoader(); //图片渲染器
  const obstacle = []; //障碍物列表
  let direction = Direction(); //方向
  let container, //div容器
    controls, //div容器
    stats, //fps指示器
    clock, //时钟
    mixer, //动画混合器
    actions, //行为
    activeAction, //活动中行为
    previousAction; //上一个行为
  let camera, //相机
    scene, // 场景
    renderer, // 渲染器
    model, // 机器人模块
    face; // 面部表情
  let time = null, // 行走状态防抖
    walk = false, // 是否是行走状态
    jump = false, // 是否跳跃状态
    re_jump = true, // 是否跳跃状态
    reset_jump_height = false, // 重置跳跃高度
    deathing = false, // 即将死亡
    groundPlane = 0; // 地面高度

  const directionObj = {
    Left: -Math.PI / 2,
    LeftBack: -Math.PI / 4,
    Back: 0,
    RightBack: Math.PI / 4,
    Right: Math.PI / 2,
    RightFront: (Math.PI * 3) / 4,
    Front: Math.PI,
    LeftFront: -Math.PI / 2,
  };
  const api = { state: 'Walking' };
  let RobotPositon = { x: 0, y: 0, z: 0 };

  let faceTo = 'Back';

  let num = 0;
  let new_height = 0;
  let falling = false;
  let fall_time = 0;
  let fall_height = 0;

  init();
  animate();

  function init() {
    //创建div
    container = document.createElement('div');
    document.body.appendChild(container);

    //创建相机
    camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.25,
      1000
    );
    camera.position.set(0, 100, 150);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    //创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0e0e0);
    //创建雾
    scene.fog = new THREE.Fog(0xe0e0e0, 20, 500);
    //时间
    clock = new THREE.Clock();

    //天空地面光
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    //方向光
    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(0, 20, 10);
    scene.add(dirLight);

    // ground

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      //depthWrite 是否渲染看不到的地方
      new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);

    //地面辅助线
    const grid = new THREE.GridHelper(1000, 200, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    const box_material = new THREE.MeshLambertMaterial({
      map: textureLoader.load(caseImg),
    });

    const blue_material = new THREE.MeshLambertMaterial({ color: 0x1890ff });
    const grey_material = new THREE.MeshLambertMaterial({ color: 0xd9d9d9 });

    //泳池
    newBox(4, 4, 4, box_material, -7, 2, -15);
    newBox(10, 10, 10, box_material, -13, 5, -15);
    newBox(30, 1, 8, box_material, -30, 8, -15);
    newBox(100, 1, 100, blue_material, -60, 0.5, -15);
    newBox(102, 1, 102, grey_material, -60, 0.4, -15);

    // 木箱阵
    newBox(4, 4, 4, box_material, 7, 2, -15); // 1
    newBox(10, 10, 10, box_material, 15, 5, -15); // 2
    newBox(10, 10, 10, box_material, 30, 5, -15); // 3
    newBox(10, 10, 10, box_material, 30, 5, -30); // 4
    newBox(10, 10, 10, box_material, 30, 5, -45); // 5
    newBox(10, 10, 10, box_material, 48, 5, -45); // 6
    newBox(10, 10, 10, box_material, 66, 5, -45); // 7
    newBox(10, 10, 10, box_material, 66, 5, -25); // 8
    newBox(10, 10, 10, box_material, 66, 5, -5); // 9
    newBox(10, 10, 10, box_material, 46, 5, 15); // 10

    function newBox(width, height, length, material, x, y, z) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, length),
        material
      );
      box.position.set(x, y, z);
      scene.add(box);
      obstacle.push(box);
    }

    //添加一个锥体
    // const cone = new THREE.Mesh(
    //   new THREE.ConeGeometry(8, 15, 50),
    //   new THREE.MeshLambertMaterial({ map: textureLoader.load(sandImg) })
    // );
    // cone.rotation.set(0, Math.PI / 2, 0);
    // cone.position.set(15, 7, 0);
    // scene.add(cone);
    // obstacle.push(cone);

    // model

    const loader = new GLTFLoader();

    loader.load(
      Robot,
      function (gltf) {
        model = gltf.scene;
        scene.add(model);
        console.log(model);

        actionInit(model, gltf.animations);
      },
      undefined,
      function (e) {
        console.error(e);
      }
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    //控制器
    controls = new OrbitControls(camera, renderer.domElement);

    window.addEventListener('resize', onWindowResize);
    stats = new Stats();
    container.appendChild(stats.dom);
  }

  function actionInit(model, animations) {
    const states = [
      'Idle',
      'Walking',
      'Running',
      'Dance',
      'Death',
      'Sitting',
      'Standing',
    ];
    const emotes = [
      'Jump',
      'Yes',
      'No',
      'Wave',
      'Punch',
      'ThumbsUp',
      'WalkJump',
    ];

    //注册动画行为
    mixer = new THREE.AnimationMixer(model);

    actions = {};
    for (let i = 0; i < animations.length; i++) {
      const clip = animations[i];
      const action = mixer.clipAction(clip);
      actions[clip.name] = action;

      if (emotes.indexOf(clip.name) >= 0 || states.indexOf(clip.name) >= 4) {
        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;
      }
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function changeDirection(code) {
    model.rotation.y = directionObj[code];
  }

  function fadeToAction(name, duration) {
    previousAction = activeAction;
    activeAction = actions[name];
    if (previousAction && previousAction !== activeAction) {
      previousAction.fadeOut(duration);
    }

    activeAction
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(duration)
      .play();
  }
  let keyAction = {
    Digit1: 'Dance',
    Digit2: 'No',
    Digit3: 'Punch',
    Digit4: 'Sitting',
    Digit5: 'Standing',
    Digit6: 'ThumbsUp',
    Digit7: 'WalkJump',
    Digit8: 'Wave',
    Digit9: 'Yes',
  };
  let shift_down = false;
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && re_jump) {
      action(walk && shift_down ? 'WalkJump' : 'Jump');
      if (jump === true) reset_jump_height = true;
      jump = true;
      new_height = RobotPositon.y;
      re_jump = false;
    }
    if (keyAction[e.code]) {
      action(keyAction[e.code]);
    }
  });
  document.addEventListener('keyup', function (e) {
    if (e.code === 'Space') {
      // re_jump = true;
    }
  });
  function isWalk(direction) {
    const walking = direction.value();
    if (!walking) return false;
    time && clearTimeout(time);
    if (!walk || shift_down !== direction.shift) {
      shift_down = direction.shift;
      fadeToAction(shift_down ? 'Running' : 'Walking', 0.2);
    }
    time = setTimeout(
      () => {
        walk = false;
        fadeToAction('Idle', 0.2);
      },
      walk ? 100 : 600
    );
    walk = true;
  }

  function action(name, time = 0.2) {
    fadeToAction(name, time);
    // 执行结束恢复状态
    mixer.addEventListener('finished', restoreState);
  }

  function restoreState() {
    mixer.removeEventListener('finished', restoreState);

    fadeToAction(walk ? (shift_down ? 'Running' : 'Walking') : 'Idle', 0.2);
  }

  function getDirection(dire) {
    if (!dire) return;
    if (faceTo !== dire) {
      changeDirection(dire);
    }
    faceTo = dire;
  }
  function getPosition(dire) {
    let length = dire.shift ? 0.2 : 0.1;
    let x = RobotPositon.x,
      height = RobotPositon.y,
      z = RobotPositon.z;
    if (direction.left) x -= length;
    if (direction.front) z -= length;
    if (direction.back) z += length;
    if (direction.right) x += length;
    if (jump) {
      num += 0.1;
      if (reset_jump_height) {
        new_height = RobotPositon.y;
        reset_jump_height = false;
        num = 0;
        if (new_height > 50) {
          deathing = true;
        }
      }
      let y = (new_height + 8 - 2 * Math.pow(num - 2, 2)).toFixed(2);
      if (y > 0) {
        height = Number(y);
      } else {
        height = 0;
        jump = false;
        num = 0;
        new_height = 0;
        if (deathing) {
          deathing = false;
          fadeToAction('Death', 0.2);
        }
      }
    }

    if (noCollisionCheck(obstacle, x, height, z)) return;

    if (height > 0 && !jump) {
      if (!noCollisionCheck(obstacle, x, height - 1, z)) {
        if (!falling) {
          falling = true;
          fall_time = 0;
          fall_height = RobotPositon.y;
        }
        fall_time += 0.1;
        let end_height = fall_height - Math.pow(fall_time, 2);
        if (end_height > 0) {
          height = end_height;
        } else {
          height = 0;
          falling = false;
        }
      } else {
        re_jump = true;
      }
    }

    if (height === 0) {
      re_jump = true;
    }

    RobotPositon.x = x;
    RobotPositon.y = height;
    RobotPositon.z = z;
  }

  function noCollisionCheck(obstacle, x, height, z) {
    return obstacle.some((a) => {
      if (a.geometry.type === 'BoxGeometry') {
        // 箱子
        let geo = a.geometry;
        return (
          x - 2 < a.position.x + geo.parameters.width / 2 &&
          x + 2 > a.position.x - geo.parameters.width / 2 &&
          height < a.position.y + geo.parameters.height / 2 &&
          height + 2 > a.position.y - geo.parameters.height / 2 &&
          z - 2 < a.position.z + geo.parameters.depth / 2 &&
          z + 2 > a.position.z - geo.parameters.depth / 2
        );
      }
      if (a.geometry.type === 'ConeGeometry') {
        // 锥形
        let geo = a.geometry;
        return (
          x - 2 < a.position.x + geo.parameters.radius &&
          x + 2 > a.position.x - geo.parameters.radius &&
          height < a.position.y + geo.parameters.height / 2 &&
          height + 2 > a.position.y - geo.parameters.height / 2 &&
          z - 2 < a.position.z + geo.parameters.radius &&
          z + 2 > a.position.z - geo.parameters.radius
        );
      }
    });
  }

  function animate() {
    let dire = direction.value();
    getDirection(dire);
    isWalk(direction);
    getPosition(direction);
    model && model.position.set(RobotPositon.x, RobotPositon.y, RobotPositon.z);
    const dt = clock.getDelta();

    if (mixer) mixer.update(dt);

    requestAnimationFrame(animate);

    renderer.render(scene, camera);
    controls.update();
    stats.update();
  }
}

main();
