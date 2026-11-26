"use client";

import { useMemo, useState } from "react";

type UnitOffice = { id: string; name: string; department: string; score: number };
const UNIT_OFFICES: UnitOffice[] = [
  { id: "novae", name: "NOVAÉ", department: "Commercial & Growth", score: 50 },
  { id: "certigo", name: "CERTIGO", department: "Education", score: 50 },
  { id: "ali-quest", name: "ALI-QUEST / CISA QUEST", department: "Education", score: 50 },
  { id: "lumeris", name: "LUMERIS", department: "Media & Community", score: 50 },
  { id: "radio", name: "RADIO CEDARS", department: "Media & Community", score: 50 },
  { id: "lep", name: "LUANDA EDGE PULSE", department: "Intelligence", score: 50 },
  { id: "dalil", name: "DALIL AL-BAZOURIEH", department: "Directory & Network", score: 50 },
  { id: "xauusd", name: "XAU/USD TRADING HQ", department: "Trading & Investment", score: 50 },
];
const FIXED_SPACES = [
  { name: "Main reception", kind: "Front of house", area: 56, dimensions: "8 × 7 m", detail: "Welcome desk, concierge and visitor check-in" },
  { name: "Visitor lounge", kind: "Front of house", area: 24, dimensions: "6 × 4 m", detail: "Waiting area with controlled access" },
  { name: "Security & access", kind: "Front of house", area: 16, dimensions: "4 × 4 m", detail: "Entry control and visitor screening" },
  { name: "Main boardroom", kind: "Meetings", area: 70, dimensions: "10 × 7 m", detail: "12–16 seats, presentation wall and video conference" },
  { name: "Meeting room A", kind: "Meetings", area: 30, dimensions: "6 × 5 m", detail: "6–8 seats" },
  { name: "Meeting room B", kind: "Meetings", area: 24, dimensions: "6 × 4 m", detail: "4–6 seats" },
  { name: "Owner / CEO office", kind: "Executive suite", area: 42, dimensions: "7 × 6 m", detail: "Private office with confidential meeting corner" },
  { name: "Chief of Staff office", kind: "Executive suite", area: 24, dimensions: "6 × 4 m", detail: "Executive coordination, priorities and follow-through" },
  { name: "Chief Operating Officer", kind: "Executive suite", area: 28, dimensions: "7 × 4 m", detail: "Operations, delivery standards and business-unit performance" },
  { name: "Chief Financial Officer", kind: "Executive suite", area: 28, dimensions: "7 × 4 m", detail: "Financial control, budgets, cash and investment governance" },
  { name: "Chief Commercial Officer", kind: "Executive suite", area: 28, dimensions: "7 × 4 m", detail: "Revenue, partnerships, customers and growth" },
  { name: "Chief Technology & Product Officer", kind: "Executive suite", area: 24, dimensions: "6 × 4 m", detail: "Technology strategy, product portfolio and data platforms" },
  { name: "Executive assistant office", kind: "Executive suite", area: 16, dimensions: "4 × 4 m", detail: "Executive scheduling, communications and confidential support" },
  { name: "Human Resources", kind: "Corporate functions", area: 36, dimensions: "6 × 6 m", detail: "HR lead, private interview room and personnel records" },
  { name: "Finance & administration", kind: "Corporate functions", area: 36, dimensions: "6 × 6 m", detail: "Finance lead, administration and confidential files" },
  { name: "Operations & PMO", kind: "Corporate functions", area: 48, dimensions: "8 × 6 m", detail: "Portfolio delivery, operating cadence and project control" },
  { name: "Technology & product", kind: "Corporate functions", area: 36, dimensions: "6 × 6 m", detail: "Platform, data, engineering and product leadership" },
  { name: "Legal & governance", kind: "Corporate functions", area: 24, dimensions: "6 × 4 m", detail: "Contracts, compliance, risk and corporate governance" },
  { name: "Procurement & supply chain", kind: "Corporate functions", area: 30, dimensions: "6 × 5 m", detail: "Vendor management, sourcing and delivery coordination" },
  { name: "Data & business intelligence", kind: "Corporate functions", area: 30, dimensions: "6 × 5 m", detail: "Verified performance reporting and decision support" },
  { name: "Collaboration hub", kind: "Shared spaces", area: 40, dimensions: "8 × 5 m", detail: "Team stand-ups, workshops and cross-unit work" },
  { name: "Staff pantry & break area", kind: "Shared spaces", area: 24, dimensions: "6 × 4 m", detail: "Staff refreshment and informal breaks" },
  { name: "Storage & facilities", kind: "Shared spaces", area: 18, dimensions: "6 × 3 m", detail: "IT storage, supplies and building support" },
];

function dimensions(area: number) {
  const width = Math.sqrt(area * 1.45);
  const depth = area / width;
  return `${width.toFixed(1)} × ${depth.toFixed(1)} m`;
}

