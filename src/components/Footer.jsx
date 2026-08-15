import './Footer.css'

const COLUMNS = [
  { title: 'Discover', links: ['Explore nearby', 'Top rated', 'Gift cards'] },
  { title: 'Barbers', links: ['List your shop', 'Dashboard', 'Pricing'] },
  { title: 'Company', links: ['About', 'Careers', 'Support'] },
]

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="shell ftr__grid">
        <div>
          <div className="ftr__word">BARBERNOW</div>
          <p className="ftr__blurb">
            The booking layer for the world&rsquo;s best barbershops.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="eyebrow eyebrow--tight ftr__heading">{col.title}</div>
            <ul className="ftr__links">
              {col.links.map((link) => (
                <li key={link}>{link}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="shell ftr__base">
        <div>© {new Date().getFullYear()} BarberNow Ltd.</div>
        <div>Privacy · Terms</div>
      </div>
    </footer>
  )
}
