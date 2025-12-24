import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

type Testimonial = {
  name: string;
  role: string;
  avatar: string;
  text: string;
  rating: number;
};

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './info.html',
  styleUrl: './info.scss'
})
export class Info {
  private fb = inject(FormBuilder);

  readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    company: [''],
    reason: ['General', Validators.required],
    message: ['', [Validators.required, Validators.minLength(10)]],
    consent: [true, Validators.requiredTrue]
  });

  submitting = false;
  submitted = false;
  errorMsg = '';

  testimonials: Testimonial[] = [
    {
      name: 'Marcus Chen',
      role: 'Collector',
      avatar: 'MC',
      text: 'The team replied fast and helped us onboard in days. The platform feels premium and reliable.',
      rating: 5
    },
    {
      name: 'Sarah Mitchell',
      role: 'Dealer',
      avatar: 'SM',
      text: 'Support actually understands auctions. Clear answers, quick fixes, and proactive recommendations.',
      rating: 5
    },
    {
      name: 'David Park',
      role: 'Enthusiast',
      avatar: 'DP',
      text: 'Super smooth experience. The onboarding call made everything click immediately.',
      rating: 5
    }
  ];

  async submit() {
    this.errorMsg = '';
    this.submitted = true;
    if (this.form.invalid) return;

    this.submitting = true;
    try {
      await new Promise(r => setTimeout(r, 900));
      this.form.reset({ reason: 'General', consent: true });

      // keep your existing behavior
      alert('Thanks! Our team will get back to you shortly.');
    } catch (e) {
      this.errorMsg = 'Something went wrong. Please try again.';
    } finally {
      this.submitting = false;
    }
  }
}
