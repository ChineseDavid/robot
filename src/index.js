import _, { functionsIn } from 'lodash';
import * as THREE from 'three';
import './style.css';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GUI } from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import Crane from './Flamingo.glb';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Direction from './components/direction';
import groundImg from './img/ground.jpg';
import blueImg from './img/blue.jpg';
import sandImg from './img/sand.jpg';
import { getRandom } from './components/util';

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
    groundList = [],
    boxList = [],
    boneList = [],
    speed = 1,
    fly_length = 0,
    fly_length_dom = 0,
    game_over = false;

  const directionObj = {
    Left: [0, (Math.PI * 5) / 4, -Math.PI / 4],
    LeftBack: [-Math.PI / 8, (Math.PI * 5) / 4, -Math.PI / 4],
    Back: [-Math.PI / 8, Math.PI, 0],
    RightBack: [-Math.PI / 8, (Math.PI * 3) / 4, Math.PI / 4],
    Right: [0, (Math.PI * 3) / 4, Math.PI / 4],
    RightFront: [Math.PI / 8, (Math.PI * 3) / 4, Math.PI / 4],
    Front: [Math.PI / 8, Math.PI, 0],
    LeftFront: [Math.PI / 8, (Math.PI * 5) / 4, -Math.PI / 4],
    Stop: [0, Math.PI, 0],
  };
  let RobotPositon = { x: 0, y: 0, z: 0 };

  let faceTo = 'Stop';

  init();
  animate();

  function init() {
    //创建div
    container = document.createElement('div');
    document.body.appendChild(container);

    //展示飞行距离
    fly_length_dom = document.createElement('div');
    fly_length_dom.setAttribute('class', 'number');
    container.appendChild(fly_length_dom);

    //提示
    const operation_tip = document.createElement('div');
    operation_tip.setAttribute('class', 'tip');
    operation_tip.innerText = '提示："W","A","S","D" 可操作方向';
    container.appendChild(operation_tip);

    //创建相机
    camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.25,
      1000
    );
    camera.position.set(0, 50, 100);
    camera.lookAt(new THREE.Vector3(0, 300, 0));

    //创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0e0e0);
    //创建雾
    scene.fog = new THREE.Fog(0xe0e0e0, 10, 800);
    //时间
    clock = new THREE.Clock();

    //天空地面光
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x91d5ff, 1);
    scene.add(hemiLight);

    //方向光
    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(0, 200, 100);
    scene.add(dirLight);

    // ground

    const groundTexture = textureLoader.load(groundImg);

    groundTexture.wrapS = THREE.MirroredRepeatWrapping;
    groundTexture.wrapT = THREE.MirroredRepeatWrapping;
    groundTexture.repeat.set(3, 7);

    const ground_material = new THREE.MeshLambertMaterial({
      map: groundTexture,
      color: 0x0050b3,
    });

    const blue_material = new THREE.MeshLambertMaterial({
      map: textureLoader.load(blueImg),
      color: 0x0050b3,
    });

    const sand_material = new THREE.MeshLambertMaterial({
      map: textureLoader.load(sandImg),
    });

    groundList.push(newBox(2000, 1, 2000, ground_material, 0, -100, -10));
    groundList.push(newBox(2000, 1, 2000, ground_material, 0, -100, -2010));

    for (let i = 0; i < 20; i++) {
      boxList.push(
        newBox(
          10,
          10,
          10,
          blue_material,
          getRandom(-60, 60),
          getRandom(-30, 30),
          1000 - 100 * i - Math.random(0, 100)
        )
      );
    }

    for (let i = 0; i < 10; i++) {
      boneList.push(
        newBox(
          10,
          10,
          10,
          sand_material,
          getRandom(-60, 60),
          getRandom(-30, 30),
          1000 - 200 * i - Math.random(0, 100)
        )
      );
    }

    function newBox(width, height, length, material, x, y, z) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, length),
        material
      );
      box.position.set(x, y, z);
      scene.add(box);
      obstacle.push(box);
      return box;
    }

    const loader = new GLTFLoader();

    loader.load(
      Crane,
      function (gltf) {
        const mesh = gltf.scene.children[0];

        const s = 0.1;
        mesh.scale.set(s, s, s);
        mesh.position.y = 0;
        mesh.rotation.y = Math.PI;

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        scene.add(mesh);
        model = mesh;

        mixer = new THREE.AnimationMixer(mesh);
        mixer.clipAction(gltf.animations[0]).setDuration(1).play();
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

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function changeDirection(code) {
    model.rotation.x = directionObj[code][0];
    model.rotation.y = directionObj[code][1];
    model.rotation.z = directionObj[code][2];
  }

  function getDirection(dire) {
    if (faceTo !== dire && model) {
      // if (mixer) mixer.stop();
      changeDirection(dire);
    }
    faceTo = dire;
  }

  function getPosition(dire) {
    let length = dire.shift ? 2 : 1;
    let x = RobotPositon.x,
      height = RobotPositon.y,
      z = RobotPositon.z;
    if (direction.left) x -= length;
    if (direction.front) height += length * 0.5;
    if (direction.back) height -= length * 0.5;
    if (direction.right) x += length;

    if (noCollisionCheck(x, height, z) && !game_over) {
      alert('Game Over !');
      game_over = true;
      window.location.href = window.location.href;
    }
    x > 60 ? (x = 60) : null;
    x < -60 ? (x = -60) : null;
    height > 30 ? (height = 30) : null;
    height < -30 ? (height = -30) : null;
    RobotPositon.x = x;
    RobotPositon.y = height;
    RobotPositon.z = z;
  }

  function noCollisionCheck(x, height, z) {
    return boxList.concat(boneList).some((a) => {
      // 箱子
      let geo = a.geometry;
      if (
        x - 5 < a.position.x + geo.parameters.width / 2 &&
        x + 5 > a.position.x - geo.parameters.width / 2 &&
        height - 5 < a.position.y + geo.parameters.height / 2 &&
        height + 5 > a.position.y - geo.parameters.height / 2 &&
        z - 5 < a.position.z + geo.parameters.depth / 2 &&
        z + 5 > a.position.z - geo.parameters.depth / 2
      ) {
        scene.remove(a);
        return true;
      }
      return false;
    });
  }

  function groundMove() {
    groundList.forEach((a) => {
      a.position.z += speed;
      if (a.position.z >= 2000) a.position.z = -2000;
    });
    boxList.forEach((a) => {
      a.position.z += speed;
      if (a.position.z >= 1000) a.position.z = -1000;
    });
    boneList.forEach((a) => {
      a.position.z += speed * 3;
      if (a.position.z >= 1000) a.position.z = -1000;
    });
  }

  function animate() {
    fly_length++;
    fly_length_dom.innerText = '你飞行了' + fly_length + '米';
    speed = 1 + Math.ceil(fly_length / 50) / 10;
    speed > 10 ? (speed = 10) : null;
    let dire = direction.value();
    getDirection(dire);
    getPosition(direction);
    groundMove();
    model && model.position.set(RobotPositon.x, RobotPositon.y, RobotPositon.z);
    const dt = clock.getDelta();

    if (mixer) {
      mixer.update(dt);
    }

    requestAnimationFrame(animate);

    renderer.render(scene, camera);
    controls.update();
    stats.update();
  }
}

main();
