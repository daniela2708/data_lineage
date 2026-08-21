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
            Follow a documented table path from source to publication, inspect any table in the
            catalog, or scan the complete Phase 1 estate. Every view redraws directly from the data.
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
