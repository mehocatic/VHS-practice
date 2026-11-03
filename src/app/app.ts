import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FILMS,
  FilmItem,
  SHEETS,
  computeCropStyle,
  computeSvgPosterProps,
  SvgPosterImageProps,
  CropStyle,
} from './film-data';

interface VirtualTape {
  virtualIndex: number;
  filmIndex: number;
  film: FilmItem;
  spineStyle: CropStyle;
  coverStyle: CropStyle;
}

interface InkBlob {
  cx: number;
  cy: number;
  delay: number;
  radius: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('shelfViewport', { static: true }) shelfViewportRef!: ElementRef<HTMLElement>;
  @ViewChild('heightProbe', { static: true }) heightProbeRef!: ElementRef<HTMLElement>;
  @ViewChild('playRing', { static: true }) playRingRef!: ElementRef<HTMLElement>;
  @ViewChild('customCursor', { static: true }) customCursorRef!: ElementRef<HTMLElement>;
  @ViewChild('detailDialog', { static: true }) detailDialogRef!: ElementRef<HTMLElement>;
  @ViewChild('captionTitle', { static: true }) captionTitleRef!: ElementRef<HTMLElement>;
  @ViewChild('captionSubtitle', { static: true }) captionSubtitleRef!: ElementRef<HTMLElement>;
  @ViewChild('captionYear', { static: true }) captionYearRef!: ElementRef<HTMLElement>;
  @ViewChild('tabsNav', { static: true }) tabsNavRef!: ElementRef<HTMLElement>;
  @ViewChild('tabIndicator', { static: true }) tabIndicatorRef!: ElementRef<HTMLElement>;

  readonly films = FILMS;
  readonly decades: { label: string; decade: string; firstFilmIdx: number }[] = [
    { label: 'ALL / すべて', decade: 'ALL', firstFilmIdx: 0 },
    { label: '1950s', decade: '1950s', firstFilmIdx: 0 },
    { label: '1960s', decade: '1960s', firstFilmIdx: 1 },
    { label: '1970s', decade: '1970s', firstFilmIdx: 5 },
    { label: '1980s', decade: '1980s', firstFilmIdx: 9 },
  ];

  // 36 virtual tapes (3 copies of 12 films)
  readonly virtualTapes: VirtualTape[] = Array.from({ length: 36 }, (_, v) => {
    const filmIndex = v % 12;
    const film = FILMS[filmIndex];
    return {
      virtualIndex: v,
      filmIndex,
      film,
      spineStyle: computeCropStyle(film.spineCrop),
      coverStyle: computeCropStyle(film.coverCrop),
    };
  });

  // State
  private s = 17; // Starts on Noon in Ashes in middle copy (12 + 5 = 17)
  private T = 17;
  private activeFilmIndex = 5;
  private hoveredVirtualIndex = -1;
  private lifts: number[] = new Array(36).fill(0);
  private mx = typeof window !== 'undefined' ? window.innerWidth / 2 : 720;
  private my = typeof window !== 'undefined' ? window.innerHeight / 2 : 450;
  private cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 720;
  private cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 450;
  private tiltX = 0;
  private tiltY = 0;
  private onCover = false;
  private isOpen = false;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartT = 17;
  private hasMovedFar = false;
  private wheelTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastTime = 0;
  private rafId = 0;
  private isReducedMotion = false;
  private cursorState: 'default' | 'spine' | 'btn' | 'open' = 'default';

  // Geometry
  private H = 340;
  private ws = 57.5;
  private d = 179.2;
  private gap = 10.2;

  // Active film for Detail View (signals for reactive binding)
  activeFilm = signal<FilmItem>(FILMS[5]);
  activePosterProps = signal<SvgPosterImageProps>(computeSvgPosterProps(FILMS[5].coverCrop));
  activeDecade = signal<string>('1970s');

