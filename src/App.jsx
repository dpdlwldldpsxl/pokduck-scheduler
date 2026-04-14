import { useState } from 'react'
import IntroOverlay from './components/IntroOverlay'
import CelebrationOverlay from './components/CelebrationOverlay'
import Header from './components/Header'
import SpeechBubble from './components/SpeechBubble'
import TodaySchedule from './components/TodaySchedule'
import TaskList from './components/TaskList'
import WeekGrid from './components/WeekGrid'
import AIScheduler from './components/AIScheduler'
import { getTodayInfo, POKDUCK_DAY_CONFIG, CHEERS } from './data/scheduleData'

function loadTasks() {
  return JSON.parse(localStorage.getItem('pokduck-tasks') || '[]')
}

function saveTasks(tasks) {
  localStorage.setItem('pokduck-tasks', JSON.stringify(tasks))
}

export default function App() {
  const todayInfo = getTodayInfo()
  const todayConfig = POKDUCK_DAY_CONFIG[todayInfo.dayName]

  const [showIntro, setShowIntro] = useState(true)
  const [showCelebrate, setShowCelebrate] = useState(false)
  const [tasks, setTasks] = useState(loadTasks)
  const [message, setMessage] = useState(todayConfig.msg)
  const [mood, setMood] = useState(todayConfig.mood)

  const updateTasks = (newTasks) => {
    saveTasks(newTasks)
    setTasks(newTasks)
  }

  const handleAdd = (text, category) => {
    updateTasks([...tasks, { text, category, done: false }])
  }

  const handleToggle = (index) => {
    const newTasks = tasks.map((t, i) =>
      i === index ? { ...t, done: !t.done } : t
    )
    updateTasks(newTasks)

    if (newTasks[index].done) {
      const allDone = newTasks.every((t) => t.done)
      if (allDone) {
        setMessage('오늘 할 일 다 했어?! 최고야!!! 폭덕이가 너무 자랑스러워!! 🎉')
        setMood('celebrate')
        setShowCelebrate(true)
      } else {
        setMessage(CHEERS[Math.floor(Math.random() * CHEERS.length)])
        setMood('happy')
      }
    } else {
      setMessage(todayConfig.msg)
      setMood(todayConfig.mood)
    }
  }

  const handleDelete = (index) => {
    updateTasks(tasks.filter((_, i) => i !== index))
  }

  return (
    <>
      {showIntro && <IntroOverlay onClose={() => setShowIntro(false)} />}
      {showCelebrate && <CelebrationOverlay onClose={() => setShowCelebrate(false)} />}
      <Header mood={mood} dateStr={todayInfo.dateStr} />
      <SpeechBubble message={message} />
      <TodaySchedule dayName={todayInfo.dayName} />
      <TaskList
        tasks={tasks}
        onAdd={handleAdd}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
      <AIScheduler existingTasks={tasks} onAddTask={handleAdd} />
      <WeekGrid todayName={todayInfo.dayName} />
    </>
  )
}
