const services = [
  {
    number: "01",
    title: "Servicios funerarios",
    description:
      "Información y orientación sobre las opciones de atención funeraria disponibles.",
  },
  {
    number: "02",
    title: "Salas de velación",
    description:
      "Consulta orientativa sobre espacios y necesidades para la despedida.",
  },
  {
    number: "03",
    title: "Traslados y logística",
    description:
      "Información sobre coordinación de traslados y recursos necesarios.",
  },
];

function App() {
  return (
    <main className="serena-page">
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Serena, inicio">
          <span className="brand-symbol" aria-hidden="true">
            S
          </span>
          <span className="brand-name">
            <strong>serena</strong>
            <small>GESTIÓN FUNERARIA</small>
          </span>
        </a>

        <nav className="main-nav" aria-label="Navegación principal">
          <a href="#servicios">Servicios</a>
          <a href="#nosotros">Nosotros</a>
          <a href="#contacto">Contacto</a>
        </nav>

        <a className="header-action" href="#contacto">
          Solicitar orientación
        </a>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-content">
          <p className="eyebrow">
            ACOMPAÑAMIENTO · RESPETO · TRANQUILIDAD
          </p>

          <h1>
            En los momentos difíciles,
            <span> cada detalle importa.</span>
          </h1>

          <p className="hero-description">
            Un espacio de orientación e información para conocer los servicios
            funerarios y facilitar su coordinación con respeto y claridad.
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="#servicios">
              Conocer los servicios <span aria-hidden="true">→</span>
            </a>
            <a className="text-button" href="#contacto">
              Necesito orientación
            </a>
          </div>

          <div className="hero-note">
            <span className="status-dot" aria-hidden="true" />
            Información clara y atención respetuosa
          </div>
        </div>

        <div className="hero-art" aria-label="Ilustración decorativa de serenidad">
          <div className="art-circle art-circle-outer" />
          <div className="art-circle art-circle-inner" />
          <div className="art-branch" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="art-caption">
            <span>UN ESPACIO PARA</span>
            <strong>acompañar</strong>
          </div>
        </div>
      </section>

      <section className="values-strip" id="nosotros">
        <div>
          <span className="value-number">01</span>
          <p>Atención con respeto</p>
        </div>
        <div>
          <span className="value-number">02</span>
          <p>Información organizada</p>
        </div>
        <div>
          <span className="value-number">03</span>
          <p>Coordinación responsable</p>
        </div>
      </section>

      <section className="services-section" id="servicios">
        <div className="section-heading">
          <p className="eyebrow">CÓMO PODEMOS ORIENTARTE</p>
          <h2>Información para cada necesidad.</h2>
          <p>
            Conoce las principales áreas de servicio y encuentra un punto de
            partida para resolver tus dudas.
          </p>
        </div>

        <div className="service-grid">
          {services.map((service) => (
            <article className="service-card" key={service.number}>
              <span className="service-number">{service.number}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <a href="#contacto" aria-label={`Consultar sobre ${service.title}`}>
                Consultar <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-section" id="contacto">
        <div>
          <p className="eyebrow">ESTAMOS PARA ORIENTARTE</p>
          <h2>Hablemos de lo que necesitas.</h2>
          <p>
            En esta demostración académica, los datos de contacto y las
            solicitudes reales aún no están habilitados.
          </p>
        </div>
        <span className="contact-label">SERENA · DEMOSTRACIÓN ACADÉMICA</span>
      </section>

      <footer className="site-footer">
        <a className="footer-brand" href="#inicio">
          serena
        </a>
        <p>Sistema Inteligente de Gestión Funeraria</p>
        <p>Proyecto académico · Datos ficticios</p>
      </footer>
    </main>
  );
}

export default App;