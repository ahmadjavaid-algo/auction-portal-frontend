import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-need-access',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  templateUrl: './need-access.html',
  styleUrl: './need-access.scss'
})
export class NeedAccess implements OnInit, OnDestroy {
  constructor(private router: Router) {}

  // Savage roast messages that rotate
  roastMessages = [
    "Did you really just click that? 💀",
    "The AUDACITY! 😤",
    "Bro thought he was slick 🤡",
    "Nice try, kiddo 👶",
    "Admin? You can't even admin your own life 💅",
    "ERROR 403: Permission Denied (and Embarrassment Granted) 🚫",
    "Imagine thinking you're admin material 🤣",
    "L + Ratio + No Admin For You 📉"
  ];

  currentRoast = '';
  roastIndex = 0;
  private roastInterval?: any;

  // Laugh track
  laughCount = 0;
  private laughInterval?: any;

  // Rejection counter
  rejectionCount = 0;

  // Meme reactions
  reactions = ['💀', '😂', '🤡', '🚫', '❌', '🙅', '👎', '🤦', '💩', '🗑️'];
  activeReactions: Array<{emoji: string, x: number, y: number, id: number}> = [];
  reactionId = 0;

  ngOnInit(): void {
    this.startRoasting();
    this.startLaughing();
    this.currentRoast = this.getRandomRoast();
    
    // Load rejection count from localStorage (for extra humiliation)
    const saved = localStorage.getItem('adminRejectionCount');
    this.rejectionCount = saved ? parseInt(saved) : 0;
    this.incrementRejection();
  }

  ngOnDestroy(): void {
    if (this.roastInterval) clearInterval(this.roastInterval);
    if (this.laughInterval) clearInterval(this.laughInterval);
  }

  private startRoasting(): void {
    this.roastInterval = setInterval(() => {
      this.currentRoast = this.getRandomRoast();
    }, 3000);
  }

  private startLaughing(): void {
    this.laughInterval = setInterval(() => {
      this.laughCount++;
    }, 500);
  }

  private getRandomRoast(): string {
    return this.roastMessages[Math.floor(Math.random() * this.roastMessages.length)];
  }

  public incrementRejection(): void {
    this.rejectionCount++;
    localStorage.setItem('adminRejectionCount', this.rejectionCount.toString());
  }

  spawnReaction(event: MouseEvent): void {
    const emoji = this.reactions[Math.floor(Math.random() * this.reactions.length)];
    const reaction = {
      emoji,
      x: event.clientX,
      y: event.clientY,
      id: this.reactionId++
    };
    
    this.activeReactions.push(reaction);
    
    // Remove after animation
    setTimeout(() => {
      this.activeReactions = this.activeReactions.filter(r => r.id !== reaction.id);
    }, 2000);
  }

  getBackToWork(): void {
    this.router.navigate(['/admin/login']);
  }

  trackByReaction(index: number, reaction: any): number {
    return reaction.id;
  }
}