/**
 * 畫面後製（MSAA、Bloom、色彩分級、暗角）與自動畫質。
 */
import * as THREE from 'three';
import { renderer } from '../core/engine.js';
import { createQualityController } from './quality-controller.js';
import { LOOK2 } from './look.js';

/* ---------- 畫面後製：MSAA、柔光 Bloom、色彩分級、暗角 ---------- */
const POST=(()=>{
  if(!renderer.capabilities.isWebGL2) return null;
  const mkRT=(ms)=>{ const rt=new THREE.WebGLRenderTarget(4,4,{samples:ms||0,depthBuffer:!!ms}); rt.texture.encoding=THREE.sRGBEncoding; rt.texture.minFilter=rt.texture.magFilter=THREE.LinearFilter; rt.texture.generateMipmaps=false; return rt; };
  const main=mkRT(4), a=mkRT(0), b=mkRT(0), c=mkRT(0), d=mkRT(0);
  const oc=new THREE.OrthographicCamera(-1,1,1,-1,0,1), quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2)), qs=new THREE.Scene(); qs.add(quad); quad.frustumCulled=false;
  const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
  const bright=new THREE.ShaderMaterial({uniforms:{t:{value:null}},vertexShader:VS,depthTest:false,depthWrite:false,
    fragmentShader:'uniform sampler2D t;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(c.r,max(c.g,c.b));float k=smoothstep(0.82,1.25,l);gl_FragColor=vec4(c*k,1.0);}'});
  const blur=new THREE.ShaderMaterial({uniforms:{t:{value:null},dir:{value:new THREE.Vector2()}},vertexShader:VS,depthTest:false,depthWrite:false,
    fragmentShader:'uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;void main(){vec3 s=texture2D(t,vUv).rgb*0.2270;s+=(texture2D(t,vUv+dir*1.3846).rgb+texture2D(t,vUv-dir*1.3846).rgb)*0.3162;s+=(texture2D(t,vUv+dir*3.2308).rgb+texture2D(t,vUv-dir*3.2308).rgb)*0.0703;gl_FragColor=vec4(s,1.0);}'});
  const comp=new THREE.ShaderMaterial({uniforms:{tS:{value:main.texture},tB1:{value:null},tB2:{value:null},bloom:{value:0.55},time:{value:0},indoor:{value:0},look:{value:LOOK2?1:0}},vertexShader:VS,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D tS,tB1,tB2;uniform float bloom,time,indoor,look;varying vec2 vUv;
    void main(){
      vec3 c=texture2D(tS,vUv).rgb;
      vec3 bl=texture2D(tB1,vUv).rgb*0.6+texture2D(tB2,vUv).rgb*0.8;
      c+=bl*bloom;
      float l=dot(c,vec3(0.2126,0.7152,0.0722));
      c=mix(vec3(l),c,1.14);
      vec3 cool=vec3(0.90,0.96,1.08), warm=vec3(1.05,1.0,0.92);
      c*=mix(cool,warm,smoothstep(0.03,0.55,l));
      c=c/(1.0+c*0.16)*1.04;
      c=pow(c,vec3(1.06));
      if(look>0.5){ float l2=dot(c,vec3(0.2126,0.7152,0.0722)); c=mix(vec3(l2),c,1.10); c=mix(c,c*c*(3.0-2.0*c),0.22); c*=1.03; }
      vec2 q=vUv-0.5; q.x*=1.25;
      c*=1.0-smoothstep(0.25,0.95,length(q))*mix(0.32,0.45,indoor);
      gl_FragColor=vec4(max(c,0.0),1.0);
      #include <encodings_fragment>
    }`});
  let enabled=true, bloomOn=true;
  function size(){ const v=new THREE.Vector2(); renderer.getDrawingBufferSize(v); const W=Math.max(4,v.x|0), H=Math.max(4,v.y|0);
    main.setSize(W,H); a.setSize(W>>1,H>>1); b.setSize(W>>1,H>>1); c.setSize(W>>2,H>>2); d.setSize(W>>2,H>>2); }
  function pass(m,src,dst){ quad.material=m; if(src) m.uniforms.t.value=src.texture; renderer.setRenderTarget(dst); renderer.render(qs,oc); }
  function render(sc,cam,t,ind){
    if(!enabled){ renderer.setRenderTarget(null); renderer.render(sc,cam); return; }
    renderer.setRenderTarget(main); renderer.render(sc,cam);
    if(bloomOn){
      pass(bright,main,a);
      blur.uniforms.dir.value.set(1/a.width,0); pass(blur,a,b); blur.uniforms.dir.value.set(0,1/a.height); pass(blur,b,a);
      pass(bright,a,c); blur.uniforms.dir.value.set(1/c.width,0); pass(blur,c,d); blur.uniforms.dir.value.set(0,1/c.height); pass(blur,d,c);
      blur.uniforms.dir.value.set(2/c.width,0); pass(blur,c,d); blur.uniforms.dir.value.set(0,2/c.height); pass(blur,d,c);
    }
    comp.uniforms.tB1.value=a.texture; comp.uniforms.tB2.value=c.texture; comp.uniforms.bloom.value=bloomOn?(ind?0.3:0.42):0; comp.uniforms.time.value=t; comp.uniforms.indoor.value=ind?1:0;
    quad.material=comp; renderer.setRenderTarget(null); renderer.render(qs,oc);
  }
  size();
  return {render,size,set enabled(v){ enabled=v; },get enabled(){ return enabled; },set bloom(v){ bloomOn=v; },get bloom(){ return bloomOn; }};
})();
/* 自動畫質使用可獨立測試的控制器；柔光最後恢復。 */
const quality=createQualityController({
  dpr:window.devicePixelRatio||1,
  bloom:!!POST,
  onChange({pr,bloom}){
    if(renderer.getPixelRatio()!==pr){
      renderer.setPixelRatio(pr);
      renderer.setSize(innerWidth,innerHeight);
      if(POST) POST.size();
    }
    if(POST) POST.bloom=bloom;
  },
});
renderer.setPixelRatio(quality.snapshot().pr);
renderer.setSize(innerWidth,innerHeight);
if(POST) POST.size();
function qualityTick(dt){ quality.tick(dt); }
function resetQualityMeasurement(){ quality.reset(); }
export { POST, qualityTick, resetQualityMeasurement };
