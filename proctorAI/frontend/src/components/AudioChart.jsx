import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export default function AudioChart({ data }) {
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
      label: 'dB level',
      data,
      backgroundColor: data.map((v) => (v > 40 ? 'rgba(226,75,74,0.7)' : 'rgba(55,138,221,0.5)')),
      borderRadius: 2,
      borderSkipped: false,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { ticks: { color: textCol, font: { size: 10 }, maxTicksLimit: 6 }, grid: { color: gridCol }, border: { display: false } },
      y: { min: 0, max: 80, ticks: { color: textCol, font: { size: 10 } }, grid: { color: gridCol }, border: { display: false } },
    },
  }

  return (
    <div className="relative h-[120px] w-full">
      <Bar data={chartData} options={options} />
    </div>
  )
}
