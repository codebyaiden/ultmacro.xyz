import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const showcase = document.querySelector("[data-laptop-showcase]");
const viewport = showcase?.querySelector("[data-laptop-viewport]");
const poster = showcase?.querySelector("[data-laptop-poster]");
if (showcase && viewport && poster) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let renderer;
  const fallback = () => {
    viewport.dataset.renderState = "fallback";
    poster.hidden = false;
    showcase.dataset.mode = "poster";
    viewport.querySelector("canvas")?.remove();
    renderer?.dispose();
  };
  if (reduced.matches) fallback();
  else try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 10);
    camera.position.set(0.34, 0.31, -0.56);
    camera.lookAt(0, 0.105, 0);
    const canvas = document.createElement("canvas");
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Graphite laptop displaying the Ultimate Macro desktop app. Drag or use arrow keys to rotate.");
    viewport.append(canvas);
    renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:"low-power"});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0,0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.06).texture;
    room.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xececf5,0x1c1822,0.55));
    const key = new THREE.DirectionalLight(0xf4f0eb,1.1);
    key.position.set(-0.35,0.7,-0.4);
    key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);
    Object.assign(key.shadow.camera,{left:-0.5,right:0.5,top:0.5,bottom:-0.5,near:0.1,far:2});
    key.shadow.bias=-0.0002;
    key.shadow.normalBias=0.001;
    key.shadow.radius=4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbcb1dd,1.1);
    rim.position.set(0.4,0.35,0.25);scene.add(rim);
    const fill = new THREE.DirectionalLight(0xe4e7ef,0.55);
    fill.position.set(0.3,0.1,-0.5);scene.add(fill);
    const appScreen = new THREE.TextureLoader().load("assets/ui/ultimate-macro-laptop-screen.png?v=1",requestRender);
    appScreen.colorSpace = THREE.SRGBColorSpace;
    appScreen.flipY = false;
    appScreen.wrapS = THREE.RepeatWrapping;
    appScreen.repeat.x = -1;
    appScreen.offset.x = 1;
    appScreen.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.55),new THREE.ShadowMaterial({opacity:0.22}));
    shadow.rotation.x=-Math.PI/2;shadow.position.y=-0.001;shadow.receiveShadow=true;
    const spin = new THREE.Group();scene.add(spin);
    let yaw=-0.12,pitch=-0.025,frame=0,last=0,pointer=null;
    spin.rotation.set(pitch,yaw,0);
    function requestRender(){if(!frame)frame=requestAnimationFrame(render);}
    function render(now){
      frame=0;
      const dt=last?Math.min(Math.max((now-last)/1000,0),0.05):1/60;last=now;
      spin.rotation.y=THREE.MathUtils.damp(spin.rotation.y,yaw,15,dt);
      spin.rotation.x=THREE.MathUtils.damp(spin.rotation.x,pitch,15,dt);
      renderer.render(scene,camera);
      if(Math.abs(spin.rotation.y-yaw)>0.0001||Math.abs(spin.rotation.x-pitch)>0.0001)requestRender();
    }
    new GLTFLoader().load("assets/models/laptop-nightfall.glb?v=4",gltf=>{
      gltf.scene.traverse(obj=>{
        if(!obj.isMesh)return;
        obj.castShadow=true;obj.receiveShadow=false;
        for(const mat of (Array.isArray(obj.material)?obj.material:[obj.material])){
          mat.envMapIntensity=0.25;
          if(mat.name.includes("Carbon black")){mat.color.setRGB(0.004,0.005,0.007);mat.roughness=0.65;mat.metalness=0;mat.envMapIntensity=0.04;}
          if(mat.name.includes("Keycap")){mat.color.setRGB(0.018,0.019,0.023);mat.roughness=0.5;mat.metalness=0.05;mat.envMapIntensity=0.08;}
          if(mat.name.includes("Display | clean")){mat.map=appScreen;mat.color.setRGB(1,1,1);mat.roughness=0.24;mat.metalness=0.04;mat.envMapIntensity=0.12;mat.needsUpdate=true;}
          if(mat.name.includes("Nightfall")){mat.color.setRGB(0.018,0.020,0.026);mat.metalness=0.55;mat.roughness=0.42;mat.envMapIntensity=0.12;}
          if(mat.name.includes("Trackpad")){mat.color.setRGB(0.021,0.023,0.028);mat.roughness=0.35;}
        }
      });
      spin.add(gltf.scene);
      viewport.dataset.renderState="ready";showcase.dataset.mode="interactive";poster.hidden=true;requestRender();
    },undefined,()=>fallback());
    canvas.addEventListener("pointerdown",e=>{
      if(e.pointerType==="mouse"&&e.button!==0)return;
      pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add("is-dragging");
    });
    canvas.addEventListener("pointermove",e=>{
      if(!pointer||pointer.id!==e.pointerId)return;
      yaw -= (e.clientX-pointer.x)*0.006;
      pitch=THREE.MathUtils.clamp(pitch+(e.clientY-pointer.y)*0.002,-0.28,0.28);
      pointer.x=e.clientX;pointer.y=e.clientY;requestRender();
    });
    const release=e=>{if(!pointer||pointer.id!==e.pointerId)return;pointer=null;canvas.classList.remove("is-dragging");if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
    canvas.addEventListener("pointerup",release);canvas.addEventListener("pointercancel",release);canvas.addEventListener("lostpointercapture",()=>{pointer=null;canvas.classList.remove("is-dragging");});
    canvas.addEventListener("keydown",e=>{
      if(e.key==="ArrowLeft")yaw+=0.12;
      else if(e.key==="ArrowRight")yaw-=0.12;
      else if(e.key==="ArrowUp")pitch-=0.06;
      else if(e.key==="ArrowDown")pitch+=0.06;
      else return;
      e.preventDefault();pitch=THREE.MathUtils.clamp(pitch,-0.28,0.28);requestRender();
    });
    const resize=new ResizeObserver(()=>{
      const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;
      camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);requestRender();
    });resize.observe(viewport);
    reduced.addEventListener("change",e=>{if(e.matches){cancelAnimationFrame(frame);resize.disconnect();fallback();}},{once:true});
    window.addEventListener("pagehide",()=>{cancelAnimationFrame(frame);resize.disconnect();renderer.dispose();},{once:true});
  } catch {fallback();}
}
