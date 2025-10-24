import Select from "react-select";
import { useEffect, useState } from "react";
import Conteinner from "../../../components/Conteinner";
import Content from "../../../components/Content";
import Header from "../../../components/Header";
import Slider from "../../../components/Slider";
import Footer from "../../../components/Footer";
import { useParams } from "react-router-dom";
import mensagem from "../../../components/mensagem";
import repositorioStock from "../Stock.js/Repositorio";
import Mercadoria from "./Mercadoria";
import repositorioMercadoria from "./Repositorio";

export default function RegistarMercadoria() {
  const [inputs, setInputs] = useState({
    nome: "",
    tipo: "",
    quantidade: "",
    dataEntrada: "",
    valorUnitario: "",
    dataSaida: "",
    estoque: "",
  });
  const [estoques, setEstoques] = useState([]);
  const { id } = useParams();
  let msg = new mensagem();
  let repositorio = new repositorioMercadoria();
  const usuario = sessionStorage.getItem("idusuarios");

  useEffect(() => {
    const fetchEstoques = async () => {
      const estoqueRepo = new repositorioStock();
      const data = await estoqueRepo.leitura();
      setEstoques(data);
    };
    fetchEstoques();
  }, []);
  // 🔹 Agrupar os estoques por data (ex: dataEntrada ou dataCriacao)
  const estoquesAgrupados = Object.values(
    estoques.reduce((grupos, item) => {
      const data = item.data||"Sem data";
      if (!grupos[data]) {
        grupos[data] = {
          label: `Data: ${data}`,
          options: [],
        };
      }
      grupos[data].options.push({
        value: item.idstock,
        label: `${item.idstock}. ${item.tipo} (${item.quantidade})`,
      });
      return grupos;
    }, {})
  );

  function calculaQuantidadeStock() {
    let stock = estoques.find((e) => e.idstock === inputs.estoque);
    if (stock) return stock.quantidade / 3;
  }
  
  console.log(calculaQuantidadeStock())
  const criaMercadoria = () => {
    return new Mercadoria(
      inputs.nome,
      "Entrada",
      calculaQuantidadeStock(),
      calculaQuantidadeStock(),
      inputs.dataEntrada,
      inputs.valorUnitario,
      inputs.dataSaida,
      usuario,
      inputs.estoque
    );
  };

  const limparFormulario = () => {
    setInputs({
      nome: "",
      tipo: "",
      quantidade: "",
      dataEntrada: "",
      valorUnitario: "",
      dataSaida: "",
      estoque: "",
    });
  };

  const cadastrar = () => {
    if (
      !inputs.nome ||
      !inputs.dataEntrada ||
      !inputs.valorUnitario ||
      !inputs.estoque
    ) {
      msg.Erro("Preencha corretamente todos os campos obrigatórios");
      return;
    }

    if (id) {
      repositorio.editar(id, criaMercadoria());
      msg.sucesso("Mercadoria editada com sucesso.");
    } else {
      repositorio.cadastrar(criaMercadoria());
      msg.sucesso("Mercadoria cadastrada com sucesso.");
    }

    limparFormulario();
    setTimeout(() => window.location.reload(), 2000);
  };

  return (
    <>
      <Header />
      <Conteinner>
        <Slider />
        <Content>
          <div className="Cadastro">
            <h1>Registo de Mercadorias</h1>
            <br />
            <div className="form">
              <label>Nome:</label>
              <input
                type="text"
                placeholder="Nome da mercadoria"
                value={inputs.nome}
                onChange={(e) =>
                  setInputs({ ...inputs, nome: e.target.value })
                }
              />
              <br />

              <label>Data de Entrada:</label>
              <input
                type="date"
                value={inputs.dataEntrada}
                onChange={(e) =>
                  setInputs({ ...inputs, dataEntrada: e.target.value })
                }
              />
              <br />

              <label>Valor Unitário:</label>
              <input
                type="number"
                placeholder="Valor unitário"
                value={inputs.valorUnitario}
                onChange={(e) =>
                  setInputs({ ...inputs, valorUnitario: e.target.value })
                }
              />
              <br />

              <label>Gaiolas:</label>
              <Select
                options={estoquesAgrupados}
                placeholder="Selecione uma Gaiola"
                onChange={(option) =>
                  setInputs({ ...inputs, estoque: option?.value || "" })
                }
                value={
                  inputs.estoque
                    ? estoquesAgrupados
                        .flatMap((g) => g.options)
                        .find((opt) => opt.value === inputs.estoque)
                    : null
                }
              />
            </div>

            <button onClick={cadastrar} className="cadastrarMercadoria">
              Cadastrar
            </button>
          </div>
        </Content>
      </Conteinner>
      <Footer />
    </>
  );
}
