"use client";

import { useState } from "react";
import { Morph } from "./Morph";

// Linear Basic is $10 a person a month, billed yearly (checked 24 Oct 2026).
// Its free plan stops at 250 issues. Leanear: free alone, $9 flat up to 10.
const LINEAR = 10;
const FLAT = 9;

export function Saving() {
  const [n, setN] = useState(3);
  const linear = n === 1 ? "Free" : `$${LINEAR * n}`;
  const ours = n === 1 ? "Free" : `$${FLAT}`;
  const big = n === 1 ? "No cap" : `${Math.round((1 - FLAT / (LINEAR * n)) * 100)}% less`;
  const fill = `${((n - 1) / 9) * 100}%`;

  return (
    <div className="price">
      <div className="saving">
        <div className="big">
          <Morph value={big} big />
        </div>
        <span className="mono">
          {n === 1 ? "Linear's free plan stops at 250 issues. Ours doesn't." : `than Linear, for ${n} people`}
        </span>
      </div>
      <div className="people">
        <span className="mono">1 person</span>
        <input
          className="range"
          type="range"
          min={1}
          max={10}
          value={n}
          aria-label="People on your team"
          style={{ "--fill": fill } as React.CSSProperties}
          onChange={(e) => setN(Number(e.target.value))}
        />
        <span className="mono">10 people</span>
      </div>
      <div className="grid vs">
        <div className="card them">
          <span className="name">Linear</span>
          <div className="amt">
            <s>{linear}</s>
            {n > 1 && <span className="per"> /mo</span>}
          </div>
          <p>{n === 1 ? "Stops at 250 issues" : "$10 a person, billed yearly"}</p>
        </div>
        <div className="card us">
          <span className="name">Leanear</span>
          <div className="amt">
            {ours}
            {n > 1 && <span className="per"> /mo</span>}
          </div>
          <p>{n === 1 ? "No cap, forever" : `You keep $${LINEAR * n - FLAT} a month`}</p>
        </div>
      </div>
    </div>
  );
}
