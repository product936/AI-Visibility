import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import ContentStrategy from './pages/ContentStrategy.jsx'
import Placeholder from './pages/Placeholder.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/content-strategy" replace />} />
        <Route path="/content-strategy" element={<ContentStrategy />} />
        <Route path="/insights" element={<Placeholder title="Insights" />} />
        <Route path="/radar" element={<Placeholder title="Radar" />} />
        <Route path="/scan" element={<Placeholder title="Scan" />} />
        <Route path="/favorites" element={<Placeholder title="Favorites" />} />
        <Route path="/conversations" element={<Placeholder title="Conversations" />} />
        <Route path="/audience" element={<Placeholder title="Audience" />} />
        <Route path="/reports" element={<Placeholder title="Reports" />} />
        <Route path="*" element={<Placeholder title="Not Found" />} />
      </Route>
    </Routes>
  )
}