export default function QWorldSpacePlan() {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(UNIT_OFFICES.map((unit) => [unit.id, unit.score])),
  );
  const allocations = useMemo(() => {
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0) || 1;
    return UNIT_OFFICES.map((unit) => {
      const score = scores[unit.id] ?? 50;
      const area = 24 + (160 * score) / total;
      return { ...unit, score, area: Math.round(area), dimensions: dimensions(area) };
    });
  }, [scores]);
  const totalUnitArea = allocations.reduce((sum, unit) => sum + unit.area, 0);
  const totalFixedArea = FIXED_SPACES.reduce((sum, space) => sum + space.area, 0);
  const totalNet = totalUnitArea + totalFixedArea;
  const gross = Math.round(totalNet / 0.82);

  return (
    <section className="qw-plan" aria-label="Alternative executive headquarters space plan">
      <header className="qw-plan-header">
        <div>
          <span className="qw-kicker">ALTERNATIVE LAYOUT · EXECUTIVE HQ</span>
          <h2>Space plan & office allocation</h2>
          <p>One floor. Executive governance, corporate services, shared meeting spaces and eight business-unit offices.</p>
        </div>
        <div className="qw-plan-metrics">
          <div><b>≈ {gross.toLocaleString("en-US")} m²</b><span>Indicative gross area</span></div>
          <div><b>{FIXED_SPACES.length + UNIT_OFFICES.length}</b><span>Dedicated spaces</span></div>
          <div><b>1</b><span>Executive floor</span></div>
        </div>
      </header>

      <div className="qw-plan-map">
        <div className="qw-plan-band">
          <span className="qw-plan-band-title">01 · ARRIVAL & MEETINGS</span>
          <div className="qw-plan-room-grid qw-plan-front">
            {FIXED_SPACES.filter((space) => space.kind === "Front of house" || space.kind === "Meetings").map((space) => (
              <article className="qw-plan-room" key={space.name}>
                <span>{space.kind}</span><h3>{space.name}</h3><b>{space.area} m²</b><small>{space.dimensions}</small><p>{space.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="qw-plan-band">
          <span className="qw-plan-band-title">02 · OWNER & EXECUTIVE LEADERSHIP</span>
          <div className="qw-plan-room-grid qw-plan-exec">
            {FIXED_SPACES.filter((space) => space.kind === "Executive suite").map((space) => (
              <article className="qw-plan-room qw-plan-room-exec" key={space.name}>
                <span>{space.kind}</span><h3>{space.name}</h3><b>{space.area} m²</b><small>{space.dimensions}</small><p>{space.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="qw-plan-band">
          <span className="qw-plan-band-title">03 · CORPORATE FUNCTIONS & SHARED SERVICES</span>
          <div className="qw-plan-room-grid qw-plan-functions">
            {FIXED_SPACES.filter((space) => space.kind === "Corporate functions" || space.kind === "Shared spaces").map((space) => (
              <article className="qw-plan-room" key={space.name}>
                <span>{space.kind}</span><h3>{space.name}</h3><b>{space.area} m²</b><small>{space.dimensions}</small><p>{space.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="qw-plan-band">
          <span className="qw-plan-band-title">04 · BUSINESS-UNIT OFFICES · VARIABLE ALLOCATION</span>
          <div className="qw-plan-unit-grid">
            {allocations.map((unit) => (
              <article className="qw-plan-room qw-plan-unit-room" key={unit.id} style={{ flexGrow: unit.area }}>
                <span>{unit.department}</span><h3>{unit.name}</h3><b>{unit.area} m²</b><small>{unit.dimensions}</small>
                <p>Planning index: {unit.score}/100</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <section className="qw-allocation">
        <div className="qw-allocation-heading">
          <div><span className="qw-kicker">OWNER SPACE ALLOCATION CONTROL</span><h3>Adjust business-unit contribution indices</h3></div>
          <button type="button" onClick={() => setScores(Object.fromEntries(UNIT_OFFICES.map((unit) => [unit.id, 50])))}>Reset baseline</button>
        </div>
        <p>Each unit keeps a 24 m² minimum. A 160 m² variable office-space pool is distributed proportionally across the eight units using the planning index below. The intended production index is weighted: verified contribution 50%, strategic importance 20%, headcount 15% and operational workload 15%. Until those data sources are connected, these sliders are scenario controls only — not actual performance scores. Changing one index reallocates the variable pool across all units.</p>
        <div className="qw-score-grid">
          {allocations.map((unit) => (
            <label className="qw-score" key={unit.id}>
              <span><b>{unit.name}</b><strong>{unit.area} m²</strong></span>
              <input type="range" min="0" max="100" step="5" value={unit.score} onChange={(event) => setScores((current) => ({ ...current, [unit.id]: Number(event.target.value) }))} />
              <small>Index {unit.score}/100 · {unit.dimensions}</small>
            </label>
          ))}
        </div>
        <div className="qw-allocation-foot">
          <b>Business-unit area: {totalUnitArea} m² · Fixed spaces: {totalFixedArea} m² · Net planned area: {totalNet} m²</b>
          <span>Gross estimate adds 18% for corridors, walls and circulation. Planning model only — not a measured building survey.</span>
        </div>
      </section>

      <p className="qw-plan-disclaimer">Important: all office dimensions are indicative planning dimensions, not architectural or construction specifications. Indices currently start equally at 50 because verified contribution data is not connected. Once real unit contribution, headcount and workload data are available, the allocation model can use those inputs instead of manual planning indices.</p>
    </section>
  );
}
