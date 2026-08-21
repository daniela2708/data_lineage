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
            Follow the documented path for CLUB_CARD_DIM from its source tables to publication,
            including its dependencies, related pipelines, and known downstreams.
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
