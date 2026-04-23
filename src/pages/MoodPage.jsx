import BottomNav from '../components/BottomNav'

export default function MoodPage() {
  return (
    <>
      <div className="page-greet">
        <img src="/images/pokduck_default.png" alt="폭덕이" className="page-greet-avatar" />
        <p className="page-greet-text">
          기분 기록은 이제 <strong>오늘 탭</strong>에서 바로 해! 이 탭은 곧 사라질 거야 🦆
        </p>
      </div>
      <div className="page-placeholder">
        <span className="page-placeholder-icon">😊</span>
        <h2>기분 트래킹</h2>
        <p>오늘 탭의 "지금 어때?" 카드에서 1탭으로 기록하면 돼.</p>
      </div>
      <BottomNav />
    </>
  )
}
