import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, world;
let hemisphereBody, secondHemisphereBody, tubeBodies = [], bottomPlaneBody, topPlaneBody;
let sphereBallCount = 0, cylinderBallCount = 0;
let ballRadius = 0.1;
let sphereBalls = []; // Array to track balls added to the sphere
let cylinderBalls = []; // Array to track balls added to the cylinder
let isShaking = false;


init();
animate();

function init() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // 부드러운 움직임을 위해 감속 추가
    controls.dampingFactor = 0.05;

    // Add light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5).normalize();
    scene.add(directionalLight);

    // Cannon.js world setup
    world = new CANNON.World();
    world.gravity.set(0, -20, 0); // Increase gravity to make objects fall faster
    world.broadphase = new CANNON.NaiveBroadphase(); // Simple broadphase for small scenes
    world.solver.iterations = 10; // Increase solver iterations for better stability

    // Create hemisphere shape
    const radius = 2;
    const segments = 32;
    const vertices = [];
    const faces = [];

    for (let i = 0; i <= segments; i++) {
        for (let j = 0; j <= segments / 2; j++) {
            const theta = (j / (segments / 2)) * Math.PI / 2;
            const phi = (i / segments) * Math.PI * 2;

            const x = radius * Math.sin(theta) * Math.cos(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi);
            const z = radius * Math.cos(theta);

            vertices.push(new CANNON.Vec3(x, y, z));
        }
    }

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments / 2; j++) {
            const a = i * (segments / 2 + 1) + j;
            const b = (i + 1) * (segments / 2 + 1) + j;
            const c = (i + 1) * (segments / 2 + 1) + (j + 1);
            const d = i * (segments / 2 + 1) + (j + 1);

            faces.push([a, b, d]);
            faces.push([b, c, d]);
        }
    }

    // First hemisphere
    hemisphereBody = new CANNON.Body({ mass: 0 });
    const shape = new CANNON.ConvexPolyhedron({ vertices, faces });
    hemisphereBody.addShape(shape);
    hemisphereBody.position.set(0, 0, 0); // Ensure hemisphere is centered
    hemisphereBody.quaternion.setFromEuler(Math.PI / 2, 0, 0); // Rotate the hemisphere to face downwards
    world.addBody(hemisphereBody);

    // Visualize first hemisphere
    visualizeCannonShape(hemisphereBody, 0x00ff00);

    // Second hemisphere (duplicate)
    secondHemisphereBody = new CANNON.Body({ mass: 0 });
    secondHemisphereBody.addShape(shape);
    secondHemisphereBody.position.set(0, 0, 0); // Same position
    secondHemisphereBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Opposite rotation
    world.addBody(secondHemisphereBody);

    // Visualize second hemisphere
    visualizeCannonShape(secondHemisphereBody, 0x00ff00); // Different color for distinction

    // Create and stack three tubes
    const tubeRadius = radius;
    const tubeHeight = tubeRadius* 2 / 3;
    const tubeSegments = 32;

    const tubeColors = [0x91bbff, 0x748ce3, 0xd694ff]; 
    for (let i = 0; i < 3; i++) {
        createAndVisualizeTube(tubeRadius, tubeHeight, tubeSegments, i, tubeColors[i]);
    }

    // Create bottom plane for the lowest tube
    createAndVisualizeBottomPlane(tubeRadius * 2.5);

    // Create top plane for the highest tube
    createAndVisualizeTopPlane(tubeRadius * 2.5);
    
    // Button Event Listeners
    document.getElementById('addBallToSphere').addEventListener('click', addBallToSphere);
    document.getElementById('addBallToCylinder').addEventListener('click', addBallToCylinder);
    document.getElementById('listObjects').addEventListener('click', listObjectsInScene);
    document.getElementById('fillBoth').addEventListener('click', fillBoth);
    document.getElementById('removeAllBalls').addEventListener('click', removeAllBalls);
    document.getElementById('ballSizeBigger').addEventListener('click', ballSizeBigger);
    document.getElementById('ballSizeSmaller').addEventListener('click', ballSizeSmaller);
    document.getElementById('shakeScene').addEventListener('click', shakeScene); // Add button for shaking the scene
}

function createAndVisualizeTube(radius, height, segments, index, color) {
    const offset = height * index - height; // Adjust position based on index

    // Create tube shape using ConvexPolyhedron
    const tubeVertices = [];
    const tubeFaces = [];

    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = radius * Math.cos(theta);
        const z = radius * Math.sin(theta);

        tubeVertices.push(new CANNON.Vec3(x, -height / 2, z));
        tubeVertices.push(new CANNON.Vec3(x, height / 2, z));
    }

    for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        const bottom1 = i * 2;
        const bottom2 = next * 2;
        const top1 = i * 2 + 1;
        const top2 = next * 2 + 1;

        tubeFaces.push([bottom1, bottom2, top1]);
        tubeFaces.push([bottom2, top2, top1]);
    }

    const tubeBody = new CANNON.Body({ mass: 0 });
    const tubeShape = new CANNON.ConvexPolyhedron({ vertices: tubeVertices, faces: tubeFaces });
    tubeBody.addShape(tubeShape);
    tubeBody.position.set(radius * 2.5, offset, 0); // Position to the right of the hemispheres
    world.addBody(tubeBody);
    tubeBodies.push(tubeBody);

    // Visualize tube
    visualizeCannonShape(tubeBody, color);
}

