function getRandom(num1, num2) {
  let num = num2 - num1;
  return num1 + Math.round(num * Math.random());
}
export { getRandom };
