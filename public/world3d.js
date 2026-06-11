// ========== THREE.JS 3D WORLD ==========
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@r128/build/three.module.js';

let scene, camera, renderer, world;

function initializeThreeJS() {
    const canvas = document.getElementById('world-canvas');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);
    scene.fog = new THREE.Fog(0x0a0e27, 300, 1000);

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 50, 100);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    canvas.innerHTML = '';
    canvas.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Neon lighting
    const neonLight1 = new THREE.PointLight(0x00ffff, 1, 200);
    neonLight1.position.set(-100, 50, -100);
    scene.add(neonLight1);

    const neonLight2 = new THREE.PointLight(0xff00ff, 1, 200);
    neonLight2.position.set(100, 50, 100);
    scene.add(neonLight2);

    // Create world
    createWorld();

    // Handle window resize
    window.addEventListener('resize', () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });

    // Animation loop
    animate();
}

function createWorld() {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1f2e,
        metalness: 0.3,
        roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid overlay
    const gridHelper = new THREE.GridHelper(400, 40, 0x00ffff, 0x1a1f2e);
    gridHelper.position.y = 0.1;
    scene.add(gridHelper);

    // Spawn buildings
    createBuildings();

    // Create player meshes for visualization
    world = {
        players: new Map(),
        npcs: new Map()
    };
}

function createBuildings() {
    const buildingLocations = [
        { x: -150, z: -150, color: 0x00ffff },
        { x: 150, z: -150, color: 0xff00ff },
        { x: -150, z: 150, color: 0x00ff00 },
        { x: 150, z: 150, color: 0xffff00 }
    ];

    buildingLocations.forEach(loc => {
        const geometry = new THREE.BoxGeometry(50, 80, 50);
        const material = new THREE.MeshStandardMaterial({
            color: loc.color,
            metalness: 0.7,
            roughness: 0.2,
            emissive: loc.color,
            emissiveIntensity: 0.3
        });
        const building = new THREE.Mesh(geometry, material);
        building.position.set(loc.x, 40, loc.z);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);

        // Add floating particles around building
        createParticles(building.position);
    });
}

function createParticles(position) {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = [];

    for (let i = 0; i < particleCount; i++) {
        positions.push(
            (Math.random() - 0.5) * 100 + position.x,
            Math.random() * 100 + position.y,
            (Math.random() - 0.5) * 100 + position.z
        );
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const material = new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 2,
        sizeAttenuation: true
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function createPlayerMesh(playerId, color) {
    // Player body
    const geometry = new THREE.CapsuleGeometry(5, 15, 4, 8);
    const material = new THREE.MeshStandardMaterial({
        color: parseInt(color.replace('#', '0x')),
        metalness: 0.5,
        roughness: 0.4,
        emissive: parseInt(color.replace('#', '0x')),
        emissiveIntensity: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    return mesh;
}

function updatePlayerPosition(playerId, position, color) {
    if (!world.players.has(playerId)) {
        const mesh = createPlayerMesh(playerId, color);
        world.players.set(playerId, { mesh, position });
    }

    const player = world.players.get(playerId);
    player.position = position;
    player.mesh.position.set(position.x, 10, position.z);
}

function animate() {
    requestAnimationFrame(animate);

    // Update camera to follow player
    if (playerData) {
        const targetX = playerData.position.x - Math.sin(playerData.rotation) * 80;
        const targetZ = playerData.position.z - Math.cos(playerData.rotation) * 80;
        camera.position.lerp(new THREE.Vector3(targetX, 60, targetZ), 0.05);
        camera.lookAt(playerData.position.x, 10, playerData.position.z);
    }

    renderer.render(scene, camera);
}

// Export for use in app.js
window.initializeThreeJS = initializeThreeJS;
window.updatePlayerPosition = updatePlayerPosition;
