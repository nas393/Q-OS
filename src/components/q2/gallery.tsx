/* The v2 design system, shown in full: colour, type, buttons, status, cards, lists, tabs and states.
   Review this page in both themes before any screen moves to v2. */
import {Button,Card,Count,Empty,Icon,Mark,Pill,Row,Skeleton} from "./ui";

const SWATCHES:{name:string;v:string}[]=[
  {name:"Canvas",v:"var(--q2-canvas)"},{name:"Surface",v:"var(--q2-surface)"},{name:"Well",v:"var(--q2-well)"},
  {name:"Ink",v:"var(--q2-ink)"},{name:"Ink 2",v:"var(--q2-ink-2)"},{name:"Accent",v:"var(--q2-accent)"},
  {name:"Ok",v:"var(--q2-ok)"},{name:"Watch",v:"var(--q2-watch)"},{name:"Crit",v:"var(--q2-crit)"},{name:"Info",v:"var(--q2-info)"}
];

export function Gallery(){
  return <>
    <h1 className="q2-h1">System</h1>
    <p className="q2-lede">The v2 design system: one token set and one component set, in two themes. Clay is the only accent, and every status colour has a word beside it.</p>

    <section className="q2-section" aria-labelledby="g-colour">
      <h2 id="g-colour">Colour</h2>
      <div className="q2-swatches">{SWATCHES.map(s=><div key={s.name} className="q2-swatch"><i style={{background:s.v}}/>{s.name}</div>)}</div>
    </section>

    <section className="q2-section" aria-labelledby="g-type">
      <h2 id="g-type">Type</h2>
      <p className="q2-h1" style={{fontSize:40}}>Good afternoon, Nassim.</p>
      <p style={{font:"400 26px/1.2 var(--q2-serif)",margin:"0 0 12px"}}>A title in the serif, for pages and cards.</p>
      <p style={{margin:"0 0 8px"}}>Body text in the sans, at fifteen pixels, for reading and for every control.</p>
      <p className="q2-meta">Meta text, for times, counts and sources.</p>
    </section>

    <section className="q2-section" aria-labelledby="g-buttons">
      <h2 id="g-buttons">Buttons</h2>
      <div className="q2-row-line">
        <Button variant="primary">Give task</Button>
        <Button>Open app</Button>
        <Button variant="ghost">Dismiss</Button>
        <Button variant="danger">Delete</Button>
        <Button disabled>Saving…</Button>
      </div>
    </section>

    <section className="q2-section" aria-labelledby="g-status">
      <h2 id="g-status">Status and counts</h2>
      <div className="q2-row-line">
        <Pill tone="ok">Live</Pill><Pill tone="watch">Watching</Pill><Pill tone="crit">Needs you</Pill><Pill tone="info">Deploying</Pill><Pill>No data</Pill>
        <Count n={3}/><Count n={2} tone="crit"/>
      </div>
    </section>

    <section className="q2-section" aria-labelledby="g-cards">
      <h2 id="g-cards">Cards, lists and states</h2>
      <div className="q2-grid">
        <Card title="Your inbox" meta="2 waiting">
          <ul className="q2-list">
            <Row title="Dalil · Booking drafts" meta="Your yes" trailing={<Button variant="ghost">Review</Button>}/>
            <Row title="Dalil: build failed" meta="Alert" trailing={<Pill tone="crit">Needs you</Pill>}/>
          </ul>
        </Card>
        <Card title="Daily focus">
          <Empty title="Nothing due today.">Add a task from the command bar.</Empty>
        </Card>
        <Card title="Loading" meta="Checking every app">
          <Skeleton lines={3}/>
        </Card>
      </div>
    </section>

    <section className="q2-section" aria-labelledby="g-tabs">
      <h2 id="g-tabs">Tabs and marks</h2>
      <div className="q2-row-line">
        <div className="q2-tabs" role="group" aria-label="Period"><button type="button" aria-pressed="true">Today</button><button type="button" aria-pressed="false">Week</button><button type="button" aria-pressed="false">Month</button></div>
        <Mark/><Icon name="floor"/><Icon name="spark"/><Icon name="compass"/><Icon name="bell"/><Icon name="grid"/>
      </div>
    </section>
  </>;
}