function createAndVisualizeBottomPlane(size) {
    const halfExtents = new CANNON.Vec3(size / 2, 0.1, size / 2);
    const bottomPlaneShape = new CANNON.Box(halfExtents);
    bottomPlaneBody = new CANNON.Body({ mass: 0 });
    bottomPlaneBody.addShape(bottomPlaneShape);
    bottomPlaneBody.position.set(size, -2-0.1, 0); // Slightly below the bottom of the lowest tube
    world.addBody(bottomPlaneBody);

    // Visualize bottom plane
    const geometry = new THREE.BoxGeometry(size, 0.2, size);
    const material = new THREE.MeshPhongMaterial({ color: 0x91bbff});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(size, -2-0.1, 0);
    scene.add(mesh);
    bottomPlaneBody.mesh = mesh;
}
function createAndVisualizeTopPlane(size) {
    const halfExtents = new CANNON.Vec3(size / 2, 0.05, size / 2);
    const topPlaneShape = new CANNON.Box(halfExtents);
    topPlaneBody = new CANNON.Body({ mass: 0 });
    topPlaneBody.addShape(topPlaneShape);
    topPlaneBody.position.set(size, 2+0.1, 0); // Slightly below the bottom of the lowest tube
    world.addBody(topPlaneBody);

    // Visualize bottom plane
    // const geometry = new THREE.BoxGeometry(size, 0.2, size);
    // const material = new THREE.MeshPhongMaterial({ color: 0x91bbff});
    // const mesh = new THREE.Mesh(geometry, material);
    // mesh.position.set(size, -2-0.1, 0);
    // scene.add(mesh);
    // bottomPlaneBody.mesh = mesh;
}

function addBallToSphere() {
    // Create a ball (cannon.js)
    const ballShape = new CANNON.Sphere(ballRadius);
    const ballBody = new CANNON.Body({ mass: 1 });
    ballBody.addShape(ballShape);
    const xPosition = (Math.random() - 0.5) * 2; // Random value between -1 and 1
    const yPosition = (Math.random() - 0.5) * 0.3 + 0.8; // Random value between -1 and 1
    ballBody.position.set(xPosition, yPosition, 0); // Start above the hemisphere
    ballBody.collisionFilterGroup = 1;
    ballBody.collisionFilterMask = 1;
    ballBody.restitution = 0.7; // Bounce factor
    world.addBody(ballBody);
    sphereBalls.push(ballBody); // Track sphere balls

    // Generate random color
    const color = new THREE.Color(Math.random(), Math.random(), Math.random());

    // Visualize Cannon.js ball
    visualizeCannonShape(ballBody, color.getHex());

    sphereBallCount++;
    document.getElementById('sphereBallCount').innerText = sphereBallCount;
}

function addBallToCylinder() {
    // Create a ball (cannon.js)
    const ballShape = new CANNON.Sphere(ballRadius);
    const ballBody = new CANNON.Body({ mass: 1 });
    ballBody.addShape(ballShape);
    const xPosition = 5 + (Math.random() - 0.5) * 2; // Random value between -1 and 1
    const yPosition = (Math.random() - 0.5) * 0.3 + 0.8; // Random value between -1 and 1
    ballBody.position.set(xPosition, yPosition, 0); // Start above the cylinder
    ballBody.collisionFilterGroup = 1;
    ballBody.collisionFilterMask = 1;
    ballBody.restitution = 0.7; // Bounce factor
    world.addBody(ballBody);
    cylinderBalls.push(ballBody); // Track cylinder balls

    // Generate random color
    const color = new THREE.Color(Math.random(), Math.random(), Math.random());

    // Visualize Cannon.js ball
    visualizeCannonShape(ballBody, color.getHex());

    cylinderBallCount++;
    document.getElementById('cylinderBallCount').innerText = cylinderBallCount;
}
function fillBoth() {
    addBallToSphere();
    addBallToCylinder();
}
function removeAllBalls() {
    sphereBalls.forEach(ballBody => {
        world.removeBody(ballBody);
        scene.remove(ballBody.mesh);
    });
    cylinderBalls.forEach(ballBody => {
        world.removeBody(ballBody);
        scene.remove(ballBody.mesh);
    });
    sphereBalls = [];
    cylinderBalls = [];
    sphereBallCount = 0;
    cylinderBallCount = 0;
    document.getElementById('sphereBallCount').innerText = sphereBallCount;
    document.getElementById('cylinderBallCount').innerText = cylinderBallCount;
}

