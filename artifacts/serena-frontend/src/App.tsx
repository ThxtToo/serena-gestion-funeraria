import { useState } from 'react';

function ViteMark() {
  return (
    <svg viewBox="0 0 256 257" role="img" aria-label="Vite">
      <defs>
        <linearGradient id="vite-a" x1="-.8%" x2="57.6%" y1="7.7%" y2="78.4%">
          <stop offset="0%" stopColor="#41d1ff" />
          <stop offset="100%" stopColor="#bd34fe" />
        </linearGradient>
        <linearGradient id="vite-b" x1="43.4%" x2="50.5%" y1="2.5%" y2="89.1%">
          <stop offset="0%" stopColor="#ffea83" />
          <stop offset="8.3%" stopColor="#ffdd35" />
          <stop offset="100%" stopColor="#ffa800" />
        </linearGradient>
      </defs>
      <path fill="url(#vite-a)" d="M255.2 38.5 135.3 253.1a8 8 0 0 1-14 0L.8 38.5a8 8 0 0 1 8.8-11.8l119.7 21.4a8 8 0 0 0 2.8 0l114.2-21.4a8 8 0 0 1 8.9 11.8Z" />
      <path fill="url(#vite-b)" d="m185.8.3-88.7 17.4a4 4 0 0 0-3.2 3.7l-5.5 93a4 4 0 0 0 4.9 4.1l24.7-5.7a4 4 0 0 1 4.8 4.7l-7.3 35.8a4 4 0 0 0 5 4.7l15.3-4.7a4 4 0 0 1 5.1 4.8l-11.7 56.6c-.7 3.5 4 5.4 6 2.4l1.3-2 72.3-144.2a4 4 0 0 0-4.3-5.7l-25.4 4.9a4 4 0 0 1-4.6-5.1l16.6-57.7a4 4 0 0 0-4.9-5Z" />
    </svg>
  );
}

function ReactMark() {
  return (
    <svg viewBox="-11.5 -10.2 23 20.4" role="img" aria-label="React">
      <circle r="2.05" fill="#61dafb" />
      <g fill="none" stroke="#61dafb" strokeWidth="1">
        <ellipse rx="10.2" ry="3.9" />
        <ellipse rx="10.2" ry="3.9" transform="rotate(60)" />
        <ellipse rx="10.2" ry="3.9" transform="rotate(120)" />
      </g>
    </svg>
  );
}

function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="starter-page">
      <div className="starter-content">
        <div className="brand-row" aria-label="Vite and React">
          <span className="brand-mark">
            <ViteMark />
          </span>
          <span className="brand-divider" aria-hidden="true" />
          <span className="brand-mark">
            <ReactMark />
          </span>
        </div>

        <p className="eyebrow">A tiny starter project</p>
        <h1>Vite + React</h1>
        <p className="intro">
          Edit the number, or use the buttons to change it.
          <br />
          Your first React component is ready to go.
        </p>

        <section className="counter-panel" aria-labelledby="counter-label">
          <label className="counter-label" id="counter-label" htmlFor="counter-value">
            Current count
          </label>
          <div className="counter-controls">
            <button
              className="step-button"
              type="button"
              aria-label="Decrease count"
              data-testid="button-decrease-count"
              onClick={() => setCount((value) => value - 1)}
            >
              −
            </button>
            <input
              className="counter-input"
              id="counter-value"
              data-testid="input-counter-value"
              type="number"
              inputMode="numeric"
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              aria-describedby="counter-caption"
            />
            <button
              className="step-button"
              type="button"
              aria-label="Increase count"
              data-testid="button-increase-count"
              onClick={() => setCount((value) => value + 1)}
            >
              +
            </button>
          </div>
          <p className="counter-caption" id="counter-caption" data-testid="text-counter-status">
            {count === 1 ? 'One click, one count.' : `${count} clicks so far.`}
          </p>
        </section>

        <nav className="docs-row" aria-label="Documentation">
          <a
            className="docs-link"
            href="https://react.dev/"
            target="_blank"
            rel="noreferrer"
            data-testid="link-react-docs"
          >
            <ReactMark />
            React docs
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <a
            className="docs-link"
            href="https://vite.dev/"
            target="_blank"
            rel="noreferrer"
            data-testid="link-vite-docs"
          >
            <ViteMark />
            Vite docs
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </nav>
        <p className="footer-note">MAKE SOMETHING THAT MATTERS</p>
      </div>
    </main>
  );
}

export default App;
