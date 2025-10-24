import { useEffect, useState } from "react";
import Conteinner from "../../../components/Conteinner";
import Content from "../../../components/Content";
import Header from "../../../components/Header";
import Slider from "../../../components/Slider";
import Footer from "../../../components/Footer";
import { useParams } from "react-router-dom";
import mensagem from "../../../components/mensagem";
import repositorioStock from "./Repositorio";
import repositorioMercadoria from "../Mercadorias/Repositorio";
import stock from "./Stock";

export default function RegistarStock() {
  const [inputs, setInputs] = useState({
    quantidade: "",
    tipo: "",
    data:"",
    mercadoria: "",
  });
  const [mercadorias, setMercadorias] = useState([]);
  const { id } = useParams();
  const msg = new mensagem();
  const repositorio = new repositorioStock();
  const usuario= sessionStorage.getItem("idusuarios");
  useEffect(() => {
    // Busca de mercadorias ao carregar o componente
    const fetchMercadorias = async () => {
      try {
        console.log(usuario)
        const repositorioMerc = new repositorioMercadoria();
        const data = await repositorioMerc.leitura();
        setMercadorias(data);
      } catch (error) {
        msg.Erro("Erro ao buscar mercadorias.");
      }

    };
    fetchMercadorias();
  }, []);

  const criaStock = () => {
    return new stock(inputs.quantidade, inputs.tipo,usuario,inputs.data, inputs.mercadoria);
  };
console.log(criaStock())
  const validarCampos = () => {
    if (!inputs.quantidade || !inputs.tipo ) {
      msg.Erro("Preencha todos os campos obrigatórios.");
      return false;
    }
    return true;
  };

  const cadastrar = () => {
    if (!validarCampos()) return;

    if (id) {
      repositorio.editar(id, criaStock());
      msg.sucesso("Stock editado com sucesso.");
    } else {
      console.log(criaStock())
      repositorio.cadastrar(criaStock());
      msg.sucesso("Stock cadastrado com sucesso.");
      setInputs({ quantidade: "", tipo: "", mercadoria: "",data:"" }); // Limpar formulário
    }
  };

  return (
    <>
      <Header />
      <Conteinner>
        <Slider />
        <Content>
          <div className="Cadastro">
            <h1>Registo  de Gaiolas</h1>
            <br />
            <div className="form">
              <label>ID:</label>
              <input type="number" value={id || 0} disabled className="id" />
              <br />
              <label>Quantidade unitária: </label>
              <input
                type="number"
                className="quantidade"
                placeholder="Quantidade"
                value={inputs.quantidade==null?null:inputs.quantidade}
                onChange={(e) =>
                  setInputs({ ...inputs, quantidade: e.target.value })
                }
              />
              <br />
              <label>Gaiola:</label>
              <input
                type="text"
                className="tipo"
                placeholder="Gaiola"
                value={inputs.tipo}
                onChange={(e) => setInputs({ ...inputs, tipo: e.target.value })}
              />
              <br />
              <label>Data </label>
              <input
                type="date"
                className="dataEntrada"
                value={inputs.data}
                onChange={(e) =>
                  setInputs({ ...inputs, data: e.target.value })
                }
              />
              <br />
              {/* <label>Mercadoria:
                --Opcional
              </label>
              <select
                className="mercadoria"
                value={inputs.mercadoria}
                onChange={(e) =>
                  setInputs({ ...inputs, mercadoria: e.target.value })
                }
              >
                <option value="">Selecione uma Mercadoria</option>
                {mercadorias.map((mercadoria) => (
                  <option
                    key={mercadoria.idmercadoria}
                    value={mercadoria.idmercadoria}
                  >
                    {mercadoria.nome}
                  </option>
                ))}
              </select> */}
            </div>
            <button onClick={cadastrar} className="cadastrarStock">
              Cadastrar
            </button>
          </div>
        </Content>
      </Conteinner>
      <Footer />
    </>
  );
}
