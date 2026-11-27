import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Controle } from './Controle'
import { Telao } from './Telao'
import '@fontsource-variable/antonio'
import '@fontsource-variable/montserrat'
import '@fontsource/corinthia/700.css'
import './estilos.css'

const ehTelao = location.hash.startsWith('#/telao')
// Trocar entre controle e telão pelo endereço recarrega a página certa
window.addEventListener('hashchange', () => location.reload())

createRoot(document.getElementById('root')!).render(
  <StrictMode>{ehTelao ? <Telao /> : <Controle />}</StrictMode>,
)
