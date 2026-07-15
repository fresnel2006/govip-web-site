import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Utilisateur from './Utilisateurs/Utilisateurs.jsx'
import Admin from './Administrateurs/Admin.jsx'
import GvipRiskDashboard from './Dashboard/GvipRiskDashboard.jsx'

function App() {


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GvipRiskDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
