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
import * as XLSX from "xlsx";  // Import the xlsx library
import { repositorioVenda } from "../vendas/vendasRepositorio";
import repositorioStock from "../Stock.js/Repositorio";

export default function MercadoriaView() {
  const repositorio = new RepositorioMercadoria();
  const repositoriovenda= new repositorioVenda()
  const [modelo, setModelo] = useState([]);
  const [total, setTotal] = useState(0);
  const [id, setId] = useState(""); // Estado para o ID digitado
  const navigate = useNavigate();
const permissao= sessionStorage.getItem("cargo");
  const [loading, setLoading] = useState(false); // Estado para exibir o loading
  const msg = useRef(null); // UseRef para manter uma instância estável
  const moda = useRef(null);
  const [quantidadeTotal, setQuantidadeTotal] = useState(0);
  const [stockSelecionado,setLoteS] = useState(0)
  const [qSaidas, setQSaidas] = useState(0);
  const [modelo2, setModelo2] = useState([]);
  const [quantidadeEst, setQuantidadeEst] = useState(0);
  const repoStco= new repositorioStock();
  useEffect(() => {
    // Inicializa as instâncias uma vez
    msg.current = new Mensagem();
    moda.current = new Modal();

    async function carregarDados() {
      setLoading(true); // Exibir loading
      try {
        const repoStck = await repoStco.leitura();
        const dadosModelo = await repositorio.leitura();
        const dadosVendas= await repositoriovenda.leitura();
       let valorTotalVendas=0;
       let  quantidadeTotal=0;
       let  quantidadeEst=0;
        dadosModelo.forEach((e) => {
    
                if (!stockSelecionado|| (stockSelecionado && stockSelecionado == e.stock.idstock)) {
                  quantidadeEst+=e.quantidade_est;
                  quantidadeTotal += e.quantidade;
                  valorTotalVendas += e.valor_total;
                  }
          
            

        });
       
        const quantidadeTotalVendas = dadosModelo.reduce((acc, merc) => 
          acc + merc.valor_total, 0);
        setQuantidadeEst(quantidadeEst)
        setModelo(dadosModelo);
        setTotal(quantidadeTotal);
        setQuantidadeTotal(valorTotalVendas);
        setModelo2(repoStck)
      } catch (erro) {
        console.error("Erro ao carregar dados:", erro);
      } finally {
        setLoading(false); // Esconder loading
      }
    }
    carregarDados();
  }, [stockSelecionado]);

  // Função para exportar os dados para Excel
  const exportToExcel = () => {
    const dados = modelo.map((elemento) => ({
      ID: elemento.idmercadoria,
      Nome: elemento.nome,
      Tipo: elemento.tipo,
      Quantidade: elemento.quantidade,
      "Data de Entrada": elemento.data_entrada,
      "Valor Unitário": `${elemento.valor_un} Mt`,
      "Valor Total": elemento.valor_total.toLocaleString("pt-PT", { minimumFractionDigits: 3 }) + " Mt",
      "Q Saídas": elemento.q_saidas,
      "Data de Saída": elemento.data_saida,
    }));

    dados.push({
      ID: "TOTAL",
      Nome: "",
      Tipo: "",
      Quantidade: total,
      "Data de Entrada": "",
      "Valor Unitário": "",
      "Valor Total": quantidadeTotal.toLocaleString("pt-PT", { minimumFractionDigits: 3 }) + " Mt",
      "Q Saídas": "",
      "Data de Saída": "",
    });

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mercadorias");
    XLSX.writeFile(wb, "mercadorias.xlsx");
  };

  return (
    <>
      {loading && <Loading />}
      <Header />
      <Conteinner>
        <Slider />
        <Content>
          
          <h2 >Mercadorias </h2>
          <label>    Filtrar por Gaiola:</label>
          <select value={stockSelecionado} onChange={(e) => setLoteS(Number(e.target.value))}>
          <option>Selecione Uma Gaiola</option>
            {modelo2.map((stock) => (
              <option key={stock.idstock} value={stock.idstock}>
                Gaiola {stock.tipo}
              </option>
            ))}
          </select>
          <div className="tabela">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Quantidade</th>
                  <th>Quantidade Disponivel (kg)</th>
                  <th>Data de Entrada</th>
                  <th>Valor unitário</th>
                  <th>Valor total</th>
                  {/* <th>Q Saidas</th> */}
                  <th>Data de Saída</th>
                  <th>Gaiola</th>
                  {(permissao === "admin" )&&
                          <th> Usuario</th>
                          }
                </tr>
              </thead>
              <tbody>
              {modelo.map((elemento, i) => {
                console.log(elemento)
                    if (!stockSelecionado || elemento.stock.idstock == stockSelecionado) {
                      return (
                        <tr key={i}>
                          <td>{elemento.idmercadoria}</td>
                          <td>{elemento.nome}</td>
                          <td>{elemento.tipo}</td>
                          <td>{elemento.quantidade_est.toFixed(2)}</td>
                          <td>{elemento.quantidade.toFixed(2)}</td>
                          <td>{elemento.data_entrada}</td>
                          <td>{elemento.valor_un} Mt</td>
                          <td>
                            {elemento.valor_total.toLocaleString("pt-PT", {
                              minimumFractionDigits: 3,
                            })}{" "}
                            Mt
                          </td>
                          {/* <td>{elemento.q_saidas}</td> */}
                          <td>{elemento.data_saida}</td>
                          <td>{elemento.stock.idstock} : {elemento.stock.tipo}</td>
                            {(permissao === "admin" )&&
                            <td>{elemento.usuario!=null?elemento.usuario.login:0}</td>
                            }
                        </tr>
                      );
                    } else {
                      return null; // Ignora se não corresponder ao filtro
                    }
                  })}

              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4">Total</td>
                  <td>{quantidadeEst.toFixed(2)} kg </td>

                  <td>{total.toFixed(2)} kg   Disponiveis</td>
                </tr>
              </tfoot>
            </table>
            {(permissao === "admin" || permissao === "gerente") && ( 
            <div className="crud">
              <button
                className="editar"
                onClick={() => {
                  if (id) {
                    moda.current.Abrir("Deseja editar o " + id);
                    document.querySelector(".sim").addEventListener("click", () => {
                      navigate(`/registar-mercadoria/${id}`);
                    });
                    document.querySelector(".nao").addEventListener("click", () => {
                      moda.current.fechar();
                    });
                  } else {
                    msg.current.Erro("Por favor, digite um ID válido!");
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
                    moda.current.Abrir("Deseja apagar o " + id);
                    document.querySelector(".sim").addEventListener("click", () => {
                      repositorio.deletar(id);
                      moda.current.fechar();
                    });
                    document.querySelector(".nao").addEventListener("click", () => {
                      moda.current.fechar();
                    });
                  } else {
                    msg.current.Erro("Por favor, digite um ID válido!");
                  }
                }}
                className="apagar"
              >
                Apagar
              </button>
              {/* Botão para exportar para Excel */}
            </div>
            )}
            {permissao==="admin" &&(  <button
                onClick={exportToExcel}
                className="btn-export"
              >
                Exportar para Excel
              </button>)}
          </div>
        </Content>
      </Conteinner>
      <Footer />
    </>
  );
}
