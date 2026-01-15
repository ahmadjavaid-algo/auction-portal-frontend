import {
  Component,
  inject,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  NgZone,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../services/auth';
import * as THREE from 'three';

@Component({
  selector: 'app-users-forgotpassword',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './users-forgotpassword.html',
  styleUrl: './users-forgotpassword.scss'
})
export class UsersForgotpassword implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;

  private auth = inject(AuthService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  currentYear = new Date().getFullYear();

  email = '';
  loading = false;
  sent = false;
  error: string | null = null;

  // Three.js State
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private tubeMesh!: THREE.Mesh;
  private animationId: number | null = null;

  // Wormhole State
  private path!: THREE.CatmullRomCurve3;
  private progress = 0;
  private speed = 0.0006;

  submit(): void {
    this.error = null;

    const addr = this.email.trim();
    if (!addr) {
      this.error = 'Please enter the email associated with your account.';
      return;
    }

    this.loading = true;
    this.auth.forgotPassword(addr).subscribe({
      next: () => {
        this.sent = true;
        this.loading = false;
      },
      error: (err) => {
        // keep same privacy-friendly behavior (still show "sent")
        this.sent = true;
        this.loading = false;
        // optionally surface a message if you want:
        // this.error = err?.error?.message || null;
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/admin/login']);
  }

  ngAfterViewInit(): void {
    this.initThree();
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.renderer?.dispose();
    if (this.tubeMesh) {
      this.tubeMesh.geometry.dispose();
      (this.tubeMesh.material as THREE.Material).dispose();
    }
  }

  private initThree(): void {
    const container = this.canvasContainer.nativeElement;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene Setup - White "Architectural" Background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.fog = new THREE.Fog(0xffffff, 0.01, 15);

    this.camera = new THREE.PerspectiveCamera(80, width / height, 0.01, 1000);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // 3. Create the Infinite Loop Path
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(t) * 15 + Math.cos(t * 3) * 5,
          Math.sin(t) * 15 + Math.sin(t * 3) * 5,
          Math.sin(t * 5) * 4
        )
      );
    }
    this.path = new THREE.CatmullRomCurve3(points);
    this.path.closed = true;

    // 4. Create Tube
    const geometry = new THREE.TubeGeometry(this.path, 200, 3, 16, true);

    // 5. Material - Cyan Wireframe on White
    const material = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });

    this.tubeMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.tubeMesh);

    // 6. Floating "Data" Particles
    const starGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 60;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x000000,
      size: 0.05,
      opacity: 0.3,
      transparent: true
    });
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    this.progress += this.speed;
    if (this.progress > 1) this.progress = 0;

    const pos = this.path.getPointAt(this.progress);
    const lookAtPos = this.path.getPointAt((this.progress + 0.02) % 1);

    this.camera.position.copy(pos);
    this.camera.lookAt(lookAtPos);

    this.tubeMesh.rotation.z += 0.0005;

    this.renderer.render(this.scene, this.camera);
  }

  @HostListener('window:resize')
  onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
