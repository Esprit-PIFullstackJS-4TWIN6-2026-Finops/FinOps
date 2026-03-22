import { getKpiSummary } from "./services/kpi.service.js";

const trackedCompanies = new Set();

export function initRealtime(io) {
  io.on("connection", (socket) => {
    socket.on("join_company", (companyId) => {
      const room = `company_${companyId}`;
      socket.join(room);
      trackedCompanies.add(Number(companyId));
    });
  });

  setInterval(async () => {
    for (const companyId of trackedCompanies) {
      const kpi = await getKpiSummary(companyId);
      io.to(`company_${companyId}`).emit("kpi_update", kpi);
    }
  }, 10_000);
}

