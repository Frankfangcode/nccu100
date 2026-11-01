import * as THREE from 'three';
const fixed = { afternoon: .62, dusk: .78, night: .92 };
const wrap = value => ((value % 1) + 1) % 1;
export function createDahClock({ cycleSeconds = 1200 } = {}) {
  if (!Number.isFinite(cycleSeconds) || cycleSeconds <= 0) throw new RangeError('Invalid day cycle');
  let mode = 'auto', anchorPhase = .62, anchorTime = 0;
  const phaseAt = time => mode === 'auto' ? wrap(anchorPhase + (time - anchorTime) / cycleSeconds) : fixed[mode];
  return {
    get mode() { return mode; },
    setMode(next, time = 0) {
      if (next !== 'auto' && !Object.hasOwn(fixed, next)) throw new RangeError('Invalid day mode');
      if (!Number.isFinite(time)) throw new RangeError('Invalid simulation time');
      const phase = phaseAt(time);
      if (next === 'auto' && mode !== 'auto') { anchorPhase = phase; anchorTime = time; }
      mode = next;
    },
    sample(time = 0) {
      if (!Number.isFinite(time)) throw new RangeError('Invalid simulation time');
      const phase = phaseAt(time);
      return { phase, mode, ...sampleDahLight(phase) };
    },
  };
}
// Linear-light colors interpolate with smoothstep for a calm, seamless day.
const keys = [
  [.20, 1, .06, .30, 1, '#182940','#344457','#27374a','#b5c8f0','#8cabc7','#52616a'],
  [.30, .35, .42, .60, .45, '#849bad','#e7b796','#a2adb2','#ffd0a3','#cbd4e7','#727b72'],
  [.50, 0, .90, .85, .04, '#9dc9e8','#d4e5e9','#b4d6e2','#fff8e7','#e5efff','#667f75'],
  [.62, 0, .85, .80, .06, '#a8cee8','#d1e4ed','#b9cfda','#ffe7c1','#dce8fa','#6d8176'],
  [.78, .58, .38, .48, .72, '#667e9e','#e6a785','#a397a2','#ffc28f','#b5bbda','#626577'],
  [.92, 1, .07, .30, 1, '#182940','#344457','#27374a','#b5c8f0','#8cabc7','#52616a'],
];
const scalarFields = ['night','sunIntensity','hemiIntensity','localIntensity'];
const colorFields = ['sky','horizon','fog','sun','ambient','ground'];
export function sampleDahLight(phase) {
  if (!Number.isFinite(phase)) throw new RangeError('Invalid day phase');
  const p = wrap(phase);
  let a = keys[keys.length - 1], b = keys[0], start = a[0], end = b[0] + 1, position = p < b[0] ? p + 1 : p;
  for (let i = 0; i < keys.length - 1; i++) {
    if (p >= keys[i][0] && p < keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; start = a[0]; end = b[0]; position = p; break; }
  }
  const t = THREE.MathUtils.smoothstep(position, start, end), result = {};
  scalarFields.forEach((field,i) => { result[field] = THREE.MathUtils.lerp(a[i+1], b[i+1], t); });
  colorFields.forEach((field,i) => { result[field] = new THREE.Color(a[i+5]).lerp(new THREE.Color(b[i+5]), t); });
  // A full circular azimuth with a readable low moon at night, always above terrain.
  const angle = (p - .62) * Math.PI * 2;
  result.sunDirection = new THREE.Vector3(48 * Math.cos(angle) + 55 * Math.sin(angle), 70 - 45 * result.night, 55 * Math.cos(angle) - 48 * Math.sin(angle)).normalize();
  return result;
}

