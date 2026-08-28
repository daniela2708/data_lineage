/**
 * Client and consultancy marks form a collaboration signature without
 * modifying either source asset.
 */
export default function Header() {
  return (
    <header>
      <div className="page-shell header-inner">
        <div className="hero-copy">
          <span className="eyebrow">Data platform modernization · Discovery</span>
          <h1>Data Lineage Explorer</h1>
          <p className="sub">
            Explore how data moves through Weis today, from source systems and load processes to
            downstream tables and reports, grounded in verified code and data evidence.
          </p>
        </div>
        <div className="brand" aria-label="Weis Markets in collaboration with Wizeline">
          <div className="logos">
            <img
              className="weis"
              src="/weis-1-logo-pack/weis-1-logo-svg-vector.svg"
              alt="Weis Markets"
            />
            <span className="collab" aria-hidden="true">×</span>
            <img className="wz" src="/wizelinered.svg" alt="Wizeline" />
          </div>
        </div>
      </div>
    </header>
  )
}
