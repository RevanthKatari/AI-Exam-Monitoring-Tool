export default function ExamQuestionNav({ questions, currentIndex, onSelect, answers }) {
  return (
    <aside className="w-44 shrink-0 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3 h-fit">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-2 font-medium px-1">
        Questions
      </div>
      <div className="flex flex-col gap-1">
        {questions.map((q, i) => {
          const answered = Boolean(answers[q.id]?.trim())
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelect(i)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs text-left transition-colors ${
                i === currentIndex
                  ? 'bg-[var(--info-bg)] text-[var(--info-text)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--bg-3)]'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 ${
                  answered ? 'bg-[#1d9e75] text-white' : 'border border-[var(--border-md)] text-[var(--text-3)]'
                }`}
              >
                {answered ? '✓' : i + 1}
              </span>
              Question {i + 1}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
