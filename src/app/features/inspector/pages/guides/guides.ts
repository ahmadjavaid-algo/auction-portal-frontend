import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-guides',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './guides.html',
  styleUrl: './guides.scss'
})
export class Guides implements OnInit, AfterViewInit, OnDestroy {
  private elementRef = inject(ElementRef);

  private io?: IntersectionObserver;
  private observedEls = new WeakSet<Element>();

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit(): void {
    this.initScrollAnimations();
    this.observeAnimatedElements();
  }

  ngOnDestroy(): void {
    try {
      this.io?.disconnect();
    } catch {}
  }

  private initScrollAnimations(): void {
    this.io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            // Keep observing for potential scroll-out effects
            // Or unobserve if you want one-time animation
            try {
              this.io?.unobserve(entry.target);
            } catch {}
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -80px 0px'
      }
    );
  }

  private observeAnimatedElements(): void {
    if (!this.io) return;

    const root: HTMLElement = this.elementRef.nativeElement as HTMLElement;
    const elements = root.querySelectorAll('.animate-on-scroll');

    elements.forEach((el: Element) => {
      if (this.observedEls.has(el)) return;
      this.observedEls.add(el);
      try {
        this.io!.observe(el);
      } catch {}
    });
  }

  scrollTo(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}