  // Ink blobs for SVG mask
  blobs = signal<InkBlob[]>([
    { cx: 150, cy: 330, delay: 0, radius: 0 },
    { cx: 340, cy: 600, delay: 120, radius: 0 },
    { cx: 250, cy: 120, delay: 220, radius: 0 },
    { cx: 90, cy: 760, delay: 300, radius: 0 },
    { cx: 400, cy: 250, delay: 360, radius: 0 },
    { cx: 260, cy: 860, delay: 420, radius: 0 },
    { cx: 230, cy: 470, delay: 180, radius: 0 },
  ]);

  // Screening dialog state
  isScreening = signal<boolean>(false);

  // Cache DOM tape elements for fast direct manipulation in RAF loop
  private tapeElements: HTMLElement[] = [];
  private spineElements: HTMLElement[] = [];
  private coverElements: HTMLElement[] = [];

  ngOnInit(): void {
    if (typeof window === 'undefined') return;

    this.checkReducedMotion();
    this.preloadSheets();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('keydown', this.onKeyDown);
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;

    this.cacheElements();
    this.measureGeometry();

    // Initial caption set
    this.initCaption(this.films[this.activeFilmIndex]);
    this.updateDecadeIndicator(this.films[this.activeFilmIndex].decade);

    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.renderLoop);
  }

  ngOnDestroy(): void {
    if (typeof window === 'undefined') return;

    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.wheelTimeout) clearTimeout(this.wheelTimeout);
  }

  private checkReducedMotion(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }

  private preloadSheets(): void {
    Object.values(SHEETS).forEach((sheet) => {
      const img = new Image();
      img.src = sheet.url;
    });
  }

  private cacheElements(): void {
    const stage = this.shelfViewportRef.nativeElement.querySelector('.stage');
    if (!stage) return;
    this.tapeElements = Array.from(stage.querySelectorAll('.tape'));
    this.spineElements = Array.from(stage.querySelectorAll('.sp-face'));
    this.coverElements = Array.from(stage.querySelectorAll('.cv-face'));
  }

  private measureGeometry(): void {
    if (!this.heightProbeRef) return;
    const probe = this.heightProbeRef.nativeElement;
    const measuredH = probe.getBoundingClientRect().height || 340;
    this.H = measuredH;
    this.ws = (measuredH * 142) / 840;
    this.d = (measuredH * 474) / 900;
    this.gap = measuredH * 0.03;

    // Set CSS variables on host and shelf
    const root = document.documentElement;
    root.style.setProperty('--ws', `${this.ws}px`);
    root.style.setProperty('--d', `${this.d}px`);
  }

  private onResize = (): void => {
    this.measureGeometry();
    this.updateDecadeIndicator(this.activeDecade());
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mx = e.clientX;
    this.my = e.clientY;

    if (!this.isOpen && !this.onCover) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, a, [role="button"], .interactive-ctrl')) {
        this.cursorState = 'btn';
      } else if (this.hoveredVirtualIndex !== -1 && Math.abs(this.getRelativeIndex(this.hoveredVirtualIndex, this.s)) > 0.5) {
        this.cursorState = 'spine';
      } else {
        this.cursorState = 'default';
      }
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      if (this.isScreening()) {
        this.isScreening.set(false);
      } else if (this.isOpen) {
        this.closeDetail();
      }
      return;
    }

    if (this.isOpen || this.isScreening()) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.prevFilm();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.nextFilm();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.openDetail();
    }
  };

  // Main Animation Loop
  private renderLoop = (time: number): void => {
    let dt = (time - this.lastTime) / 1000;
    if (dt > 0.05) dt = 0.05;
    this.lastTime = time;

    // Spring interpolation for shelf scroll
    const k = this.isReducedMotion ? 100 : this.isDragging ? 18 : 5.2;
    this.s += (this.T - this.s) * (1 - Math.exp(-k * dt));
    if (Math.abs(this.T - this.s) < 1e-4) {
      this.s = this.T;
    }

    // Normalizing loop drift (keep s centered around middle copy 12..23)
    if (this.s > 29) {
      this.s -= 12;
      this.T -= 12;
    } else if (this.s < 5) {
      this.s += 12;
      this.T += 12;
    }

    // Active film change check
    const currentFilmIndex = ((Math.round(this.s) % 12) + 12) % 12;
    if (currentFilmIndex !== this.activeFilmIndex) {
      const dir = Math.sign(this.T - this.s) || 1;
      this.activeFilmIndex = currentFilmIndex;
      const film = this.films[this.activeFilmIndex];
      this.activeFilm.set(film);
      this.activePosterProps.set(computeSvgPosterProps(film.coverCrop));
      this.activeDecade.set(film.decade);
      this.swapCaption(film, dir);
      this.updateDecadeIndicator(film.decade);
    }

    // Cover cursor detection & tilt
    const W = window.innerWidth;
    const cyShelf = window.innerHeight / 2;
    const isSettled = Math.abs(this.T - this.s) < 0.3;
    const coverDx = Math.abs(this.mx - W / 2);
    const coverDy = Math.abs(this.my - cyShelf);

    this.onCover =
      coverDx <= 0.55 * this.d &&
      coverDy <= 0.55 * this.H &&
      !this.isOpen &&
      isSettled;

    if (this.onCover) {
      this.cursorState = 'open';
      const targetTiltY = ((this.mx - W / 2) / (0.55 * this.d)) * 9;
      const targetTiltX = -((this.my - cyShelf) / (this.H / 2)) * 6;
      this.tiltY += (targetTiltY - this.tiltY) * (1 - Math.exp(-7 * dt));
      this.tiltX += (targetTiltX - this.tiltX) * (1 - Math.exp(-7 * dt));
    } else {
      if (this.cursorState === 'open') {
        this.cursorState = 'default';
      }
      const targetTiltY = ((this.mx - W / 2) / W) * 5;
      const targetTiltX = 0;
      this.tiltY += (targetTiltY - this.tiltY) * (1 - Math.exp(-7 * dt));
      this.tiltX += (targetTiltX - this.tiltX) * (1 - Math.exp(-7 * dt));
    }

    // Smooth Cursor Movement
    this.cx += (this.mx - this.cx) * (1 - Math.exp(-16 * dt));
    this.cy += (this.my - this.cy) * (1 - Math.exp(-16 * dt));
    if (this.customCursorRef) {
      const cursor = this.customCursorRef.nativeElement;
      cursor.style.transform = `translate3d(${this.cx}px, ${this.cy}px, 0)`;
      cursor.className = `state-${this.cursorState}`;
    }

    // Update 36 Tapes
    const cullingThreshold = W / 2 + 1.5 * this.d;
    for (let v = 0; v < 36; v++) {
      const tapeEl = this.tapeElements[v];
      if (!tapeEl) continue;

      const r = this.getRelativeIndex(v, this.s);
      const B = this.smoothB(r);
      const x = r * (this.ws + this.gap) + (this.d - this.ws + 1.6 * this.gap) * B;

      // Culling
      if (Math.abs(x) > cullingThreshold) {
        tapeEl.style.visibility = 'hidden';
        continue;
      }
      tapeEl.style.visibility = 'visible';

      // Openness
      const openRaw = Math.max(0, 1 - Math.abs(r));
      const o = this.smoothstep(openRaw);

      // Hover Lift
      const targetLift =
        this.hoveredVirtualIndex === v && Math.abs(r) > 0.5 ? 1 : 0;
      this.lifts[v] += (targetLift - this.lifts[v]) * (1 - Math.exp(-12 * dt));
      const lift = this.lifts[v];

      // 3D rotations & coordinates
      const rotY = -90 * o + this.tiltY * o;
      const rotX = this.tiltX * o;
      const rotZ = -4.5 * o;
      const tz = o * 0.2 * this.H;
      const ty = -o * 0.025 * this.H - lift * 0.045 * this.H;
      const zIndex = Math.round(100 - Math.abs(r) * 4);

      tapeEl.style.transform = `translate3d(${x.toFixed(2)}px, ${ty.toFixed(2)}px, ${tz.toFixed(2)}px) rotateZ(${rotZ.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      tapeEl.style.zIndex = String(zIndex);

      // Shading overlays
      const spineEl = this.spineElements[v];
      const coverEl = this.coverElements[v];
      if (spineEl) {
        spineEl.style.setProperty('--shade', (o * 0.55).toFixed(3));
      }
      if (coverEl) {
        coverEl.style.setProperty('--shade', ((1 - o) * 0.5).toFixed(3));
      }
    }

    // Play Ring Position and Scale
    if (this.playRingRef) {
      const ring = this.playRingRef.nativeElement;
      const ringLeft = W / 2 - 0.5 * this.d - 6;
      const ringTop = cyShelf + 0.36 * this.H;
      const ringScale = this.isOpen
        ? 0
        : this.smoothstep(Math.max(0, 1 - Math.abs(this.T - this.s) * 3));
      ring.style.transform = `translate3d(${ringLeft}px, ${ringTop}px, 0) scale(${ringScale})`;
    }

    this.rafId = requestAnimationFrame(this.renderLoop);
  };

  private getRelativeIndex(v: number, scroll: number): number {
    let r = (v - scroll) % 36;
    if (r > 18) r -= 36;
    if (r < -18) r += 36;
    return r;
  }

  private smoothB(r: number): number {
    if (Math.abs(r) < 1) {
      return (r + Math.sin(Math.PI * r) / Math.PI) / 2;
    }
    return r > 0 ? 0.5 : -0.5;
  }

  private smoothstep(x: number): number {
    const c = Math.max(0, Math.min(1, x));
    return c * c * (3 - 2 * c);
  }

  // Pointer & Drag Handling on Shelf
  onShelfPointerDown(e: PointerEvent): void {
    if (this.isOpen) return;
    this.isDragging = true;
    this.hasMovedFar = false;
    this.dragStartX = e.clientX;
    this.dragStartT = this.T;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  onShelfPointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStartX;
    if (Math.abs(dx) > 5) {
      this.hasMovedFar = true;
    }
    const unit = this.ws + this.gap;
    this.T = this.dragStartT - dx / unit;
  }

  onShelfPointerUp(e: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    const target = e.currentTarget as HTMLElement | null;
    if (target && typeof target.hasPointerCapture === 'function' && target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
    this.T = Math.round(this.T);
  }

  onShelfWheel(e: WheelEvent): void {
    if (this.isOpen) return;
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const unit = this.ws + this.gap;
    this.T += (delta / unit) * 0.5;

    if (this.wheelTimeout) clearTimeout(this.wheelTimeout);
    this.wheelTimeout = setTimeout(() => {
      this.T = Math.round(this.T);
    }, 160);
  }

  onTapePointerEnter(virtualIndex: number): void {
    this.hoveredVirtualIndex = virtualIndex;
    const r = this.getRelativeIndex(virtualIndex, this.s);
    if (Math.abs(r) > 0.5 && !this.isOpen) {
      this.cursorState = 'spine';
    }
  }

  onTapePointerLeave(): void {
    this.hoveredVirtualIndex = -1;
    if (this.cursorState === 'spine') {
      this.cursorState = 'default';
    }
  }

  onTapeClick(v: number): void {
    if (this.hasMovedFar || this.isOpen) return;
    const r = this.getRelativeIndex(v, this.s);
    if (Math.abs(r) < 0.5) {
      this.openDetail();
    } else {
      this.T = Math.round(this.T + r);
    }
  }

  // Navigation arrows
  prevFilm(): void {
    this.T = Math.round(this.T) - 1;
  }

  nextFilm(): void {
    this.T = Math.round(this.T) + 1;
  }

  jumpToDecade(decade: string, targetFilmIdx: number): void {
    const currentIdx = ((Math.round(this.T) % 12) + 12) % 12;
    let diff = targetFilmIdx - currentIdx;
    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;
    this.T = Math.round(this.T) + diff;
  }

  // Caption swap logic with Web Animations API
  private initCaption(film: FilmItem): void {
    if (!this.captionTitleRef) return;
    this.captionTitleRef.nativeElement.innerHTML = `<span class="caption-line-slot font-serif-vasari text-[24px] md:text-[31px] leading-[1.12] tracking-[-0.01em]">${film.title}</span>`;
    this.captionSubtitleRef.nativeElement.innerHTML = `<span class="caption-line-slot lbl text-[var(--cobalt)] font-medium text-[10.5px]">${film.romaji} / ${film.kanji}</span>`;
    this.captionYearRef.nativeElement.innerHTML = `<span class="caption-line-slot font-sans-vasari font-medium text-[11px] tracking-[0.08em]">${film.year}</span>`;
  }

  private swapCaption(film: FilmItem, dir: number): void {
    if (!this.captionTitleRef) return;

    this.swapLine(
      this.captionTitleRef.nativeElement,
      `<span class="caption-line-slot font-serif-vasari text-[24px] md:text-[31px] leading-[1.12] tracking-[-0.01em]">${film.title}</span>`,
      dir
    );
    this.swapLine(
      this.captionSubtitleRef.nativeElement,
      `<span class="caption-line-slot lbl text-[var(--cobalt)] font-medium text-[10.5px]">${film.romaji} / ${film.kanji}</span>`,
      dir
    );
    this.swapLine(
      this.captionYearRef.nativeElement,
      `<span class="caption-line-slot font-sans-vasari font-medium text-[11px] tracking-[0.08em]">${film.year}</span>`,
      dir
    );
  }

  private swapLine(container: HTMLElement, html: string, dir: number): void {
    const oldSpans = Array.from(container.children) as HTMLElement[];

    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const newSpan = template.content.firstChild as HTMLElement;
    if (!newSpan) return;

    if (oldSpans.length > 0) {
      newSpan.style.position = 'absolute';
      newSpan.style.left = '0';
      newSpan.style.top = '0';
    }

    container.appendChild(newSpan);

    if (this.isReducedMotion) {
      oldSpans.forEach((s) => s.remove());
      newSpan.style.position = 'relative';
      return;
    }

    const duration = 650;
    const easing = 'cubic-bezier(.2, .8, .2, 1)';

    // Animate incoming
    newSpan.animate(
      [
        { transform: `translateY(${dir * 105}%)` },
        { transform: 'translateY(0%)' },
      ],
      { duration, easing, fill: 'both' }
    ).onfinish = () => {
      newSpan.style.position = 'relative';
    };

    // Animate outgoing
    oldSpans.forEach((old) => {
      old.style.position = 'absolute';
      old.style.left = '0';
      old.style.top = '0';
      const anim = old.animate(
        [
          { transform: 'translateY(0%)' },
          { transform: `translateY(${-dir * 105}%)` },
        ],
        { duration, easing, fill: 'both' }
      );
      anim.onfinish = () => {
        old.remove();
      };
    });
  }

  // Update decade sliding indicator
  private updateDecadeIndicator(decade: string): void {
    if (!this.tabsNavRef || !this.tabIndicatorRef) return;
    const nav = this.tabsNavRef.nativeElement;
    const buttons = Array.from(nav.querySelectorAll('button'));
    const targetBtn = buttons.find((b) => b.getAttribute('data-decade') === decade);

    if (targetBtn) {
      const left = targetBtn.offsetLeft;
      const width = targetBtn.offsetWidth;
      this.tabIndicatorRef.nativeElement.style.transform = `translateX(${left}px)`;
      this.tabIndicatorRef.nativeElement.style.width = `${width}px`;
      this.tabIndicatorRef.nativeElement.style.opacity = '1';
    } else {
      this.tabIndicatorRef.nativeElement.style.opacity = '0';
    }
  }

  // Open Detail Page with Paper Growth and Ink Blots
  openDetail(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.T = Math.round(this.T);

    const dialog = this.detailDialogRef.nativeElement;
    const activeCover = this.coverElements.find((_, idx) => {
      const v = idx;
      const r = this.getRelativeIndex(v, this.s);
      return Math.abs(r) < 0.5;
    });

    const rect = activeCover
      ? activeCover.getBoundingClientRect()
      : {
          left: window.innerWidth / 2 - this.d / 2,
          top: window.innerHeight / 2 - this.H / 2,
          right: window.innerWidth / 2 + this.d / 2,
          bottom: window.innerHeight / 2 + this.H / 2,
          width: this.d,
          height: this.H,
        };

    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    dialog.style.transformOrigin = `${originX}px ${originY}px`;
    dialog.style.visibility = 'visible';

    // Reset ink blobs to 0
    this.blobs.update((blobs) => blobs.map((b) => ({ ...b, radius: 0 })));

    const top = Math.max(0, rect.top);
    const right = Math.max(0, window.innerWidth - rect.right);
    const bottom = Math.max(0, window.innerHeight - rect.bottom);
    const left = Math.max(0, rect.left);

    if (this.isReducedMotion) {
      dialog.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';
      dialog.style.transform = 'rotate(0deg)';
      this.blobs.update((blobs) => blobs.map((b) => ({ ...b, radius: 720 })));
      return;
    }

    // Sheet growth animation
    dialog.animate(
      [
        {
          clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round 3px)`,
          transform: 'rotate(-4.5deg)',
        },
        {
          clipPath: 'inset(0px 0px 0px 0px round 0px)',
          transform: 'rotate(0deg)',
        },
      ],
      {
        duration: 1050,
        easing: 'cubic-bezier(.76, 0, .18, 1)',
        fill: 'both',
      }
    );

    // Staggered text line rises
    const lines = dialog.querySelectorAll('.detail-line-inner');
    lines.forEach((line, index) => {
      line.animate(
        [
          { transform: 'translateY(110%)' },
          { transform: 'translateY(0%)' },
        ],
        {
          duration: 900,
          easing: 'cubic-bezier(.2, .8, .2, 1)',
          delay: 620 + index * 75,
          fill: 'both',
        }
      );
    });

    // Poster ink blot bleed
    const inkStartTime = performance.now() + 520;
    const animateInk = (now: number) => {
      const elapsed = now - inkStartTime;
      if (elapsed < 0) {
        requestAnimationFrame(animateInk);
        return;
      }

      let stillAnimating = false;
      this.blobs.update((currentBlobs) =>
        currentBlobs.map((blob) => {
          const blobElapsed = elapsed - blob.delay;
          if (blobElapsed <= 0) {
            stillAnimating = true;
            return { ...blob, radius: 0 };
          }
          const p = Math.min(1, blobElapsed / 1250);
          if (p < 1) stillAnimating = true;
          const easeOutCubic = 1 - Math.pow(1 - p, 3);
          return { ...blob, radius: easeOutCubic * 720 };
        })
      );

      if (stillAnimating && this.isOpen) {
        requestAnimationFrame(animateInk);
      }
    };
    requestAnimationFrame(animateInk);
  }

  closeDetail(): void {
    if (!this.isOpen) return;
    const dialog = this.detailDialogRef.nativeElement;

    const activeCover = this.coverElements.find((_, idx) => {
      const v = idx;
      const r = this.getRelativeIndex(v, this.s);
      return Math.abs(r) < 0.5;
    });

    const rect = activeCover
      ? activeCover.getBoundingClientRect()
      : {
          left: window.innerWidth / 2 - this.d / 2,
          top: window.innerHeight / 2 - this.H / 2,
          right: window.innerWidth / 2 + this.d / 2,
          bottom: window.innerHeight / 2 + this.H / 2,
        };

    const top = Math.max(0, rect.top);
    const right = Math.max(0, window.innerWidth - rect.right);
    const bottom = Math.max(0, window.innerHeight - rect.bottom);
    const left = Math.max(0, rect.left);

    if (this.isReducedMotion) {
      dialog.style.visibility = 'hidden';
      this.isOpen = false;
      return;
    }

    const closeAnim = dialog.animate(
      [
        {
          clipPath: 'inset(0px 0px 0px 0px round 0px)',
          transform: 'rotate(0deg)',
        },
        {
          clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round 3px)`,
          transform: 'rotate(-4.5deg)',
        },
      ],
      {
        duration: 850,
        easing: 'cubic-bezier(.76, 0, .18, 1)',
        fill: 'both',
      }
    );

    closeAnim.onfinish = () => {
      dialog.style.visibility = 'hidden';
      this.isOpen = false;
    };
  }

  // Watch film action
  watchFilm(): void {
    this.isScreening.set(true);
  }

  closeScreening(): void {
    this.isScreening.set(false);
  }
}
