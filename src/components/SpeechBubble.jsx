export default function SpeechBubble({ message }) {
  return (
    <section className="speech-section">
      <div className="speech-bubble">
        <p id="pokduck-message">{message}</p>
      </div>
    </section>
  )
}
