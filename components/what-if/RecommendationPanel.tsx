import type { WhatIfResponse } from "../../lib/whatIfTypes";

export default function RecommendationPanel({ response }: { response: WhatIfResponse | null }) {
  const recommendation = response?.recommendation;
  if (!recommendation || !response) return <section className="what-if-recommendation"><span className="mono-label">PROTOTYPE DECISION SCORE</span><h2>RECOMMENDATION UNAVAILABLE</h2><p>No successful scenario results are available to rank.</p></section>;

  return (
    <section className="what-if-recommendation">
      <div className="what-if-recommendation__top"><div><span className="mono-label">PROTOTYPE DECISION SCORE</span><h2>RECOMMENDED CONFIGURATION</h2></div><span className="what-if-recommendation__score">{recommendation.score.toFixed(3)}</span></div>
      <h3>{recommendation.scenario}</h3>
      <ul>{recommendation.explanation.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      <div className="what-if-scoring-note">
        <span>SCORING FORMULA</span>
        <p>{response.scoring.formula}</p>
        <p>Risk penalties · {Object.entries(response.scoring.risk_penalties).map(([risk, penalty]) => `${risk} ${penalty}`).join(" · ")}</p>
        <p>Utilization penalty applies above {response.scoring.utilization_threshold}% prototype threshold. Component values for the recommendation are displayed below.</p>
        <small>{response.scoring.note}</small>
      </div>
    </section>
  );
}
