import { useEffect, useState, useRef } from "react";
import Header from "../../../components/Header";
import Conteinner from "../../../components/Conteinner";
import Slider from "../../../components/Slider";
import Content from "../../../components/Content";
import { useNavigate } from "react-router-dom";
import Modal from "../../../components/modal";
import Mensagem from "../../../components/mensagem";
import Footer from "../../../components/Footer";
import RepositorioMercadoria from "./Repositorio";
import Loading from "../../../components/loading";
import * as XLSX from "xlsx";
import { repositorioVenda } from "../vendas/vendasRepositorio";
import repositorioStock from "../Stock.js/Repositorio";

export default function MercadoriaView() {
  const repositorio = new RepositorioMercadoria();
  const repositoriovenda = new repositorioVenda();
  const [modelo, setModelo] = useState([]);
  const [total, setTotal] = useState(0);
  const [id, setId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [quantidadeEst, setQuantidadeEst] = useState(0);
  const [valorEntradas, setValorEntradas] = useState(0);
  const [valorDisponivel, setValorDisponivel] = useState(0);
  const [stockSelecionado, setLoteS] = useState(0);
  const [modelo2, setModelo2] = useState([]);

  const navigate = useNavigate();
  const permissao = sessionStorage.getItem("cargo");
  const [loading, setLoading] = useState(false);
  let msg = new Mensagem();
    let moda = new Modal();

  const repoStco = new repositorioStock();

  useEffect(() => {
 
    async function carregarDados() {
      setLoading(true);
      try {
        const repoStck = await repoStco.leitura();
        const dadosModelo = await repositorio.leitura();

        // 🔹 Filtragem por gaiola e datas
        const filtradas = dadosModelo.filter(
          (e) =>
            (!stockSelecionado || e.stock.idstock == stockSelecionado) &&
            (!dataInicio || new Date(e.data_entrada) >= new Date(dataInicio)) &&
            (!dataFim || new Date(e.data_entrada) <= new Date(dataFim))
        );

        // 🔹 Cálculos gerais
        let totalQtd = 0;
        let totalQtdEst = 0;
        let totalValorEntradas = 0;
        let totalValorDisponivel = 0;

        filtradas.forEach((e) => {
          totalQtd += e.quantidade || 0;
          totalQtdEst += e.quantidade_est || 0;
          totalValorEntradas += e.valor_total || 0;
          totalValorDisponivel += (e.quantidade|| 0) * (e.valor_un || 0);
        });

        setModelo(dadosModelo);
        setTotal(totalQtd);
        setQuantidadeEst(totalQtdEst);
        setValorEntradas(totalValorEntradas);
        setValorDisponivel(totalValorDisponivel);
        setModelo2(repoStck);
      } catch (erro) {
        console.error("Erro ao carregar dados:", erro);
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [stockSelecionado, dataInicio, dataFim]);

  // =====================================================
  // 🧾 EXPORTAR PARA EXCEL (organizado e completo)
  // =====================================================
  const exportToExcel = () => {
    // 🔹 Filtra os dados conforme os filtros aplicados
    const filtradas = modelo.filter(
      (e) =>
        (!stockSelecionado || e.stock.idstock == stockSelecionado) &&
        (!dataInicio || new Date(e.data_entrada) >= new Date(dataInicio)) &&
        (!dataFim || new Date(e.data_entrada) <= new Date(dataFim))
    );

    // 🔹 Estrutura dos dados a exportar
    const dados = filtradas.map((e) => ({
      ID: e.idmercadoria,
      Nome: e.nome,
      Tipo: e.tipo,
      "Quantidade Total (kg)": e.quantidade.toFixed(2),
      "Disponível (kg)": e.quantidade_est.toFixed(2),
      "Saída (kg)": (e.quantidade - e.quantidade_est).toFixed(2),
      "Valor Unitário (Mt)": e.valor_un.toFixed(2),
      "Valor Total (Mt)": e.valor_total.toLocaleString("pt-PT", {
        minimumFractionDigits: 2,
      }),
      "Data de Entrada": e.data_entrada,
      "Gaiola": e.stock ? e.stock.tipo : "-",
      "Usuário": e.usuario ? e.usuario.login : "-",
    }));

    // 🔹 Linha de resumo no final
    dados.push({
      ID: "",
      Nome: "",
      Tipo: "TOTAIS:",
      "Quantidade Total (kg)": total.toFixed(2),
      "Disponível (kg)": quantidadeEst.toFixed(2),
      "Saída (kg)": (total - quantidadeEst).toFixed(2),
      "Valor Unitário (Mt)": "",
      "Valor Total (Mt)": valorEntradas.toLocaleString("pt-PT", {
        minimumFractionDigits: 2,
      }),
      "Data de Entrada": "",
      "Gaiola": "",
      "Usuário": "",
    });

    // 🔹 Gera planilha Excel
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mercadorias");
    XLSX.writeFile(wb, "Relatorio_Mercadorias.xlsx");
  };
  // =====================================================

  return (
    <>
      {loading && <Loading />}
      <Header />
      <Conteinner>
        <Slider />
        <Content>
          <h2>📦 Mercadorias</h2>

          {/* 🔹 Filtros */}
          <div style={{ marginBottom: "15px" }}>
            <label>Filtrar por Gaiola:</label>
            <select
              value={stockSelecionado}
              onChange={(e) => setLoteS(Number(e.target.value))}
            >
              <option value={0}>Todas as Gaiolas</option>
              {modelo2.map((stock) => (
                <option key={stock.idstock} value={stock.idstock}>
                  Gaiola {stock.tipo}
                </option>
              ))}
            </select>

            <br />
            <label>Filtrar por Data:</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
              <span>até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          {/* 🔹 Tabela */}
          <div className="tabela">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Entrada (kg)</th>
                  <th>Disponível (kg)</th>
                  <th>Saída (kg)</th>
                  <th>Valor Unitário (Mt)</th>
                  <th>Valor Total (Mt)</th>
                  <th>Data de Entrada</th>
                  <th>Gaiola</th>
                  {permissao === "admin" && <th>Usuário</th>}
                </tr>
              </thead>

              <tbody>
                {modelo.map((e, i) => {
                  if (
                    (!stockSelecionado || e.stock.idstock == stockSelecionado) &&
                    (!dataInicio ||
                      new Date(e.data_entrada) >= new Date(dataInicio)) &&
                    (!dataFim ||
                      new Date(e.data_entrada) <= new Date(dataFim))
                  ) {
                    return (
                      <tr key={i}>
                        <td>{e.idmercadoria}</td>
                        <td>{e.nome}</td>
                        <td>{e.tipo}</td>
                        <td>{e.quantidade.toFixed(2)}</td>
                        <td>{e.quantidade_est.toFixed(2)}</td>
                        <td>{(e.quantidade - e.quantidade_est).toFixed(2)}</td>
                        <td>{e.valor_un.toFixed(2)} Mt</td>
                        <td>
                          {e.valor_total.toLocaleString("pt-PT", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          Mt
                        </td>
                        <td>{e.data_entrada}</td>
                        <td>
                          {e.stock.idstock}: {e.stock.tipo}
                        </td>
                        {permissao === "admin" && (
                          <td>{e.usuario ? e.usuario.login : "-"}</td>
                        )}
                      </tr>
                    );
                  } else return null;
                })}
              </tbody>

              {/* 🔹 Rodapé com totais */}
              <tfoot>
                <tr style={{ fontWeight: "bold" }}>
                  <td colSpan="3">Totais</td>
                  <td>{total.toFixed(2)} kg Entradas</td>
                  <td>{quantidadeEst.toFixed(2)} kg Disponíveis</td>
                  <td>{(total - quantidadeEst).toFixed(2)} kg Saídas</td>
                  <td></td>
                  <td>
                    <span style={{ color: "#006400" }}>
                      Entradas:{" "}
                      {valorEntradas.toLocaleString("pt-PT", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      Mt
                    </span>
                    <br />
                    <span style={{ color: "blue" }}>
                      Disponível:{" "}
                      {valorDisponivel.toLocaleString("pt-PT", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      Mt
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="crud">
              <button
                className="editar"
                onClick={() => {
                    if (id) {
                        moda.Abrir("deseja editar o "+id)
                         document.querySelector(".sim").addEventListener("click",()=>{ 
                            navigate(`/registar-mercadoria/${id}`)
                          })
                         document.querySelector(".nao").addEventListener("click",()=>{ 
                           moda.fechar()
                          })
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
                onChange={(e) => setId(e.target.value)} // Atualiza o estado com o valor digitado
              />
              <button
                onClick={() => {
                  if (id) {
                      moda.Abrir("deseja apagar o " + id)
                       document.querySelector(".sim").addEventListener("click", () => {
                        repositorio.deletar(id)
                        moda.fechar()
                      })
                       document.querySelector(".nao").addEventListener("click", () => {
                         moda.fechar()
                      })
                  } else {
                    msg.Erro("Por favor, digite um ID válido!");
                  }
                }}
                className="apagar">Apagar
              </button>


            </div>

            {/* 🔹 Botão Excel */}
            {permissao === "admin" && (
              <button
                onClick={exportToExcel}
                className="btn-export"
                style={{
                  marginTop: "15px",
                  backgroundColor: "#007BFF",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                📤 Exportar para Excel
              </button>
            )}
          </div>
        </Content>
      </Conteinner>
      <Footer />
    </>
  );
}
