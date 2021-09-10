export default function Direction() {
  let lastKey = null,
    lastUpTime = 0;
  let direction = {
    left: false,
    front: false,
    back: false,
    right: false,
    shift: false,
    doubleKey: '',
    value() {
      if (this.left && this.front) return 'LeftFront';
      if (this.left && this.back) return 'LeftBack';
      if (this.right && this.front) return 'RightFront';
      if (this.right && this.back) return 'RightBack';
      if (this.left) return 'Left';
      if (this.front) return 'Front';
      if (this.back) return 'Back';
      if (this.right) return 'Right';
      return false;
    },
  };

  document.addEventListener('keydown', function (ev) {
    if (lastKey === ev.code && new Date().getTime() - lastUpTime < 300) {
      direction.doubleKey = ev.code;
    }
    switch (ev.code) {
      case 'KeyA':
        direction.left = true;
        break;
      case 'KeyW':
        direction.front = true;
        break;
      case 'KeyD':
        direction.right = true;
        break;
      case 'KeyS':
        direction.back = true;
        break;
      case 'ShiftLeft':
        direction.shift = true;
        break;
    }
  });

  document.addEventListener('keyup', function (ev) {
    if (direction.doubleKey === ev.code) direction.doubleKey = '';
    lastKey = ev.code;
    lastUpTime = new Date().getTime();
    switch (ev.code) {
      case 'KeyA':
        direction.left = false;
        break;
      case 'KeyW':
        direction.front = false;
        break;
      case 'KeyD':
        direction.right = false;
        break;
      case 'KeyS':
        direction.back = false;
        break;
      case 'ShiftLeft':
        direction.shift = false;
        break;
    }
    return false;
  });

  return direction;
}
