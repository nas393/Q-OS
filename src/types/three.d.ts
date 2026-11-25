/* eslint-disable @typescript-eslint/no-explicit-any -- temporary for first preview; tighten types later */
declare module "three" {
  const THREE: any;
  export = THREE;
}
declare module "three/addons/controls/OrbitControls.js" {
  export const OrbitControls: any;
}
declare module "three/addons/environments/RoomEnvironment.js" {
  export const RoomEnvironment: any;
}
