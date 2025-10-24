import Header from "../../../components/Header";
import Conteinner from "../../../components/Conteinner";
import Slider from "../../../components/Slider";
import Content from "../../../components/Content";
import modal from "../../../components/modal";
import mensagem from "../../../components/mensagem";
import Footer from "../../../components/Footer";

import { useEffect, useState } from "react";
import Loading from "../../../components/loading";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import repositorioRacao from "./repositorio";

export default function RacaoView() {
  const [loading, setLoading] = useState(false);
  const [modelo, setModelo] = useState([]);
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [id, setId] = useState("");
  const permissao = sessionStorage.getItem("cargo");
  const navigate = useNavigate();

  const moda = new modal();
  const msg = new mensagem();
  const repositorio = new repositorioRacao();

  useEffect(() => {
    async function carregarDados() {
      setLoading(true);
      try {
        const dadosModelo = await repositorio.leitura();
        setModelo(dadosModelo);
      } catch (erro) {
        console.error("Erro ao carregar dados:", erro);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(modelo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Racao");
    XLSX.writeFile(wb, "relatorio_racao.xlsx");
  };

  // Filtrar por intervalo de datas
  const dadosFiltrados = modelo.filter((e) => {
    const data = new Date(e.data_entrada);
    const inicio = filtroInicio ? new Date(filtroInicio) : null;
    const fim = filtroFim ? new Date(filtroFim) : null;

    return (!inicio || data >= inicio) && (!fim || data <= fim);
  });

  // Totais
  const totalEntrada = dadosFiltrados.reduce((acc, e) => acc + (e.quantidade || 0), 0);
  const totalSaida = dadosFiltrados.reduce((acc, e) => acc + (e.quantidade_saida || 0), 0);
  const totalDisponivel = dadosFiltrados.reduce((acc, e) => acc + (e.quantidade_disp || 0), 0);
  const totalValor= dadosFiltrados.reduce((acc, e) => acc + (e.valor_tot || 0), 0);
  const totalValorDisp= dadosFiltrados.reduce((acc, e) => acc + (e.quantidade_disp || 0), 0);

  return (
    <>
      {loading && <Loading />}
      <Header />
      <Conteinner>
        <Slider />
        <Content>
          <div className="tabela">
            <h2 style={{ textAlign: "center", marginBottom: "15px" }}>Ração</h2>

            {/* FILTROS POR DATA */}
            <div className="filtros-data">
              <label className="form-label">
                Início:
                <input
                  type="date"
                  value={filtroInicio}
                  onChange={(e) => setFiltroInicio(e.target.value)}
                  className="form-control"
                />
              </label>
              <label>
                Fim:
                <input className="input-group  m-2 form-control"
                  type="date"
                  value={filtroFim}
                  onChange={(e) => setFiltroFim(e.target.value)}
                />
              </label>
              <button
                onClick={() => {
                  setFiltroInicio("");
                  setFiltroFim("");
                }}
                className="m-4"
              >
                Limpar Filtros
              </button>
            </div>

            {/* TABELA */}
            <div className="tabela-container">
              <table className="tabela-racao ">
                <thead>
                  <tr>
                    <th colSpan="5" style={{ textAlign: "center" }}>Entradas</th>
                    <th colSpan="4" style={{ textAlign: "center" }}>Saídas</th>
                  </tr>
                  <tr>
                    <th>Tipo</th>
                    <th>Data Entrada</th>
                    <th>Qtd (un)</th>
                    <th>Valor un (MZN)</th>
                    
                    <th className="linha-divisoria">Valor Total (MZN)</th>
                    <th>Data Saída</th>
                    <th>Qtd Saída</th>
                    <th>Qtd Disponível</th>
               
                   
                  </tr>
                </thead>

                <tbody>
                  {dadosFiltrados.length > 0 ? (
                    dadosFiltrados.map((e, index) => (
                      <tr key={index}>
                        <td>{e.tipo}</td>
                        <td>{e.data_entrada}</td>
                        <td>{e.quantidade}</td>
                        <td>{e.valor_uni}</td>
                        <td>{e.valor_tot}</td>
                        <td>{e.data_saida}</td>
                        <td>{e.quantidade_saida}</td>
                        <td>{e.quantidade_disp}</td>
                
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "15px" }}>
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* TOTAL */}
                <tfoot>
                  <tr style={{ fontWeight: "bold", background: "#f5f5f5" }}>
                    <td>Total</td>
                    <td></td>
                    <td>{totalEntrada}</td>
                    <td>{totalDisponivel}</td>
                    <td></td>
                    <td>{totalValor}</td>
                    <td>{totalSaida}</td>
                    <td>{totalValorDisp}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* BOTÕES CRUD */}
            <div className="crud">
              <button
                className="editar"
                onClick={() => {
                  if (id) {
                    moda.Abrir("Deseja editar o " + id);
                    document.querySelector(".sim").addEventListener("click", () => {
                      navigate(`/registar-mortalidade/${id}`);
                    });
                    document.querySelector(".nao").addEventListener("click", () => {
                      moda.fechar();
                    });
                  } else {
                    msg.Erro("Por favor, digite um ID válido!");
                  }
                }}
              >
                Editar
              </button>

              <input
                type="number"
                className="crudid"
                placeholder="Digite o ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />

              <button
                onClick={() => {
                  if (id) {
                    moda.Abrir("Deseja apagar o " + id);
                    document.querySelector(".sim").addEventListener("click", () => {
                      repositorio.deletar(id);
                      moda.fechar();
                    });
                    document.querySelector(".nao").addEventListener("click", () => {
                      moda.fechar();
                    });
                  } else {
                    msg.Erro("Por favor, digite um ID válido!");
                  }
                }}
                className="apagar"
              >
                Apagar
              </button>
            </div>

            {permissao === "admin" && (
              <button className="btn-export" onClick={exportarExcel}>
                Exportar para Excel
              </button>
            )}
          </div>
        </Content>
      </Conteinner>
      <Footer />
    </>
  );
}
