export default function ExamQuestionView({ question, index, total, value, onChange, onPrev, onNext, disabled }) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 flex-1 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-[var(--text)]">Question {index + 1} of {total}</h2>
      </div>
      <p className="text-sm text-[var(--text-2)] leading-relaxed mb-4 whitespace-pre-wrap">{question.prompt}</p>
      <textarea
        rows={10}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here..."
        className="w-full px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)] resize-y disabled:opacity-60"
      />
      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="text-xs font-medium px-3.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-md)] text-[var(--text-2)] hover:bg-[var(--bg-3)] disabled:opacity-40"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={index === total - 1}
          className="text-xs font-medium px-3.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-md)] text-[var(--text-2)] hover:bg-[var(--bg-3)] disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