function ballSizeBigger() {
    removeAllBalls();
    ballRadius += 0.02;
    addBallToSphere();
    addBallToCylinder();
    if (ballRadius > 0.5) {
        alert("TOO BIG!!! 처음으로 돌아갑니다");
        ballRadius = 0.1;
        removeAllBalls();
    }
}

function ballSizeSmaller() {
    removeAllBalls();
    ballRadius -= 0.02;
    addBallToSphere();
    addBallToCylinder();
    if (ballRadius < 0.021) {
        alert("TOO SMALL!!! 처음으로 돌아갑니다");
        ballRadius = 0.1;
        removeAllBalls();
    }
}

function shakeScene() {
    if (isShaking) return; // Prevent multiple shakes at the same time

    isShaking = true;
    const duration = 500; // Duration of the shake in milliseconds
    const interval = 50; // Interval at which to apply forces
    const forceMagnitude = 30; // Magnitude of the force to apply

    let elapsedTime = 0;

    const shakeInterval = setInterval(() => {
        elapsedTime += interval;

        if (elapsedTime >= duration) {
            clearInterval(shakeInterval);
            isShaking = false;
            return;
        }

        // Apply a random force to each ball
        [...sphereBalls, ...cylinderBalls].forEach(ballBody => {
            const force = new CANNON.Vec3(
                (Math.random() - 0.5) * forceMagnitude,
                (Math.random() - 0.5) * forceMagnitude,
                (Math.random() - 0.5) * forceMagnitude
            );
            ballBody.applyForce(force, ballBody.position);
        });
    }, interval);
}

//시각화 세션
function visualizeCannonShape(body, color) {
    // Remove old visualization if any
    if (body.mesh) {
        scene.remove(body.mesh);
    }

    body.shapes.forEach(shape => {
        let mesh;
        if (shape instanceof CANNON.Sphere) {
            const geometry = new THREE.SphereGeometry(shape.radius, 32, 32);
            const material = new THREE.MeshPhongMaterial({ color });
            mesh = new THREE.Mesh(geometry, material);
        } else if (shape instanceof CANNON.ConvexPolyhedron) {
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const indices = [];
            shape.vertices.forEach(v => {
                vertices.push(v.x, v.y, v.z);
            });
            shape.faces.forEach(face => {
                const a = face[0];
                const b = face[1];
                const c = face[2];
                indices.push(a, b, c);
            });
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals(); // Ensure smooth shading
            const material = new THREE.MeshPhongMaterial({ color });
            mesh = new THREE.Mesh(geometry, material);
        }
        if (mesh) {
            mesh.position.copy(body.position);
            mesh.quaternion.copy(body.quaternion);
            body.mesh = mesh;
            scene.add(mesh);
        }
    });
}

function listObjectsInScene() {
    console.log("Objects in scene:");
    scene.children.forEach((child, index) => {
        console.log(`Object ${index}:`, child);
    });
}

function animate() {
    requestAnimationFrame(animate);
    world.step(1 / 360);
    sphereBalls.forEach((ballBody, index) => {
        if (ballBody.mesh) {
            ballBody.mesh.position.copy(ballBody.position);
            ballBody.mesh.quaternion.copy(ballBody.quaternion);
        }

        // Check if ball has fallen through the hemisphere
        if (ballBody.position.y < -10) {
            console.warn('Sphere ball has fallen through the hemisphere:', ballBody.position);

            // Remove the ball from the world and scene
            world.removeBody(ballBody);
            scene.remove(ballBody.mesh);
            sphereBalls.splice(index, 1);

            // Update ball count
            sphereBallCount--;
            document.getElementById('sphereBallCount').innerText = sphereBallCount;
        }
    });

    cylinderBalls.forEach((ballBody, index) => {
        if (ballBody.mesh) {
            ballBody.mesh.position.copy(ballBody.position);
            ballBody.mesh.quaternion.copy(ballBody.quaternion);
        }

        // Check if ball has fallen through the cylinder
        if (ballBody.position.y < -10) {
            console.warn('Cylinder ball has fallen through the cylinder:', ballBody.position);

            // Remove the ball from the world and scene
            world.removeBody(ballBody);
            scene.remove(ballBody.mesh);
            cylinderBalls.splice(index, 1);

            // Update ball count
            cylinderBallCount--;
            document.getElementById('cylinderBallCount').innerText = cylinderBallCount;
        }
    });

    if (hemisphereBody.mesh) {
        hemisphereBody.mesh.position.copy(hemisphereBody.position);
        hemisphereBody.mesh.quaternion.copy(hemisphereBody.quaternion);
    }
    if (secondHemisphereBody.mesh) {
        secondHemisphereBody.mesh.position.copy(secondHemisphereBody.position);
        secondHemisphereBody.mesh.quaternion.copy(secondHemisphereBody.quaternion);
    }
    tubeBodies.forEach(tubeBody => {
        if (tubeBody.mesh) {
            tubeBody.mesh.position.copy(tubeBody.position);
            tubeBody.mesh.quaternion.copy(tubeBody.quaternion);
        }
    });

    renderer.render(scene, camera);
}