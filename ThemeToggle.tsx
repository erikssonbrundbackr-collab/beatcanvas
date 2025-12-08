export default function ThemeToggle() {
  const toggle = () => {
    const d = document.documentElement
    const dark = d.classList.toggle('dark')
    if (dark) d.setAttribute('data-theme','dark'); else d.removeAttribute('data-theme')
  }
  return <button className="btn ghost" onClick={toggle}>Tema</button>
}