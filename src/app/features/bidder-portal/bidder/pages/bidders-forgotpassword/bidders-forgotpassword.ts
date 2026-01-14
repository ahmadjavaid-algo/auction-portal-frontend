import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BidderAuthService } from '../../../../../services/bidderauth';
import { loginAnimations } from '../bidders-login/login-animations';
import * as THREE from 'three';

@Component({
  selector: 'app-bidders-forgotpassword',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bidders-forgotpassword.html',
  styleUrl: './bidders-forgotpassword.scss',
  animations: loginAnimations
})
export class BiddersForgotpassword implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: false })
  canvasContainer!: ElementRef<HTMLDivElement>;

  private auth = inject(BidderAuthService);
  private router = inject(Router);

  email = '';
  loading = false;
  sent = false;
  error: string | null = null;

  // ===== THREE.JS (same as login) =====
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private floatingShapes: THREE.Mesh[] = [];
  private particles!: THREE.Points;
  private neuralNodes: Array<{ x: number; y: number; z: number; vx: number; vy: number; vz: number }> = [];
  private neuralLines: THREE.Line[] = [];
  private animationId: number = 0;
  private mouse = { x: 0, y: 0 };
  private time = 0;

  // Keep stable refs so removeEventListener works correctly
  private boundMouseMove = (e: MouseEvent) => this.onMouseMove(e);
  private boundResize = () => this.onWindowResize();

  ngOnInit(): void {
    window.addEventListener('mousemove', this.boundMouseMove);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initThreeJS();
      this.animate();
    }, 100);
  }

  ngOnDestroy(): void {
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('resize', this.boundResize);

    if (this.animationId) cancelAnimationFrame(this.animationId);

    if (this.renderer) {
      this.renderer.dispose();
      // Optional cleanup to avoid canvas staying in DOM if you navigate back/forth
      const el = this.renderer.domElement;
      if (el?.parentElement) el.parentElement.removeChild(el);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private initThreeJS(): void {
    const container = this.canvasContainer.nativeElement;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0a0f, 5, 50);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 20);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x2f7bff, 3, 60);
    pointLight1.position.set(15, 15, 15);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff3366, 2, 50);
    pointLight2.position.set(-15, -10, 10);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x00ff88, 2, 50);
    pointLight3.position.set(0, -15, 15);
    this.scene.add(pointLight3);

    this.createFloatingGeometry();
    this.createParticleField();
    this.createNeuralNetwork();

    window.addEventListener('resize', this.boundResize);
  }

  private createFloatingGeometry(): void {
    const geometries = [
      { geo: new THREE.IcosahedronGeometry(1.2, 1), pos: [-6, 3, -8], color: 0x2f7bff },
      { geo: new THREE.OctahedronGeometry(1, 0), pos: [7, -2, -10], color: 0xff3366 },
      { geo: new THREE.TetrahedronGeometry(1.1, 0), pos: [-5, -4, -6], color: 0x00ff88 },
      { geo: new THREE.BoxGeometry(1.8, 1.8, 1.8), pos: [6, 4, -9], color: 0x7c5cff },
      { geo: new THREE.TorusGeometry(1, 0.35, 16, 32), pos: [-7, -1, -12], color: 0x2f7bff },
      { geo: new THREE.ConeGeometry(0.9, 1.8, 6), pos: [0, 5, -7], color: 0xffb020 }
    ];

    geometries.forEach((data, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        metalness: 0.85,
        roughness: 0.15,
        emissive: data.color,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.8,
        wireframe: false
      });

      const mesh = new THREE.Mesh(data.geo, material);
      mesh.position.set(data.pos[0], data.pos[1], data.pos[2]);
      mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);

      mesh.userData['rotationSpeed'] = {
        x: (Math.random() - 0.5) * 0.015,
        y: (Math.random() - 0.5) * 0.015,
        z: (Math.random() - 0.5) * 0.015
      };
      mesh.userData['floatOffset'] = Math.random() * Math.PI * 2;
      mesh.userData['floatSpeed'] = 0.3 + Math.random() * 0.4;
      mesh.userData['originalY'] = data.pos[1];

      this.floatingShapes.push(mesh);
      this.scene.add(mesh);

      const edges = new THREE.EdgesGeometry(data.geo);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: data.color,
        transparent: true,
        opacity: 0.3
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);
    });
  }

  private createParticleField(): void {
    const particleCount = 1500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorPalette = [
      new THREE.Color(0x2f7bff),
      new THREE.Color(0xff3366),
      new THREE.Color(0x00ff88),
      new THREE.Color(0x7c5cff),
      new THREE.Color(0xffffff)
    ];

    for (let i = 0; i < particleCount; i++) {
      const radius = 12 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi) - 5;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private createNeuralNetwork(): void {
    const nodeCount = 35;

    for (let i = 0; i < nodeCount; i++) {
      const radius = 15 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      this.neuralNodes.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi) - 5,
        vx: (Math.random() - 0.5) * 0.02,
        vy: (Math.random() - 0.5) * 0.02,
        vz: (Math.random() - 0.5) * 0.02
      });
    }

    const connections = Math.floor(nodeCount * 0.5);
    for (let i = 0; i < connections; i++) {
      const startNode = this.neuralNodes[Math.floor(Math.random() * nodeCount)];
      const endNode = this.neuralNodes[Math.floor(Math.random() * nodeCount)];

      const points = [new THREE.Vector3(startNode.x, startNode.y, startNode.z), new THREE.Vector3(endNode.x, endNode.y, endNode.z)];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x2f7bff,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending
      });

      const line = new THREE.Line(geometry, material);
      this.neuralLines.push(line);
      this.scene.add(line);
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.time += 0.008;

    this.floatingShapes.forEach((shape, index) => {
      const rotSpeed = shape.userData['rotationSpeed'];
      shape.rotation.x += rotSpeed.x;
      shape.rotation.y += rotSpeed.y;
      shape.rotation.z += rotSpeed.z;

      const floatOffset = shape.userData['floatOffset'];
      const floatSpeed = shape.userData['floatSpeed'];
      const originalY = shape.userData['originalY'];

      shape.position.y = originalY + Math.sin(this.time * floatSpeed + floatOffset) * 1.2;
      shape.position.x += Math.cos(this.time * 0.3 + index) * 0.008;

      const pulseScale = 1 + Math.sin(this.time * 2 + index * 0.5) * 0.04;
      shape.scale.set(pulseScale, pulseScale, pulseScale);

      const material = shape.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.3 + Math.sin(this.time * 3 + index) * 0.15;
    });

    if (this.particles) {
      this.particles.rotation.y += 0.0002;
      this.particles.rotation.x = Math.sin(this.time * 0.2) * 0.1;
    }

    this.neuralNodes.forEach((node) => {
      node.x += node.vx;
      node.y += node.vy;
      node.z += node.vz;

      const dist = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z);
      if (dist > 25 || dist < 10) {
        node.vx *= -1;
        node.vy *= -1;
        node.vz *= -1;
      }
    });

    this.neuralLines.forEach((line, index) => {
      const material = line.material as THREE.LineBasicMaterial;
      material.opacity = 0.05 + Math.abs(Math.sin(this.time * 2 + index * 0.3)) * 0.15;

      const positions = line.geometry.attributes['position'];
      if (positions) {
        const posArray = positions.array as Float32Array;
        const startNode = this.neuralNodes[index % this.neuralNodes.length];
        const endNode = this.neuralNodes[(index + 1) % this.neuralNodes.length];

        if (startNode && endNode) {
          posArray[0] = startNode.x;
          posArray[1] = startNode.y;
          posArray[2] = startNode.z;
          posArray[3] = endNode.x;
          posArray[4] = endNode.y;
          posArray[5] = endNode.z;
          positions.needsUpdate = true;
        }
      }
    });

    this.camera.position.x += (this.mouse.x * 2 - this.camera.position.x) * 0.03;
    this.camera.position.y += (-this.mouse.y * 2 - this.camera.position.y) * 0.03;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize(): void {
    if (!this.camera || !this.renderer) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  submit(): void {
    this.error = null;
    this.sent = false;

    const addr = this.email?.trim();
    if (!addr) {
      this.error = 'Please enter the email associated with your account.';
      return;
    }

    this.loading = true;
    this.auth.forgotPassword(addr).subscribe({
      next: () => {
        this.loading = false;
        this.sent = true;
      },
      error: () => {
        // same UX pattern: don’t reveal if email exists
        this.loading = false;
        this.sent = true;
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/bidder/login']);
  }
}
