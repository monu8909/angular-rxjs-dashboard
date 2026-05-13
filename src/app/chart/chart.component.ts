import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { UserRole } from '../models/user.model';
import { ROLE_COLORS } from '../models/user.model';
@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [],
  template: `
    <div class="chart-wrapper">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [
    `
      .chart-wrapper {
        position: relative;
        width: 100%;
        max-width: 350px;
        margin: 0 auto;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements OnChanges, OnDestroy {
  @ViewChild('chartCanvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  @Input() data: { role: UserRole; count: number }[] = [];

  private chart: any = null;
  private ChartLib: any = null;

  async ngOnChanges(): Promise<void> {
    if (this.data.length) {
      await this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private async renderChart(): Promise<void> {
    if (!this.ChartLib) {
      const mod = await import('chart.js');
      this.ChartLib = mod;
      const { Chart, ArcElement, Tooltip, Legend, PieController } = mod;
      Chart.register(PieController, ArcElement, Tooltip, Legend);
    }

    this.destroyChart();

    const { Chart } = this.ChartLib;
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.data.map((d) => d.role),
        datasets: [
          {
            data: this.data.map((d) => d.count),
            backgroundColor: this.data.map((d) => ROLE_COLORS[d.role]),
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: { size: 14 },
            },
          },
        },
      },
    });
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}
