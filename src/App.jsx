import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Utilisateur from './assets/Utilisateurs/Utilisateurs.jsx'
import Admin from './assets/Administrateurs/Admin.jsx'

function App() {


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Utilisateur />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
