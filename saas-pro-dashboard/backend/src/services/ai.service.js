export function generateAiInsights(kpi) {
  const alerts = [];
  if (kpi.expenses_total > kpi.revenue_total * 0.2) {
    alerts.push({ level: "red", title: "Charges critiques", description: "Les charges dépassent 20% des revenus." });
  }
  if (kpi.retention_rate < 70) {
    alerts.push({ level: "yellow", title: "Rétention en baisse", description: "La rétention client est en baisse brutale." });
  }
  if (kpi.net_profit < 0) {
    alerts.push({ level: "red", title: "Profit négatif", description: "Le bénéfice net est négatif." });
  }
  if (!alerts.length) {
    alerts.push({ level: "green", title: "Performance stable", description: "Les indicateurs clés sont dans une plage saine." });
  }

  const recommendations = [
    "Optimiser l'infrastructure cloud sur les postes surconsommateurs.",
    "Réduire les dépenses des catégories à faible ROI.",
    "Renforcer l'investissement sur les départements à forte croissance.",
  ];

  const executiveSummary = `Revenus: ${kpi.revenue_total.toFixed(2)}, Charges: ${kpi.expenses_total.toFixed(2)}, Bénéfice net: ${kpi.net_profit.toFixed(2)}, Rétention: ${kpi.retention_rate.toFixed(2)}%.`;

  const healthScore = Math.max(
    0,
    Math.min(
      100,
      70 + (kpi.net_profit > 0 ? 10 : -20) + (kpi.retention_rate > 75 ? 10 : -10) - (alerts.filter((a) => a.level === "red").length * 15),
    ),
  );

  return { executiveSummary, alerts, recommendations, healthScore };
}

