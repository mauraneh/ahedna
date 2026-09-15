import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  GlobalWorkerOptions,
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
  getDocument,
} from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.mjs';

@Component({
  selector: 'app-pdf-thumbnail',
  standalone: true,
  template: `
    <canvas #canvas [attr.aria-label]="alt" role="img"></canvas>
    @if (failed) {
      <span class="pdf-thumbnail-fallback">PDF</span>
    }
  `,
  styles: `
    :host {
      display: grid;
      width: 100%;
      height: 100%;
      min-height: inherit;
      place-items: center;
      overflow: hidden;
      background: #eee3cf;
    }

    canvas {
      display: block;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      background: #ffffff;
    }

    .pdf-thumbnail-fallback {
      display: grid;
      width: 4rem;
      height: 4rem;
      place-items: center;
      border-radius: 0.75rem;
      background: #a8322d;
      color: #ffffff;
      font-family: var(--site-sans-font);
      font-size: 0.9rem;
      font-weight: 900;
    }

    canvas[hidden] {
      display: none;
    }
  `,
})
export class PdfThumbnailComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() src = '';
  @Input() alt = 'Aperçu du document PDF';
  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  failed = false;

  private viewReady = false;
  private requestId = 0;
  private loadingTask: PDFDocumentLoadingTask | null = null;
  private document: PDFDocumentProxy | null = null;
  private renderTask: RenderTask | null = null;

  ngAfterViewInit(): void {
    this.viewReady = true;
    void this.renderFirstPage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewReady && changes['src']) {
      void this.renderFirstPage();
    }
  }

  ngOnDestroy(): void {
    this.requestId += 1;
    this.renderTask?.cancel();
    void this.document?.destroy();
    void this.loadingTask?.destroy();
  }

  private async renderFirstPage(): Promise<void> {
    const canvas = this.canvasRef?.nativeElement;
    const source = this.src.trim();

    if (!canvas || !source) {
      return;
    }

    const currentRequestId = ++this.requestId;
    this.failed = false;
    canvas.hidden = false;
    this.renderTask?.cancel();
    await this.document?.destroy();
    await this.loadingTask?.destroy();

    try {
      this.loadingTask = getDocument(source);
      const document = await this.loadingTask.promise;

      if (currentRequestId !== this.requestId) {
        await document.destroy();
        return;
      }

      this.document = document;
      const page = await document.getPage(1);
      const initialViewport = page.getViewport({ scale: 1 });
      const parentWidth = canvas.parentElement?.clientWidth || 260;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.max(1, (parentWidth * pixelRatio) / initialViewport.width);
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext('2d');

      if (!context || currentRequestId !== this.requestId) {
        return;
      }

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      this.renderTask = page.render({ canvasContext: context, viewport });
      await this.renderTask.promise;
    } catch (error) {
      if (currentRequestId !== this.requestId || (error as { name?: string })?.name === 'RenderingCancelledException') {
        return;
      }

      canvas.hidden = true;
      this.failed = true;
    }
  }
}