export function createDahLighting(scene, { interior = false, mobile = false } = {}) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(440, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { topColor: { value: new THREE.Color() }, bottomColor: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vDirection; void main(){float h=smoothstep(0.0,0.8,normalize(vDirection).y);gl_FragColor=vec4(mix(bottomColor,topColor,h),1.0);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}',
  }));
  sky.name = 'dah-gradient-sky'; sky.userData.noOcc = true; sky.renderOrder = -100;
  scene.add(sky);
  scene.fog = new THREE.Fog('#b9cfda', interior ? 100 : 140, 380);
  const hemi = new THREE.HemisphereLight('#dce8fa','#6d8176',.8);
  const sun = new THREE.DirectionalLight('#ffe7c1',.85);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  const camera = sun.shadow.camera;
  Object.assign(camera,{left:-36,right:36,top:36,bottom:-36,near:1,far:210});camera.updateProjectionMatrix();
  sun.shadow.bias = -.00025; sun.shadow.normalBias = .045;
  scene.add(hemi,sun,sun.target);
  // Positions correspond to existing entrance, café and path fixtures in layout.js.
  const fixtures = (interior ? [] :
    [[10.16,6.6,7.6],[4.55,3.2,-24],[30,3.8,68],[32,3.8,43],[38,3.8,10],[38,3.8,-23],[27,3.8,-38],[-31,3.8,-39],[-39,3.8,-68],[23,3.8,-96]])
    .map(p=>new THREE.Vector3(...p));
  // Read actual lamp positions, including batched upper reading lamps.
  scene.updateMatrixWorld(true);
  const lampMatrix=new THREE.Matrix4(),worldMatrix=new THREE.Matrix4();
  scene.traverse(o=>{
   if(!o.isMesh||!['lamp','light'].includes(o.material?.userData?.dahKind))return;
   if(o.userData.dahFixtureParts){
    for(const p of o.userData.dahFixtureParts)fixtures.push(new THREE.Vector3(...p).applyMatrix4(o.matrixWorld));
    return;
   }
   const addFixture=matrix=>{
    const position=new THREE.Vector3().setFromMatrixPosition(matrix);
    if(interior){
      // Place the emitter outside the underside, so its own opaque shade cannot occlude it.
      if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
      const bounds=o.geometry.boundingBox.clone().applyMatrix4(matrix);position.y=bounds.min.y-.035;
    }
    fixtures.push(position);
   };
   if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,lampMatrix);worldMatrix.multiplyMatrices(o.matrixWorld,lampMatrix);addFixture(worldMatrix);}}
   else addFixture(o.matrixWorld);
  });
  const localLights = Array.from({length:mobile?2:4},()=>{
    const light=interior?new THREE.SpotLight('#ffe4c4',0,11,Math.PI/3,.55,2):new THREE.PointLight('#ffcf91',0,19,2);
    if(interior){
      light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;
      light.shadow.camera.near=.05;light.shadow.bias=-.0003;light.shadow.normalBias=.025;
      scene.add(light.target);
    }
    scene.add(light);return light;
  });
  const lastFixturePosition=new THREE.Vector3(Infinity,Infinity,Infinity);let nearest=[];
  // 室內固定有限數量真燈；其餘發光燈具與中性間接光維持連續明暗。
  // 不以角色距離搬動光源，避免走路時像感應燈突然亮起。
  if(interior){
    const available=[...fixtures],anchors=[[-12,7.1,-18.8],[-8,3.6,5],[6,19,-8],[0,25,18]];
    nearest=anchors.slice(0,localLights.length).map(p=>{
      if(!available.length)return undefined;
      const anchor=new THREE.Vector3(...p);available.sort((a,b)=>a.distanceToSquared(anchor)-b.distanceToSquared(anchor));return available.shift();
    });
  }
  function update(profile, playerPosition = new THREE.Vector3()) {
    sky.position.copy(playerPosition);
    sky.material.uniforms.topColor.value.copy(profile.sky);
    sky.material.uniforms.bottomColor.value.copy(profile.horizon);
    scene.background = profile.sky.clone(); scene.fog.color.copy(profile.fog);
    hemi.color.copy(profile.ambient);hemi.groundColor.copy(profile.ground);
    // Indirect indoor bounce stays neutral; warm color belongs to the real fixtures.
    if(interior){hemi.color.lerp(new THREE.Color('#d8dfdf'),.8);hemi.groundColor.lerp(new THREE.Color('#9da7a1'),.8);}
    hemi.intensity = profile.hemiIntensity * (interior ? 1.05 : .85);
    sun.color.copy(profile.sun);sun.intensity=profile.sunIntensity*(interior?1.12:1);
    const direction=profile.sunDirection.clone();
    // Quantize the light-space horizontal basis, not world X/Z, to prevent crawling shadows.
    const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
    const up=new THREE.Vector3().crossVectors(direction,right).normalize();
    const texel=72/sun.shadow.mapSize.x, target=playerPosition.clone();
    for(const axis of [right,up]){const v=target.dot(axis);target.addScaledVector(axis,Math.round(v/texel)*texel-v);}
    sun.target.position.copy(target);sun.position.copy(target).addScaledVector(direction,100);
    sun.target.updateMatrixWorld();sun.updateMatrixWorld();sun.shadow.updateMatrices(sun);
    if(!interior&&lastFixturePosition.distanceToSquared(playerPosition)>.25){const candidates=fixtures.filter(p=>!interior||(p.y>playerPosition.y+.1&&p.y<playerPosition.y+4.2));
      const ranked=candidates.sort((a,b)=>a.distanceToSquared(playerPosition)-b.distanceToSquared(playerPosition));
      const chosen=ranked.slice(0,localLights.length);
      // Keep pool slots stable while the nearest set is unchanged.
      nearest=localLights.map(light=>chosen.find(p=>p.equals(light.position)));
      const remaining=chosen.filter(p=>!nearest.includes(p));
      nearest=nearest.map(p=>p||remaining.shift());lastFixturePosition.copy(playerPosition);}
    localLights.forEach((light,index)=>{
      const fixture=nearest[index];
      light.visible=Boolean(fixture);
      light.userData.dahFixturePosition=fixture?fixture.toArray():null;
      if(!fixture){light.intensity=0;return;}
      if(!light.position.equals(fixture)){
        light.position.copy(fixture);
        if(interior){
          light.target.position.copy(fixture).add(new THREE.Vector3(0,-1,0));light.target.updateMatrixWorld();
          light.shadow.needsUpdate=true;
        }
      }
      light.distance=interior?8:19;
      // The library's working lamps stay on in daytime (official commons/AV
      // photos). Outdoor path lights still fade with daylight as before.
      light.intensity=interior?Math.max(.65,profile.localIntensity)*1.55:profile.localIntensity*2.2;
    });
  }
  update(sampleDahLight(.62));
  return { update, sun, localLights };
}

export function configureDahShadows(root) {
  root.traverse(object => {
    if (!object.isMesh) return;
    let excluded = false;
    for (let node = object; node; node = node.parent) {
      if (node.userData.noOcc || node.userData.water || /water|outline|水面/i.test(node.name)) { excluded = true; break; }
      if (node === root) break;
    }
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const opaque = materials.length > 0 && materials.every(material => material && !material.transparent && material.opacity >= 1 && material.side !== THREE.BackSide);
    object.castShadow = object.receiveShadow = !excluded && opaque;
  });
}
