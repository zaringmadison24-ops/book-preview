(() => {
  const api = { ready:false, books:[], scene:null, camera:null, renderer:null };
  window.V5Immersive = api;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const host = document.getElementById('v5Immersive');
  const hero = document.querySelector('.hero');
  const fallback = document.getElementById('v5WebglFallback');
  if (!host || !hero || reduced || !window.THREE) {
    if (fallback) fallback.classList.add('show');
    return;
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
  } catch (err) {
    if (fallback) fallback.classList.add('show');
    return;
  }
  api.renderer = renderer;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  api.scene = scene;
  scene.fog = new THREE.FogExp2(0x07100e, 0.045);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 60);
  api.camera = camera;
  camera.position.set(0, 0.35, 12.4);
  const baseTarget = new THREE.Vector3(0, 0.1, 0);
  const lookTarget = baseTarget.clone();
  const ambient = new THREE.HemisphereLight(0xe8d8b9, 0x11241d, 1.05);
  scene.add(ambient);
  const key = new THREE.SpotLight(0xffd58c, 28, 26, Math.PI / 5.5, 0.72, 1.5);
  key.position.set(0, 6.8, 5.2);
  key.target.position.set(0, 0, -1.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key, key.target);
  const fill = new THREE.PointLight(0x6fa995, 6.5, 18, 2);
  fill.position.set(-5.2, 1.4, 3.2);
  scene.add(fill);
  const rim = new THREE.PointLight(0xb9824a, 5.5, 16, 2);
  rim.position.set(5.4, 2.5, 0);
  scene.add(rim);
  const root = new THREE.Group();
  root.position.y = -0.15;
  scene.add(root);
  const matWood = new THREE.MeshStandardMaterial({ color:0x4a2d1b, roughness:.58, metalness:.08 });
  const matWoodHi = new THREE.MeshStandardMaterial({ color:0x6d4426, roughness:.5, metalness:.1 });
  const matBrass = new THREE.MeshStandardMaterial({ color:0xb99055, roughness:.26, metalness:.78 });
  const matDark = new THREE.MeshStandardMaterial({ color:0x102019, roughness:.84, metalness:.04 });
  const matFloor = new THREE.MeshStandardMaterial({ color:0x201810, roughness:.72, metalness:.05 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, .22, 13), matFloor);
  floor.position.set(0, -3.22, -1.8);
  floor.receiveShadow = true;
  root.add(floor);
  const back = new THREE.Mesh(new THREE.BoxGeometry(17.5, 8.6, .28), matDark);
  back.position.set(0, .45, -5.15);
  back.receiveShadow = true;
  root.add(back);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,13.2,12), matBrass);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 3.72, -4.74);
  root.add(rail);
  const bookGroup = new THREE.Group();
  root.add(bookGroup);
  const clickable = [];
  const shelfYs = [-2.55,-1.25,.05,1.35,2.65];
  const bayXs = [-5.6,-2.8,0,2.8,5.6];
  function addBox(w,h,d,x,y,z,mat,cast=true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
    m.position.set(x,y,z);
    m.castShadow = cast;
    m.receiveShadow = true;
    root.add(m);
    return m;
  }
  for (const x of bayXs) {
    addBox(2.55,.16,.72,x,-2.98,-4.55,matWoodHi);
    addBox(.18,6.35,.78,x-1.2,.05,-4.55,matWood);
    addBox(.18,6.35,.78,x+1.2,.05,-4.55,matWood);
    for (const y of shelfYs) addBox(2.55,.12,.82,x,y,-4.55,matWoodHi);
  }
  addBox(14.2,.2,.92,0,3.2,-4.55,matWood);
  addBox(14.6,.28,.98,0,-3.05,-4.55,matWood);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(4.2,.035,10,90,Math.PI),matBrass);
  arch.position.set(0,2.8,-4.68);
  arch.rotation.z = Math.PI;
  root.add(arch);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(9,9);
  let hovered = null;
  let active = null;
  let deep = false;
  let px = 0, py = 0;
  const hoverCard = document.getElementById('v5HoverCard');
  const enterBtn = document.getElementById('v5EnterRoom');
  function colorForBook(book, index) {
    const palette = [0x5b3424,0x7a4b2b,0x365344,0x8a6b3c,0x4a5c68,0x6a3f46,0x3a493e,0x755d42];
    const seed = String(book && book.title || index).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    return palette[Math.abs(seed) % palette.length];
  }
  function clearBooks() {
    for (const mesh of clickable) {
      bookGroup.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material && mesh.material.dispose) mesh.material.dispose();
    }
    clickable.length = 0;
  }
  function buildBooks(list) {
    clearBooks();
    const source = (list || []).filter(Boolean).slice(0, 95);
    let k = 0;
    for (let s = 0; s < shelfYs.length; s++) {
      for (let b = 0; b < bayXs.length; b++) {
        const count = 3 + ((s + b) % 2);
        for (let j = 0; j < count && k < source.length; j++, k++) {
          const book = source[k];
          const w = .28 + ((k * 17) % 9) * .012;
          const h = .76 + ((k * 13) % 12) * .025;
          const material = new THREE.MeshStandardMaterial({
            color:colorForBook(book,k), roughness:.5, metalness:.04
          });
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,.54),material);
          mesh.position.set(bayXs[b] - .9 + j * .53, shelfYs[s] + .08 + h/2, -4.18);
          mesh.rotation.z = (j === count-1 && (b+s)%3===0) ? -.08 : 0;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.book = book;
          mesh.userData.home = mesh.position.clone();
          mesh.userData.homeRot = mesh.rotation.clone();
          mesh.userData.index = k;
          bookGroup.add(mesh);
          clickable.push(mesh);
        }
      }
    }
    api.books = source;
  }
  function resize() {
    const r = hero.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  function toNdc(e) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX-r.left)/r.width)*2-1;
    mouse.y = -((e.clientY-r.top)/r.height)*2+1;
    px = e.clientX-r.left; py = e.clientY-r.top;
  }
  function setHover(mesh) {
    if (hovered === mesh) return;
    if (hovered && hovered !== active) hovered.scale.setScalar(1);
    hovered = mesh;
    if (hovered && hovered !== active) hovered.scale.setScalar(1.08);
    renderer.domElement.style.cursor = hovered ? 'pointer' : 'default';
    if (!hoverCard) return;
    if (!hovered) { hoverCard.classList.remove('show'); return; }
    const b = hovered.userData.book || {};
    hoverCard.querySelector('b').textContent = b.title || '未命名';
    hoverCard.querySelector('span').textContent = [b.author,b.category].filter(Boolean).join(' · ') || '点击抽出这本书';
    hoverCard.style.left = Math.min(px, hero.clientWidth - 300) + 'px';
    hoverCard.style.top = Math.min(py, hero.clientHeight - 90) + 'px';
    hoverCard.classList.add('show');
  }
  function pick(e) {
    toNdc(e);
    raycaster.setFromCamera(mouse,camera);
    const hit = raycaster.intersectObjects(clickable,false)[0];
    setHover(hit ? hit.object : null);
  }
  function returnActive() {
    if (!active) return;
    active.userData.pull = false;
    active = null;
  }
  function openBook(mesh) {
    if (!mesh || !mesh.userData.book) return;
    if (active && active !== mesh) active.userData.pull = false;
    active = mesh;
    active.userData.pull = true;
    if (hoverCard) hoverCard.classList.remove('show');
    const book = active.userData.book;
    const label = 'SPACE · ' + String(active.userData.index+1).padStart(2,'0');
    setTimeout(() => {
      if (typeof window.openModal === 'function') window.openModal(book, label);
      returnActive();
    }, 420);
  }
  renderer.domElement.addEventListener('pointermove',pick,{passive:true});
  renderer.domElement.addEventListener('pointerleave',()=>setHover(null),{passive:true});
  renderer.domElement.addEventListener('click',(e)=>{ pick(e); if (hovered) openBook(hovered); });
  if (enterBtn) enterBtn.addEventListener('click',()=>{
    deep = !deep;
    document.body.classList.toggle('v5-deep',deep);
    enterBtn.classList.toggle('active',deep);
    enterBtn.textContent = deep ? '退出沉浸' : '进入书房';
  });
  document.addEventListener('pointermove',(e)=>{
    const r = hero.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    lookTarget.x = ((e.clientX-r.left)/r.width-.5)*.72;
    lookTarget.y = -((e.clientY-r.top)/r.height-.5)*.34 + .08;
  },{passive:true});
  document.addEventListener('pointerleave',()=>lookTarget.copy(new THREE.Vector3(0,.1,0)),{passive:true});
  const unit = new THREE.Vector3(1,1,1);
  function tick(t) {
    const targetZ = deep ? 8.35 : 12.4;
    camera.position.z += (targetZ-camera.position.z)*.045;
    camera.position.x += ((deep ? lookTarget.x*.34 : lookTarget.x*.16)-camera.position.x)*.035;
    camera.position.y += ((deep ? .25+lookTarget.y*.18 : .35+lookTarget.y*.1)-camera.position.y)*.035;
    baseTarget.lerp(lookTarget,.035);
    camera.lookAt(baseTarget.x,baseTarget.y,-3.6);
    root.rotation.y = Math.sin(t*.00018)*.006;
    for (const m of clickable) {
      if (m.userData.pull) {
        m.position.x += (0-m.position.x)*.11;
        m.position.y += (.25-m.position.y)*.11;
        m.position.z += (1.7-m.position.z)*.11;
        m.rotation.y += (.1-m.rotation.y)*.1;
        m.scale.lerp(new THREE.Vector3(1.38,1.38,1.38),.1);
      } else {
        m.position.lerp(m.userData.home,.085);
        m.rotation.x += (m.userData.homeRot.x-m.rotation.x)*.08;
        m.rotation.y += (m.userData.homeRot.y-m.rotation.y)*.08;
        m.rotation.z += (m.userData.homeRot.z-m.rotation.z)*.08;
        const s = m===hovered ? 1.08 : 1;
        unit.set(s,s,s);
        m.scale.lerp(unit,.12);
      }
    }
    renderer.render(scene,camera);
    requestAnimationFrame(tick);
  }
  api.setBooks = buildBooks;
  api.focusBook = (book) => {
    const mesh = clickable.find(m => m.userData.book && m.userData.book.path === book.path);
    if (mesh) openBook(mesh);
  };
  api.ready = true;
  resize();
  addEventListener('resize',resize,{passive:true});
  requestAnimationFrame(tick);
})();
