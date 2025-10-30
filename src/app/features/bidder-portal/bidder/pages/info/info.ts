import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  async submit() {
    this.errorMsg = '';
    this.submitted = true;
    if (this.form.invalid) return;

    this.submitting = true;
    try {
      // TODO: replace with real API call
      await new Promise(r => setTimeout(r, 900));
      this.form.reset({ reason: 'General', consent: true });
      // show thank-you state
      alert('Thanks! Our team will get back to you shortly.');
    } catch (e) {
      this.errorMsg = 'Something went wrong. Please try again.';
    } finally {
      this.submitting = false;
    }
  }
}
