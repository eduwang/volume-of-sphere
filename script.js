import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';



// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setClearColor(0xffffff); // 하얀색 배경 설정
document.body.appendChild(renderer.domElement);

// Add OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 부드러운 움직임을 위해 감속 추가
controls.dampingFactor = 0.05;


// Cannon.js world
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

// Materials
const material = new CANNON.Material();
const contactMaterial = new CANNON.ContactMaterial(material, material, { restitution: 0.7 });
world.addContactMaterial(contactMaterial);

// Create a sphere geometry
const sphereRadius = 5;
const sphereGeo = new THREE.SphereGeometry(sphereRadius, 32, 32);
const sphereMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.5
});
const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
scene.add(sphereMesh);

const sphereBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(sphereRadius),
    position: new CANNON.Vec3(0, sphereRadius, 0),
    material: material
});
world.addBody(sphereBody);

// Create a plane geometry
const planeSize = 20;
const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
const planeMat = new THREE.MeshBasicMaterial({ color: 0x666666, side: THREE.DoubleSide });
const planeMesh = new THREE.Mesh(planeGeo, planeMat);
planeMesh.rotation.x = Math.PI / 2; // Rotate the plane to be horizontal
planeMesh.position.y = -sphereRadius;
scene.add(planeMesh);

const planeBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    position: new CANNON.Vec3(0, 0, 0),
    material: material
});
planeBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(planeBody);
// Add ball to sphere button
const addBallToSphereButton = document.getElementById('addBallToSphere');

function addBallToSphere() {
    const ballRadius = 0.5;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    const initialPosition = new THREE.Vector3(
        (Math.random() - 0.5) * 2 * (sphereRadius - ballRadius),
        sphereRadius * 0.5,
        (Math.random() - 0.5) * 2 * (sphereRadius - ballRadius)
    );
    ballMesh.position.copy(initialPosition);
    scene.add(ballMesh);

    const ballBody = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Sphere(ballRadius),
        position: new CANNON.Vec3(initialPosition.x, initialPosition.y, initialPosition.z),
        material: material
    });
    world.addBody(ballBody);

    function update() {
        // Check if the ball is outside the sphere
        if (ballBody.position.distanceTo(sphereBody.position) > sphereRadius - ballRadius) {
            // Reset the position of the ball to the initial position
            ballBody.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
            ballBody.velocity.set(0, 0, 0); // Reset velocity
        }
        ballMesh.position.copy(ballBody.position);
        ballMesh.quaternion.copy(ballBody.quaternion);
    }

    return update;
}

const ballUpdaters = [];

addBallToSphereButton.addEventListener('click', () => {
    ballUpdaters.push(addBallToSphere());
});

// Position the camera
camera.position.z = 20;

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update the physics world
    world.step(1 / 60);

    // Update the positions of the meshes
    ballUpdaters.forEach(update => update());

    // Update OrbitControls
    controls.update();

    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});