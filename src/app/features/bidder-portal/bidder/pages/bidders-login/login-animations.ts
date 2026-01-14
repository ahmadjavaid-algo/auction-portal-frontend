import { 
  trigger, 
  transition, 
  style, 
  animate, 
  query, 
  stagger 
} from '@angular/animations';

export const loginAnimations = [
  trigger('cardEnter', [
    transition(':enter', [
      style({ 
        opacity: 0, 
        transform: 'translateY(40px) scale(0.94)' 
      }),
      animate(
        '0.8s cubic-bezier(0.34, 1.56, 0.64, 1)', 
        style({ 
          opacity: 1, 
          transform: 'translateY(0) scale(1)' 
        })
      )
    ])
  ]),

  trigger('slideDown', [
    transition(':enter', [
      style({ 
        opacity: 0, 
        transform: 'translateY(-15px)' 
      }),
      animate(
        '0.5s 0.1s ease-out', 
        style({ 
          opacity: 1, 
          transform: 'translateY(0)' 
        })
      )
    ])
  ]),

  trigger('fadeInUp', [
    transition(':enter', [
      style({ 
        opacity: 0, 
        transform: 'translateY(25px)' 
      }),
      animate(
        '0.6s ease-out', 
        style({ 
          opacity: 1, 
          transform: 'translateY(0)' 
        })
      )
    ])
  ]),

  trigger('staggerIn', [
    transition('* => *', [
      query(':enter', [
        style({ 
          opacity: 0, 
          transform: 'translateY(20px) scale(0.95)' 
        }),
        stagger(100, [
          animate(
            '0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', 
            style({ 
              opacity: 1, 
              transform: 'translateY(0) scale(1)' 
            })
          )
        ])
      ], { optional: true })
    ])
  ]),

  trigger('floatIn', [
    transition(':enter', [
      style({ 
        opacity: 0, 
        transform: 'translateY(-25px) scale(0.85)' 
      }),
      animate(
        '0.6s 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', 
        style({ 
          opacity: 1, 
          transform: 'translateY(0) scale(1)' 
        })
      )
    ])
  ])
];