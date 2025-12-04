import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-guides',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './guides.html',
  styleUrl: './guides.scss'
})
export class Guides {

  // Highlight current section in sidebar
  activeSection: string = 'intro';

  @HostListener('window:scroll', [])
  onScroll() {
    const sections = document.querySelectorAll('[data-section]');
    let current = 'intro';

    sections.forEach((sec: any) => {
      const top = sec.offsetTop - 120;
      if (window.scrollY >= top) {
        current = sec.getAttribute('data-section');
      }
    });

    this.activeSection = current;
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
