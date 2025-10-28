// DashboardFull.jsx
import Conteinner from "../components/Conteinner";
import Content from "../components/Content";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Sidebar from "../components/Slider";
import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import ClienteRepository from "./servicos/Clientes/ClienteRepository";
import repositorioMercadoria from "./servicos/Mercadorias/Repositorio";
import repositorioStock from "./servicos/Stock.js/Repositorio";
import { repositorioVenda } from "./servicos/vendas/vendasRepositorio";
import Loading from "../components/loading";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  AlertTriangle,
  Bell,
  TrendingDown,
  TrendingUp,
  Users,
  Box,
  DollarSign,
  List,
} from "lucide-react";

export default function Dashboard() {
  // --- REPOSITORIES (mesma forma que tinhas)
  const clientes = new ClienteRepository();
  const mercadoria = new repositorioMercadoria();
  const stok = new repositorioStock();
  const vendas = new repositorioVenda();

  // --- REFS e STATES
  const chartRef = useRef(null);
  const mixedChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const mixedChartInstanceRef = useRef(null);
  const pieChartInstanceRef = useRef(null);

  const [loading, setLoading] = useState(false);

  // Estados originais e mantidos (preservados)
  const [cards, setCard] = useState([]);
  const [modelo2, setModelo2] = useState([]);
  const [entrada, setEntradada] = useState(0);
  const [saida, setSaida] = useState(0);
  const [useVenda, setVenda] = useState([]);
  const [useData, setData] = useState([]);
  const [dadosParaExportar, setDadosParaExportar] = useState(null);
  const [stockSelecionado, setLoteS] = useState(0);
  const [mesSelecionado, setMesSelecionado] = useState("");
  const [Dados2, setDados2] = useState([]);
  const [Dados3, setDados3] = useState([]);
  const [total, setTotal] = useState(0);
  const [quantidadetotal, setQuantidadeTotal] = useState(0);
  const [totalDivida, setTotalDivida] = useState(0);
  const [quantiDivida, setQuantiDivida] = useState(0);
  const [totalMerc, setTotalMerc] = useState(0);

  var [quantidadeTotal, setQuant] = useState(0);

  const buscarCargo = () => sessionStorage.getItem("cargo");

  // --- Função original: agruparPorPeriodo (preservada)
  function agruparPorPeriodo(dados, periodo = "dia") {
    const agrupados = {};

    dados.forEach((item) => {
      let chave;
      const data = new Date(item.data);

      if (periodo === "dia") {
        chave = data.toISOString().split("T")[0];
      } else if (periodo === "semana") {
        const semana = Math.ceil(data.getDate() / 7);
        chave = `${data.getFullYear()}-M${data.getMonth() + 1}-W${semana}`;
      } else if (periodo === "mes") {
        chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!agrupados[chave]) {
        agrupados[chave] = 0;
      }
      agrupados[chave] += item.valor_total;
    });

    return {
      labels: Object.keys(agrupados),
      valores: Object.values(agrupados),
    };
  }

  // --- Export to Excel (mantive e melhorei pequenas partes mantendo a lógica)
  function exportarParaExcel(dados, nomeArquivo = "dados.xlsx") {
    if (!dados) return;
    // sheet 1: resumo básico (dados.infoBasica)
    const wsDados = XLSX.utils.json_to_sheet(dados.infoBasica || []);

    // entradas (usa Dados2 como antes — garante que está carregado)
    const MercadoriasFiltradas = Dados2.filter((merc) => {
      const dataMerc = new Date(merc.data_entrada);
      const anoMes = `${dataMerc.getFullYear()}-${String(dataMerc.getMonth() + 1).padStart(2, "0")}`;

      return (
        (!mesSelecionado || anoMes === mesSelecionado) &&
        (!stockSelecionado || stockSelecionado == merc.stock.idstock)
      );
    });

    const wsEntradas = XLSX.utils.json_to_sheet(
      MercadoriasFiltradas.map((merc) => ({
        ID: merc.idmercadoria,
        Nome: merc.nome,
        Quantidade: Number(merc.quantidade_est || 0).toFixed(2).replace(".", ","),
        Quantidade_Disponivel: Number(merc.quantidade || 0).toFixed(2).replace(".", ","),
        ValorUnitario: merc.valor_un,
        Data: merc.data_entrada,
        ValorTotal: Number(merc.valor_total || 0).toFixed(2).replace(".", ","),
        Stock: merc.stock?.idstock ?? "",
        Usuario: merc.usuario == null ? "0" : merc.usuario.login,
      }))
    );

    const totalQuantidadeMerc = MercadoriasFiltradas.reduce((acc, merc) => acc + Number(merc.quantidade_est || 0), 0);
    const totalValorMerc = MercadoriasFiltradas.reduce((acc, merc) => acc + Number(merc.valor_total || 0), 0);
    const totalDisponivel = MercadoriasFiltradas.reduce((acc, merc) => acc + Number(merc.quantidade || 0), 0);

    XLSX.utils.sheet_add_json(
      wsEntradas,
      [
        {
          ID: "TOTAL",
          Quantidade: totalQuantidadeMerc.toFixed(2).replace(".", ","),
          ValorTotal: totalValorMerc.toFixed(2).replace(".", ","),
        },
      ],
      { skipHeader: true, origin: -1 }
    );
    XLSX.utils.sheet_add_json(
      wsEntradas,
      [
        {
          ID: "Disponivel",
          Quantidade_Disponivel: totalDisponivel.toFixed(2).replace(".", ","),
        },
      ],
      { skipHeader: true, origin: -1 }
    );

    // vendas filtradas (mantendo lógica original de filtros e cálculos)
    const vendasFiltradas = (dados.grafico || []).filter((venda) => {
      const dataVenda = new Date(venda.data);
      const anoMes = `${dataVenda.getFullYear()}-${String(dataVenda.getMonth() + 1).padStart(2, "0")}`;

      return venda.mercadorias.some((o) => {
        return (
          (!mesSelecionado || anoMes === mesSelecionado) &&
          (!stockSelecionado || stockSelecionado == o.stock.idstock)
        );
      });
    });
   
    const wsGrafico = XLSX.utils.json_to_sheet(
      vendasFiltradas.map((venda) => ({
        ID: venda.idvendas,
        Quantidade: Number(venda.quantidade || 0).toFixed(2).replace(".", ","),
        ValorUnitario: venda.valor_uni,
        Data: venda.data,
        ValorTotal: Number(venda.valor_total || 0).toFixed(2).replace(".", ","),
        Status: venda.status_p,
        Mercadoria: venda.mercadorias.map((e) => e.nome).join(", "),
        Usuario: venda.usuario == null ? "0" : venda.usuario.login,
      }))
    );

    const totalQuantidade = vendasFiltradas.reduce((acc, venda) => acc + Number(venda.quantidade || 0), 0);
    const totalValor = vendasFiltradas.reduce((acc, venda) => acc + Number(venda.valor_total || 0), 0);

    let temp = 0;
    let temp2 = 0;
    vendasFiltradas.forEach((e) => {
      if (e.status_p === "Em_Divida") {
        temp += Number(e.valor_total || 0);
        temp2 += Number(e.quantidade || 0);
      }
    });

    XLSX.utils.sheet_add_json(
      wsGrafico,
      [
        {
          ID: "TOTAL",
          Quantidade: totalQuantidade.toFixed(2).replace(".", ","),
          ValorTotal: totalValor.toFixed(2).replace(".", ","),
        },
      ],
      { skipHeader: true, origin: -1 }
    );

    XLSX.utils.sheet_add_json(
      wsGrafico,
      [
        {
          ID: "TOTAL Divida",
          quantidadeTotal_divida: temp2.toFixed(2).replace(".", ","),
          totalDivida: temp.toFixed(2).replace(".", ","),
        },
      ],
      { skipHeader: true, origin: -1 }
    );

    // Monta workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsDados, "Dados_Resumo");
    XLSX.utils.book_append_sheet(wb, wsGrafico, "Saidas");
    XLSX.utils.book_append_sheet(wb, wsEntradas, "Entradas");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, nomeArquivo);
  }

  // --- Carregamento original (preservado) mas reorganizado para limpar e adicionar KPIs extras
  useEffect(() => {
    async function carregarDashboard() {
      setLoading(true);
      try {
        // Faz as leituras como antes
        const vendasT = await vendas.leitura();
        setDados3(await vendas.leitura());
        const stk = await stok.leitura();
        const mercT = await mercadoria.leitura();

        // Mantive os cálculos e filtros que já tinhas
        const totalVendas = vendasT.reduce((acc, venda) => acc + Number(venda.quantidade || 0), 0);
        setQuant(totalVendas);

        // cálculos das vendas com filtros por mês/stock (preservados)
        let valorTotalVendas = 0;
        let quantidadeTotal = 0;
        let quantidadeTotal2 = 0;
        let quantidadeDivida = 0;

        vendasT.forEach((e) => {
          console.log(e)
          const dataVenda = new Date(e.data);
          const anoMes = `${dataVenda.getFullYear()}-${String(dataVenda.getMonth() + 1).padStart(2, "0")}`;

          e.mercadorias.forEach((o) => {
            if ((!mesSelecionado || anoMes === mesSelecionado) && (!stockSelecionado || (stockSelecionado && stockSelecionado == o.stock.idstock))) {
              if (e.status_p === "Em_Divida") {
                e.itensVenda.forEach((item) => {
                  quantidadeTotal2 += Number(item.quantidade|| 0);
                  quantidadeDivida += Number(e.valor_total|| 0);
                })
              } else {
         
                e.itensVenda.forEach((item) => {
                  quantidadeTotal +=Number(item.quantidade|| 0);
          
                  valorTotalVendas += Number(e.valor_total|| 0);
              })
              }
            }
          });
        });

        setQuantiDivida(quantidadeDivida);
        setTotal(quantidadeTotal);
        setTotalDivida(quantidadeTotal2);
        setQuantidadeTotal(valorTotalVendas);

        setModelo2(stk);

        // cards (preservando a intenção original)
        let cards2 = [
          await clientes.total(),
          totalMerc.toFixed ? totalMerc.toFixed(2) : totalMerc,
          total,
          totalDivida,
        ];
        setCard(cards2);

        // cálculos de mercadorias (preservado)
        let contador1 = 0;
        let contador2 = 0;
        let contador3 = 0;

        mercT.forEach((e) => {
          const dataMercadoria = new Date(e.data_entrada);
          const anoMes = `${dataMercadoria.getFullYear()}-${String(dataMercadoria.getMonth() + 1).padStart(2, "0")}`;

          if ((!mesSelecionado || anoMes === mesSelecionado) && (!stockSelecionado || (stockSelecionado && stockSelecionado == e.stock.idstock))) {
            if (e.tipo != null) {
              contador1 += Number(e.stock.quantidade_estoque || 0);
              contador3 += Number(e.quantidade || 0);
            }
            if (e.tipo != null) {
              contador2 += Number(e.quantidade || 0);
            
            }
          }
        });

        setTotalMerc(contador2);
        setEntradada(contador1.toFixed(2));
        setSaida(contador3);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockSelecionado, total, totalDivida, entrada, mesSelecionado]);

  // --- Prepara dados para gráficos e exportação (preservando tua lógica)
  useEffect(() => {
    if (cards.length > 0) {
      async function setGrafico() {
        const dados = await vendas.leitura();
        const dados2 = await mercadoria.leitura();
        setDados2(dados2);
        const { labels, valores } = agruparPorPeriodo(dados, "mes");
        setVenda(valores);
        setData(labels);

        setDadosParaExportar({
          infoBasica: [
            { label: "Total Clientes", valor: Number(cards[0]).toFixed(2).replace(".", ",") },
            { label: "Total Vendas", valor: (Number(cards[3]) + Number(cards[2])).toFixed(2).replace(".", ",") },
            { label: "Total Mercadorias", valor: Number(cards[1]).toFixed(2).replace(".", ",") },
            { label: "Total Vendas Pagas", valor: Number(cards[2]).toFixed(2).replace(".", ",") },
            { label: "Total Vendas Devidas", valor: Number(cards[3]).toFixed(2).replace(".", ",") },
            { label: "Total Saídas", valor: Number(saida).toFixed(2).replace(".", ",") },
            { label: "Total Entradas", valor: Number(entrada).toFixed(2).replace(".", ",") },
          ],
          grafico: dados,
          labels: labels,
        });
      }

      setGrafico();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, entrada, saida]);

  // --- Gráfico de barras padrão (vendas mensais) usando useData/useVenda (mantido)
  useEffect(() => {
    if (!chartRef.current) return;
    if (!useData || useData.length === 0) return;

    const ctx = chartRef.current.getContext("2d");
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    chartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: useData,
        datasets: [
          {
            label: "Vendas",
            data: useVenda,
            backgroundColor: "rgba(54, 162, 235, 0.6)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
        },
        scales: {
          x: { ticks: { maxTicksLimit: 10 } },
          y: {
            ticks: {
              callback: function (value) {
                return `${value} Mt`;
              },
            },
          },
        },
      },
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useVenda, useData]);

  // --- Gráfico combinado: Entradas vs Saídas por mês (novo, mas usando os mesmos dados)
  useEffect(() => {
    async function montarGraficoCombinado() {
      const vendasDados = await vendas.leitura();
      const mercDados = await mercadoria.leitura();

      // Agrupar por mês para ambos
      const mapVendas = {};
      vendasDados.forEach((v) => {
        const d = new Date(v.data);
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        mapVendas[chave] = (mapVendas[chave] || 0) + Number(v.valor_total || 0);
      });

      const mapEntradas = {};
      mercDados.forEach((m) => {
        const d = new Date(m.data_entrada);
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        mapEntradas[chave] = (mapEntradas[chave] || 0) + Number(m.stock.quantidade_estoque || 0);
      });

      // merge labels
      const labelsSet = new Set([...Object.keys(mapVendas), ...Object.keys(mapEntradas)]);
      const labelsArr = Array.from(labelsSet).sort();

      const vendasVals = labelsArr.map((l) => mapVendas[l] || 0);
      const entradasVals = labelsArr.map((l) => mapEntradas[l] || 0);

      // desenha gráfico combinado
      if (!mixedChartRef.current) return;
      const ctx = mixedChartRef.current.getContext("2d");
      if (mixedChartInstanceRef.current) mixedChartInstanceRef.current.destroy();

      mixedChartInstanceRef.current = new Chart(ctx, {
        data: {
          labels: labelsArr,
          datasets: [
            {
              type: "bar",
              label: "Vendas (MT)",
              data: vendasVals,
              backgroundColor: "rgba(255, 99, 132, 0.6)",
            },
            {
              type: "line",
              label: "Entradas ",
              data: entradasVals,
              borderColor: "rgba(54, 162, 235, 1)",
              tension: 0.3,
              fill: false,
              yAxisID: "y1",
            },
          ],
        },
        options: {
          responsive: true,
          interaction: { mode: "index", intersect: false },
          scales: {
            y: {
              beginAtZero: true,
              position: "left",
              title: { display: true, text: "Vendas (MT)" },
            },
            y1: {
              beginAtZero: true,
              position: "right",
              grid: { drawOnChartArea: false },
              title: { display: true, text: "Entradas " },
            },
          },
        },
      });
    }

    montarGraficoCombinado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSelecionado, stockSelecionado]);

  // --- Gráfico de pizza: Distribuição por stock (mantendo dados)
  useEffect(() => {
    async function montarPie() {
      const mercDados = await mercadoria.leitura();
      const mapa = {};
      mercDados.forEach((m) => {
        const id = m.stock?.idstock ?? "SemStock";
        mapa[id] = (mapa[id] || 0) + Number(m.quantidade || 0);
      });

      const labels = Object.keys(mapa);
      const valores = labels.map((l) => mapa[l]);

      if (!pieChartRef.current) return;
      const ctx = pieChartRef.current.getContext("2d");
      if (pieChartInstanceRef.current) pieChartInstanceRef.current.destroy();

      pieChartInstanceRef.current = new Chart(ctx, {
        type: "pie",
        data: {
          labels,
          datasets: [
            {
              data: valores,
              backgroundColor: [
                "rgba(54,162,235,0.6)",
                "rgba(255,99,132,0.6)",
                "rgba(255,206,86,0.6)",
                "rgba(75,192,192,0.6)",
                "rgba(153,102,255,0.6)",
              ],
            },
          ],
        },
        options: { responsive: true },
      });
    }

    montarPie();
  }, [mesSelecionado, stockSelecionado]);

  // --- Ranking de mercadorias mais vendidas (novo)
  const [ranking, setRanking] = useState([]);
  useEffect(() => {
    async function gerarRanking() {
      const vendasDados = await vendas.leitura();
      const mapa = {};
      vendasDados.forEach((v) => {
        v.mercadorias.forEach((m) => {
          mapa[m.nome] = (mapa[m.nome] || 0) + Number(m.quantidade || 0);
        });
      });
      const arr = Object.entries(mapa).map(([nome, qtd]) => ({ nome, qtd }));
      arr.sort((a, b) => b.qtd - a.qtd);
      setRanking(arr.slice(0, 8)); // top 8
    }
    gerarRanking();
  }, [mesSelecionado, stockSelecionado]);

  // --- Helper: Formatação simples
  const formatNumber = (n) => {
    if (n == null) return "0";
    if (Number.isFinite(Number(n))) return Number(n).toLocaleString();
    return n;
  };

  // --- Render
  return (
    <>
      <Header />
      <Conteinner>
        <Sidebar />
        <Content>
          {loading && <Loading />}

          <div style={{ display: "grid", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: 600 }}>Filtrar por stock:</label>
              <select
                value={stockSelecionado}
                onChange={(e) => setLoteS(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 8 }}
              >
                <option value={0}>Todas Gaiolas</option>
                {modelo2.map((stock) => (
                  <option key={stock.idstock} value={stock.idstock}>
                    Gaiola {stock.tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="d-grid">
              <label style={{ fontWeight: 600 }}>Filtrar por Mês:</label>
              <input
                type="month"
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
                style={{ padding: 8, borderRadius: 8 }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center",justifyContent:"center"
             }}>
              <button
                className="btn-export"
                onClick={() => exportarParaExcel(dadosParaExportar, "dashboard_dados.xlsx")}
              >
                📥 Exportar Excel
              </button>
            </div>
          </div>

          {/* --- KPI CARDS (estilo Power BI) */}
          <div className="cards-grid">
            <KpiCard title="Total Clientes" value={formatNumber(cards[0] || 0)} icon={<Users />} color="#4fc3f7" />
            <KpiCard
              title="Vendas Pagas"
              value={`${Number(total.toFixed(2)|| 0)} `}
              icon={<TrendingUp />}
              color="#66bb6a"
            />
            <KpiCard
              title="Vendas em Dívida"
              value={`${formatNumber(totalDivida.toFixed(2) || 0)} `}
              icon={<TrendingDown />}
              color="#ef5350"
            />
            <KpiCard
              title="Total Mercadorias"
              value={`${formatNumber(cards[1] || 0)} `}
              icon={<Box />}
              color="#ffa726"
            />
            <KpiCard
              title="Total Entradas"
              value={`${formatNumber(entrada || 0)} `}
              icon={<List />}
              color="#42a5f5"
            />
            <KpiCard
              title="Total Saídas"
              value={`${saida.toFixed(2)} `}
              icon={<DollarSign />}
              color="#7e57c2"
            />
          </div>

          {/* --- Charts Row */}
          <div className="charts-row">
            <div className="chart-card">
              <h4>Vendas Mensais</h4>
              <canvas ref={chartRef} />
            </div>

            <div className="chart-card">
              <h4>Entradas x Saídas (Mensal)</h4>
              <canvas ref={mixedChartRef} />
            </div>

            <div className="small-cards">
              <div className="chart-card small">
                <h4>Distribuição de Stock</h4>
                <canvas ref={pieChartRef} />
              </div>

              <div className="chart-card small">
                <h4>Ranking Mercadorias</h4>
                <ol className="ranking-list">
                  {ranking.map((r, idx) => (
                    <li key={r.nome}>
                      <strong>{idx + 1}.</strong> {r.nome} — <em>{formatNumber(r.qtd)} kg</em>
                    </li>
                  ))}
                  {ranking.length === 0 && <li>Nenhuma venda registada</li>}
                </ol>
              </div>
            </div>
          </div>

          {/* --- Tabela Resumo de Mercadorias (filtrável) */}
          <div className="table-card">
            <h3>Resumo de Entradas (filtrado)</h3>
            <ResumoTabela mercadorias={Dados2} mesSelecionado={mesSelecionado} stockSelecionado={stockSelecionado} />
          </div>
        </Content>
      </Conteinner>
      <Footer />
      {/* --- CSS local abaixo */}
      <style>{`
       
      `}</style>
    </>
  );
}

/* -------------------------
   Componentes auxiliares
   ------------------------- */

function KpiCard({ title, value, icon, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: color }}>
        {icon}
      </div>
      <div className="kpi-text">
        <h3>{title}</h3>
        <p>{value}</p>
      </div>
    </div>
  );
}

function ResumoTabela({ mercadorias = [], mesSelecionado, stockSelecionado }) {
  const filtradas = mercadorias
    .filter((m) => {
      if (!m) return false;
      const d = new Date(m.data_entrada);
      if (isNaN(d)) return false;
      const anoMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (mesSelecionado && anoMes !== mesSelecionado) return false;
      if (stockSelecionado && stockSelecionado != 0 && m.stock && m.stock.idstock != stockSelecionado) return false;
      return true;
    })
    .slice(0, 200); // limita a 200 linhas para performance

  const totalQuantidadeEst = filtradas.reduce((acc, m) => acc + Number(m.quantidade_est || 0), 0);
  const totalQuantidadeDisp = filtradas.reduce((acc, m) => acc + Number(m.quantidade || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <small>Registos: {filtradas.length}</small>
        <div>
          <small style={{ marginRight: 12 }}>Total Entradas: {totalQuantidadeEst.toFixed(2)}</small>
          <small>Total Disponível: {totalQuantidadeDisp.toFixed(2)}</small>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: 8 }}>ID</th>
              <th>Nome</th>
              <th>Quantidade Est.</th>
              <th>Disponível</th>
              <th>Valor Unit.</th>
              <th>Data Entrada</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((m) => (
              <tr key={m.idmercadoria} style={{ borderBottom: "1px solid #fafafa" }}>
                <td style={{ padding: 8 }}>{m.idmercadoria}</td>
                <td>{m.nome}</td>
                <td>{Number(m.quantidade_est || 0).toFixed(2)}</td>
                <td>{Number(m.quantidade || 0).toFixed(2)}</td>
                <td>{m.valor_un}</td>
                <td>{m.data_entrada}</td>
                <td>{m.stock?.idstock ?? ""}</td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 12, textAlign: "center" }}>
                  Nenhum registo encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
