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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../services/auth';
import * as THREE from 'three';

@Component({
  selector: 'app-users-resetpassword',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './users-resetpassword.html',
  styleUrl: './users-resetpassword.scss'
})
export class UsersResetpassword implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;

  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private ngZone = inject(NgZone);

  // Reset State (kept same structure style as login)
  email = '';
  password = '';
  confirmPassword = '';
  code = '';

  loading = false;
  error: string | null = null;
  success = false;
  currentYear = new Date().getFullYear();

  // Three.js State
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private tubeMesh!: THREE.Mesh;
  private animationId: number | null = null;

  // Wormhole State
  private path!: THREE.CatmullRomCurve3;
  private progress = 0;
  private speed = 0.0006; // Adjust for "speed" feel

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;

    const email = q.get('email') ?? '';
    const codeRaw = q.get('code') ?? '';
    const code = decodeURIComponent(codeRaw);

    if (!email || !code) {
      this.error = 'Invalid or missing reset link.';
      return;
    }

    this.email = email;
    this.code = code;
  }

  async resetPassword(): Promise<void> {
    this.error = null;

    if (!this.email || !this.code) {
      this.error = 'Invalid or missing reset link.';
      return;
    }

    if (!this.password || !this.confirmPassword) {
      this.error = 'Credentials required.';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'Must be at least 6 characters.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.loading = true;

    this.auth.resetPassword(this.email, this.password, this.code).subscribe({
      next: (ok) => {
        this.loading = false;
        if (ok) {
          this.success = true;
          setTimeout(() => this.router.navigate(['/admin/login']), 1500);
        } else {
          this.error = 'Reset failed. Your link may be expired or already used.';
        }
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.message || 'Reset failed. Please try again.';
      }
    });
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
    this.scene.fog = new THREE.Fog(0xffffff, 0.01, 15); // Hides the distant curve

    this.camera = new THREE.PerspectiveCamera(80, width / height, 0.01, 1000);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // 3. Create the Infinite Loop Path
    const points: THREE.Vector3[] = [];
    // Create a complex knot-like loop
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
      color: 0x00aaff, // Electric Cyan
      wireframe: true,
      transparent: true,
      opacity: 0.2, // Keep it subtle so text is readable
      side: THREE.BackSide
    });

    this.tubeMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.tubeMesh);

    // 6. Floating "Data" Particles (Optional)
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

    // Move along the curve
    this.progress += this.speed;
    if (this.progress > 1) this.progress = 0;

    const pos = this.path.getPointAt(this.progress);
    const lookAtPos = this.path.getPointAt((this.progress + 0.02) % 1); // Look slightly ahead

    this.camera.position.copy(pos);
    this.camera.lookAt(lookAtPos);

    // Rotate tube for disorientation effect
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
