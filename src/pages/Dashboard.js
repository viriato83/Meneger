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
  TrendingDown,
  TrendingUp,
  Users,
  Box,
  DollarSign,
  List,
} from "lucide-react";

import "./DashboardFull.css"; // <- NOVO: estilos separados

export default function Dashboard() {
  // --- REPOSITORIES
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

  // Estados preservados
  const [cards, setCard] = useState([]);
  const [modelo2, setModelo2] = useState([]);
  const [entrada, setEntradada] = useState(0); // (MT) soma de valor_total das mercadorias
  const [saida, setSaida] = useState(0); // (MT) soma de valor_total de vendas filtradas
  const [useVenda, setVenda] = useState([]);
  const [useData, setData] = useState([]);
  const [dadosParaExportar, setDadosParaExportar] = useState(null);
  const [stockSelecionado, setLoteS] = useState(0);
  const [mesSelecionado, setMesSelecionado] = useState("");
  const [Dados2, setDados2] = useState([]); // mercadorias
  const [Dados3, setDados3] = useState([]); // vendas
  const [total, setTotal] = useState(0); // vendas pagas (kg)
  const [quantidadetotal, setQuantidadeTotal] = useState(0); // valor vendas pagas (MT)
  const [totalDivida, setTotalDivida] = useState(0); // quantidade em dívida (kg)
  const [quantiDivida, setQuantiDivida] = useState(0); // valor em dívida (MT)
  const [totalMerc, setTotalMerc] = useState(0); // total mercadorias (kg)
  var [quantidadeTotal, setQuant] = useState(0); // total vendas (kg)

  const buscarCargo = () => sessionStorage.getItem("cargo");

  // --- Agrupar por período (preservado)
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
        chave = `${data.getFullYear()}-${String(
          data.getMonth() + 1
        ).padStart(2, "0")}`;
      }
      if (!agrupados[chave]) agrupados[chave] = 0;
      agrupados[chave] += item.valor_total;
    });
    return { labels: Object.keys(agrupados), valores: Object.values(agrupados) };
  }

  // =====================================================
  // 🧾 EXPORTAR PARA EXCEL — com RESUMO_FINANCEIRO
  // =====================================================
  function exportarParaExcel(dados, nomeArquivo = "dashboard_dados.xlsx") {
    if (!dados) return;

    // 1) Aba "Dados_Resumo"
    const wsDados = XLSX.utils.json_to_sheet(dados.infoBasica || []);

    // 2) Aba "Entradas" (respeita filtros)
    const MercadoriasFiltradas = (Dados2 || []).filter((merc) => {
      if (!merc) return false;
      const dataMerc = new Date(merc.data_entrada);
      if (isNaN(dataMerc)) return false;
      const anoMes = `${dataMerc.getFullYear()}-${String(
        dataMerc.getMonth() + 1
      ).padStart(2, "0")}`;
      return (
        (!mesSelecionado || anoMes === mesSelecionado) &&
        (!stockSelecionado ||
          Number(stockSelecionado) === Number(merc.stock?.idstock))
      );
    });

    const wsEntradas = XLSX.utils.json_to_sheet(
      MercadoriasFiltradas.map((merc) => ({
        ID: merc.idmercadoria,
        Nome: merc.nome,
        "Quantidade Entrada (kg)": Number(merc.quantidade_est || 0)
          .toFixed(2)
          .replace(".", ","),
        "Disponível (kg)": Number(merc.quantidade || 0)
          .toFixed(2)
          .replace(".", ","),
        "Saída (kg)": Number(
          (merc.quantidade_est || 0) - (merc.quantidade || 0)
        )
          .toFixed(2)
          .replace(".", ","),
        "Valor Unitário (Mt)": Number(merc.valor_un || 0).toFixed(2),
        "Valor Total (Mt)": Number(merc.valor_total || 0)
          .toFixed(2)
          .replace(".", ","),
        "Data de Entrada": merc.data_entrada,
        Gaiola: merc.stock?.tipo || "",
        Usuário: merc.usuario == null ? "0" : merc.usuario.login,
      }))
    );

    const totalEntradaKg = MercadoriasFiltradas.reduce(
      (acc, m) => acc + Number(m.quantidade_est || 0),
      0
    );
    const totalDisponivelKg = MercadoriasFiltradas.reduce(
      (acc, m) => acc + Number(m.quantidade || 0),
      0
    );
    const totalSaidaKg = totalEntradaKg - totalDisponivelKg;

    const totalValorEntradasMt = MercadoriasFiltradas.reduce(
      (acc, m) => acc + Number(m.valor_total || 0),
      0
    );
    const totalValorDisponivelMt = MercadoriasFiltradas.reduce(
      (acc, m) => acc + Number(m.quantidade || 0) * Number(m.valor_un || 0),
      0
    );

    XLSX.utils.sheet_add_json(
      wsEntradas,
      [
        {
          ID: "TOTAL",
          "Quantidade Entrada (kg)": totalEntradaKg.toFixed(2).replace(".", ","),
          "Disponível (kg)": totalDisponivelKg.toFixed(2).replace(".", ","),
          "Saída (kg)": totalSaidaKg.toFixed(2).replace(".", ","),
          "Valor Total (Mt)": totalValorEntradasMt
            .toFixed(2)
            .replace(".", ","),
        },
      ],
      { skipHeader: true, origin: -1 }
    );

    // 3) Aba "Saidas"
    const vendasFiltradas = (dados.grafico || []).filter((venda) => {
      const dataVenda = new Date(venda.data);
      const anoMes = `${dataVenda.getFullYear()}-${String(
        dataVenda.getMonth() + 1
      ).padStart(2, "0")}`;

      return venda.mercadorias?.some(
        (o) =>
          (!mesSelecionado || anoMes === mesSelecionado) &&
          (!stockSelecionado ||
            Number(stockSelecionado) === Number(o.stock?.idstock))
      );
    });

    const wsGrafico = XLSX.utils.json_to_sheet(
      vendasFiltradas.map((venda) => ({
        ID: venda.idvendas,
        Quantidade: Number(venda.quantidade || 0)
          .toFixed(2)
          .replace(".", ","),
        "Valor Unitário (Mt)": Number(venda.valor_uni || 0).toFixed(2),
        Data: venda.data,
        "Valor Total (Mt)": Number(venda.valor_total || 0)
          .toFixed(2)
          .replace(".", ","),
        Status: venda.status_p,
        Mercadorias: (venda.mercadorias || []).map((e) => e.nome).join(", "),
        Usuário: venda.usuario == null ? "0" : venda.usuario.login,
      }))
    );

    const totalQuantidadeSaidas = vendasFiltradas.reduce(
      (acc, v) => acc + Number(v.quantidade || 0),
      0
    );
    const totalValorSaidas = vendasFiltradas.reduce(
      (acc, v) => acc + Number(v.valor_total || 0),
      0
    );

    let valorDividaMt = 0;
    let quantidadeDividaKg = 0;
    vendasFiltradas.forEach((e) => {
      if (e.status_p === "Em_Divida") {
        e.itensVenda?.forEach((item) => {
          quantidadeDividaKg += Number(item.quantidade || 0);
          valorDividaMt += Number(item.valor_total || 0);
        });
      }
    });

    XLSX.utils.sheet_add_json(
      wsGrafico,
      [
        {
          ID: "TOTAL",
          Quantidade: totalQuantidadeSaidas.toFixed(2).replace(".", ","),
          "Valor Total (Mt)": totalValorSaidas.toFixed(2).replace(".", ","),
        },
      ],
      { skipHeader: true, origin: -1 }
    );
    XLSX.utils.sheet_add_json(
      wsGrafico,
      [
        {
          ID: "TOTAL Dívida",
          "Quantidade (kg)": quantidadeDividaKg.toFixed(2).replace(".", ","),
          "Valor (Mt)": valorDividaMt.toFixed(2).replace(".", ","),
        },
      ],
      { skipHeader: true, origin: -1 }
    );

    // 4) Aba "Resumo_Financeiro"
    const resumoFinanceiro = [
      {
        Campo: "Vendas Pagas (Mt)",
        Valor: Number(quantidadetotal || 0).toFixed(2),
      },
      {
        Campo: "Vendas em Dívida (Mt)",
        Valor: Number(quantiDivida || 0).toFixed(2),
      },
      { Campo: "Entradas (kg)", Valor: Number(entrada || 0).toFixed(2) },
      { Campo: "Saídas (kg)", Valor: Number(saida || 0).toFixed(2) },
      { Campo: "Total Mercadorias (kg)", Valor: Number(totalMerc || 0).toFixed(2) },
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumoFinanceiro);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsDados, "Dados_Resumo");
    XLSX.utils.book_append_sheet(wb, wsGrafico, "Saidas");
    XLSX.utils.book_append_sheet(wb, wsEntradas, "Entradas");
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo_Financeiro");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, nomeArquivo);
  }

  // --- Carregamento principal (preservado)
  useEffect(() => {
    async function carregarDashboard() {
      setLoading(true);
      try {
        const vendasT = await vendas.leitura();
        setDados3(vendasT);
        const stk = await stok.leitura();
        const mercT = await mercadoria.leitura();

        const totalVendas = vendasT.reduce(
          (acc, venda) => acc + Number(venda.quantidade || 0),
          0
        );
        setQuant(totalVendas);

        // cálculos das vendas (com filtros mes/stock na tua lógica)
        let valorTotalVendas = 0; // MT (pagas)
        let quantidadeTotalPagas = 0; // kg
        let quantidadeTotalDividaKg = 0; // kg em dívida
        let valorTotalDividaMt = 0; // MT em dívida
        let valorTotalVendasFiltradas = 0; // MT (todas as vendas conforme filtros)

        vendasT.forEach((e) => {
          const dataVenda = new Date(e.data);
          const anoMes = `${dataVenda.getFullYear()}-${String(
            dataVenda.getMonth() + 1
          ).padStart(2, "0")}`;

          e.mercadorias?.forEach((o) => {
            const passaMes =
              !mesSelecionado || anoMes === mesSelecionado;
            const passaStock =
              !stockSelecionado ||
              Number(stockSelecionado) === Number(o.stock?.idstock);

            if (passaMes && passaStock) {
              // Total filtrado (saídas MT)
              valorTotalVendasFiltradas += Number(e.valor_total || 0);

              if (e.status_p === "Em_Divida") {
                e.itensVenda?.forEach((item) => {
                  quantidadeTotalDividaKg += Number(item.quantidade || 0);
                  valorTotalDividaMt += Number(item.valor_total || 0);
                });
              } else {
                e.itensVenda?.forEach((item) => {
                  quantidadeTotalPagas += Number(item.quantidade || 0);
                  valorTotalVendas += Number(item.valor_total || 0);
                });
              }
            }
          });
        });

        setQuantiDivida(valorTotalDividaMt);
        setTotal(quantidadeTotalPagas);
        setTotalDivida(quantidadeTotalDividaKg);
        setQuantidadeTotal(valorTotalVendas);
        setSaida(valorTotalVendasFiltradas);

        setModelo2(stk);

        // cálculos de mercadorias (preservado)
        let totalKg = 0; // total mercadorias (kg)
        let totalKg2 = 0; // total mercadorias Entradas (kg)
        let totalEntradasMt = 0; // entradas em MT (valor_total somado)
        mercT.forEach((e) => {
          const dataMercadoria = new Date(e.data_entrada);
          const anoMes = `${dataMercadoria.getFullYear()}-${String(
            dataMercadoria.getMonth() + 1
          ).padStart(2, "0")}`;

          const passaMes =
            !mesSelecionado || anoMes === mesSelecionado;
          const passaStock =
            !stockSelecionado ||
            Number(stockSelecionado) === Number(e.stock?.idstock);

          if (passaMes && passaStock) {
            if (e.tipo != null) {
              totalKg += Number(e.quantidade || 0);
              totalKg2 += Number(e.quantidade_est|| 0);
              totalEntradasMt += Number(e.valor_total || 0);
            }
          }
        });

        setTotalMerc(totalKg);
        
        setEntradada(Number(totalEntradasMt || 0).toFixed(2));

        // cards
        const cards2 = [
          await clientes.total(),
          totalKg,
          totalKg2,
          quantidadeTotalPagas,
          quantidadeTotalDividaKg,
        ];
        setCard(cards2);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockSelecionado, mesSelecionado]);

  // --- Prepara dados para gráficos e exportação (preservado)
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
            {
              label: "Total Clientes",
              valor: Number(cards[0]).toFixed(2).replace(".", ","),
            },
            {
              label: "Total Vendas",
              valor: (Number(cards[3]) + Number(cards[2]))
                .toFixed(2)
                .replace(".", ","),
            },
            {
              label: "Total Mercadorias",
              valor: Number(cards[2]).toFixed(2).replace(".", ","),
            },
            {
              label: "Total Mercadorias Disponivel",
              valor: Number(cards[1]).toFixed(2).replace(".", ","),
            },
            {
              label: "Total Vendas Pagas (kg)",
              valor: Number(cards[2]).toFixed(2).replace(".", ","),
            },
            {
              label: "Total Vendas Devidas (kg)",
              valor: Number(cards[3]).toFixed(2).replace(".", ","),
            },
            {
              label: "Total Saídas (kg)",
              valor: Number(total).toFixed(2).replace(".", ","),
            },
            {
              label: "Total Entradas (kg)",
              valor: Number(totalMerc).toFixed(2).replace(".", ","),
            },
          ],
          grafico: dados,
          labels: labels,
        });
      }
      setGrafico();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, entrada, saida]);

  // --- Gráfico de barras (preservado)
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
        plugins: { legend: { position: "top" } },
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

  // --- Gráfico combinado (preservado)
  useEffect(() => {
    async function montarGraficoCombinado() {
      const vendasDados = await vendas.leitura();
      const mercDados = await mercadoria.leitura();

      const mapVendas = {};
      vendasDados.forEach((v) => {
        const d = new Date(v.data);
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
        mapVendas[chave] =
          (mapVendas[chave] || 0) + Number(v.valor_total || 0);
      });

      const mapEntradas = {};
      mercDados.forEach((m) => {
        const d = new Date(m.data_entrada);
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
        mapEntradas[chave] =
          (mapEntradas[chave] || 0) +
          Number(m.stock?.quantidade_estoque || 0);
      });

      const labelsSet = new Set([
        ...Object.keys(mapVendas),
        ...Object.keys(mapEntradas),
      ]);
      const labelsArr = Array.from(labelsSet).sort();

      const vendasVals = labelsArr.map((l) => mapVendas[l] || 0);
      const entradasVals = labelsArr.map((l) => mapEntradas[l] || 0);

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

  // --- Pie: Distribuição por stock (preservado)
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

  // --- Ranking (preservado)
  const [ranking, setRanking] = useState([]);
  useEffect(() => {
    async function gerarRanking() {
      const vendasDados = await vendas.leitura();
      const mapa = {};
      vendasDados.forEach((v) => {
        v.mercadorias?.forEach((m) => {
          mapa[m.nome] = (mapa[m.nome] || 0) + Number(m.quantidade || 0);
        });
      });
      const arr = Object.entries(mapa).map(([nome, qtd]) => ({ nome, qtd }));
      arr.sort((a, b) => b.qtd - a.qtd);
      setRanking(arr.slice(0, 8));
    }
    gerarRanking();
  }, [mesSelecionado, stockSelecionado]);

  // --- Helper: Formatação
  const formatNumber = (n) => {
    if (n == null) return "0";
    if (Number.isFinite(Number(n))) return Number(n).toLocaleString();
    return n;
  };

  // --- Valores do Resumo Financeiro
  const entradasMT = Number(String(entrada).replace(",", ".")) || 0;
  const saidasMT = Number(saida || 0) || 0;
  const diferenca =   saidasMT- entradasMT;

  // --- Render
  return (
    <>
      <Header />
      <Conteinner>
        <Sidebar />
        <Content>
          {loading && <Loading />}

          {/* Barra de Filtros */}
          <div className="filters-bar">
            <div className="filter-item">
              <label>Filtrar por Gaiola</label>
              <select
                value={stockSelecionado}
                onChange={(e) => setLoteS(e.target.value)}
              >
                <option value={0}>Todas Gaiolas</option>
                {modelo2.map((stock) => (
                  <option key={stock.idstock} value={stock.idstock}>
                    Gaiola {stock.tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>Filtrar por Mês</label>
              <input
                type="month"
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
              />
            </div>

            <div className="filter-actions">
              <button
                className="btn-export"
                onClick={() =>
                  exportarParaExcel(dadosParaExportar, "dashboard_dados.xlsx")
                }
                title="Exportar dados da dashboard para Excel"
              >
                📥 Exportar Excel
              </button>
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="cards-grid">
            <KpiCard
              title="Total Clientes"
              value={formatNumber(cards[0] || 0)}
              icon={<Users />}
              color="#0b74de1a"
              iconTint="#0b74de"
            />
            <KpiCard
              title="Vendas Pagas"
              value={`${Number(total || 0).toFixed(2)} Kg`}
              icon={<TrendingUp />}
              color="#1b5e201a"
              iconTint="#1b5e20"
            />
            <KpiCard
              title="Vendas em Dívida"
              value={`${Number(totalDivida || 0).toFixed(2)} Kg`}
              icon={<TrendingDown />}
              color="#c628281a"
              iconTint="#c62828"
            />
            <KpiCard
              title="Total Mercadorias Em stock"
              value={`${Number(cards[1] || 0).toFixed(2)} Kg`}
              icon={<Box />}
              color="#ef6c001a"
              iconTint="#ef6c00"
            />
            <KpiCard
              title="Total  Entradas"
              value={`${Number(cards[2] || 0).toFixed(2)} Kg`}
              icon={<Box />}
              color="#ef6c001a"
              iconTint="#ef6c00"
            />
            <KpiCard
              title="Total Entradas"
              value={`${formatNumber(entrada || 0)} Mt`}
              icon={<List />}
              color="#1976d21a"
              iconTint="#1976d2"
            />
            <KpiCard
              title="Total Saídas"
              value={`${formatNumber(saida)} Mt`}
              icon={<DollarSign />}
              color="#673ab71a"
              iconTint="#673ab7"
            />

            {/* NOVO: Resumo Financeiro */}
            <ResumoFinanceiroCard
              entradas={entradasMT}
              saidas={saidasMT}
              diferenca={diferenca}
            />
          </div>

          {/* Charts */}
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
                      <strong>{idx + 1}.</strong> {r.nome} —{" "}
                      <em>{formatNumber(r.qtd)} kg</em>
                    </li>
                  ))}
                  {ranking.length === 0 && <li>Nenhuma venda registada</li>}
                </ol>
              </div>
            </div>
          </div>

          {/* Tabela Resumo (filtrável) */}
          <div className="table-card">
            <h3>Resumo de Entradas (filtrado)</h3>
            <ResumoTabela
              mercadorias={Dados2}
              mesSelecionado={mesSelecionado}
              stockSelecionado={stockSelecionado}
            />
          </div>
        </Content>
      </Conteinner>
      <Footer />
    </>
  );
}

/* -------------------------
   Componentes auxiliares
   ------------------------- */

function KpiCard({ title, value, icon, color, iconTint }) {
  return (
    <div className="kpi-card" style={{ background: "#fff" }}>
      <div className="kpi-icon" style={{ background: color, color: iconTint }}>
        {icon}
      </div>
      <div className="kpi-text">
        <h3>{title}</h3>
        <p>{value}</p>
      </div>
    </div>
  );
}

function ResumoFinanceiroCard({ entradas = 0, saidas = 0, diferenca = 0 }) {
  const positivo = Number(diferenca) >= 0;
  return (
    <div className="finance-card">
      <div className="finance-head">
        <div className="finance-icon">
          <DollarSign size={22} />
        </div>
        <div>
          <h3>Resumo Financeiro</h3>
          <span className="finance-sub">Consolidação por filtros activos</span>
        </div>
      </div>
      <div className="finance-grid">
        <div className="finance-item">
          <span>Entradas</span>
          <strong>{entradas.toLocaleString()} Mt</strong>
        </div>
        <div className="finance-item">
          <span>Saídas</span>
          <strong>{saidas.toLocaleString()} Mt</strong>
        </div>
        <div className={`finance-item ${positivo ? "positivo" : "negativo"}`}>
          <span>Diferença</span>
          <strong>
            {positivo ? "+" : "-"}
            {Math.abs(diferenca).toLocaleString()} Mt
          </strong>
        </div>
      </div>
    </div>
  );
}

function ResumoTabela({ mercadorias = [], mesSelecionado, stockSelecionado }) {
  const filtradas = (mercadorias || [])
    .filter((m) => {
      if (!m) return false;
      const d = new Date(m.data_entrada);
      if (isNaN(d)) return false;
      const anoMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      if (mesSelecionado && anoMes !== mesSelecionado) return false;
      if (
        stockSelecionado &&
        Number(stockSelecionado) !== 0 &&
        m.stock &&
        Number(m.stock.idstock) !== Number(stockSelecionado)
      )
        return false;
      return true;
    })
    .slice(0, 200);

  const totalQuantidadeEst = filtradas.reduce(
    (acc, m) => acc + Number(m.quantidade_est || 0),
    0
  );
  const totalQuantidadeDisp = filtradas.reduce(
    (acc, m) => acc + Number(m.quantidade || 0),
    0
  );

  return (
    <div>
      <div className="table-meta">
        <small>Registos: {filtradas.length}</small>
        <div className="table-totals">
          <small>Total Entradas: {totalQuantidadeEst.toFixed(2)}</small>
          <small>Total Disponível: {totalQuantidadeDisp.toFixed(2)}</small>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
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
              <tr key={m.idmercadoria}>
                <td>{m.idmercadoria}</td>
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
                <td colSpan={7} className="td-center">
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
