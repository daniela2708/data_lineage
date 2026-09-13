/**
 * The application chrome: the page identity on the left, the consultancy mark
 * on the right. Both source assets are used unmodified.
 */
export default function AppChrome() {
  return <header className="topbar">
    <div className="brands">
      <img src="/weis-1-logo-pack/weis-1-logo-svg-vector.svg" alt="Weis Markets" />
      <h1>Data Lineage Explorer</h1>
    </div>
    <img className="chrome-mark" src="/wizelinered.svg" alt="Wizeline" />
  </header>
}
