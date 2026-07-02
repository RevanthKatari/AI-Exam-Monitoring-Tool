import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

export default function GazeChart({ data }) {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const gridCol = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const textCol = isDark ? '#6b6a67' : '#8f8e8a'

  const labels = data.map((_, i) => {
    const mins = Math.round((i / Math.max(data.length - 1, 1)) * 90)
    const h = 9 + Math.floor(mins / 60)
    const m = String(mins % 60).padStart(2, '0')
    return `${h}:${m}`
  })

  const chartData = {
    labels,
    datasets: [{
      label: 'Gaze score',
      data,
      borderColor: '#1d9e75',
      backgroundColor: 'rgba(29,158,117,0.08)',
      borderWidth: 1.5,
      pointRadius: 0,
      fill: true,
      tension: 0.4,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { ticks: { color: textCol, font: { size: 10 }, maxTicksLimit: 6 }, grid: { color: gridCol }, border: { display: false } },
      y: { min: 0, max: 100, ticks: { color: textCol, font: { size: 10 } }, grid: { color: gridCol }, border: { display: false } },
    },
  }

  return (
    <div className="relative h-[120px] w-full">
      <Line data={chartData} options={options} />
    </div>
  )
}
