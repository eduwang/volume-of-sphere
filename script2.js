import * as THREE from 'three';
import * as CANNON from 'cannon';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


// 기본적인 Three.js 설정
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 구체의 지오메트리 생성
const geometry = new THREE.IcosahedronGeometry(5, 10); // 세부 수준을 높이려면 두 번째 인수를 증가시킵니다.
const material = new THREE.MeshBasicMaterial({ color: 0x0077ff, wireframe: true });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

camera.position.z = 10;

function animate() {
    requestAnimationFrame(animate);
    sphere.rotation.x += 0.001;
    sphere.rotation.y += 0.001;
    renderer.render(scene, camera);
}



animate();