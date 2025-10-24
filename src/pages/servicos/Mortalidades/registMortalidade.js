import { useEffect, useState } from "react";
import Conteinner from "../../../components/Conteinner";
import Content from "../../../components/Content";
import Header from "../../../components/Header";
import Slider from "../../../components/Slider";
import { useParams } from "react-router-dom";
import mensagem from "../../../components/mensagem";
import Footer from "../../../components/Footer";
import { repositorioMortalidade } from "./mortalidadeRepository";
import Mortalidade from "./Mortalidade";
import repositorioStock from "../Stock.js/Repositorio";
import Select from "react-select";
import stock from "../Stock.js/Stock";

export default function RegistarMortalidade() {
  const [inputs, setInputs] = useState({
    descricao: "",
    quantidade: "",
    data: "",
  });

  const { id } = useParams();
  let msg = new mensagem();
  let repositorio = new repositorioMortalidade();
  let repoStock= new repositorioStock()
  const [stocks,setStock]= useState([])
  const [Stock,setStock2]= useState()

  useEffect(() => {
    msg = new mensagem();
    repositorio = new repositorioMortalidade();
     async function lerDados(){
      setStock(await repoStock.leitura())
    }
    lerDados()
  }, []);

  const limparFormulario = () => {
    setInputs({
      descricao: "",
      quantidade: "",
      data: "",
    });
  };

  function calculaQuantidade() {
    const estoque = stocks.find(e => e.idstock == Stock);
    if (!estoque) return 0; // se não achar o stock
    return estoque.quantidade - Number(inputs.quantidade); // <-- CONVERTER
  }
  

  const criaMortalidade = () => {
    return new Mortalidade(inputs.descricao, inputs.quantidade, inputs.data,Stock);
  };

  const cadastrar =async () => {

      if (id) {
        await repositorio.editar(id, criaMortalidade());
      } else {
        if (!inputs.descricao || !inputs.quantidade || !inputs.data) {
          msg.Erro("Preencha corretamente todos os campos");
        } else {
          const estoque = stocks.find(e => e.idstock == Stock);
          if (!estoque) {
            msg.Erro("Stock não encontrado");
            return;
          }
    
          // Atualiza a quantidade disponível no stock
          const novaQuantidade = estoque.quantidade - Number(inputs.quantidade);
          await repoStock.editar3(Stock,novaQuantidade );
    
          // Agora cadastra a mortalidade
          await repositorio.cadastrar(criaMortalidade());
    
          limparFormulario(); // Limpa o formulário após o cadastro
          msg.sucesso("Mortalidade registrada e stock atualizado");
        }
      }
    
    
  };

  function agruparStock(){
    return stocks.map(e=>({
      label:e.idstock+"::"+e.tipo,
      value:e.idstock
    }))
  }

  return (
    <>
      <Header />
      <Conteinner>
        <Slider />
        <Content>
          <div className="Cadastro">
            <h1>Registo de Mortalidade</h1>
            <br />

            <div className="form">
             
              <label>ID:</label>
              <input
                type="number"
                value={id ? id : 0}
                disabled
                className="id"
              />
               <Select
              placeholder="Selecione o Stock"
                options={agruparStock()}
                value={agruparStock().filter(e=>Stock==e.value)}
                onChange={(selected)=>{
                  setStock2(selected.value)
                }}
              >

              </Select>
              <br />
              <label>Descrição:</label>
              <input
                type="text"
                required
                className="descricao"
                id="cad"
                placeholder="Descrição"
                value={inputs.descricao}
                onChange={(e) => setInputs({ ...inputs, descricao: e.target.value })}
              />
              <br />
              <label>Quantidade: </label>
              <input
                type="number"
                required
                className="quantidade"
                id="cad"
                placeholder="Quantidade"
                value={inputs.quantidade}
                onChange={(e) => setInputs({ ...inputs, quantidade: e.target.value })}
              />
              <br />
              <label>Data: </label>
              <input
                type="date"
                className="data"
                id="cad"
                placeholder="Data"
                value={inputs.data}
                onChange={(e) => setInputs({ ...inputs, data: e.target.value })}
              />
            </div>
            <button onClick={cadastrar} className="cadastrar">
              Cadastrar
            </button>
          </div>
        </Content>
      </Conteinner>
      <Footer />
    </>
  );
}
