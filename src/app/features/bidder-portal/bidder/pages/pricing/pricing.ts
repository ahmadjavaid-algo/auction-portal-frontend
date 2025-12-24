import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type Billing = 'monthly' | 'yearly';

type Plan = {
  id: 'free' | 'pro' | 'business';
  name: string;
  tagline: string;
  popular?: boolean;
  monthly: number;
  yearly: number;
  cta: string;
  features: string[];
  limits: {
    auctionsPerMonth: string;
    teamSeats: string;
    api: 'None' | 'Basic' | 'Full';
    sla: 'Community' | 'Business' | 'Enterprise';
  };
};

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing.html',
  styleUrls: ['./pricing.scss']
})
export class Pricing {
  billing: Billing = 'yearly';

  plans: Plan[] = [
    {
      id: 'free',
      name: 'Starter',
      tagline: 'Get going with core bidding.',
      monthly: 0,
      yearly: 0,
      cta: 'Start for free',
      features: [
        'Public auctions browsing',
        '1 live auction at a time',
        'Basic insights',
        'Email support'
      ],
      limits: {
        auctionsPerMonth: 'Up to 10',
        teamSeats: '1',
        api: 'None',
        sla: 'Community'
      }
    },
    {
      id: 'pro',
      name: 'Pro',
      tagline: 'Everything you need to run auctions at scale.',
      popular: true,
      monthly: 49,
      yearly: 39,
      cta: 'Upgrade to Pro',
      features: [
        'Unlimited auctions',
        'Advanced insights & CSV export',
        'Team roles & permissions',
        'Priority email support'
      ],
      limits: {
        auctionsPerMonth: 'Unlimited',
        teamSeats: 'Up to 5',
        api: 'Basic',
        sla: 'Business'
      }
    },
    {
      id: 'business',
      name: 'Business',
      tagline: 'For high-volume teams and enterprises.',
      monthly: 199,
      yearly: 159,
      cta: 'Contact sales',
      features: [
        'Unlimited auctions & lots',
        'API & webhooks',
        'SSO (SAML/OIDC)',
        'SLA with 99.9% uptime'
      ],
      limits: {
        auctionsPerMonth: 'Unlimited',
        teamSeats: 'Unlimited',
        api: 'Full',
        sla: 'Enterprise'
      }
    }
  ];

  switchTo(b: Billing) {
    this.billing = b;
  }

  priceValue(p: Plan): number {
    return this.billing === 'monthly' ? p.monthly : p.yearly;
  }

  priceLabel(p: Plan): string {
    const amt = this.priceValue(p);
    return amt === 0 ? '$0' : `$${amt}`;
  }

  priceSuffix(p: Plan): string {
    const amt = this.priceValue(p);
    if (amt === 0) return 'Free forever';
    return this.billing === 'yearly' ? '/month (billed yearly)' : '/month';
  }

  saveBadge(p: Plan): string | null {
    if (p.monthly === 0 || p.yearly === 0) return null;
    const monthlyAnnualized = p.monthly * 12;
    const yearlyAnnualized = p.yearly * 12;
    const saved = monthlyAnnualized - yearlyAnnualized;
    if (saved <= 0) return null;
    const pct = Math.round((saved / monthlyAnnualized) * 100);
    return `Save ${pct}%`;
  }

  ctaVariant(p: Plan): 'primary' | 'secondary' | 'outline' {
    if (p.popular) return 'primary';
    if (p.id === 'free') return 'outline';
    return 'secondary';
  }

  get compareRows() {
    return [
      { label: 'Auctions / month', free: this.plans[0].limits.auctionsPerMonth, pro: this.plans[1].limits.auctionsPerMonth, business: this.plans[2].limits.auctionsPerMonth },
      { label: 'Team seats',       free: this.plans[0].limits.teamSeats,        pro: this.plans[1].limits.teamSeats,        business: this.plans[2].limits.teamSeats },
      { label: 'API access',       free: this.plans[0].limits.api,              pro: this.plans[1].limits.api,              business: this.plans[2].limits.api },
      { label: 'SLA & support',    free: this.plans[0].limits.sla,              pro: this.plans[1].limits.sla,              business: this.plans[2].limits.sla },
    ];
  }

  trackByPlanId(_: number, p: Plan) {
    return p.id;
  }
}
