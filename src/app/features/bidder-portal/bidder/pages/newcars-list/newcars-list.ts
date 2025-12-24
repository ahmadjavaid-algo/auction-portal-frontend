import { AfterViewInit, Component, ElementRef, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-newcars-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './newcars-list.html',
  styleUrl: './newcars-list.scss'
})
export class NewcarsList implements AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private el = inject(ElementRef<HTMLElement>);

  private io?: IntersectionObserver;

  submitting = false;
  sent = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    name: [''],
    region: ['PK'],
    intent: ['Notify me'],
    notes: [''],
    consent: [false, [Validators.requiredTrue]]
  });

  get f() {
    return this.form.controls;
  }

  ngAfterViewInit(): void {
    const host = this.el.nativeElement as HTMLElement;
    const nodes = Array.from(host.querySelectorAll('.reveal')) as Element[];

    // Smooth anchor scrolling (dashboard-like “glide”)
    // (Only affects this component’s scroll interactions)
    const anchors = Array.from(host.querySelectorAll('a[data-scroll]')) as HTMLAnchorElement[];
    anchors.forEach(a => {
      a.addEventListener('click', (ev) => {
        const id = a.getAttribute('href')?.replace('#', '');
        if (!id) return;
        const target = host.querySelector('#' + CSS.escape(id)) as HTMLElement | null;
        if (!target) return;
        ev.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    if (!nodes.length) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      nodes.forEach(n => (n as HTMLElement).classList.add('in'));
      return;
    }

    this.io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) (e.target as HTMLElement).classList.add('in');
        }
      },
      { root: null, threshold: 0.14, rootMargin: '0px 0px -14% 0px' }
    );

    nodes.forEach((n: Element) => this.io?.observe(n));
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
  }

  submit(): void {
    if (this.submitting) return;

    this.sent = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;

    setTimeout(() => {
      this.submitting = false;
      this.sent = true;

      const keepRegion = this.form.value.region ?? 'PK';
      this.form.reset({
        email: '',
        name: '',
        region: keepRegion,
        intent: 'Notify me',
        notes: '',
        consent: false
      });
    }, 900);
  }
}
