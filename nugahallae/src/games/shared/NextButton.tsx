/** `다음 사람 →` / `결과 보기`. onNext는 화면 공용 가드(useScreenGuard)로 감싸서 넘긴다 */
export function NextButton({ last, onNext }: { last: boolean; onNext: () => void }) {
  return (
    <button type="button" className="rg-btn" onClick={onNext}>
      {last ? (
        '결과 보기'
      ) : (
        <>
          다음 사람
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginLeft: 6, verticalAlign: '-3px' }}
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </>
      )}
    </button>
  )
}
